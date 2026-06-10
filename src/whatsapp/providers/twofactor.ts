import { config } from '../../config.js';
import type { WhatsAppProvider, WebhookVerification } from '../provider.js';
import type { InboundMessage, MediaRef, OutboundMessage } from '../types.js';

// 2Factor WhatsApp Business adapter.
//
// 2Factor resells Meta's Cloud API, so we parse/produce Meta Cloud API shapes as
// the canonical wire format. The exact 2Factor webhook payload + send endpoint are
// not publicly documented (behind login) — the three constants below + the parser
// are the ONLY things to confirm/adjust during the 2Factor trial (see plan M4).
//
// When TWOFACTOR_API_KEY is unset, send() logs instead of calling HTTP, so the
// local simulator and tests run end-to-end without any provider credentials.

const SEND_PATH = '/whatsapp/messages'; // TODO(M4): confirm real 2Factor send endpoint
const MEDIA_PATH = '/whatsapp/media'; //    TODO(M4): confirm real 2Factor media endpoint

export class TwoFactorProvider implements WhatsAppProvider {
  readonly name = 'twofactor';

  verifyWebhook(query: Record<string, unknown>): WebhookVerification {
    // Meta-style subscribe handshake. 2Factor may differ — confirm in trial.
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    if (mode === 'subscribe' && token === config.WEBHOOK_VERIFY_TOKEN) {
      return { ok: true, challenge: typeof challenge === 'string' ? challenge : undefined };
    }
    // Some providers just GET the URL for liveness; don't hard-fail.
    return { ok: true };
  }

  parseInbound(body: unknown): InboundMessage[] {
    return parseMetaShaped(body);
  }

  async send(to: string, message: OutboundMessage): Promise<void> {
    const payload = toMetaSendBody(to, message);
    if (!config.TWOFACTOR_API_KEY) {
      // Log mode — no credentials configured.
      // eslint-disable-next-line no-console
      console.log(`[wa:log] -> ${to}:`, JSON.stringify(payload));
      return;
    }
    const res = await fetch(`${config.TWOFACTOR_BASE_URL}${SEND_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO(M4): confirm real 2Factor auth header (API key in header vs path).
        Authorization: `Bearer ${config.TWOFACTOR_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`2Factor send failed: ${res.status} ${errBody}`);
    }
  }

  async downloadMedia(ref: MediaRef): Promise<{ data: Buffer; mimeType: string }> {
    if (!config.TWOFACTOR_API_KEY) {
      throw new Error('downloadMedia requires TWOFACTOR_API_KEY');
    }
    // Meta-style: GET media metadata -> follow url -> download with auth.
    const metaRes = await fetch(`${config.TWOFACTOR_BASE_URL}${MEDIA_PATH}/${ref.id}`, {
      headers: { Authorization: `Bearer ${config.TWOFACTOR_API_KEY}` },
    });
    if (!metaRes.ok) throw new Error(`media lookup failed: ${metaRes.status}`);
    const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
    if (!meta.url) throw new Error('media url missing in provider response');
    const fileRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${config.TWOFACTOR_API_KEY}` },
    });
    if (!fileRes.ok) throw new Error(`media download failed: ${fileRes.status}`);
    const data = Buffer.from(await fileRes.arrayBuffer());
    return { data, mimeType: meta.mime_type || ref.mimeType || 'application/octet-stream' };
  }
}

// ---- Meta Cloud API shape helpers (shared by meta/360dialog providers later) ----

interface MetaWebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<Record<string, any>>;
      };
    }>;
  }>;
}

export function parseMetaShaped(body: unknown): InboundMessage[] {
  const out: InboundMessage[] = [];
  const b = body as MetaWebhookBody;
  const entries = b?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      for (const m of change.value?.messages ?? []) {
        const from = String(m.from ?? '');
        const messageId = String(m.id ?? '');
        if (!from || !messageId) continue;
        switch (m.type) {
          case 'text':
            out.push({ kind: 'text', from, messageId, text: String(m.text?.body ?? '') });
            break;
          case 'interactive': {
            const br = m.interactive?.button_reply;
            const lr = m.interactive?.list_reply;
            const chosen = br ?? lr;
            out.push({
              kind: 'interactive',
              from,
              messageId,
              replyId: String(chosen?.id ?? ''),
              title: chosen?.title ? String(chosen.title) : undefined,
            });
            break;
          }
          case 'image':
          case 'document':
          case 'audio':
          case 'video': {
            const media = m[m.type];
            out.push({
              kind: 'media',
              from,
              messageId,
              media: {
                id: String(media?.id ?? ''),
                mimeType: media?.mime_type ? String(media.mime_type) : undefined,
                filename: media?.filename ? String(media.filename) : undefined,
              },
              caption: media?.caption ? String(media.caption) : undefined,
            });
            break;
          }
          default:
            out.push({ kind: 'unknown', from, messageId, raw: m });
        }
      }
    }
  }
  return out;
}

export function toMetaSendBody(to: string, message: OutboundMessage): Record<string, unknown> {
  const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to };
  switch (message.kind) {
    case 'text':
      return { ...base, type: 'text', text: { body: message.text } };
    case 'buttons':
      return {
        ...base,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: message.body },
          action: {
            buttons: message.buttons.map((b) => ({
              type: 'reply',
              reply: { id: b.id, title: b.title.slice(0, 20) },
            })),
          },
        },
      };
    case 'list':
      return {
        ...base,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text: message.body },
          action: {
            button: message.buttonText.slice(0, 20),
            sections: message.sections.map((s) => ({
              title: s.title,
              rows: s.rows.map((r) => ({
                id: r.id,
                title: r.title.slice(0, 24),
                description: r.description,
              })),
            })),
          },
        },
      };
  }
}
