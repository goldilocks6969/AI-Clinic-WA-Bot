import { config, requireConfig } from '../../config.js';
import type { WhatsAppProvider, WebhookVerification } from '../provider.js';
import type { InboundMessage, MediaRef, OutboundMessage } from '../types.js';
import { parseMetaShaped, toMetaSendBody } from './twofactor.js';

const GRAPH = 'https://graph.facebook.com';

// Meta WhatsApp Cloud API (direct). 360dialog is byte-compatible and can reuse this.
// Requires env: META_ACCESS_TOKEN, META_PHONE_NUMBER_ID (+ optional META_API_VERSION).
export class MetaProvider implements WhatsAppProvider {
  readonly name = 'meta';

  verifyWebhook(query: Record<string, unknown>): WebhookVerification {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    if (mode === 'subscribe' && token === config.WEBHOOK_VERIFY_TOKEN) {
      return { ok: true, challenge: typeof challenge === 'string' ? challenge : undefined };
    }
    return { ok: false };
  }

  parseInbound(body: unknown): InboundMessage[] {
    return parseMetaShaped(body);
  }

  async send(to: string, message: OutboundMessage): Promise<void> {
    const token = requireConfig('META_ACCESS_TOKEN');
    const phoneId = requireConfig('META_PHONE_NUMBER_ID');
    const url = `${GRAPH}/${config.META_API_VERSION}/${phoneId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(toMetaSendBody(to, message)),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Meta send failed: ${res.status} ${errBody}`);
    }
  }

  async downloadMedia(ref: MediaRef): Promise<{ data: Buffer; mimeType: string }> {
    const token = requireConfig('META_ACCESS_TOKEN');
    const metaRes = await fetch(`${GRAPH}/${config.META_API_VERSION}/${ref.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) throw new Error(`media lookup failed: ${metaRes.status}`);
    const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
    if (!meta.url) throw new Error('media url missing in Meta response');
    const fileRes = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` } });
    if (!fileRes.ok) throw new Error(`media download failed: ${fileRes.status}`);
    const data = Buffer.from(await fileRes.arrayBuffer());
    return { data, mimeType: meta.mime_type || ref.mimeType || 'application/octet-stream' };
  }
}
