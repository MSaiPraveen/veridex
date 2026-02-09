import { Role } from '@veridex/roles-permissions';

export interface JwtUser {
  // Common fields
  sub?: string;         // userId (subject claim)
  id?: string;          // Alternative user ID field
  role: Role | string;
  email?: string;
  iat?: number;
  exp?: number;
  
  // Regular user fields
  orgId?: string;
  organizationId?: string;
  
  // Admin user fields (from admin tokens)
  adminId?: string;
  name?: string;
  permissions?: string[];
  mfaVerified?: boolean;
  sessionId?: string;
  iss?: string;         // Issuer: 'ADMIN_AUTH' for admin tokens
  aud?: string;         // Audience: 'ADMIN_API' for admin tokens
}
