import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtUser } from './types';

export function verifyToken(token: string): JwtUser {
  return jwt.verify(token, env.JWT_SECRET) as JwtUser;
}
