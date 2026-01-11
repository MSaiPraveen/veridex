import { 
  signAccessToken, 
  signRefreshToken, 
  verifyRefreshToken,
  getRefreshTokenExpiresIn,
  TokenPayload,
} from '../config/jwt';
import { IUser } from '../domain/user.entity';
import { RefreshTokenRepo } from '../repositories/refresh-token.repository';
import { InvalidTokenError } from '../errors/auth.errors';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface TokenContext {
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Generate access and refresh tokens for a user
 */
export async function generateTokens(
  user: IUser,
  context?: TokenContext
): Promise<AuthTokens> {
  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    sub: String(user._id),
    role: user.role,
    email: user.email,
    orgId: user.organizationId,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Calculate expiration date for refresh token
  const expiresAt = new Date(Date.now() + getRefreshTokenExpiresIn() * 1000);

  // Store refresh token in database
  await RefreshTokenRepo.create({
    userId: String(user._id),
    token: refreshToken,
    expiresAt,
    userAgent: context?.userAgent,
    ipAddress: context?.ipAddress,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
    tokenType: 'Bearer',
  };
}

/**
 * Refresh tokens using a valid refresh token
 * Implements token rotation - old token is revoked, new one is issued
 */
export async function refreshTokens(
  refreshToken: string,
  context?: TokenContext
): Promise<AuthTokens> {
  // Verify the refresh token cryptographically
  const payload = verifyRefreshToken(refreshToken);

  // Check if token exists and is not revoked in database
  const storedToken = await RefreshTokenRepo.findValidToken(refreshToken);
  if (!storedToken) {
    throw new InvalidTokenError('Refresh token has been revoked or does not exist');
  }

  // Revoke the old refresh token (token rotation)
  await RefreshTokenRepo.revokeToken(refreshToken);

  // Generate new tokens - preserve orgId from original token
  const newPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
    sub: payload.sub,
    role: payload.role,
    email: payload.email,
    orgId: payload.orgId,
  };

  const newAccessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken(newPayload);

  // Calculate expiration date for new refresh token
  const expiresAt = new Date(Date.now() + getRefreshTokenExpiresIn() * 1000);

  // Store new refresh token
  await RefreshTokenRepo.create({
    userId: payload.sub,
    token: newRefreshToken,
    expiresAt,
    userAgent: context?.userAgent,
    ipAddress: context?.ipAddress,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: 900,
    tokenType: 'Bearer',
  };
}

/**
 * Revoke a specific refresh token (logout from one device)
 */
export async function revokeToken(refreshToken: string): Promise<boolean> {
  const result = await RefreshTokenRepo.revokeToken(refreshToken);
  return result !== null;
}

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 */
export async function revokeAllUserTokens(userId: string): Promise<number> {
  return RefreshTokenRepo.revokeAllUserTokens(userId);
}
