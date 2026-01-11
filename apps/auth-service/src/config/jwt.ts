import { sign, verify, Secret, JwtPayload, SignOptions } from 'jsonwebtoken';
import { env } from './env';
import { InvalidTokenError, TokenExpiredError } from '../errors/auth.errors';

const accessSecret: Secret = env.JWT_ACCESS_SECRET;
const refreshSecret: Secret = env.JWT_REFRESH_SECRET;

export interface TokenPayload extends JwtPayload {
  sub: string;
  role: string;
  email?: string;
  orgId?: string;
}

// Parse TTL string to seconds for expiration calculation
function parseTTLToSeconds(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15 minutes
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 900;
  }
}

export const getAccessTokenExpiresIn = (): number => 
  parseTTLToSeconds(env.ACCESS_TOKEN_TTL);

export const getRefreshTokenExpiresIn = (): number => 
  parseTTLToSeconds(env.REFRESH_TOKEN_TTL);

export const signAccessToken = (payload: Omit<TokenPayload, 'iat' | 'exp'>): string => {
  const options: SignOptions = {
    expiresIn: getAccessTokenExpiresIn(),
    issuer: 'veridex-auth',
    audience: 'veridex-api',
  };
  return sign(payload, accessSecret, options);
};

export const signRefreshToken = (payload: Omit<TokenPayload, 'iat' | 'exp'>): string => {
  const options: SignOptions = {
    expiresIn: getRefreshTokenExpiresIn(),
    issuer: 'veridex-auth',
    audience: 'veridex-api',
  };
  return sign(payload, refreshSecret, options);
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return verify(token, accessSecret, {
      issuer: 'veridex-auth',
      audience: 'veridex-api',
    }) as TokenPayload;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw new TokenExpiredError();
    }
    throw new InvalidTokenError();
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return verify(token, refreshSecret, {
      issuer: 'veridex-auth',
      audience: 'veridex-api',
    }) as TokenPayload;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw new TokenExpiredError('Refresh token has expired');
    }
    throw new InvalidTokenError('Invalid refresh token');
  }
};
