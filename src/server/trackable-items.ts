import { prisma } from "./db";
import { parseTags, serializeTags } from "./tags";

export type TrackableItemType = "book" | "course";
export type TrackableItemStatus =
  | "not-started"
  | "in-progress"
  | "paused"
  | "done";

export const VALID_TYPES: TrackableItemType[] = ["book", "course"];
const VALID_STATUSES: TrackableItemStatus[] = [
  "not-started",
  "in-progress",
  "paused",
  "done",
];

// No WIP Limit interview answer exists yet — this is an inferred default,
// not a user decision. Adjust via setWipLimit once the user has an opinion.
export const DEFAULT_WIP_LIMIT = 3;

export class WipLimitExceededError extends Error {
  constructor(type: TrackableItemType, limit: number) {
    super(`WIP limit of ${limit} reached for type "${type}"`);
    this.name = "WipLimitExceededError";
  }
}

export interface CreateTrackableItemInput {
  title: string;
  type: TrackableItemType;
  // Optional: defaults to "last place" (current max priority + 1) so the
  // Add form no longer needs a raw priority number — priority is now
  // managed exclusively by dragging on /items (see reorderTrackableItems).
  priority?: number;
  unitCount: number;
  estimatedDays: number;
  status?: TrackableItemStatus;
  unitsCompleted?: number;
  // Explicit target completion date — independent of estimatedDays, see
  // prisma/schema.prisma's comment. null/undefined means "no target set."
  targetDate?: Date | null;
  // "Chapters average Nx longer than normal" — the baseline for any unit
  // without its own entry in unitWeightOverrides. Defaults to 1.0.
  unitWeightMultiplier?: number;
  // Per-unit-index overrides (1-based) — see prisma/schema.prisma's comment
  // on unitWeightOverrides. Defaults to none (every unit uses the baseline).
  unitWeightOverrides?: Record<number, number>;
  tags?: string[];
}

export interface UpdateTrackableItemInput {
  title?: string;
  priority?: number;
  status?: TrackableItemStatus;
  unitCount?: number;
  unitsCompleted?: number;
  estimatedDays?: number;
  targetDate?: Date | null;
  unitWeightMultiplier?: number;
  unitWeightOverrides?: Record<number, number>;
  tags?: string[];
}

function assertValidType(type: string): asserts type is TrackableItemType {
  if (!VALID_TYPES.includes(type as TrackableItemType)) {
    throw new Error(`Invalid TrackableItem type: ${type}`);
  }
}

function assertValidStatus(
  status: string,
): asserts status is TrackableItemStatus {
  if (!VALID_STATUSES.includes(status as TrackableItemStatus)) {
    throw new Error(`Invalid TrackableItem status: ${status}`);
  }
}

function assertValidUnits(unitCount: number, unitsCompleted: number): void {
  if (unitCount <= 0) {
    throw new Error("unitCount must be > 0");
  }
  if (unitsCompleted < 0 || unitsCompleted > unitCount) {
    throw new Error("unitsCompleted must be between 0 and unitCount");
  }
}

function assertValidTargetDate(targetDate: Date | null | undefined): void {
  if (
    targetDate !== null &&
    targetDate !== undefined &&
    (!(targetDate instanceof Date) || Number.isNaN(targetDate.getTime()))
  ) {
    throw new Error("targetDate must be a valid Date or null");
  }
}

function assertValidUnitWeightMultiplier(unitWeightMultiplier: number): void {
  if (!Number.isFinite(unitWeightMultiplier) || unitWeightMultiplier <= 0) {
    throw new Error("unitWeightMultiplier must be > 0");
  }
}

// unitWeightOverrides is stored as JSON (same convention as tags.ts), keyed
// by unit index (1-based, "第 N 章" numbering) as a string since JSON object
// keys are always strings — parsed back to a number here so callers work
// with plain `Record<number, number>`.
export function serializeUnitWeightOverrides(overrides: Record<number, number> | undefined): string {
  if (!overrides) {
    return "{}";
  }
  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(overrides)) {
    normalized[String(Math.trunc(Number(key)))] = value;
  }
  return JSON.stringify(normalized);
}

export function parseUnitWeightOverrides(json: string | null | undefined): Record<number, number> {
  if (!json) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const result: Record<number, number> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const unitIndex = Number(key);
      if (Number.isInteger(unitIndex) && typeof value === "number" && Number.isFinite(value)) {
        result[unitIndex] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function assertValidUnitWeightOverrides(
  overrides: Record<number, number> | undefined,
  unitCount: number,
): void {
  if (!overrides) {
    return;
  }
  for (const [key, value] of Object.entries(overrides)) {
    const unitIndex = Number(key);
    if (!Number.isInteger(unitIndex) || unitIndex < 1 || unitIndex > unitCount) {
      throw new Error(`unitWeightOverrides key ${key} must be an integer between 1 and ${unitCount}`);
    }
    assertValidUnitWeightMultiplier(value);
  }
}

// The multiplier actually governing `unitIndex` (1-based): its own
// unitWeightOverrides entry if one exists, otherwise the item's baseline
// unitWeightMultiplier. Shared by advanceTrackableItemProgress (session
// count needed before unitsCompleted rolls forward), the Weekly View's
// progress fraction (src/server/time-slots.ts), and the Scheduler's
// horizon engine (how many sessions to place per remaining unit).
export function effectiveUnitWeightMultiplier(
  overridesJson: string | null | undefined,
  baseline: number,
  unitIndex: number,
): number {
  const overrides = parseUnitWeightOverrides(overridesJson);
  return overrides[unitIndex] ?? baseline;
}

export async function getWipLimit(type: TrackableItemType): Promise<number> {
  const row = await prisma.wipLimit.findUnique({ where: { type } });
  return row?.maxInProgress ?? DEFAULT_WIP_LIMIT;
}

export async function setWipLimit(
  type: TrackableItemType,
  maxInProgress: number,
): Promise<void> {
  if (maxInProgress < 0) {
    throw new Error("maxInProgress must be >= 0");
  }
  await prisma.wipLimit.upsert({
    where: { type },
    create: { type, maxInProgress },
    update: { maxInProgress },
  });
}

async function assertWipLimitNotExceeded(
  type: TrackableItemType,
): Promise<void> {
  const limit = await getWipLimit(type);
  const inProgressCount = await prisma.trackableItem.count({
    where: { type, status: "in-progress" },
  });
  if (inProgressCount >= limit) {
    throw new WipLimitExceededError(type, limit);
  }
}

function withParsedFields<T extends { tags: string; unitWeightOverrides: string }>(
  item: T,
): Omit<T, "tags" | "unitWeightOverrides"> & { tags: string[]; unitWeightOverrides: Record<number, number> } {
  return { ...item, tags: parseTags(item.tags), unitWeightOverrides: parseUnitWeightOverrides(item.unitWeightOverrides) };
}

export async function listTrackableItems(type?: TrackableItemType) {
  const items = await prisma.trackableItem.findMany({
    where: type ? { type } : undefined,
    orderBy: { priority: "asc" },
  });
  return items.map(withParsedFields);
}

export async function getTrackableItem(id: string) {
  const item = await prisma.trackableItem.findUnique({ where: { id } });
  return item ? withParsedFields(item) : null;
}

async function nextPriority(): Promise<number> {
  const result = await prisma.trackableItem.aggregate({ _max: { priority: true } });
  return (result._max.priority ?? 0) + 1;
}

export async function createTrackableItem(input: CreateTrackableItemInput) {
  assertValidType(input.type);
  const status = input.status ?? "not-started";
  assertValidStatus(status);
  const unitsCompleted = input.unitsCompleted ?? 0;
  assertValidUnits(input.unitCount, unitsCompleted);
  if (input.estimatedDays <= 0) {
    throw new Error("estimatedDays must be > 0");
  }
  assertValidTargetDate(input.targetDate);
  const unitWeightMultiplier = input.unitWeightMultiplier ?? 1.0;
  assertValidUnitWeightMultiplier(unitWeightMultiplier);
  assertValidUnitWeightOverrides(input.unitWeightOverrides, input.unitCount);

  if (status === "in-progress") {
    await assertWipLimitNotExceeded(input.type);
  }

  const priority = input.priority ?? (await nextPriority());

  const item = await prisma.trackableItem.create({
    data: {
      title: input.title,
      type: input.type,
      priority,
      status,
      unitCount: input.unitCount,
      unitsCompleted,
      estimatedDays: input.estimatedDays,
      targetDate: input.targetDate ?? null,
      unitWeightMultiplier,
      unitWeightOverrides: serializeUnitWeightOverrides(input.unitWeightOverrides),
      tags: serializeTags(input.tags),
    },
  });
  return withParsedFields(item);
}

// Persists a full drag-and-drop reorder in one go: `orderedIds` is every
// Trackable Item id in its new top-to-bottom priority order (1-indexed).
// Used by /items' drag-and-drop priority list — see
// src/app/items/priority-list.tsx.
export async function reorderTrackableItems(orderedIds: string[]): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.trackableItem.update({ where: { id }, data: { priority: index + 1 } }),
    ),
  );
}

export async function removeTrackableItem(id: string): Promise<void> {
  const existing = await prisma.trackableItem.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`TrackableItem not found: ${id}`);
  }
  await prisma.trackableItem.delete({ where: { id } });
}

export async function updateTrackableItem(
  id: string,
  input: UpdateTrackableItemInput,
) {
  const existing = await prisma.trackableItem.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`TrackableItem not found: ${id}`);
  }
  assertValidType(existing.type);

  const nextStatus = input.status ?? existing.status;
  assertValidStatus(nextStatus);
  const nextUnitCount = input.unitCount ?? existing.unitCount;
  const nextUnitsCompleted = input.unitsCompleted ?? existing.unitsCompleted;
  assertValidUnits(nextUnitCount, nextUnitsCompleted);
  if (input.targetDate !== undefined) {
    assertValidTargetDate(input.targetDate);
  }
  if (input.unitWeightMultiplier !== undefined) {
    assertValidUnitWeightMultiplier(input.unitWeightMultiplier);
  }
  if (input.unitWeightOverrides !== undefined) {
    assertValidUnitWeightOverrides(input.unitWeightOverrides, nextUnitCount);
  }

  if (nextStatus === "in-progress" && existing.status !== "in-progress") {
    await assertWipLimitNotExceeded(existing.type);
  }

  // A manual unitsCompleted edit (via the /items edit form, or
  // completeItemEarly's whole-item finish) invalidates whatever partial
  // session count was mid-way through the old current unit — reset it so
  // advanceTrackableItemProgress starts counting fresh from the new value.
  const nextCurrentUnitSessionsCompleted =
    input.unitsCompleted !== undefined ? 0 : undefined;

  const item = await prisma.trackableItem.update({
    where: { id },
    data: {
      title: input.title,
      priority: input.priority,
      status: nextStatus,
      unitCount: nextUnitCount,
      unitsCompleted: nextUnitsCompleted,
      currentUnitSessionsCompleted: nextCurrentUnitSessionsCompleted,
      estimatedDays: input.estimatedDays,
      targetDate: input.targetDate === undefined ? undefined : input.targetDate,
      unitWeightMultiplier: input.unitWeightMultiplier,
      unitWeightOverrides:
        input.unitWeightOverrides === undefined
          ? undefined
          : serializeUnitWeightOverrides(input.unitWeightOverrides),
      tags: input.tags === undefined ? undefined : serializeTags(input.tags),
    },
  });
  return withParsedFields(item);
}

export interface AdvanceProgressResult {
  unitsCompleted: number;
  currentUnitSessionsCompleted: number;
  completed: boolean;
}

// Called when one session (Time Slot) for this item is confirmed done —
// via the daily check-in gate's 是，已完成 answer, or the Weekly View's
// 完成本次 button (src/app/actions.ts). Distinct from completeItemEarly
// (src/server/scheduler-repair.ts), which finishes the WHOLE item early;
// this advances by exactly one sitting. A unit (chapter/video) isn't
// always one sitting — effectiveUnitWeightMultiplier (this file) says how
// many sittings the CURRENT unit takes (its own unitWeightOverrides entry
// if one exists, otherwise the baseline unitWeightMultiplier), rounded to
// a whole session count (see time-slots.ts's currentUnit/sessionFraction
// comment) — so unitsCompleted only rolls forward once that many sessions
// have been logged for the current unit.
export async function advanceTrackableItemProgress(
  id: string,
): Promise<AdvanceProgressResult> {
  const existing = await prisma.trackableItem.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`TrackableItem not found: ${id}`);
  }
  if (existing.unitsCompleted >= existing.unitCount) {
    return {
      unitsCompleted: existing.unitsCompleted,
      currentUnitSessionsCompleted: existing.currentUnitSessionsCompleted,
      completed: true,
    };
  }

  const currentUnitIndex = existing.unitsCompleted + 1;
  const currentMultiplier = effectiveUnitWeightMultiplier(
    existing.unitWeightOverrides,
    existing.unitWeightMultiplier,
    currentUnitIndex,
  );
  const sessionsPerUnit = Math.max(1, Math.round(currentMultiplier));
  const sessionsDone = existing.currentUnitSessionsCompleted + 1;

  let unitsCompleted = existing.unitsCompleted;
  let currentUnitSessionsCompleted = sessionsDone;
  if (sessionsDone >= sessionsPerUnit) {
    unitsCompleted = Math.min(existing.unitsCompleted + 1, existing.unitCount);
    currentUnitSessionsCompleted = 0;
  }

  const completed = unitsCompleted >= existing.unitCount;

  await prisma.trackableItem.update({
    where: { id },
    data: {
      unitsCompleted,
      currentUnitSessionsCompleted,
      status: completed ? "done" : existing.status,
    },
  });

  return { unitsCompleted, currentUnitSessionsCompleted, completed };
}
