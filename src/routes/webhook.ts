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
    // DIAGNOSTIC: log the raw payload so we can confirm 2Factor's real shape.
    req.log.info({ rawBody: req.body }, 'INBOUND_WEBHOOK_RAW');

    let messages;
    try {
      messages = provider.parseInbound(req.body);
    } catch (err) {
      req.log.error({ err }, 'parseInbound failed');
      return reply.code(200).send({ received: 0, parseError: true });
    }
    req.log.info({ count: messages.length, from: messages.map((m) => m.from) }, 'INBOUND_PARSED');

    for (const message of messages) {
      try {
        await dispatch(message);
      } catch (err) {
        req.log.error({ err: String(err), from: message.from }, 'DISPATCH_FAILED');
      }
    }
    return reply.code(200).send({ received: messages.length });
  });
}
