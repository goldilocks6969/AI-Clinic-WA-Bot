import * as patients from '../../db/repositories/patients.js';
import { list, text, type ListRow } from '../../whatsapp/types.js';
import { States } from '../states.js';
import { showMenu } from '../menuView.js';
import type { HandlerResult, Input, Session } from '../types.js';

export async function startSwitch(session: Session): Promise<HandlerResult> {
  const memberships = await patients.listMembershipsByPhone(session.waPhone);
  if (memberships.length <= 1) {
    return showMenu(session, "You're only a member of one clinic right now.");
  }
  const rows: ListRow[] = memberships.map((m) => ({
    id: `clinic_${m.clinic_id}`,
    title: m.clinic_name.slice(0, 24),
    description: m.clinic_code,
  }));
  return {
    replies: [list('Which clinic do you want to use?', 'Choose clinic', [{ rows }])],
    next: { state: States.SWITCH_CLINIC },
  };
}

export async function handleSwitchClinic(input: Input, session: Session): Promise<HandlerResult> {
  const clinicId = input.replyId?.startsWith('clinic_') ? input.replyId.slice(7) : null;
  if (!clinicId) {
    return { replies: [text('Please pick a clinic from the list, or type *menu*.')] };
  }
  const memberships = await patients.listMembershipsByPhone(session.waPhone);
  const chosen = memberships.find((m) => m.clinic_id === clinicId);
  if (!chosen) {
    return { replies: [text('That clinic is not in your list. Please choose again.')] };
  }
  const updated: Session = {
    ...session,
    activeClinicId: chosen.clinic_id,
    activePatientId: chosen.patient_id,
  };
  const menu = await showMenu(updated, `Now using *${chosen.clinic_name}* ✅`);
  return {
    replies: menu.replies,
    next: { state: States.MENU, activeClinicId: chosen.clinic_id, activePatientId: chosen.patient_id },
  };
}
