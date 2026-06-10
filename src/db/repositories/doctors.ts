import { query } from '../pool.js';
import type { Doctor } from '../types.js';

export async function listByClinic(clinicId: string): Promise<Doctor[]> {
  return query<Doctor>(
    `select doctor_id, clinic_id, name, specialty, status
       from doctors
      where clinic_id = $1 and status = 'active'
      order by name`,
    [clinicId],
  );
}

export async function getById(clinicId: string, doctorId: string): Promise<Doctor | null> {
  const rows = await query<Doctor>(
    `select doctor_id, clinic_id, name, specialty, status
       from doctors where clinic_id = $1 and doctor_id = $2 limit 1`,
    [clinicId, doctorId],
  );
  return rows[0] ?? null;
}
