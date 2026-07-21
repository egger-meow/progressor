import { prisma } from "./db";
import { parseTags, serializeTags } from "./tags";
import {
  assertValidCadence,
  assertValidDurationMinutes,
  assertValidPreferredStartTime,
  assertValidTimeOfDay,
  normalizeAnchor,
  parseAnchor,
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
  timeOfDayPreference?: TimeOfDayPreference;
  // "HH:mm", 24h — domain-model.md's Time-of-Day Preference "(or an
  // explicit hour range)" case. When set, the Scheduler tries this exact
  // time before timeOfDayPreference's bucket window (routine-placement.ts).
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
  // Explicit null clears the preference; omitted leaves it unchanged.
  timeOfDayPreference?: TimeOfDayPreference | null;
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

export async function createRoutine(input: CreateRoutineInput) {
  assertValidCadence(input.cadence);
  if (input.timeOfDayPreference) {
    assertValidTimeOfDay(input.timeOfDayPreference);
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
      timeOfDayPreference: input.timeOfDayPreference ?? null,
      preferredStartTime: input.preferredStartTime ?? null,
      durationMinutes: input.durationMinutes ?? 120,
      tags: serializeTags(input.tags),
    },
  });
  return withParsedTags(withParsedAnchor(routine));
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
  if (input.timeOfDayPreference) {
    assertValidTimeOfDay(input.timeOfDayPreference);
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
      timeOfDayPreference:
        input.timeOfDayPreference === undefined
          ? undefined
          : input.timeOfDayPreference,
      preferredStartTime:
        input.preferredStartTime === undefined ? undefined : input.preferredStartTime,
      durationMinutes: input.durationMinutes,
      tags: input.tags === undefined ? undefined : serializeTags(input.tags),
    },
  });
  return withParsedTags(withParsedAnchor(routine));
}

export async function getRoutine(id: string) {
  const routine = await prisma.routine.findUnique({ where: { id } });
  return routine ? withParsedTags(withParsedAnchor(routine)) : null;
}

export async function listRoutines() {
  const routines = await prisma.routine.findMany({
    orderBy: { title: "asc" },
  });
  return routines.map((r) => withParsedTags(withParsedAnchor(r)));
}
