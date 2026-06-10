import { query } from '../pool.js';

// Returns true if this is the first time we've seen the message id (i.e. process it),
// false if it was already processed (providers may redeliver the same webhook).
export async function markProcessed(providerMessageId: string, waPhone: string): Promise<boolean> {
  if (!providerMessageId) return true; // nothing to dedupe on; process it
  const rows = await query<{ provider_message_id: string }>(
    `insert into bot_processed_messages (provider_message_id, wa_phone)
       values ($1, $2)
     on conflict (provider_message_id) do nothing
     returning provider_message_id`,
    [providerMessageId, waPhone],
  );
  return rows.length > 0;
}
