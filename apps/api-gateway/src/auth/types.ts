import { Role } from '@veridex/roles-permissions';

export interface JwtUser {
  sub: string;          // userId
  role: Role;
  orgId?: string;
  iat: number;
  exp: number;
}
