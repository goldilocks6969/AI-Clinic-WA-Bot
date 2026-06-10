import type { InboundMessage, MediaRef, OutboundMessage } from './types';

export interface WebhookVerification {
  ok: boolean;
  challenge?: string;
}

// A WhatsApp provider adapter. All provider-specific quirks live behind this.
export interface WhatsAppProvider {
  readonly name: string;

  // GET handshake when the provider verifies the webhook URL.
  verifyWebhook(query: Record<string, unknown>): WebhookVerification;

  // Normalize a raw inbound webhook body into canonical messages.
  parseInbound(body: unknown): InboundMessage[];

  // Send a canonical outbound message to a wa phone (digits only).
  send(to: string, message: OutboundMessage): Promise<void>;

  // Resolve + download inbound media (image / pdf).
  downloadMedia(ref: MediaRef): Promise<{ data: Buffer; mimeType: string }>;
}
