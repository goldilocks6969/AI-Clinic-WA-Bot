import * as doctors from '../../db/repositories/doctors.js';
import * as appointments from '../../db/repositories/appointments.js';
import { list, text, type ListRow } from '../../whatsapp/types.js';
import { generateSlots, formatIst, type Slot } from '../slots.js';
import { States } from '../states.js';
import { showMenu } from '../menuView.js';
import type { HandlerResult, Input, Session } from '../types.js';

export async function startBooking(session: Session): Promise<HandlerResult> {
  const docs = await doctors.listByClinic(session.activeClinicId!);
  if (docs.length === 0) {
    return showMenu(session, 'No doctors are available at this clinic yet.');
  }
  const rows: ListRow[] = docs.slice(0, 10).map((d) => ({
    id: `doc_${d.doctor_id}`,
    title: d.name.slice(0, 24),
    description: d.specialty ?? undefined,
  }));
  return {
    replies: [list('Which doctor would you like to see?', 'Choose doctor', [{ rows }])],
    next: { state: States.BOOK_DOCTOR, context: {} },
  };
}

export async function handleBookDoctor(input: Input, session: Session): Promise<HandlerResult> {
  const doctorId = input.replyId?.startsWith('doc_') ? input.replyId.slice(4) : null;
  if (!doctorId) {
    return { replies: [text('Please pick a doctor from the list, or type *menu* to go back.')] };
  }
  const doctor = await doctors.getById(session.activeClinicId!, doctorId);
  if (!doctor) {
    return { replies: [text('That doctor is not available. Please choose again, or type *menu*.')] };
  }

  const booked = await appointments.bookedTimesForDoctor(session.activeClinicId!, doctorId);
  const slots = generateSlots().filter((s) => !booked.has(s.iso)).slice(0, 10);
  if (slots.length === 0) {
    return showMenu(session, `Sorry, ${doctor.name} has no open slots in the next few days.`);
  }

  const rows: ListRow[] = slots.map((s, i) => ({ id: `slot_${i}`, title: s.label.slice(0, 24) }));
  return {
    replies: [list(`Pick a time with *${doctor.name}*:`, 'Choose time', [{ rows }])],
    next: { state: States.BOOK_SLOT, context: { doctorId, doctorName: doctor.name, slots } },
  };
}

export async function handleBookSlot(input: Input, session: Session): Promise<HandlerResult> {
  const idx = input.replyId?.startsWith('slot_') ? Number(input.replyId.slice(5)) : NaN;
  const slots = (session.context.slots as Slot[] | undefined) ?? [];
  const slot = Number.isInteger(idx) ? slots[idx] : undefined;
  if (!slot) {
    return { replies: [text('Please pick a time from the list, or type *menu* to go back.')] };
  }

  await appointments.create({
    clinicId: session.activeClinicId!,
    patientId: session.activePatientId!,
    doctorId: session.context.doctorId as string,
    scheduledAt: slot.iso,
  });

  const confirm = `✅ Appointment booked with *${session.context.doctorName}* on *${formatIst(
    new Date(slot.iso),
  )}*.`;
  return {
    replies: (await showMenu(session, confirm)).replies,
    next: { state: States.MENU, context: {} },
  };
}
