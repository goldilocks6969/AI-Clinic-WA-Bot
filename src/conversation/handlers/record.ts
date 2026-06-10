import * as clinics from '../../db/repositories/clinics.js';
import * as patients from '../../db/repositories/patients.js';
import * as reports from '../../db/repositories/reports.js';
import * as appointments from '../../db/repositories/appointments.js';
import * as prescriptions from '../../db/repositories/prescriptions.js';
import { text, type OutboundMessage } from '../../whatsapp/types.js';
import { formatIst } from '../slots.js';
import type { Session } from '../types.js';

export async function renderRecord(session: Session): Promise<OutboundMessage> {
  const clinicId = session.activeClinicId!;
  const [clinic, patient, reportRows, upcoming, rx] = await Promise.all([
    clinics.getById(clinicId),
    patients.findByPhoneAndClinic(clinicId, session.waPhone),
    reports.listByPatient(clinicId, session.activePatientId!),
    appointments.listUpcomingByPatient(clinicId, session.activePatientId!),
    prescriptions.listByPatient(clinicId, session.activePatientId!),
  ]);

  const lines: string[] = [];
  lines.push(`🪪 *Your record — ${clinic?.name ?? 'Clinic'}*`);
  lines.push('');
  lines.push(`*Name:* ${patient?.full_name ?? '—'}`);
  lines.push(`*DOB:* ${patient?.dob ? formatDate(patient.dob) : '—'}`);
  lines.push(`*Gender:* ${patient?.gender ? cap(patient.gender) : '—'}`);

  lines.push('');
  lines.push(`*Reports* (${reportRows.length})`);
  if (reportRows.length === 0) lines.push('  • none yet');
  else for (const r of reportRows.slice(0, 5)) lines.push(`  • ${formatDate(r.uploaded_at)} — ${r.file_type ?? 'file'}`);

  lines.push('');
  lines.push(`*Upcoming appointments* (${upcoming.length})`);
  if (upcoming.length === 0) lines.push('  • none');
  else for (const a of upcoming) lines.push(`  • ${formatIst(new Date(a.scheduled_at))}`);

  lines.push('');
  lines.push(`*Prescriptions* (${rx.length})`);
  if (rx.length === 0) lines.push('  • none yet');
  else for (const p of rx.slice(0, 5)) lines.push(`  • ${formatDate(p.created_at)} — ${truncate(p.content ?? '', 40)}`);

  return text(lines.join('\n'));
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
