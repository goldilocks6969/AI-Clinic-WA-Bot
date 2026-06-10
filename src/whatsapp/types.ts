// Canonical internal message shapes. These mirror the Meta WhatsApp Cloud API,
// so the meta/360dialog adapters are near-identity and only the 2Factor adapter
// may need real translation once its real payload is confirmed.

export interface MediaRef {
  id: string;
  mimeType?: string;
  filename?: string;
}

export interface InboundText {
  kind: 'text';
  from: string; // sender wa phone, digits only (E.164 without +)
  messageId: string;
  text: string;
}

export interface InboundInteractive {
  kind: 'interactive';
  from: string;
  messageId: string;
  replyId: string; // the id of the chosen button/list row
  title?: string;
}

export interface InboundMedia {
  kind: 'media';
  from: string;
  messageId: string;
  media: MediaRef;
  caption?: string;
}

export interface InboundUnknown {
  kind: 'unknown';
  from: string;
  messageId: string;
  raw?: unknown;
}

export type InboundMessage = InboundText | InboundInteractive | InboundMedia | InboundUnknown;

// Outbound — built by conversation handlers, rendered by the provider adapter.
export interface Button {
  id: string;
  title: string; // <= 20 chars (WhatsApp limit)
}

export interface ListRow {
  id: string;
  title: string; // <= 24 chars
  description?: string;
}

export interface ListSection {
  title?: string;
  rows: ListRow[];
}

export type OutboundMessage =
  | { kind: 'text'; text: string }
  | { kind: 'buttons'; body: string; buttons: Button[] } // up to 3 reply buttons
  | { kind: 'list'; body: string; buttonText: string; sections: ListSection[] };

export const text = (t: string): OutboundMessage => ({ kind: 'text', text: t });
export const buttons = (body: string, b: Button[]): OutboundMessage => ({ kind: 'buttons', body, buttons: b });
export const list = (body: string, buttonText: string, sections: ListSection[]): OutboundMessage => ({
  kind: 'list',
  body,
  buttonText,
  sections,
});
