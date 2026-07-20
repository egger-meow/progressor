import { prisma } from "./db";

// The six occupant kinds from docs/domain-model.md's "Time Slot" — five
// real occupant tables plus "slack" (deliberately empty, occupantId null).
export type OccupantType =
  | "routine"
  | "fixed-commitment"
  | "deadline-task"
  | "trackable-item"
  | "ad-hoc-event"
  | "slack";

const VALID_OCCUPANT_TYPES: OccupantType[] = [
  "routine",
  "fixed-commitment",
  "deadline-task",
  "trackable-item",
  "ad-hoc-event",
  "slack",
];

export interface CreateTimeSlotInput {
  startAt: Date;
  endAt: Date;
  occupantType: OccupantType;
  // Required for every occupantType except "slack".
  occupantId?: string;
}

export interface UpdateTimeSlotInput {
  startAt?: Date;
  endAt?: Date;
  occupantType?: OccupantType;
  occupantId?: string;
}

export interface ListTimeSlotsRange {
  from: Date;
  to: Date;
}

function assertValidOccupantType(
  value: string,
): asserts value is OccupantType {
  if (!VALID_OCCUPANT_TYPES.includes(value as OccupantType)) {
    throw new Error(`Invalid Time Slot occupantType: ${value}`);
  }
}

function assertValidRange(startAt: Date, endAt: Date): void {
  if (
    !(startAt instanceof Date) ||
    Number.isNaN(startAt.getTime()) ||
    !(endAt instanceof Date) ||
    Number.isNaN(endAt.getTime())
  ) {
    throw new Error("startAt and endAt must be valid Dates");
  }
  if (startAt >= endAt) {
    throw new Error("startAt must be before endAt");
  }
}

// Not a foreign key (sqlite/Prisma has no polymorphic relation support —
// see prisma/schema.prisma's TimeSlot comment), so existence is checked
// here instead, at the boundary where a Time Slot is created or
// re-pointed at a different occupant.
async function assertOccupantExists(
  occupantType: OccupantType,
  occupantId: string | undefined,
): Promise<void> {
  if (occupantType === "slack") {
    if (occupantId) {
      throw new Error('occupantId must be omitted when occupantType is "slack"');
    }
    return;
  }
  if (!occupantId) {
    throw new Error(`occupantId is required for occupantType "${occupantType}"`);
  }

  const found = await (() => {
    switch (occupantType) {
      case "routine":
        return prisma.routine.findUnique({ where: { id: occupantId } });
      case "fixed-commitment":
        return prisma.fixedCommitment.findUnique({ where: { id: occupantId } });
      case "deadline-task":
        return prisma.deadlineTask.findUnique({ where: { id: occupantId } });
      case "trackable-item":
        return prisma.trackableItem.findUnique({ where: { id: occupantId } });
      case "ad-hoc-event":
        return prisma.adHocEvent.findUnique({ where: { id: occupantId } });
    }
  })();

  if (!found) {
    throw new Error(
      `No ${occupantType} found with id "${occupantId}" — cannot create a Time Slot referencing it`,
    );
  }
}

export async function createTimeSlot(input: CreateTimeSlotInput) {
  assertValidOccupantType(input.occupantType);
  assertValidRange(input.startAt, input.endAt);
  await assertOccupantExists(input.occupantType, input.occupantId);

  return prisma.timeSlot.create({
    data: {
      startAt: input.startAt,
      endAt: input.endAt,
      occupantType: input.occupantType,
      occupantId: input.occupantType === "slack" ? null : (input.occupantId ?? null),
    },
  });
}

export async function updateTimeSlot(id: string, input: UpdateTimeSlotInput) {
  const existing = await prisma.timeSlot.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`TimeSlot not found: ${id}`);
  }

  const nextStartAt = input.startAt ?? existing.startAt;
  const nextEndAt = input.endAt ?? existing.endAt;
  assertValidRange(nextStartAt, nextEndAt);

  const nextOccupantType =
    input.occupantType ?? (existing.occupantType as OccupantType);
  assertValidOccupantType(nextOccupantType);

  // Re-validate the occupant whenever the type changes or a new id is
  // given. If occupantType changes without an explicit occupantId, the old
  // occupantId must NOT carry over — it identifies a record of the old
  // type, which is meaningless (or worse, coincidentally valid) under the
  // new type.
  const occupantTypeChanged =
    input.occupantType !== undefined && input.occupantType !== existing.occupantType;
  const occupantChanged = occupantTypeChanged || input.occupantId !== undefined;
  const nextOccupantId =
    input.occupantId !== undefined
      ? input.occupantId
      : occupantTypeChanged
        ? undefined
        : (existing.occupantId ?? undefined);
  if (occupantChanged) {
    await assertOccupantExists(nextOccupantType, nextOccupantId);
  }

  return prisma.timeSlot.update({
    where: { id },
    data: {
      startAt: nextStartAt,
      endAt: nextEndAt,
      occupantType: nextOccupantType,
      occupantId: nextOccupantType === "slack" ? null : (nextOccupantId ?? null),
    },
  });
}

export async function removeTimeSlot(id: string): Promise<void> {
  const existing = await prisma.timeSlot.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`TimeSlot not found: ${id}`);
  }
  await prisma.timeSlot.delete({ where: { id } });
}

export function getTimeSlot(id: string) {
  return prisma.timeSlot.findUnique({ where: { id } });
}

export function listTimeSlots(range?: ListTimeSlotsRange) {
  return prisma.timeSlot.findMany({
    where: range ? { startAt: { lt: range.to }, endAt: { gt: range.from } } : undefined,
    orderBy: { startAt: "asc" },
  });
}

// Human-readable label for a Time Slot's occupant, for display in the
// Weekly View. Lives here (service layer) rather than in the UI so the UI
// never has to know how each occupant kind is looked up.
async function occupantLabel(
  occupantType: OccupantType,
  occupantId: string | null,
): Promise<string> {
  if (occupantType === "slack" || !occupantId) {
    return "留白";
  }
  switch (occupantType) {
    case "routine": {
      const routine = await prisma.routine.findUnique({ where: { id: occupantId } });
      return routine ? `常規事件：${routine.title}` : "（常規事件已刪除）";
    }
    case "fixed-commitment": {
      const commitment = await prisma.fixedCommitment.findUnique({
        where: { id: occupantId },
      });
      return commitment ? `固定事務：${commitment.title}` : "（固定事務已刪除）";
    }
    case "deadline-task": {
      const task = await prisma.deadlineTask.findUnique({ where: { id: occupantId } });
      return task ? `截止任務：${task.title}` : "（截止任務已刪除）";
    }
    case "trackable-item": {
      const item = await prisma.trackableItem.findUnique({ where: { id: occupantId } });
      if (!item) {
        return "（書籍／課程已刪除）";
      }
      // Domain-model.md: Book's unit is Chapter, Course's unit is Video —
      // surfaced here (not just the title) so a Weekly View block tells you
      // which chapter/video this session is actually for, per INBOX.md's
      // 2026-07-20 request.
      const typeLabel = item.type === "book" ? "書籍" : "課程";
      const unitLabel = item.type === "book" ? "章" : "支影片";
      const currentUnit = Math.min(item.unitsCompleted + 1, item.unitCount);
      return `${typeLabel}：${item.title}（第 ${currentUnit} ${unitLabel}／共 ${item.unitCount} ${unitLabel}）`;
    }
    case "ad-hoc-event": {
      const event = await prisma.adHocEvent.findUnique({ where: { id: occupantId } });
      return event ? `臨時事件：${event.title}` : "（臨時事件已刪除）";
    }
  }
}

export interface TimeSlotWithLabel {
  id: string;
  startAt: Date;
  endAt: Date;
  occupantType: OccupantType;
  occupantId: string | null;
  occupantLabel: string;
}

export async function listTimeSlotsWithLabels(
  range?: ListTimeSlotsRange,
): Promise<TimeSlotWithLabel[]> {
  const slots = await listTimeSlots(range);
  return Promise.all(
    slots.map(async (slot) => ({
      id: slot.id,
      startAt: slot.startAt,
      endAt: slot.endAt,
      occupantType: slot.occupantType as OccupantType,
      occupantId: slot.occupantId,
      occupantLabel: await occupantLabel(slot.occupantType as OccupantType, slot.occupantId),
    })),
  );
}
