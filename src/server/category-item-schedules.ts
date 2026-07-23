import { prisma } from "./db";
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
import { VALID_TYPES, type TrackableItemType } from "./trackable-items";

export type { RoutineCadence, TimeOfDayPreference };

export interface SetCategoryItemScheduleInput {
  cadence: RoutineCadence;
  // Weekday(s) 0-6 for "weekly", day(s)-of-month 1-31 for "monthly".
  // Ignored (must be omitted) for "daily".
  anchor?: number[];
  // Multi-select (2026-07-22) — omitted or [] means no preference.
  timeOfDayPreferences?: TimeOfDayPreference[];
  preferredStartTime?: string | null;
  durationMinutes?: number;
}

function assertValidType(type: string): asserts type is TrackableItemType {
  if (!VALID_TYPES.includes(type as TrackableItemType)) {
    throw new Error(`Invalid TrackableItem type: ${type}`);
  }
}

function withParsedAnchor<T extends { anchor: string | null }>(
  schedule: T,
): Omit<T, "anchor"> & { anchor: number[] | null } {
  return { ...schedule, anchor: parseAnchor(schedule.anchor) };
}

function withParsedTimeOfDayPreferences<T extends { timeOfDayPreferences: string }>(
  schedule: T,
): Omit<T, "timeOfDayPreferences"> & { timeOfDayPreferences: TimeOfDayPreference[] } {
  return {
    ...schedule,
    timeOfDayPreferences: parseTimeOfDayPreferences(schedule.timeOfDayPreferences),
  };
}

// Upsert-by-type (like setWipLimit) — this is configuration, one row per
// TrackableItemType, not a growing list of records.
export async function setCategoryItemSchedule(
  type: TrackableItemType,
  input: SetCategoryItemScheduleInput,
) {
  assertValidType(type);
  assertValidCadence(input.cadence, "CategoryItemSchedule");
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

  const data = {
    cadence: input.cadence,
    anchor,
    timeOfDayPreferences: serializeTimeOfDayPreferences(input.timeOfDayPreferences),
    preferredStartTime: input.preferredStartTime ?? null,
    durationMinutes: input.durationMinutes ?? 120,
  };

  const schedule = await prisma.categoryItemSchedule.upsert({
    where: { type },
    create: { type, ...data },
    update: data,
  });
  return withParsedAnchor(withParsedTimeOfDayPreferences(schedule));
}

export async function removeCategoryItemSchedule(type: TrackableItemType): Promise<void> {
  assertValidType(type);
  await prisma.categoryItemSchedule.deleteMany({ where: { type } });
}

export async function getCategoryItemSchedule(type: TrackableItemType) {
  assertValidType(type);
  const schedule = await prisma.categoryItemSchedule.findUnique({ where: { type } });
  return schedule ? withParsedAnchor(withParsedTimeOfDayPreferences(schedule)) : null;
}

export async function listCategoryItemSchedules() {
  const schedules = await prisma.categoryItemSchedule.findMany({ orderBy: { type: "asc" } });
  return schedules.map((s) => withParsedAnchor(withParsedTimeOfDayPreferences(s)));
}
