import * as clinics from '../../db/repositories/clinics.js';
import * as patients from '../../db/repositories/patients.js';
import { buttons, text, type OutboundMessage } from '../../whatsapp/types.js';
import { States, ONBOARDED_STATES } from '../states.js';
import { showMenu } from '../menuView.js';
import type { HandlerResult, Input, Session } from '../types.js';

const JOIN_RE = /^\s*join\s+([a-z0-9][a-z0-9\-]*)\s*$/i;

export function parseJoinCode(s: string | null): string | null {
  if (!s) return null;
  const m = s.match(JOIN_RE);
  return m ? m[1]!.toUpperCase() : null;
}

export async function startPrompt(reset = false): Promise<HandlerResult> {
  const body =
    'Welcome to *PaperPlane* 👋\n\n' +
    "I'm your clinic's WhatsApp assistant. To get started, join your clinic by sending its code, e.g. *JOIN PPC-MUM*, or scan the QR code your clinic gave you.";
  return {
    replies: [text(body)],
    next: reset
      ? { state: States.START, activeClinicId: null, activePatientId: null, context: {} }
      : { state: States.START },
  };
}

export async function helpMessage(session: Session): Promise<HandlerResult> {
  const help =
    '*PaperPlane help*\n\n' +
    '• *JOIN <code>* — join a clinic\n' +
    '• *menu* — show the main menu\n' +
    '• *restart* — start over\n\n' +
    'From the menu you can upload reports, book appointments, and view your health record.';
  if (session.activeClinicId && ONBOARDED_STATES.has(session.state)) {
    return showMenu(session, help);
  }
  return { replies: [text(help)] };
}

export async function handleJoin(code: string, session: Session): Promise<HandlerResult> {
  const clinic = await clinics.findByCode(code);
  if (!clinic) {
    return {
      replies: [
        text(
          `Hmm, I couldn't find a clinic with code *${code}*. Please double-check the code and try again, or scan your clinic's QR code.`,
        ),
      ],
    };
  }

  const patient = await patients.findOrCreate(clinic.clinic_id, session.waPhone);
  const updated: Session = {
    ...session,
    activeClinicId: clinic.clinic_id,
    activePatientId: patient.patient_id,
  };

  if (patient.full_name) {
    // Returning patient — straight to the menu.
    const menu = await showMenu(updated, `Welcome back to *${clinic.name}* 👋`);
    return {
      replies: menu.replies,
      next: {
        state: States.MENU,
        activeClinicId: clinic.clinic_id,
        activePatientId: patient.patient_id,
      },
    };
  }

  return {
    replies: [
      text(
        `You've joined *${clinic.name}* ✅\n\nLet's set up your profile. What's your *full name*?`,
      ),
    ],
    next: {
      state: States.PROFILE_NAME,
      activeClinicId: clinic.clinic_id,
      activePatientId: patient.patient_id,
      context: {},
    },
  };
}

export async function handleProfileName(input: Input, session: Session): Promise<HandlerResult> {
  const name = input.text?.trim();
  if (!name || name.length < 2) {
    return { replies: [text('Please tell me your *full name* so we can set up your profile.')] };
  }
  await patients.updateProfile(session.activeClinicId!, session.activePatientId!, { full_name: name });
  return {
    replies: [text(`Thanks, ${name.split(' ')[0]}! What's your *date of birth*? (DD/MM/YYYY)`)],
    next: { state: States.PROFILE_DOB },
  };
}

export async function handleProfileDob(input: Input, session: Session): Promise<HandlerResult> {
  const dob = parseDob(input.text);
  if (!dob) {
    return { replies: [text('Please send your date of birth as *DD/MM/YYYY*, e.g. 14/03/1990.')] };
  }
  await patients.updateProfile(session.activeClinicId!, session.activePatientId!, { dob });
  return {
    replies: [genderButtons()],
    next: { state: States.PROFILE_GENDER },
  };
}

export async function handleProfileGender(input: Input, session: Session): Promise<HandlerResult> {
  const g = genderFromInput(input);
  if (!g) {
    return { replies: [genderButtons('Please choose your gender:')] };
  }
  await patients.updateProfile(session.activeClinicId!, session.activePatientId!, { gender: g });
  return showMenu(session, 'Your profile is all set ✅');
}

// ---- helpers ----

function genderButtons(body = "Lastly, what's your gender?"): OutboundMessage {
  return buttons(body, [
    { id: 'gender_male', title: 'Male' },
    { id: 'gender_female', title: 'Female' },
    { id: 'gender_other', title: 'Other' },
  ]);
}

function genderFromInput(input: Input): string | null {
  const id = input.replyId;
  if (id === 'gender_male') return 'male';
  if (id === 'gender_female') return 'female';
  if (id === 'gender_other') return 'other';
  const t = input.text?.toLowerCase();
  if (t === 'male' || t === 'm') return 'male';
  if (t === 'female' || t === 'f') return 'female';
  if (t === 'other' || t === 'o') return 'other';
  return null;
}

export function parseDob(s: string | null): string | null {
  if (!s) return null;
  const v = s.trim();
  // YYYY-MM-DD
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return isoDate(+m[1]!, +m[2]!, +m[3]!);
  // DD/MM/YYYY or DD-MM-YYYY
  m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return isoDate(+m[3]!, +m[2]!, +m[1]!);
  return null;
}

function isoDate(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  if (y < 1900 || dt.getTime() > Date.now()) return null;
  return `${y.toString().padStart(4, '0')}-${mo.toString().padStart(2, '0')}-${d
    .toString()
    .padStart(2, '0')}`;
}
