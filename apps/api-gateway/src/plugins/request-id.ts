import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';

export const requestIdPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (req) => {
    req.headers['x-request-id'] =
      req.headers['x-request-id'] ||
      crypto.randomUUID();
  });
};
