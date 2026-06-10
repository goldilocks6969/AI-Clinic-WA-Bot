-- PaperPlane WhatsApp bot — REFERENCE schema (the bot's DB contract).
--
-- You own the real, complete production schema. The bot depends only on the
-- tables/columns below; map them in src/db/repositories/* if your names differ.
-- Every domain table carries clinic_id (tenant key). Tenant isolation is enforced
-- in the repository layer (every query filters clinic_id) since the bot connects
-- as a trusted server, not an end-user session.

create table if not exists clinics (
  clinic_id   uuid primary key default gen_random_uuid(),
  clinic_code text unique not null,
  name        text not null,
  qr_link     text,
  status      text not null default 'active',
  created_at  timestamptz not null default now()
);

create table if not exists doctors (
  doctor_id  uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references clinics(clinic_id),
  name       text not null,
  specialty  text,
  status     text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists patients (
  patient_id uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references clinics(clinic_id),
  wa_phone   text not null,
  full_name  text,
  dob        date,
  gender     text,
  status     text not null default 'active',
  created_at timestamptz not null default now(),
  unique (clinic_id, wa_phone)
);

create table if not exists appointments (
  appointment_id uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references clinics(clinic_id),
  patient_id     uuid not null references patients(patient_id),
  doctor_id      uuid references doctors(doctor_id),
  scheduled_at   timestamptz not null,
  status         text not null default 'booked',
  created_at     timestamptz not null default now()
);

create table if not exists reports (
  report_id   uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references clinics(clinic_id),
  patient_id  uuid not null references patients(patient_id),
  file_key    text not null,            -- object-storage key (file lives in S3 / Spaces)
  file_type   text,
  source      text default 'whatsapp',
  uploaded_at timestamptz not null default now()
);

-- Written by the DOCTOR side (read-only for the bot) — included so "My record" can show them.
create table if not exists consultations (
  consultation_id uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references clinics(clinic_id),
  patient_id      uuid not null references patients(patient_id),
  doctor_id       uuid references doctors(doctor_id),
  appointment_id  uuid references appointments(appointment_id),
  transcript      text,
  soap_note       text,
  created_at      timestamptz not null default now()
);

create table if not exists prescriptions (
  prescription_id uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references clinics(clinic_id),
  patient_id      uuid not null references patients(patient_id),
  consultation_id uuid references consultations(consultation_id),
  content         text,
  created_at      timestamptz not null default now()
);

-- Bot-operational tables.
create table if not exists bot_conversation_state (
  wa_phone          text primary key,
  active_clinic_id  uuid references clinics(clinic_id),
  active_patient_id uuid references patients(patient_id),
  state             text not null default 'START',
  context           jsonb not null default '{}'::jsonb,
  updated_at        timestamptz not null default now()
);

create table if not exists bot_processed_messages (
  provider_message_id text primary key,
  wa_phone            text,
  received_at         timestamptz not null default now()
);

create index if not exists idx_doctors_clinic       on doctors(clinic_id);
create index if not exists idx_patients_clinic       on patients(clinic_id);
create index if not exists idx_patients_wa           on patients(wa_phone);
create index if not exists idx_appointments_patient  on appointments(clinic_id, patient_id);
create index if not exists idx_reports_patient       on reports(clinic_id, patient_id);
create index if not exists idx_prescriptions_patient on prescriptions(clinic_id, patient_id);
