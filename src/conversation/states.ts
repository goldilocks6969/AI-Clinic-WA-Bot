export const States = {
  START: 'START',
  PROFILE_NAME: 'PROFILE_NAME',
  PROFILE_DOB: 'PROFILE_DOB',
  PROFILE_GENDER: 'PROFILE_GENDER',
  MENU: 'MENU',
  REPORT_WAIT: 'REPORT_WAIT',
  BOOK_DOCTOR: 'BOOK_DOCTOR',
  BOOK_SLOT: 'BOOK_SLOT',
  SWITCH_CLINIC: 'SWITCH_CLINIC',
} as const;

export type StateName = (typeof States)[keyof typeof States];

// States where the user is past onboarding (global "menu" command is allowed).
export const ONBOARDED_STATES: ReadonlySet<string> = new Set([
  States.MENU,
  States.REPORT_WAIT,
  States.BOOK_DOCTOR,
  States.BOOK_SLOT,
  States.SWITCH_CLINIC,
]);
