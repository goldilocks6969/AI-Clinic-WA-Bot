// Drives the conversation engine end-to-end with no WhatsApp/provider creds.
// Feeds Meta-shaped inbound webhooks through the real router and prints the
// outbound replies (captured from log mode), then summarizes the data created.

import { dispatch } from '../src/conversation/router.js';
import { parseMetaShaped } from '../src/whatsapp/providers/twofactor.js';
import { query, closePool } from '../src/db/pool.js';

let seq = 0;
function inbound(from: string, body: unknown): unknown {
  seq += 1;
  return {
    entry: [{ changes: [{ value: { messages: [{ ...(body as object), from, id: `wamid.SIM${seq}` }] } }] }],
  };
}
const textMsg = (from: string, t: string) => inbound(from, { type: 'text', text: { body: t } });
const listMsg = (from: string, id: string) =>
  inbound(from, { type: 'interactive', interactive: { list_reply: { id } } });
const btnMsg = (from: string, id: string) =>
  inbound(from, { type: 'interactive', interactive: { button_reply: { id } } });
const mediaMsg = (from: string, id: string, mime: string) =>
  inbound(from, { type: 'image', image: { id, mime_type: mime } });

// Capture outbound (log-mode) messages so we can print a readable transcript.
const sent: Array<{ to: string; text: string }> = [];
const origLog = console.log;
console.log = (...args: unknown[]) => {
  const first = String(args[0] ?? '');
  if (first.startsWith('[wa:log] ->')) {
    const to = first.replace('[wa:log] -> ', '').replace(':', '');
    try {
      const payload = JSON.parse(String(args[1]));
      sent.push({ to, text: describe(payload) });
    } catch {
      /* ignore */
    }
    return;
  }
  origLog(...args);
};

function describe(p: any): string {
  if (p.type === 'text') return p.text.body;
  if (p.type === 'interactive') {
    const i = p.interactive;
    if (i.type === 'button') return `${i.body.text}  [${i.action.buttons.map((b: any) => b.reply.title).join(' | ')}]`;
    if (i.type === 'list') {
      const rows = i.action.sections.flatMap((s: any) => s.rows.map((r: any) => `${r.id}=${r.title}`));
      return `${i.body.text}  {${rows.join(' | ')}}`;
    }
  }
  return JSON.stringify(p);
}

async function feed(raw: unknown, label: string): Promise<void> {
  const before = sent.length;
  for (const m of parseMetaShaped(raw)) await dispatch(m);
  const replies = sent.slice(before);
  origLog(`\n  USER ${label}`);
  for (const r of replies) origLog(`  BOT  ${r.text.replace(/\n/g, '\n       ')}`);
}

async function pickSlotId(from: string): Promise<string> {
  // The slot list was the last list sent to this user; grab its first row id.
  const last = [...sent].reverse().find((s) => s.to === from && s.text.includes('slot_'));
  const m = last?.text.match(/slot_\d+/);
  return m ? m[0] : 'slot_0';
}
async function firstId(from: string, prefix: string): Promise<string> {
  const last = [...sent].reverse().find((s) => s.to === from && s.text.includes(`${prefix}_`));
  const m = last?.text.match(new RegExp(`${prefix}_[A-Za-z0-9-]+`));
  return m ? m[0] : `${prefix}_0`;
}

async function runPatient(phone: string, clinicCode: string, name: string): Promise<void> {
  origLog(`\n══════ ${name} (${phone}) → ${clinicCode} ══════`);
  await feed(textMsg(phone, 'hi'), '"hi"');
  await feed(textMsg(phone, `JOIN ${clinicCode}`), `"JOIN ${clinicCode}"`);
  await feed(textMsg(phone, name), `"${name}"`);
  await feed(textMsg(phone, '14/03/1990'), '"14/03/1990"');
  await feed(btnMsg(phone, 'gender_female'), '[Female]');
  // Upload a report
  await feed(listMsg(phone, 'menu_report'), '[Upload report]');
  await feed(mediaMsg(phone, `MEDIA-${phone}`, 'image/jpeg'), '<sends report photo>');
  // Book an appointment
  await feed(listMsg(phone, 'menu_book'), '[Book appointment]');
  const docId = await firstId(phone, 'doc');
  await feed(listMsg(phone, docId), `[${docId}]`);
  const slotId = await pickSlotId(phone);
  await feed(listMsg(phone, slotId), `[${slotId}]`);
  // View record
  await feed(listMsg(phone, 'menu_record'), '[My health record]');
}

async function main(): Promise<void> {
  // Clean prior simulated rows so the run is repeatable.
  await query(`delete from bot_processed_messages where provider_message_id like 'wamid.SIM%'`);
  await query(`delete from appointments where patient_id in (select patient_id from patients where wa_phone like '91999%')`);
  await query(`delete from reports where patient_id in (select patient_id from patients where wa_phone like '91999%')`);
  await query(`delete from bot_conversation_state where wa_phone like '91999%'`);
  await query(`delete from patients where wa_phone like '91999%'`);

  await runPatient('919990000001', 'PPC-MUM', 'Asha Verma');
  await runPatient('919990000002', 'PPC-DEL', 'Rohan Gupta');
  await runPatient('919990000003', 'PPC-BLR', 'Meera Krishnan');
  // Same person joining a second clinic (multi-tenant membership).
  await runPatient('919990000001', 'PPC-BLR', 'Asha Verma');

  // ---- Data summary: prove buckets-of-data per clinic ----
  origLog('\n\n================ DATA SUMMARY (per clinic) ================');
  const summary = await query<{ clinic_code: string; name: string; patients: string; reports: string; appointments: string }>(
    `select c.clinic_code, c.name,
            count(distinct p.patient_id) as patients,
            count(distinct r.report_id) as reports,
            count(distinct a.appointment_id) as appointments
       from clinics c
       left join patients p on p.clinic_id = c.clinic_id and p.wa_phone like '91999%'
       left join reports r on r.patient_id = p.patient_id
       left join appointments a on a.patient_id = p.patient_id
      group by c.clinic_code, c.name
      order by c.clinic_code`,
  );
  for (const s of summary) {
    origLog(`  ${s.clinic_code}  ${s.name}`);
    origLog(`      patients=${s.patients}  reports=${s.reports}  appointments=${s.appointments}`);
  }

  // ---- Isolation check ----
  const leak = await query<{ n: string }>(
    `select count(*)::int as n
       from patients p
       join reports r on r.patient_id = p.patient_id
      where r.clinic_id <> p.clinic_id`,
  );
  origLog(`\n  Cross-tenant leak check (reports whose clinic_id != patient clinic_id): ${leak[0]!.n}  ${Number(leak[0]!.n) === 0 ? '✅' : '❌'}`);

  await closePool();
}

await main();
