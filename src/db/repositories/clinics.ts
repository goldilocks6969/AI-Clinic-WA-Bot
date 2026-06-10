import { query } from '../pool.js';
import type { Clinic } from '../types.js';

export async function findByCode(clinicCode: string): Promise<Clinic | null> {
  const rows = await query<Clinic>(
    `select * from clinics where upper(clinic_code) = upper($1) and status = 'active' limit 1`,
    [clinicCode],
  );
  return rows[0] ?? null;
}

export async function getById(clinicId: string): Promise<Clinic | null> {
  const rows = await query<Clinic>(`select * from clinics where clinic_id = $1 limit 1`, [clinicId]);
  return rows[0] ?? null;
}
