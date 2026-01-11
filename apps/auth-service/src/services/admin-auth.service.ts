/**
 * Admin Authentication Service
 * 
 * Handles admin login, MFA, and session management.
 * COMPLETELY SEPARATE from public user authentication.
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import jwt from 'jsonwebtoken';
import { AdminUser, AdminSession, AdminMFASetup, AdminLoginAttempt, IAdminUser } from '../domain/admin.models';
import { AdminAuthError } from '../errors/admin-auth.errors';

// Configuration
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-jwt-secret-change-in-production';
const ADMIN_JWT_REFRESH_SECRET = process.env.ADMIN_JWT_REFRESH_SECRET || 'admin-refresh-secret-change-in-production';
const ACCESS_TOKEN_TTL = 30 * 60; // 30 minutes
const REFRESH_TOKEN_TTL = 24 * 60 * 60; // 24 hours
const SESSION_INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

interface AdminTokenPayload {
  sub: string;
  adminId: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  iss: 'ADMIN_AUTH';
  aud: 'ADMIN_API';
  sessionId: string;
  mfaVerified: boolean;
  ipAddress?: string;
}

export class AdminAuthService {
  /**
   * Step 1: Validate credentials
   * Returns MFA challenge if MFA is enabled
   */
  async login(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string,
    deviceId?: string
  ): Promise<{
    requiresMfa: boolean;
    mfaSessionToken?: string;
    accessToken?: string;
    refreshToken?: string;
    admin?: Partial<IAdminUser>;
  }> {
    // Rate limit check
    await this.checkRateLimit(email, ipAddress);
    
    // Find admin user
    const admin = await AdminUser.findOne({ email: email.toLowerCase() })
      .select('+passwordHash +mfaSecret');
    
    if (!admin) {
      await this.recordLoginAttempt(email, ipAddress, userAgent, false, 'USER_NOT_FOUND');
      throw new AdminAuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }
    
    // Check account status
    if (admin.status === 'DEACTIVATED') {
      await this.recordLoginAttempt(email, ipAddress, userAgent, false, 'ACCOUNT_DEACTIVATED');
      throw new AdminAuthError('ACCOUNT_DEACTIVATED', 'Account has been deactivated');
    }
    
    if (admin.status === 'LOCKED' && admin.lockedUntil && admin.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((admin.lockedUntil.getTime() - Date.now()) / 1000 / 60);
      throw new AdminAuthError('ACCOUNT_LOCKED', `Account is locked. Try again in ${remainingTime} minutes`);
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, admin.passwordHash);
    
    if (!validPassword) {
      await this.handleFailedLogin(admin, email, ipAddress, userAgent);
      throw new AdminAuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }
    
    // Reset failed attempts on successful password
    if (admin.failedLoginAttempts > 0) {
      admin.failedLoginAttempts = 0;
      admin.lockedUntil = undefined;
      await admin.save();
    }
    
    // Check if MFA is required
    if (admin.mfaEnabled && admin.mfaSecret) {
      // Create MFA session
      const mfaSessionToken = await this.createMFASession(admin._id.toString(), ipAddress, userAgent, deviceId);
      
      return {
        requiresMfa: true,
        mfaSessionToken,
      };
    }
    
    // No MFA - create full session (only for initial setup)
    if (admin.status === 'PENDING_MFA') {
      throw new AdminAuthError('MFA_SETUP_REQUIRED', 'MFA setup is required before first login');
    }
    
    // For accounts without MFA (shouldn't happen in production)
    const { accessToken, refreshToken, session } = await this.createSession(
      admin,
      ipAddress,
      userAgent,
      deviceId,
      false // Not MFA verified
    );
    
    await this.recordLoginAttempt(email, ipAddress, userAgent, true);
    
    return {
      requiresMfa: false,
      accessToken,
      refreshToken,
      admin: this.sanitizeAdmin(admin),
    };
  }
  
  /**
   * Step 2: Verify MFA code
   */
  async verifyMFA(
    mfaSessionToken: string,
    mfaCode: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    admin: Partial<IAdminUser>;
  }> {
    // Verify MFA session token
    let payload: { adminId: string; sessionId: string };
    try {
      payload = jwt.verify(mfaSessionToken, ADMIN_JWT_SECRET) as typeof payload;
    } catch {
      throw new AdminAuthError('INVALID_MFA_SESSION', 'MFA session expired or invalid');
    }
    
    // Find admin with MFA secret
    const admin = await AdminUser.findById(payload.adminId).select('+mfaSecret +mfaBackupCodes');
    
    if (!admin || !admin.mfaSecret) {
      throw new AdminAuthError('INVALID_MFA_SESSION', 'MFA session expired or invalid');
    }
    
    // Verify TOTP code
    const isValidCode = authenticator.verify({
      token: mfaCode,
      secret: admin.mfaSecret,
    });
    
    // Check backup codes if TOTP fails
    let usedBackupCode = false;
    if (!isValidCode && admin.mfaBackupCodes) {
      const hashedCode = crypto.createHash('sha256').update(mfaCode).digest('hex');
      const codeIndex = admin.mfaBackupCodes.indexOf(hashedCode);
      
      if (codeIndex !== -1) {
        // Remove used backup code
        admin.mfaBackupCodes.splice(codeIndex, 1);
        await admin.save();
        usedBackupCode = true;
      }
    }
    
    if (!isValidCode && !usedBackupCode) {
      await this.recordLoginAttempt(admin.email, ipAddress, userAgent, false, 'INVALID_MFA_CODE');
      throw new AdminAuthError('INVALID_MFA_CODE', 'Invalid MFA code');
    }
    
    // Find and update the pending session
    const session = await AdminSession.findById(payload.sessionId);
    if (!session || session.revoked) {
      throw new AdminAuthError('INVALID_MFA_SESSION', 'MFA session expired or invalid');
    }
    
    // Mark MFA as verified
    session.mfaVerified = true;
    session.mfaVerifiedAt = new Date();
    await session.save();
    
    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(admin, session);
    
    // Update last login
    admin.lastLoginAt = new Date();
    admin.lastLoginIP = ipAddress;
    await admin.save();
    
    await this.recordLoginAttempt(admin.email, ipAddress, userAgent, true);
    
    return {
      accessToken,
      refreshToken,
      admin: this.sanitizeAdmin(admin),
    };
  }
  
  /**
   * Setup MFA for a new admin
   */
  async setupMFA(adminId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    const admin = await AdminUser.findById(adminId);
    
    if (!admin) {
      throw new AdminAuthError('ADMIN_NOT_FOUND', 'Admin user not found');
    }
    
    if (admin.mfaEnabled) {
      throw new AdminAuthError('MFA_ALREADY_ENABLED', 'MFA is already enabled');
    }
    
    // Generate secret
    const secret = authenticator.generateSecret();
    
    // Create QR code URL
    const qrCodeUrl = authenticator.keyuri(admin.email, 'Veridex Admin', secret);
    
    // Generate backup codes
    const backupCodes: string[] = [];
    const hashedBackupCodes: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
      hashedBackupCodes.push(crypto.createHash('sha256').update(code).digest('hex'));
    }
    
    // Store temp setup
    await AdminMFASetup.findOneAndUpdate(
      { adminId: admin._id },
      {
        adminId: admin._id,
        tempSecret: secret,
        verified: false,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
      { upsert: true }
    );
    
    // Store hashed backup codes for verification
    admin.mfaBackupCodes = hashedBackupCodes;
    await admin.save();
    
    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }
  
  /**
   * Confirm MFA setup with verification code
   */
  async confirmMFASetup(adminId: string, verificationCode: string): Promise<{ success: boolean }> {
    const setup = await AdminMFASetup.findOne({ adminId, verified: false });
    
    if (!setup) {
      throw new AdminAuthError('MFA_SETUP_NOT_FOUND', 'No pending MFA setup found');
    }
    
    if (setup.expiresAt < new Date()) {
      await setup.deleteOne();
      throw new AdminAuthError('MFA_SETUP_EXPIRED', 'MFA setup has expired. Please start again.');
    }
    
    // Verify the code
    const isValid = authenticator.verify({
      token: verificationCode,
      secret: setup.tempSecret,
    });
    
    if (!isValid) {
      throw new AdminAuthError('INVALID_MFA_CODE', 'Invalid verification code');
    }
    
    // Enable MFA on admin account
    await AdminUser.findByIdAndUpdate(adminId, {
      mfaEnabled: true,
      mfaSecret: setup.tempSecret,
      status: 'ACTIVE',
    });
    
    // Delete setup record
    await setup.deleteOne();
    
    return { success: true };
  }
  
  /**
   * Refresh access token
   */
  async refreshTokens(
    refreshToken: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    let payload: { adminId: string; sessionId: string };
    
    try {
      payload = jwt.verify(refreshToken, ADMIN_JWT_REFRESH_SECRET) as typeof payload;
    } catch {
      throw new AdminAuthError('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
    }
    
    // Find session
    const session = await AdminSession.findById(payload.sessionId);
    
    if (!session || session.revoked || !session.mfaVerified) {
      throw new AdminAuthError('SESSION_INVALID', 'Session is invalid or revoked');
    }
    
    // Check inactivity timeout
    const inactiveTime = Date.now() - session.lastActivityAt.getTime();
    if (inactiveTime > SESSION_INACTIVITY_TIMEOUT) {
      session.revoked = true;
      session.revokedAt = new Date();
      session.revokedReason = 'INACTIVITY_TIMEOUT';
      await session.save();
      throw new AdminAuthError('SESSION_TIMEOUT', 'Session expired due to inactivity');
    }
    
    // Find admin
    const admin = await AdminUser.findById(payload.adminId);
    
    if (!admin || admin.status !== 'ACTIVE') {
      throw new AdminAuthError('ADMIN_NOT_ACTIVE', 'Admin account is not active');
    }
    
    // Update session activity
    session.lastActivityAt = new Date();
    session.ipAddress = ipAddress;
    session.userAgent = userAgent;
    await session.save();
    
    // Generate new tokens
    return this.generateTokens(admin, session);
  }
  
  /**
   * Logout - revoke session
   */
  async logout(sessionId: string, revokedBy?: string): Promise<void> {
    await AdminSession.findByIdAndUpdate(sessionId, {
      revoked: true,
      revokedAt: new Date(),
      revokedReason: 'USER_LOGOUT',
      revokedBy: revokedBy,
    });
  }
  
  /**
   * Logout all sessions for an admin
   */
  async logoutAll(adminId: string, revokedBy?: string): Promise<number> {
    const result = await AdminSession.updateMany(
      { adminId, revoked: false },
      {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: 'LOGOUT_ALL',
        revokedBy: revokedBy,
      }
    );
    
    return result.modifiedCount;
  }
  
  /**
   * Verify admin token
   */
  async verifyToken(token: string): Promise<AdminTokenPayload> {
    try {
      const payload = jwt.verify(token, ADMIN_JWT_SECRET) as AdminTokenPayload;
      
      // Validate required claims
      if (payload.iss !== 'ADMIN_AUTH' || payload.aud !== 'ADMIN_API') {
        throw new AdminAuthError('INVALID_TOKEN', 'Token issuer or audience mismatch');
      }
      
      if (!payload.mfaVerified) {
        throw new AdminAuthError('MFA_NOT_VERIFIED', 'MFA verification required');
      }
      
      // Check session is still valid
      const session = await AdminSession.findById(payload.sessionId);
      
      if (!session || session.revoked) {
        throw new AdminAuthError('SESSION_REVOKED', 'Session has been revoked');
      }
      
      // Update last activity
      session.lastActivityAt = new Date();
      await session.save();
      
      return payload;
    } catch (error) {
      if (error instanceof AdminAuthError) throw error;
      throw new AdminAuthError('INVALID_TOKEN', 'Token verification failed');
    }
  }
  
  // ============================================
  // PRIVATE HELPERS
  // ============================================
  
  private async createMFASession(
    adminId: string,
    ipAddress: string,
    userAgent: string,
    deviceId?: string
  ): Promise<string> {
    const session = await AdminSession.create({
      adminId,
      tokenHash: crypto.randomBytes(32).toString('hex'),
      ipAddress,
      userAgent,
      deviceId,
      mfaVerified: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes for MFA
    });
    
    // Create MFA session token
    return jwt.sign(
      { adminId, sessionId: session._id.toString() },
      ADMIN_JWT_SECRET,
      { expiresIn: '5m' }
    );
  }
  
  private async createSession(
    admin: IAdminUser,
    ipAddress: string,
    userAgent: string,
    deviceId?: string,
    mfaVerified: boolean = false
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    session: typeof AdminSession.prototype;
  }> {
    const session = await AdminSession.create({
      adminId: admin._id,
      tokenHash: crypto.randomBytes(32).toString('hex'),
      ipAddress,
      userAgent,
      deviceId,
      mfaVerified,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL * 1000),
    });
    
    const { accessToken, refreshToken } = await this.generateTokens(admin, session);
    
    // Update session with refresh token hash
    session.refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await session.save();
    
    return { accessToken, refreshToken, session };
  }
  
  private async generateTokens(
    admin: IAdminUser,
    session: typeof AdminSession.prototype
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const permissions = this.getPermissionsForRole(admin.role);
    
    const accessToken = jwt.sign(
      {
        sub: admin._id.toString(),
        adminId: admin._id.toString(),
        email: admin.email,
        name: `${admin.firstName} ${admin.lastName}`,
        role: admin.role,
        permissions,
        iss: 'ADMIN_AUTH',
        aud: 'ADMIN_API',
        sessionId: session._id.toString(),
        mfaVerified: session.mfaVerified,
        ipAddress: session.ipAddress,
      } as AdminTokenPayload,
      ADMIN_JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );
    
    const refreshToken = jwt.sign(
      {
        adminId: admin._id.toString(),
        sessionId: session._id.toString(),
      },
      ADMIN_JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_TTL }
    );
    
    return { accessToken, refreshToken };
  }
  
  private getPermissionsForRole(role: string): string[] {
    // Import from roles-permissions package in real implementation
    const rolePermissions: Record<string, string[]> = {
      SUPER_ADMIN: ['*'], // Full access
      ADMIN: [
        'org.read', 'org.review', 'org.approve', 'org.reject',
        'doc.read', 'doc.review', 'doc.approve', 'doc.reject', 'doc.override',
        'compliance.read', 'compliance.review', 'compliance.approve', 'compliance.reject',
        'product.read', 'product.review', 'product.suspend', 'product.reactivate',
        'batch.read', 'batch.review', 'batch.approve', 'batch.reject',
        'rules.read', 'rules.history',
        'audit.read', 'audit.export',
        'admin.user.read',
        'settings.read',
        'notifications.read', 'notifications.create',
        'reports.compliance', 'reports.analytics',
      ],
      COMPLIANCE_REVIEWER: [
        'org.read',
        'doc.read', 'doc.review', 'doc.approve', 'doc.reject', 'doc.request_resubmit',
        'compliance.read', 'compliance.review', 'compliance.approve', 'compliance.reject',
        'product.read',
        'batch.read', 'batch.review', 'batch.approve', 'batch.reject',
        'rules.read',
        'audit.read',
        'notifications.read',
        'reports.compliance',
      ],
      VIEWER: [
        'org.read', 'doc.read', 'compliance.read', 'product.read',
        'batch.read', 'rules.read', 'audit.read', 'notifications.read',
        'reports.compliance', 'reports.analytics',
      ],
    };
    
    return rolePermissions[role] || [];
  }
  
  private async checkRateLimit(email: string, ipAddress: string): Promise<void> {
    const windowStart = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes
    
    // Check attempts by IP
    const ipAttempts = await AdminLoginAttempt.countDocuments({
      ipAddress,
      success: false,
      timestamp: { $gte: windowStart },
    });
    
    if (ipAttempts >= 20) {
      throw new AdminAuthError('RATE_LIMITED', 'Too many login attempts. Please try again later.');
    }
    
    // Check attempts by email
    const emailAttempts = await AdminLoginAttempt.countDocuments({
      email: email.toLowerCase(),
      success: false,
      timestamp: { $gte: windowStart },
    });
    
    if (emailAttempts >= MAX_FAILED_ATTEMPTS) {
      throw new AdminAuthError('RATE_LIMITED', 'Too many login attempts for this account.');
    }
  }
  
  private async handleFailedLogin(
    admin: IAdminUser,
    email: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    admin.failedLoginAttempts += 1;
    
    if (admin.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      admin.status = 'LOCKED';
      admin.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
    }
    
    await admin.save();
    await this.recordLoginAttempt(email, ipAddress, userAgent, false, 'INVALID_PASSWORD');
  }
  
  private async recordLoginAttempt(
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    await AdminLoginAttempt.create({
      email: email.toLowerCase(),
      ipAddress,
      success,
      failureReason,
      userAgent,
    });
  }
  
  private sanitizeAdmin(admin: IAdminUser): Partial<IAdminUser> {
    return {
      _id: admin._id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      status: admin.status,
      mfaEnabled: admin.mfaEnabled,
      lastLoginAt: admin.lastLoginAt,
    };
  }
}

export const adminAuthService = new AdminAuthService();
