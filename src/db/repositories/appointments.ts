import { query } from '../pool.js';
import type { Appointment } from '../types.js';

export async function create(input: {
  clinicId: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string; // ISO timestamp
}): Promise<Appointment> {
  const rows = await query<Appointment>(
    `insert into appointments (clinic_id, patient_id, doctor_id, scheduled_at)
       values ($1, $2, $3, $4)
     returning *`,
    [input.clinicId, input.patientId, input.doctorId, input.scheduledAt],
  );
  return rows[0]!;
}

export async function listUpcomingByPatient(clinicId: string, patientId: string): Promise<Appointment[]> {
  return query<Appointment>(
    `select * from appointments
      where clinic_id = $1 and patient_id = $2 and scheduled_at >= now() and status = 'booked'
      order by scheduled_at`,
    [clinicId, patientId],
  );
}

// Times already booked for a doctor (to filter offered slots).
export async function bookedTimesForDoctor(clinicId: string, doctorId: string): Promise<Set<string>> {
  const rows = await query<{ scheduled_at: string }>(
    `select scheduled_at from appointments
      where clinic_id = $1 and doctor_id = $2 and scheduled_at >= now() and status = 'booked'`,
    [clinicId, doctorId],
  );
  return new Set(rows.map((r) => new Date(r.scheduled_at).toISOString()));
}
