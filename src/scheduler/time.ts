// Pure date/time helpers for the Scheduler. No Prisma, no I/O — see
// types.ts's header comment for why.

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// FixedCommitment.dayOfWeek is 0 (Sunday) - 6 (Saturday); SchedulerInput's
// weekStart is always a Monday. Returns the day offset from weekStart to
// that weekday within the same week.
export function offsetFromMonday(dayOfWeek: number): number {
  return (dayOfWeek + 6) % 7;
}

// Combines a day (only its year/month/date are used) with an "HH:mm" time
// string into a concrete Date.
export function combineDateAndTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(day);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
