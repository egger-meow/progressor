import { prisma } from "./db";

export type RoutineCadence = "daily" | "weekly" | "monthly";
export type TimeOfDayPreference = "morning" | "afternoon" | "evening" | "night";

const VALID_CADENCES: RoutineCadence[] = ["daily", "weekly", "monthly"];
const VALID_TIME_OF_DAY: TimeOfDayPreference[] = [
  "morning",
  "afternoon",
  "evening",
  "night",
];

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
}

export interface UpdateRoutineInput {
  title?: string;
  category?: string;
  cadence?: RoutineCadence;
  anchor?: number[];
  // Explicit null clears the preference; omitted leaves it unchanged.
  timeOfDayPreference?: TimeOfDayPreference | null;
  preferredStartTime?: string | null;
}

function assertValidCadence(cadence: string): asserts cadence is RoutineCadence {
  if (!VALID_CADENCES.includes(cadence as RoutineCadence)) {
    throw new Error(`Invalid Routine cadence: ${cadence}`);
  }
}

function assertValidTimeOfDay(
  value: string,
): asserts value is TimeOfDayPreference {
  if (!VALID_TIME_OF_DAY.includes(value as TimeOfDayPreference)) {
    throw new Error(`Invalid Time-of-Day Preference: ${value}`);
  }
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function assertValidPreferredStartTime(value: string): void {
  if (!TIME_PATTERN.test(value)) {
    throw new Error(`Invalid preferredStartTime: ${value} (expected "HH:mm")`);
  }
}

function normalizeAnchor(
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

function parseAnchor(anchor: string | null): number[] | null {
  return anchor ? (JSON.parse(anchor) as number[]) : null;
}

function withParsedAnchor<T extends { anchor: string | null }>(
  routine: T,
): Omit<T, "anchor"> & { anchor: number[] | null } {
  return { ...routine, anchor: parseAnchor(routine.anchor) };
}

export async function createRoutine(input: CreateRoutineInput) {
  assertValidCadence(input.cadence);
  if (input.timeOfDayPreference) {
    assertValidTimeOfDay(input.timeOfDayPreference);
  }
  if (input.preferredStartTime) {
    assertValidPreferredStartTime(input.preferredStartTime);
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
    },
  });
  return withParsedAnchor(routine);
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
    },
  });
  return withParsedAnchor(routine);
}

export async function getRoutine(id: string) {
  const routine = await prisma.routine.findUnique({ where: { id } });
  return routine ? withParsedAnchor(routine) : null;
}

export async function listRoutines() {
  const routines = await prisma.routine.findMany({
    orderBy: { title: "asc" },
  });
  return routines.map(withParsedAnchor);
}
