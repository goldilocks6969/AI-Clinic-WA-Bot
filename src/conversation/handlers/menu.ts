import { States } from '../states.js';
import { buildMenuMessage, showMenu } from '../menuView.js';
import { startReport } from './reports.js';
import { startBooking } from './appointments.js';
import { startSwitch } from './switch.js';
import { renderRecord } from './record.js';
import { helpMessage } from './onboarding.js';
import type { HandlerResult, Input, Session } from '../types.js';

// Map both list/button selections and typed keywords to a menu action.
function resolveAction(input: Input): string | null {
  const id = input.replyId;
  if (id?.startsWith('menu_')) return id.slice(5);
  const t = input.text?.toLowerCase().trim();
  if (!t) return null;
  if (t.includes('report')) return 'report';
  if (t.includes('book') || t.includes('appoint')) return 'book';
  if (t.includes('record')) return 'record';
  if (t.includes('switch')) return 'switch';
  if (t === 'help') return 'help';
  return null;
}

export async function handleMenu(input: Input, session: Session): Promise<HandlerResult> {
  switch (resolveAction(input)) {
    case 'report':
      return startReport(session);
    case 'book':
      return startBooking(session);
    case 'record':
      return {
        replies: [await renderRecord(session), await buildMenuMessage(session)],
        next: { state: States.MENU },
      };
    case 'switch':
      return startSwitch(session);
    case 'help':
      return helpMessage(session);
    default:
      return showMenu(session, "I didn't catch that. Pick an option from the menu:");
  }
}
