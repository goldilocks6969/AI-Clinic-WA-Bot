import { query } from '../pool.js';
import type { ConversationState } from '../types.js';

export async function get(waPhone: string): Promise<ConversationState | null> {
  const rows = await query<ConversationState>(
    `select * from bot_conversation_state where wa_phone = $1 limit 1`,
    [waPhone],
  );
  return rows[0] ?? null;
}

export async function upsert(s: {
  waPhone: string;
  state: string;
  activeClinicId?: string | null;
  activePatientId?: string | null;
  context?: Record<string, unknown>;
}): Promise<ConversationState> {
  const rows = await query<ConversationState>(
    `insert into bot_conversation_state (wa_phone, state, active_clinic_id, active_patient_id, context, updated_at)
       values ($1, $2, $3, $4, $5::jsonb, now())
     on conflict (wa_phone) do update set
       state             = excluded.state,
       active_clinic_id  = excluded.active_clinic_id,
       active_patient_id = excluded.active_patient_id,
       context           = excluded.context,
       updated_at        = now()
     returning *`,
    [
      s.waPhone,
      s.state,
      s.activeClinicId ?? null,
      s.activePatientId ?? null,
      JSON.stringify(s.context ?? {}),
    ],
  );
  return rows[0]!;
}
