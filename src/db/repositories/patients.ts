import { query } from '../pool.js';
import type { Patient } from '../types.js';

export async function findByPhoneAndClinic(clinicId: string, waPhone: string): Promise<Patient | null> {
  const rows = await query<Patient>(
    `select * from patients where clinic_id = $1 and wa_phone = $2 limit 1`,
    [clinicId, waPhone],
  );
  return rows[0] ?? null;
}

// All clinic memberships for a phone number (a person can belong to many clinics).
export async function listMembershipsByPhone(
  waPhone: string,
): Promise<Array<Patient & { clinic_name: string; clinic_code: string }>> {
  return query(
    `select p.*, c.name as clinic_name, c.clinic_code
       from patients p
       join clinics c on c.clinic_id = p.clinic_id
      where p.wa_phone = $1
      order by p.created_at`,
    [waPhone],
  );
}

export async function findOrCreate(clinicId: string, waPhone: string): Promise<Patient> {
  const rows = await query<Patient>(
    `insert into patients (clinic_id, wa_phone)
       values ($1, $2)
     on conflict (clinic_id, wa_phone) do update set wa_phone = excluded.wa_phone
     returning *`,
    [clinicId, waPhone],
  );
  return rows[0]!;
}

export async function updateProfile(
  clinicId: string,
  patientId: string,
  fields: { full_name?: string; dob?: string; gender?: string },
): Promise<Patient> {
  const rows = await query<Patient>(
    `update patients
        set full_name = coalesce($3, full_name),
            dob       = coalesce($4, dob),
            gender    = coalesce($5, gender)
      where clinic_id = $1 and patient_id = $2
      returning *`,
    [clinicId, patientId, fields.full_name ?? null, fields.dob ?? null, fields.gender ?? null],
  );
  return rows[0]!;
}
