import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PasswordResetModel, IPasswordReset } from '../domain/password-reset.entity';
import { EmailVerificationModel, IEmailVerification } from '../domain/email-verification.entity';
import { UserRepo } from '../repositories/user.repository';
import { InvalidTokenError, UserNotFoundError } from '../errors/auth.errors';

const BCRYPT_ROUNDS = 12;
const PASSWORD_RESET_EXPIRY_HOURS = 1;
const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;

/**
 * Password Reset Service
 * 
 * Handles:
 * - Generating password reset tokens
 * - Validating reset tokens
 * - Resetting passwords
 */
export const PasswordResetService = {
  /**
   * Generate a password reset token for a user
   * Returns the token (to be sent via email) and the reset record
   */
  async createResetToken(email: string): Promise<{ token: string; userId: string } | null> {
    // Find user by email
    const user = await UserRepo.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists - return null silently
      return null;
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_EXPIRY_HOURS);

    // Invalidate any existing tokens for this user
    await PasswordResetModel.deleteMany({ userId: user._id });

    // Create new reset token
    await PasswordResetModel.create({
      userId: user._id,
      token: tokenHash,
      expiresAt,
    });

    return {
      token, // Plain token to send to user
      userId: String(user._id),
    };
  },

  /**
   * Validate a password reset token
   */
  async validateToken(token: string): Promise<IPasswordReset | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await PasswordResetModel.findOne({
      token: tokenHash,
      expiresAt: { $gt: new Date() },
      usedAt: { $exists: false },
    });

    return resetRecord;
  },

  /**
   * Reset password using a valid token
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await PasswordResetModel.findOne({
      token: tokenHash,
      expiresAt: { $gt: new Date() },
      usedAt: { $exists: false },
    });

    if (!resetRecord) {
      throw new InvalidTokenError('Invalid or expired reset token');
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update user's password
    const updated = await UserRepo.update(String(resetRecord.userId), { password: newPassword } as any);
    if (!updated) {
      throw new UserNotFoundError();
    }

    // Mark token as used
    resetRecord.usedAt = new Date();
    await resetRecord.save();

    // Invalidate all refresh tokens for this user (force re-login)
    // This is handled by the calling code

    return true;
  },
};

/**
 * Email Verification Service
 * 
 * Handles:
 * - Generating verification tokens for new users
 * - Verifying email addresses
 * - Resending verification emails
 */
export const EmailVerificationService = {
  /**
   * Create a verification token for a new user
   */
  async createVerificationToken(userId: string, email: string): Promise<string> {
    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + EMAIL_VERIFICATION_EXPIRY_HOURS);

    // Invalidate any existing tokens for this user
    await EmailVerificationModel.deleteMany({ userId });

    // Create new verification token
    await EmailVerificationModel.create({
      userId,
      email,
      token: tokenHash,
      expiresAt,
    });

    return token; // Plain token to send to user
  },

  /**
   * Verify email using token
   */
  async verifyEmail(token: string): Promise<{ userId: string; email: string }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const verification = await EmailVerificationModel.findOne({
      token: tokenHash,
      expiresAt: { $gt: new Date() },
      verifiedAt: { $exists: false },
    });

    if (!verification) {
      throw new InvalidTokenError('Invalid or expired verification token');
    }

    // Mark email as verified in user record
    const user = await UserRepo.update(String(verification.userId), { emailVerified: true });
    if (!user) {
      throw new UserNotFoundError();
    }

    // Mark token as used
    verification.verifiedAt = new Date();
    await verification.save();

    return {
      userId: String(verification.userId),
      email: verification.email,
    };
  },

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<{ token: string; userId: string } | null> {
    const user = await UserRepo.findByEmail(email);
    if (!user) {
      return null;
    }

    if (user.emailVerified) {
      return null; // Already verified
    }

    const token = await this.createVerificationToken(String(user._id), user.email);
    return { token, userId: String(user._id) };
  },
};
