export interface Clinic {
  clinic_id: string;
  clinic_code: string;
  name: string;
  qr_link: string | null;
  status: string;
  created_at: string;
}

export interface Doctor {
  doctor_id: string;
  clinic_id: string;
  name: string;
  specialty: string | null;
  status: string;
}

export interface Patient {
  patient_id: string;
  clinic_id: string;
  wa_phone: string;
  full_name: string | null;
  dob: string | null;
  gender: string | null;
  status: string;
  created_at: string;
}

export interface Appointment {
  appointment_id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string | null;
  scheduled_at: string;
  status: string;
  created_at: string;
}

export interface Report {
  report_id: string;
  clinic_id: string;
  patient_id: string;
  file_key: string;
  file_type: string | null;
  source: string | null;
  uploaded_at: string;
}

export interface Prescription {
  prescription_id: string;
  clinic_id: string;
  patient_id: string;
  consultation_id: string | null;
  content: string | null;
  created_at: string;
}

export interface ConversationState {
  wa_phone: string;
  active_clinic_id: string | null;
  active_patient_id: string | null;
  state: string;
  context: Record<string, unknown>;
  updated_at: string;
}
