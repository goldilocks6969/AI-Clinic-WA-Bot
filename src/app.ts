import Fastify, { type FastifyInstance } from 'fastify';
import { healthRoutes } from './routes/health.js';
import { webhookRoutes } from './routes/webhook.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
  });

  app.register(healthRoutes);
  app.register(webhookRoutes);

  return app;
}
