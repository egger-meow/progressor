import { prisma } from "./db";
import { parseTags, serializeTags } from "./tags";

export type TrackableItemType = "book" | "course";
export type TrackableItemStatus =
  | "not-started"
  | "in-progress"
  | "paused"
  | "done";

const VALID_TYPES: TrackableItemType[] = ["book", "course"];
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
  tags?: string[];
}

export interface UpdateTrackableItemInput {
  title?: string;
  priority?: number;
  status?: TrackableItemStatus;
  unitCount?: number;
  unitsCompleted?: number;
  estimatedDays?: number;
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

function withParsedTags<T extends { tags: string }>(
  item: T,
): Omit<T, "tags"> & { tags: string[] } {
  return { ...item, tags: parseTags(item.tags) };
}

export async function listTrackableItems(type?: TrackableItemType) {
  const items = await prisma.trackableItem.findMany({
    where: type ? { type } : undefined,
    orderBy: { priority: "asc" },
  });
  return items.map(withParsedTags);
}

export async function getTrackableItem(id: string) {
  const item = await prisma.trackableItem.findUnique({ where: { id } });
  return item ? withParsedTags(item) : null;
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
      tags: serializeTags(input.tags),
    },
  });
  return withParsedTags(item);
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

  if (nextStatus === "in-progress" && existing.status !== "in-progress") {
    await assertWipLimitNotExceeded(existing.type);
  }

  const item = await prisma.trackableItem.update({
    where: { id },
    data: {
      title: input.title,
      priority: input.priority,
      status: nextStatus,
      unitCount: nextUnitCount,
      unitsCompleted: nextUnitsCompleted,
      estimatedDays: input.estimatedDays,
      tags: input.tags === undefined ? undefined : serializeTags(input.tags),
    },
  });
  return withParsedTags(item);
}
