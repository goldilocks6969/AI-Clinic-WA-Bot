import type { InboundMessage, OutboundMessage } from '../whatsapp/types.js';

export interface Session {
  waPhone: string;
  state: string;
  activeClinicId: string | null;
  activePatientId: string | null;
  context: Record<string, any>;
}

export interface Input {
  message: InboundMessage;
  text: string | null; // trimmed text for text messages
  replyId: string | null; // id of chosen button/list row
}

export interface NextState {
  state?: string;
  activeClinicId?: string | null;
  activePatientId?: string | null;
  context?: Record<string, any>;
}

export interface HandlerResult {
  replies: OutboundMessage[];
  next?: NextState;
}

export type Handler = (input: Input, session: Session) => Promise<HandlerResult>;
