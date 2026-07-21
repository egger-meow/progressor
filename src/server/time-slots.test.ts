import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { createAdHocEvent } from "./ad-hoc-events";
import { createRoutine } from "./routines";
import { createFixedCommitment, createDeadlineTask } from "./semester-commitments";
import { createTrackableItem } from "./trackable-items";
import {
  createTimeSlot,
  getTimeSlot,
  listTimeSlots,
  listTimeSlotsWithLabels,
  removeTimeSlot,
  updateTimeSlot,
} from "./time-slots";
import { removeTrackableItem } from "./trackable-items";

afterEach(async () => {
  await prisma.timeSlot.deleteMany();
  await prisma.adHocEvent.deleteMany();
  await prisma.routine.deleteMany();
  await prisma.fixedCommitment.deleteMany();
  await prisma.deadlineTask.deleteMany();
  await prisma.trackableItem.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const HOUR = 1000 * 60 * 60;
function hourSlot(startHour: number) {
  const startAt = new Date(2026, 6, 20, startHour, 0, 0);
  const endAt = new Date(startAt.getTime() + HOUR);
  return { startAt, endAt };
}

describe("createTimeSlot — occupant kinds", () => {
  it("creates a slack slot with no occupant", async () => {
    const slot = await createTimeSlot({ ...hourSlot(9), occupantType: "slack" });
    expect(slot.occupantId).toBeNull();
  });

  it("creates a slot referencing a Routine", async () => {
    const routine = await createRoutine({ title: "Gym", category: "gym", cadence: "daily" });
    const slot = await createTimeSlot({
      ...hourSlot(7),
      occupantType: "routine",
      occupantId: routine.id,
    });
    expect(slot.occupantId).toBe(routine.id);
  });

  it("creates a slot referencing a FixedCommitment", async () => {
    const commitment = await createFixedCommitment({
      title: "Class",
      dayOfWeek: 1,
      startTime: "10:00",
      endTime: "11:00",
    });
    const slot = await createTimeSlot({
      ...hourSlot(10),
      occupantType: "fixed-commitment",
      occupantId: commitment.id,
    });
    expect(slot.occupantId).toBe(commitment.id);
  });

  it("creates a slot referencing a DeadlineTask", async () => {
    const task = await createDeadlineTask({
      title: "Homework",
      dueAt: new Date("2026-08-01"),
      estimatedDays: 2,
    });
    const slot = await createTimeSlot({
      ...hourSlot(14),
      occupantType: "deadline-task",
      occupantId: task.id,
    });
    expect(slot.occupantId).toBe(task.id);
  });

  it("creates a slot referencing a TrackableItem", async () => {
    const book = await createTrackableItem({
      title: "A book",
      type: "book",
      priority: 1,
      unitCount: 10,
      estimatedDays: 10,
    });
    const slot = await createTimeSlot({
      ...hourSlot(20),
      occupantType: "trackable-item",
      occupantId: book.id,
    });
    expect(slot.occupantId).toBe(book.id);
  });

  it("creates a slot referencing an AdHocEvent", async () => {
    const event = await createAdHocEvent({ title: "See a friend" });
    const slot = await createTimeSlot({
      ...hourSlot(18),
      occupantType: "ad-hoc-event",
      occupantId: event.id,
    });
    expect(slot.occupantId).toBe(event.id);
  });
});

describe("createTimeSlot — validation", () => {
  it("rejects an invalid occupantType", async () => {
    await expect(
      createTimeSlot({
        ...hourSlot(9),
        // @ts-expect-error deliberately invalid input to prove runtime validation
        occupantType: "nap",
      }),
    ).rejects.toThrow(/Invalid Time Slot occupantType/);
  });

  it("rejects endAt not after startAt", async () => {
    const startAt = new Date(2026, 6, 20, 9, 0, 0);
    await expect(
      createTimeSlot({ startAt, endAt: startAt, occupantType: "slack" }),
    ).rejects.toThrow(/startAt must be before endAt/);
  });

  it("rejects a slack slot given an occupantId", async () => {
    const event = await createAdHocEvent({ title: "x" });
    await expect(
      createTimeSlot({ ...hourSlot(9), occupantType: "slack", occupantId: event.id }),
    ).rejects.toThrow(/occupantId must be omitted/);
  });

  it("rejects a non-slack slot with no occupantId", async () => {
    await expect(
      createTimeSlot({ ...hourSlot(9), occupantType: "routine" }),
    ).rejects.toThrow(/occupantId is required/);
  });

  it("rejects a dangling occupantId (no such Routine)", async () => {
    await expect(
      createTimeSlot({
        ...hourSlot(9),
        occupantType: "routine",
        occupantId: "does-not-exist",
      }),
    ).rejects.toThrow(/No routine found/);
  });
});

describe("updateTimeSlot / removeTimeSlot — neighbor isolation", () => {
  it("editing one Time Slot does not alter any other Time Slot", async () => {
    const a = await createTimeSlot({ ...hourSlot(8), occupantType: "slack" });
    const b = await createTimeSlot({ ...hourSlot(9), occupantType: "slack" });
    const c = await createTimeSlot({ ...hourSlot(10), occupantType: "slack" });

    const newStart = new Date(2026, 6, 20, 8, 30, 0);
    await updateTimeSlot(a.id, { startAt: newStart, endAt: new Date(newStart.getTime() + HOUR) });

    const [reloadedA, reloadedB, reloadedC] = await Promise.all([
      getTimeSlot(a.id),
      getTimeSlot(b.id),
      getTimeSlot(c.id),
    ]);
    expect(reloadedA?.startAt.getTime()).toBe(newStart.getTime());
    expect(reloadedB?.startAt.getTime()).toBe(b.startAt.getTime());
    expect(reloadedC?.startAt.getTime()).toBe(c.startAt.getTime());
  });

  it("removing one Time Slot does not remove any other Time Slot", async () => {
    const a = await createTimeSlot({ ...hourSlot(8), occupantType: "slack" });
    const b = await createTimeSlot({ ...hourSlot(9), occupantType: "slack" });

    await removeTimeSlot(a.id);

    expect(await getTimeSlot(a.id)).toBeNull();
    expect(await getTimeSlot(b.id)).not.toBeNull();
  });

  it("re-validates the occupant when occupantType changes on update", async () => {
    const routine = await createRoutine({ title: "Gym", category: "gym", cadence: "daily" });
    const slot = await createTimeSlot({
      ...hourSlot(7),
      occupantType: "routine",
      occupantId: routine.id,
    });

    await expect(
      updateTimeSlot(slot.id, { occupantType: "ad-hoc-event" }),
    ).rejects.toThrow(/occupantId is required/);
  });

  it("allows moving a slot from an occupant to slack", async () => {
    const routine = await createRoutine({ title: "Gym", category: "gym", cadence: "daily" });
    const slot = await createTimeSlot({
      ...hourSlot(7),
      occupantType: "routine",
      occupantId: routine.id,
    });

    const updated = await updateTimeSlot(slot.id, { occupantType: "slack" });
    expect(updated.occupantType).toBe("slack");
    expect(updated.occupantId).toBeNull();
  });

  it("throws for a nonexistent Time Slot on update or remove", async () => {
    await expect(updateTimeSlot("does-not-exist", { occupantType: "slack" })).rejects.toThrow(
      /TimeSlot not found/,
    );
    await expect(removeTimeSlot("does-not-exist")).rejects.toThrow(/TimeSlot not found/);
  });
});

describe("listTimeSlots", () => {
  it("filters by an overlapping date range and orders by startAt", async () => {
    await createTimeSlot({ ...hourSlot(8), occupantType: "slack" });
    await createTimeSlot({ ...hourSlot(20), occupantType: "slack" });

    const from = new Date(2026, 6, 20, 0, 0, 0);
    const to = new Date(2026, 6, 20, 12, 0, 0);
    const inRange = await listTimeSlots({ from, to });
    expect(inRange).toHaveLength(1);
    expect(inRange[0].startAt.getHours()).toBe(8);
  });

  it("returns all Time Slots when no range is given", async () => {
    await createTimeSlot({ ...hourSlot(8), occupantType: "slack" });
    await createTimeSlot({ ...hourSlot(9), occupantType: "slack" });
    expect(await listTimeSlots()).toHaveLength(2);
  });
});

describe("listTimeSlotsWithLabels — occupantTags", () => {
  it("surfaces the occupant's tags, and an empty array for slack/ad-hoc", async () => {
    const item = await createTrackableItem({
      title: "Trading 101",
      type: "book",
      priority: 1,
      unitCount: 10,
      estimatedDays: 5,
      tags: ["trader"],
    });
    const bookSlot = await createTimeSlot({
      ...hourSlot(9),
      occupantType: "trackable-item",
      occupantId: item.id,
    });
    const slackSlot = await createTimeSlot({ ...hourSlot(10), occupantType: "slack" });

    const labeled = await listTimeSlotsWithLabels();
    expect(labeled.find((s) => s.id === bookSlot.id)?.occupantTags).toEqual(["trader"]);
    expect(labeled.find((s) => s.id === slackSlot.id)?.occupantTags).toEqual([]);
  });
});

describe("listTimeSlotsWithLabels — occupant deleted out from under a Time Slot", () => {
  it("degrades to a placeholder label instead of throwing (Core Entity Creation UI's delete guarantee)", async () => {
    const item = await createTrackableItem({
      title: "Some book",
      type: "book",
      priority: 1,
      unitCount: 10,
      estimatedDays: 5,
    });
    const slot = await createTimeSlot({
      ...hourSlot(9),
      occupantType: "trackable-item",
      occupantId: item.id,
    });

    await removeTrackableItem(item.id);

    const labeled = await listTimeSlotsWithLabels();
    const found = labeled.find((s) => s.id === slot.id);
    expect(found?.occupantLabel).toBe("（書籍／課程已刪除）");
  });
});
