import { query } from '../pool.js';
import type { Report } from '../types.js';

export async function create(input: {
  clinicId: string;
  patientId: string;
  fileKey: string;
  fileType?: string;
}): Promise<Report> {
  const rows = await query<Report>(
    `insert into reports (clinic_id, patient_id, file_key, file_type)
       values ($1, $2, $3, $4)
     returning *`,
    [input.clinicId, input.patientId, input.fileKey, input.fileType ?? null],
  );
  return rows[0]!;
}

export async function listByPatient(clinicId: string, patientId: string, limit = 10): Promise<Report[]> {
  return query<Report>(
    `select * from reports
      where clinic_id = $1 and patient_id = $2
      order by uploaded_at desc
      limit $3`,
    [clinicId, patientId, limit],
  );
}
