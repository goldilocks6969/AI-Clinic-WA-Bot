import { getProvider } from '../whatsapp/index.js';
import { text, type InboundMessage } from '../whatsapp/types.js';
import * as stateRepo from '../db/repositories/state.js';
import * as dedupe from '../db/repositories/dedupe.js';
import { States, ONBOARDED_STATES } from './states.js';
import type { HandlerResult, Input, Session } from './types.js';
import {
  parseJoinCode,
  handleJoin,
  handleProfileName,
  handleProfileDob,
  handleProfileGender,
  startPrompt,
  helpMessage,
} from './handlers/onboarding.js';
import { handleMenu } from './handlers/menu.js';
import { handleReportWait } from './handlers/reports.js';
import { handleBookDoctor, handleBookSlot } from './handlers/appointments.js';
import { handleSwitchClinic } from './handlers/switch.js';
import { showMenu } from './menuView.js';

function toInput(message: InboundMessage): Input {
  return {
    message,
    text: message.kind === 'text' ? message.text.trim() : null,
    replyId: message.kind === 'interactive' ? message.replyId : null,
  };
}

function loadSession(
  from: string,
  existing: Awaited<ReturnType<typeof stateRepo.get>>,
): Session {
  if (!existing) {
    return { waPhone: from, state: States.START, activeClinicId: null, activePatientId: null, context: {} };
  }
  return {
    waPhone: from,
    state: existing.state,
    activeClinicId: existing.active_clinic_id,
    activePatientId: existing.active_patient_id,
    context: existing.context ?? {},
  };
}

export async function dispatch(message: InboundMessage): Promise<void> {
  const provider = getProvider();
  const from = message.from;

  // Idempotency: providers may redeliver the same webhook.
  const fresh = await dedupe.markProcessed(message.messageId, from);
  if (!fresh) return;

  const session = loadSession(from, await stateRepo.get(from));
  const input = toInput(message);

  let result: HandlerResult;
  try {
    result = await route(input, session);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('handler error', err);
    result = { replies: [text('Something went wrong on our side. Please type *menu* to try again.')] };
  }

  // Persist next state (undefined fields fall back to current session values).
  const next = result.next ?? {};
  await stateRepo.upsert({
    waPhone: from,
    state: next.state ?? session.state,
    activeClinicId: next.activeClinicId !== undefined ? next.activeClinicId : session.activeClinicId,
    activePatientId: next.activePatientId !== undefined ? next.activePatientId : session.activePatientId,
    context: next.context !== undefined ? next.context : session.context,
  });

  for (const reply of result.replies) {
    await provider.send(from, reply);
  }
}

async function route(input: Input, session: Session): Promise<HandlerResult> {
  const lowered = input.text?.toLowerCase().trim() ?? '';

  // ---- Global commands (work from most states) ----
  const joinCode = parseJoinCode(input.text);
  if (joinCode) return handleJoin(joinCode, session);

  if (lowered === 'restart' || lowered === 'reset') return startPrompt(true);
  if (lowered === 'help') return helpMessage(session);
  if (lowered === 'menu') {
    if (session.activeClinicId && ONBOARDED_STATES.has(session.state)) return showMenu(session);
    if (!session.activeClinicId) return startPrompt();
  }

  // ---- Per-state routing ----
  switch (session.state) {
    case States.PROFILE_NAME:
      return handleProfileName(input, session);
    case States.PROFILE_DOB:
      return handleProfileDob(input, session);
    case States.PROFILE_GENDER:
      return handleProfileGender(input, session);
    case States.MENU:
      return handleMenu(input, session);
    case States.REPORT_WAIT:
      return handleReportWait(input, session);
    case States.BOOK_DOCTOR:
      return handleBookDoctor(input, session);
    case States.BOOK_SLOT:
      return handleBookSlot(input, session);
    case States.SWITCH_CLINIC:
      return handleSwitchClinic(input, session);
    default:
      return startPrompt();
  }
}
