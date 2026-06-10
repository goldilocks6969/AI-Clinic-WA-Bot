import { query } from '../pool.js';
import type { Prescription } from '../types.js';

// Read-only for the bot (doctor side writes these).
export async function listByPatient(clinicId: string, patientId: string, limit = 5): Promise<Prescription[]> {
  return query<Prescription>(
    `select * from prescriptions
      where clinic_id = $1 and patient_id = $2
      order by created_at desc
      limit $3`,
    [clinicId, patientId, limit],
  );
}
