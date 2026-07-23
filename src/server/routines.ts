import { prisma } from "./db";
import { parseTags, serializeTags } from "./tags";
import {
  assertValidCadence,
  assertValidDurationMinutes,
  assertValidPreferredStartTime,
  assertValidTimeOfDayPreferences,
  normalizeAnchor,
  parseAnchor,
  parseTimeOfDayPreferences,
  serializeTimeOfDayPreferences,
  type RoutineCadence,
  type TimeOfDayPreference,
} from "./cadence";

export type { RoutineCadence, TimeOfDayPreference };

export interface CreateRoutineInput {
  title: string;
  category: string;
  cadence: RoutineCadence;
  // Weekday(s) 0-6 for "weekly", day(s)-of-month 1-31 for "monthly".
  // Ignored (must be omitted) for "daily".
  anchor?: number[];
  // Multi-select (2026-07-22) — omitted or [] means no preference.
  timeOfDayPreferences?: TimeOfDayPreference[];
  // "HH:mm", 24h — domain-model.md's Time-of-Day Preference "(or an
  // explicit hour range)" case. When set, the Scheduler tries this exact
  // time before timeOfDayPreferences' buckets (routine-placement.ts).
  preferredStartTime?: string;
  // How long one occurrence runs, in minutes. Defaults to 120 (the
  // Scheduler's old hardcoded SESSION_DURATION_MS) when omitted.
  durationMinutes?: number;
  tags?: string[];
}

export interface UpdateRoutineInput {
  title?: string;
  category?: string;
  cadence?: RoutineCadence;
  anchor?: number[];
  // [] clears the preference (the column is non-nullable); omitted leaves
  // it unchanged.
  timeOfDayPreferences?: TimeOfDayPreference[];
  preferredStartTime?: string | null;
  durationMinutes?: number;
  tags?: string[];
}

function withParsedAnchor<T extends { anchor: string | null }>(
  routine: T,
): Omit<T, "anchor"> & { anchor: number[] | null } {
  return { ...routine, anchor: parseAnchor(routine.anchor) };
}

function withParsedTags<T extends { tags: string }>(
  routine: T,
): Omit<T, "tags"> & { tags: string[] } {
  return { ...routine, tags: parseTags(routine.tags) };
}

function withParsedTimeOfDayPreferences<T extends { timeOfDayPreferences: string }>(
  routine: T,
): Omit<T, "timeOfDayPreferences"> & { timeOfDayPreferences: TimeOfDayPreference[] } {
  return { ...routine, timeOfDayPreferences: parseTimeOfDayPreferences(routine.timeOfDayPreferences) };
}

export async function createRoutine(input: CreateRoutineInput) {
  assertValidCadence(input.cadence);
  if (input.timeOfDayPreferences) {
    assertValidTimeOfDayPreferences(input.timeOfDayPreferences);
  }
  if (input.preferredStartTime) {
    assertValidPreferredStartTime(input.preferredStartTime);
  }
  if (input.durationMinutes !== undefined) {
    assertValidDurationMinutes(input.durationMinutes);
  }
  const anchor = normalizeAnchor(input.cadence, input.anchor);

  const routine = await prisma.routine.create({
    data: {
      title: input.title,
      category: input.category,
      cadence: input.cadence,
      anchor,
      timeOfDayPreferences: serializeTimeOfDayPreferences(input.timeOfDayPreferences),
      preferredStartTime: input.preferredStartTime ?? null,
      durationMinutes: input.durationMinutes ?? 120,
      tags: serializeTags(input.tags),
    },
  });
  return withParsedTags(withParsedAnchor(withParsedTimeOfDayPreferences(routine)));
}

export async function removeRoutine(id: string): Promise<void> {
  const existing = await prisma.routine.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Routine not found: ${id}`);
  }
  await prisma.routine.delete({ where: { id } });
}

export async function updateRoutine(id: string, input: UpdateRoutineInput) {
  const existing = await prisma.routine.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Routine not found: ${id}`);
  }

  const nextCadence = input.cadence ?? (existing.cadence as RoutineCadence);
  assertValidCadence(nextCadence);
  if (input.timeOfDayPreferences) {
    assertValidTimeOfDayPreferences(input.timeOfDayPreferences);
  }
  if (input.preferredStartTime) {
    assertValidPreferredStartTime(input.preferredStartTime);
  }
  if (input.durationMinutes !== undefined) {
    assertValidDurationMinutes(input.durationMinutes);
  }

  const cadenceChanged =
    input.cadence !== undefined && input.cadence !== existing.cadence;
  const anchorInput =
    input.anchor !== undefined
      ? input.anchor
      : cadenceChanged
        ? undefined
        : (parseAnchor(existing.anchor) ?? undefined);
  const anchor = normalizeAnchor(nextCadence, anchorInput);

  const routine = await prisma.routine.update({
    where: { id },
    data: {
      title: input.title,
      category: input.category,
      cadence: nextCadence,
      anchor,
      timeOfDayPreferences:
        input.timeOfDayPreferences === undefined
          ? undefined
          : serializeTimeOfDayPreferences(input.timeOfDayPreferences),
      preferredStartTime:
        input.preferredStartTime === undefined ? undefined : input.preferredStartTime,
      durationMinutes: input.durationMinutes,
      tags: input.tags === undefined ? undefined : serializeTags(input.tags),
    },
  });
  return withParsedTags(withParsedAnchor(withParsedTimeOfDayPreferences(routine)));
}

export async function getRoutine(id: string) {
  const routine = await prisma.routine.findUnique({ where: { id } });
  return routine ? withParsedTags(withParsedAnchor(withParsedTimeOfDayPreferences(routine))) : null;
}

export async function listRoutines() {
  const routines = await prisma.routine.findMany({
    orderBy: { title: "asc" },
  });
  return routines.map((r) => withParsedTags(withParsedAnchor(withParsedTimeOfDayPreferences(r))));
}
