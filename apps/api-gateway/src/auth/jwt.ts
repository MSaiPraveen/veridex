import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtUser } from './types';

/**
 * Verify a regular user JWT token
 */
export function verifyToken(token: string): JwtUser {
  return jwt.verify(token, env.JWT_SECRET) as JwtUser;
}

/**
 * Verify an admin JWT token
 */
export function verifyAdminToken(token: string): JwtUser {
  return jwt.verify(token, env.ADMIN_JWT_SECRET) as JwtUser;
}

/**
 * Try to verify token with either secret
 * Admin tokens use ADMIN_JWT_SECRET, regular tokens use JWT_SECRET
 */
export function verifyAnyToken(token: string): JwtUser | null {
  // First try admin token (for admin routes)
  try {
    const payload = jwt.verify(token, env.ADMIN_JWT_SECRET) as any;
    // Admin tokens have iss: 'ADMIN_AUTH'
    if (payload.iss === 'ADMIN_AUTH') {
      return {
        sub: payload.sub || payload.adminId,  // Set sub for consistency
        id: payload.sub || payload.adminId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        mfaVerified: payload.mfaVerified,
        organizationId: payload.organizationId,
        permissions: payload.permissions,
      } as JwtUser;
    }
  } catch {
    // Not an admin token, try regular
  }
  
  // Then try regular user token
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtUser;
  } catch {
    return null;
  }
}
