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

export interface Interval {
  start: Date;
  end: Date;
}

// Finds the first free `durationMs` window inside [windowStart, windowEnd),
// not overlapping any interval in `busy`, ending no later than `notAfter`
// (defaults to windowEnd). Shared by hard-constraints.ts and
// routine-placement.ts so "search this window for room" behaves the same
// way everywhere in the Scheduler.
export function findFreeInterval(
  windowStart: Date,
  windowEnd: Date,
  durationMs: number,
  busy: Interval[],
  notAfter: Date = windowEnd,
): Interval | null {
  const effectiveEnd = notAfter < windowEnd ? notAfter : windowEnd;
  const relevantBusy = busy
    .filter((interval) => overlaps(windowStart, windowEnd, interval.start, interval.end))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let candidateStart = windowStart;
  for (const interval of relevantBusy) {
    const candidateEnd = new Date(candidateStart.getTime() + durationMs);
    if (candidateEnd <= interval.start && candidateEnd <= effectiveEnd) {
      return { start: candidateStart, end: candidateEnd };
    }
    if (interval.end > candidateStart) {
      candidateStart = interval.end;
    }
  }

  const candidateEnd = new Date(candidateStart.getTime() + durationMs);
  if (candidateEnd <= effectiveEnd) {
    return { start: candidateStart, end: candidateEnd };
  }
  return null;
}
