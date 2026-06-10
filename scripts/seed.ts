import { config } from '../src/config.js';
import { getPool, closePool, query } from '../src/db/pool.js';

const DEMO_CLINICS = [
  {
    code: 'PPC-DEL',
    name: 'PaperPlane Clinic — Delhi',
    doctors: [
      { name: 'Dr. Aarti Sharma', specialty: 'General Physician' },
      { name: 'Dr. Vikram Mehta', specialty: 'Cardiology' },
    ],
  },
  {
    code: 'PPC-MUM',
    name: 'PaperPlane Clinic — Mumbai',
    doctors: [
      { name: 'Dr. Sneha Iyer', specialty: 'Pediatrics' },
      { name: 'Dr. Rahul Desai', specialty: 'Dermatology' },
    ],
  },
  {
    code: 'PPC-BLR',
    name: 'PaperPlane Clinic — Bengaluru',
    doctors: [
      { name: 'Dr. Priya Nair', specialty: 'General Physician' },
      { name: 'Dr. Arjun Rao', specialty: 'Orthopedics' },
    ],
  },
];

function qrLink(code: string): string {
  const num = config.WHATSAPP_BUSINESS_NUMBER;
  return `https://wa.me/${num}?text=${encodeURIComponent(`JOIN ${code}`)}`;
}

getPool();

for (const c of DEMO_CLINICS) {
  const clinicRows = await query<{ clinic_id: string }>(
    `insert into clinics (clinic_code, name, qr_link)
       values ($1, $2, $3)
     on conflict (clinic_code) do update set name = excluded.name, qr_link = excluded.qr_link
     returning clinic_id`,
    [c.code, c.name, qrLink(c.code)],
  );
  const clinicId = clinicRows[0]!.clinic_id;

  const existing = await query<{ n: string }>(`select count(*)::int as n from doctors where clinic_id = $1`, [
    clinicId,
  ]);
  if (Number(existing[0]!.n) === 0) {
    for (const d of c.doctors) {
      await query(`insert into doctors (clinic_id, name, specialty) values ($1, $2, $3)`, [
        clinicId,
        d.name,
        d.specialty,
      ]);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`✓ ${c.code}  ${c.name}`);
  // eslint-disable-next-line no-console
  console.log(`   join: ${qrLink(c.code)}`);
}

// eslint-disable-next-line no-console
console.log('\nSeeded 3 demo clinics. Patients join by sending the code (e.g. "JOIN PPC-MUM") or scanning the QR link above.');
await closePool();
