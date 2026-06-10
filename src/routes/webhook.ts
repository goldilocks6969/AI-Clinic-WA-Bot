import type { FastifyInstance } from 'fastify';
import { getProvider } from '../whatsapp/index.js';
import { dispatch } from '../conversation/router.js';

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  const provider = getProvider();

  // Provider webhook verification handshake.
  app.get('/api/webhook', async (req, reply) => {
    const result = provider.verifyWebhook((req.query as Record<string, unknown>) ?? {});
    if (result.ok) {
      return reply.code(200).send(result.challenge ?? 'ok');
    }
    return reply.code(403).send('forbidden');
  });

  // Inbound messages.
  app.post('/api/webhook', async (req, reply) => {
    const messages = provider.parseInbound(req.body);
    for (const message of messages) {
      try {
        await dispatch(message);
      } catch (err) {
        req.log.error({ err, from: message.from }, 'dispatch failed');
      }
    }
    return reply.code(200).send({ received: messages.length });
  });
}
