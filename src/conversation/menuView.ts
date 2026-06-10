import * as patients from '../db/repositories/patients.js';
import { list, text, type OutboundMessage } from '../whatsapp/types.js';
import { States } from './states.js';
import type { HandlerResult, Session } from './types.js';

export async function buildMenuMessage(session: Session): Promise<OutboundMessage> {
  const memberships = await patients.listMembershipsByPhone(session.waPhone);
  const rows = [
    { id: 'menu_report', title: 'Upload report', description: 'Share a lab report or scan' },
    { id: 'menu_book', title: 'Book appointment', description: 'See a doctor' },
    { id: 'menu_record', title: 'My health record', description: 'Profile, reports & visits' },
  ];
  if (memberships.length > 1) {
    rows.push({ id: 'menu_switch', title: 'Switch clinic', description: 'Change active clinic' });
  }
  rows.push({ id: 'menu_help', title: 'Help', description: 'How this works' });
  return list('What would you like to do?', 'Open menu', [{ rows }]);
}

export async function showMenu(session: Session, prefix?: string): Promise<HandlerResult> {
  const replies: OutboundMessage[] = [];
  if (prefix) replies.push(text(prefix));
  replies.push(await buildMenuMessage(session));
  return { replies, next: { state: States.MENU } };
}
