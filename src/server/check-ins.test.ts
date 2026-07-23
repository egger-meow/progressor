import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { createTimeSlot } from "./time-slots";
import { createTrackableItem } from "./trackable-items";
import { createDeadlineTask } from "./semester-commitments";
import {
  confirmCheckIn,
  dismissCheckInAsMissed,
  listPendingCheckIns,
  submitCheckIns,
} from "./check-ins";

afterEach(async () => {
  await prisma.timeSlot.deleteMany();
  await prisma.trackableItem.deleteMany();
  await prisma.deadlineTask.deleteMany();
  await prisma.routine.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const HOUR = 60 * 60 * 1000;

describe("listPendingCheckIns", () => {
  it("includes a past trackable-item slot with confirmedAt null", async () => {
    const book = await createTrackableItem({
      title: "Deep Work",
      type: "book",
      unitCount: 10,
      estimatedDays: 5,
      status: "in-progress",
    });
    const now = new Date("2026-07-22T12:00:00");
    const past = await createTimeSlot({
      startAt: new Date(now.getTime() - 2 * HOUR),
      endAt: new Date(now.getTime() - HOUR),
      occupantType: "trackable-item",
      occupantId: book.id,
    });

    const pending = await listPendingCheckIns(now);
    expect(pending.map((p) => p.id)).toEqual([past.id]);
    expect(pending[0].occupantLabel).toBe("Deep Work");
  });

  it("excludes a future slot", async () => {
    const book = await createTrackableItem({
      title: "Deep Work",
      type: "book",
      unitCount: 10,
      estimatedDays: 5,
      status: "in-progress",
    });
    const now = new Date("2026-07-22T12:00:00");
    await createTimeSlot({
      startAt: new Date(now.getTime() + HOUR),
      endAt: new Date(now.getTime() + 2 * HOUR),
      occupantType: "trackable-item",
      occupantId: book.id,
    });

    expect(await listPendingCheckIns(now)).toEqual([]);
  });

  it("excludes a slot that already has confirmedAt set", async () => {
    const book = await createTrackableItem({
      title: "Deep Work",
      type: "book",
      unitCount: 10,
      estimatedDays: 5,
      status: "in-progress",
    });
    const now = new Date("2026-07-22T12:00:00");
    const past = await createTimeSlot({
      startAt: new Date(now.getTime() - 2 * HOUR),
      endAt: new Date(now.getTime() - HOUR),
      occupantType: "trackable-item",
      occupantId: book.id,
    });
    await prisma.timeSlot.update({ where: { id: past.id }, data: { confirmedAt: now } });

    expect(await listPendingCheckIns(now)).toEqual([]);
  });

  it("excludes a past routine occurrence — out of scope for this gate", async () => {
    const routine = await prisma.routine.create({
      data: { title: "Gym", category: "gym", cadence: "daily", anchor: null },
    });
    const now = new Date("2026-07-22T12:00:00");
    await createTimeSlot({
      startAt: new Date(now.getTime() - 2 * HOUR),
      endAt: new Date(now.getTime() - HOUR),
      occupantType: "routine",
      occupantId: routine.id,
    });

    expect(await listPendingCheckIns(now)).toEqual([]);
  });
});

describe("confirmCheckIn", () => {
  it("sets confirmedAt, removing the slot from the pending list", async () => {
    const book = await createTrackableItem({
      title: "Deep Work",
      type: "book",
      unitCount: 10,
      estimatedDays: 5,
      status: "in-progress",
    });
    const now = new Date("2026-07-22T12:00:00");
    const past = await createTimeSlot({
      startAt: new Date(now.getTime() - 2 * HOUR),
      endAt: new Date(now.getTime() - HOUR),
      occupantType: "trackable-item",
      occupantId: book.id,
    });

    await confirmCheckIn(past.id, now);

    const updated = await prisma.timeSlot.findUnique({ where: { id: past.id } });
    expect(updated?.confirmedAt).toEqual(now);
    expect(await listPendingCheckIns(now)).toEqual([]);
  });

  it("advances the trackable-item's progress by one sitting", async () => {
    const book = await createTrackableItem({
      title: "Deep Work",
      type: "book",
      unitCount: 10,
      estimatedDays: 5,
      status: "in-progress",
    });
    const now = new Date("2026-07-22T12:00:00");
    const past = await createTimeSlot({
      startAt: new Date(now.getTime() - 2 * HOUR),
      endAt: new Date(now.getTime() - HOUR),
      occupantType: "trackable-item",
      occupantId: book.id,
    });

    await confirmCheckIn(past.id, now);

    const updatedBook = await prisma.trackableItem.findUnique({ where: { id: book.id } });
    expect(updatedBook?.unitsCompleted).toBe(1);
  });

  it("does not touch estimatedHours/progress for a deadline-task", async () => {
    const task = await createDeadlineTask({
      title: "Homework",
      dueAt: new Date(Date.now() + 5 * 24 * HOUR),
      estimatedHours: 4,
    });
    const now = new Date("2026-07-22T12:00:00");
    const past = await createTimeSlot({
      startAt: new Date(now.getTime() - 2 * HOUR),
      endAt: new Date(now.getTime() - HOUR),
      occupantType: "deadline-task",
      occupantId: task.id,
    });

    await confirmCheckIn(past.id, now);

    const stillTask = await prisma.deadlineTask.findUnique({ where: { id: task.id } });
    expect(stillTask?.estimatedHours).toBe(4);
  });

  it("rejects a slot id whose occupantType isn't trackable-item/deadline-task", async () => {
    const routine = await prisma.routine.create({
      data: { title: "Gym", category: "gym", cadence: "daily", anchor: null },
    });
    const slot = await createTimeSlot({
      startAt: new Date("2026-07-21T09:00:00"),
      endAt: new Date("2026-07-21T10:00:00"),
      occupantType: "routine",
      occupantId: routine.id,
    });

    await expect(confirmCheckIn(slot.id)).rejects.toThrow(/not eligible/);
  });
});

describe("dismissCheckInAsMissed", () => {
  it("removes the slot and reschedules the item into the current week", async () => {
    const book = await createTrackableItem({
      title: "Deep Work",
      type: "book",
      unitCount: 10,
      estimatedDays: 5,
      status: "in-progress",
    });
    const now = new Date();
    const past = await createTimeSlot({
      startAt: new Date(now.getTime() - 2 * HOUR),
      endAt: new Date(now.getTime() - HOUR),
      occupantType: "trackable-item",
      occupantId: book.id,
    });

    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    const day = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() + (day === 0 ? -6 : 1 - day));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Passing weekStart itself as `now` (rather than the real current
    // time) means nothing the Scheduler places anywhere in this week can
    // be "already past" relative to it — isolates this test to the
    // reschedule/eligibility behavior, independent of wall-clock timing.
    // The dedicated stale-placement-pruning test below covers the other
    // branch (now = end of week, forcing every placement to be pruned).
    const result = await dismissCheckInAsMissed(past.id, weekStart, weekEnd, weekStart);

    expect(result.removedSlotId).toBe(past.id);
    expect(await prisma.timeSlot.findUnique({ where: { id: past.id } })).toBeNull();
    expect(result.reschedule.createdSlotIds.length).toBeGreaterThan(0);

    const newSlot = await prisma.timeSlot.findUnique({
      where: { id: result.reschedule.createdSlotIds[0] },
    });
    expect(newSlot?.occupantType).toBe("trackable-item");
    expect(newSlot?.occupantId).toBe(book.id);
  });

  it("prunes a fresh placement that still lands on an already-elapsed day", async () => {
    const book = await createTrackableItem({
      title: "Deep Work",
      type: "book",
      unitCount: 10,
      estimatedDays: 5,
      status: "in-progress",
    });
    const weekStart = new Date("2026-07-20T00:00:00");
    const weekEnd = new Date("2026-07-27T00:00:00");
    const past = await createTimeSlot({
      startAt: new Date("2026-07-20T10:00:00"),
      endAt: new Date("2026-07-20T11:00:00"),
      occupantType: "trackable-item",
      occupantId: book.id,
    });

    // `now` at the very end of the week means every possible placement
    // the Scheduler could find inside [weekStart, weekEnd) already counts
    // as "elapsed" relative to it, forcing the prune branch.
    await dismissCheckInAsMissed(past.id, weekStart, weekEnd, weekEnd);

    expect(await prisma.timeSlot.findUnique({ where: { id: past.id } })).toBeNull();
    const remaining = await prisma.timeSlot.findMany({ where: { occupantId: book.id } });
    expect(remaining).toEqual([]);
  });

  it("dismisses a deadline task's missed session without touching estimatedHours", async () => {
    const task = await createDeadlineTask({
      title: "Homework",
      dueAt: new Date(Date.now() + 5 * 24 * HOUR),
      estimatedHours: 4,
    });
    const now = new Date();
    const past = await createTimeSlot({
      startAt: new Date(now.getTime() - 2 * HOUR),
      endAt: new Date(now.getTime() - HOUR),
      occupantType: "deadline-task",
      occupantId: task.id,
    });

    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    const day = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() + (day === 0 ? -6 : 1 - day));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    await dismissCheckInAsMissed(past.id, weekStart, weekEnd);

    expect(await prisma.timeSlot.findUnique({ where: { id: past.id } })).toBeNull();
    const stillTask = await prisma.deadlineTask.findUnique({ where: { id: task.id } });
    expect(stillTask?.estimatedHours).toBe(4);
  });
});

describe("submitCheckIns", () => {
  it("processes a batch of yes/no answers in one call", async () => {
    const book = await createTrackableItem({
      title: "Deep Work",
      type: "book",
      unitCount: 10,
      estimatedDays: 5,
      status: "in-progress",
    });
    const course = await createTrackableItem({
      title: "Algorithms",
      type: "course",
      unitCount: 20,
      estimatedDays: 5,
      status: "in-progress",
    });
    const weekStart = new Date("2026-07-20T00:00:00");
    const weekEnd = new Date("2026-07-27T00:00:00");

    const yesSlot = await createTimeSlot({
      startAt: new Date("2026-07-20T09:00:00"),
      endAt: new Date("2026-07-20T10:00:00"),
      occupantType: "trackable-item",
      occupantId: book.id,
    });
    const noSlot = await createTimeSlot({
      startAt: new Date("2026-07-20T11:00:00"),
      endAt: new Date("2026-07-20T12:00:00"),
      occupantType: "trackable-item",
      occupantId: course.id,
    });

    await submitCheckIns(
      [
        { slotId: yesSlot.id, answer: "yes" },
        { slotId: noSlot.id, answer: "no" },
      ],
      weekStart,
      weekEnd,
      weekStart,
    );

    const confirmed = await prisma.timeSlot.findUnique({ where: { id: yesSlot.id } });
    expect(confirmed?.confirmedAt).toEqual(weekStart);
    expect(await prisma.timeSlot.findUnique({ where: { id: noSlot.id } })).toBeNull();
  });
});
