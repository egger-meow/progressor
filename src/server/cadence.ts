// Shared cadence/timing vocabulary and validation for anything that
// recurs like a Routine (Routine itself, and CategoryItemSchedule) — pure
// functions, no Prisma import, same "shared helper, separate entity"
// pattern as tags.ts. Extracted from routines.ts: Routine and
// CategoryItemSchedule are the same shape solving the same "which day(s),
// which time window" problem, unlike FixedCommitment/DeadlineTask (which
// are deliberately kept separate because their fields *and* placement
// algorithms genuinely differ).

export type RoutineCadence = "daily" | "weekly" | "monthly";
export type TimeOfDayPreference = "morning" | "afternoon" | "evening" | "night";

export const VALID_CADENCES: RoutineCadence[] = ["daily", "weekly", "monthly"];
export const VALID_TIME_OF_DAY: TimeOfDayPreference[] = [
  "morning",
  "afternoon",
  "evening",
  "night",
];

export const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

// `label` names the owning concept in the error message (defaults to
// "Routine" — this helper was extracted from routines.ts, and
// routines.test.ts pins that exact wording); category-item-schedules.ts
// passes its own label.
export function assertValidCadence(
  cadence: string,
  label = "Routine",
): asserts cadence is RoutineCadence {
  if (!VALID_CADENCES.includes(cadence as RoutineCadence)) {
    throw new Error(`Invalid ${label} cadence: ${cadence}`);
  }
}

export function assertValidTimeOfDay(
  value: string,
): asserts value is TimeOfDayPreference {
  if (!VALID_TIME_OF_DAY.includes(value as TimeOfDayPreference)) {
    throw new Error(`Invalid Time-of-Day Preference: ${value}`);
  }
}

export function assertValidPreferredStartTime(value: string): void {
  if (!TIME_PATTERN.test(value)) {
    throw new Error(`Invalid preferredStartTime: ${value} (expected "HH:mm")`);
  }
}

export function assertValidDurationMinutes(value: number): void {
  if (!Number.isInteger(value) || value < 5 || value > 720) {
    throw new Error(`Invalid durationMinutes: ${value} (expected an integer, 5-720)`);
  }
}

// Weekday(s) 0-6 for "weekly", day(s)-of-month 1-31 for "monthly"; "daily"
// ignores anchor entirely (always null). Returns the JSON-encoded storage
// form, or null for "daily".
export function normalizeAnchor(
  cadence: RoutineCadence,
  anchor: number[] | undefined,
): string | null {
  if (cadence === "daily") {
    return null;
  }
  if (!anchor || anchor.length === 0) {
    throw new Error(`cadence "${cadence}" requires a non-empty anchor`);
  }
  const [min, max] = cadence === "weekly" ? [0, 6] : [1, 31];
  for (const value of anchor) {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(
        `Invalid anchor value ${value} for cadence "${cadence}" (expected ${min}-${max})`,
      );
    }
  }
  return JSON.stringify(anchor);
}

export function parseAnchor(anchor: string | null): number[] | null {
  return anchor ? (JSON.parse(anchor) as number[]) : null;
}
