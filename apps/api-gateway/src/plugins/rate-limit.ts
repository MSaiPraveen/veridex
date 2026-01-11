import { FastifyPluginAsync } from 'fastify';
import { redis } from '../config/redis';

const WINDOW_SEC = 60;
const MAX_REQ = 100;

export const rateLimitPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (req) => {
    const key = `rl:${req.ip}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, WINDOW_SEC);
    }

    if (count > MAX_REQ) {
      throw new Error('Rate limit exceeded');
    }
  });
};
