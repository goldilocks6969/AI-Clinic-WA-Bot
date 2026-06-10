import type { WhatsAppProvider, WebhookVerification } from '../provider.js';
import type { InboundMessage, MediaRef, OutboundMessage } from '../types.js';
import { parseMetaShaped } from './twofactor.js';

// Stub for talking to Meta's WhatsApp Cloud API directly (or 360dialog, which is
// byte-compatible). parseInbound is already correct (shared Meta parser); send +
// downloadMedia are left for when/if we bring WhatsApp in-house. Kept so the
// provider swap is a config change, not a rewrite.
export class MetaProvider implements WhatsAppProvider {
  readonly name = 'meta';

  verifyWebhook(): WebhookVerification {
    throw new Error('MetaProvider not implemented yet');
  }

  parseInbound(body: unknown): InboundMessage[] {
    return parseMetaShaped(body);
  }

  async send(): Promise<void> {
    throw new Error('MetaProvider.send not implemented yet');
  }

  async downloadMedia(_ref: MediaRef): Promise<{ data: Buffer; mimeType: string }> {
    throw new Error('MetaProvider.downloadMedia not implemented yet');
  }
}

export type { OutboundMessage };
