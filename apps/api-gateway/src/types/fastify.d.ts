import 'fastify';
import { JwtUser } from '../auth/types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtUser;
  }
}
