export interface Slot {
  iso: string; // UTC ISO timestamp
  label: string; // human label in IST
}

// Generate candidate appointment slots over the next few days (IST), independent
// of any slots table — booked times are filtered out by the caller.
export function generateSlots(daysAhead = 3, hours = [10, 12, 16]): Slot[] {
  const slots: Slot[] = [];
  const now = new Date();
  for (let d = 1; d <= daysAhead; d++) {
    const base = new Date(now.getTime());
    base.setUTCDate(base.getUTCDate() + d);
    const y = base.getUTCFullYear();
    const mo = base.getUTCMonth();
    const day = base.getUTCDate();
    for (const h of hours) {
      // h:00 IST (UTC+5:30) -> subtract 5h30m to get the UTC instant.
      const dt = new Date(Date.UTC(y, mo, day, h - 5, -30));
      slots.push({ iso: dt.toISOString(), label: formatIst(dt) });
    }
  }
  return slots;
}

export function formatIst(dt: Date): string {
  return dt.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}
