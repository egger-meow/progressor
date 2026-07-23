import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { createTrackableItem } from "./trackable-items";
import { createDeadlineTask } from "./semester-commitments";
import { createTimeSlot } from "./time-slots";
import {
  computeHorizonWeeks,
  buildHorizonSchedulerInput,
  runSchedulerForHorizon,
} from "./scheduler-runs";
import { DEFAULT_HORIZON_WEEKS, MAX_HORIZON_WEEKS } from "../scheduler";

afterEach(async () => {
  await prisma.timeSlot.deleteMany();
  await prisma.trackableItem.deleteMany();
  await prisma.deadlineTask.deleteMany();
  await prisma.semester.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const DAY_MS = 24 * 60 * 60 * 1000;
const horizonStart = new Date("2026-07-20T00:00:00"); // Monday

describe("computeHorizonWeeks", () => {
  it("defaults to DEFAULT_HORIZON_WEEKS when nothing extends further", () => {
    expect(computeHorizonWeeks(horizonStart, [], null)).toBe(DEFAULT_HORIZON_WEEKS);
  });

  it("extends to cover a Deadline Task due further out than the default", () => {
    const dueAt = new Date(horizonStart.getTime() + (DEFAULT_HORIZON_WEEKS + 5) * 7 * DAY_MS);
    const weeks = computeHorizonWeeks(horizonStart, [{ id: "dt-1", title: "x", dueAt, estimatedHours: 1 }], null);
    expect(weeks).toBeGreaterThanOrEqual(DEFAULT_HORIZON_WEEKS + 5);
  });

  it("extends to cover a configured Semester's end", () => {
    const semester = { startDate: horizonStart, weekCount: DEFAULT_HORIZON_WEEKS + 8 };
    const weeks = computeHorizonWeeks(horizonStart, [], semester);
    expect(weeks).toBeGreaterThanOrEqual(DEFAULT_HORIZON_WEEKS + 8);
  });

  it("caps at MAX_HORIZON_WEEKS even for a due date years out", () => {
    const dueAt = new Date(horizonStart.getTime() + 200 * 7 * DAY_MS);
    const weeks = computeHorizonWeeks(horizonStart, [{ id: "dt-1", title: "x", dueAt, estimatedHours: 1 }], null);
    expect(weeks).toBe(MAX_HORIZON_WEEKS);
  });
});

describe("buildHorizonSchedulerInput", () => {
  it("derives alreadyScheduledSessionsByItemId by counting real Time Slots across the horizon", async () => {
    const book = await createTrackableItem({
      title: "Deep Work",
      type: "book",
      unitCount: 10,
      estimatedDays: 5,
      status: "in-progress",
    });
    await createTimeSlot({
      startAt: new Date("2026-07-21T09:00:00"),
      endAt: new Date("2026-07-21T10:00:00"),
      occupantType: "trackable-item",
      occupantId: book.id,
    });
    await createTimeSlot({
      startAt: new Date("2026-07-28T09:00:00"),
      endAt: new Date("2026-07-28T10:00:00"),
      occupantType: "trackable-item",
      occupantId: book.id,
    });

    const input = await buildHorizonSchedulerInput(horizonStart);

    expect(input.alreadyScheduledSessionsByItemId[book.id]).toBe(2);
  });

  it("derives alreadyScheduledHoursByTaskId by summing Time Slot durations across the horizon", async () => {
    const task = await createDeadlineTask({
      title: "Homework",
      dueAt: new Date("2026-09-01T00:00:00"),
      estimatedHours: 6,
    });
    await createTimeSlot({
      startAt: new Date("2026-07-21T09:00:00"),
      endAt: new Date("2026-07-21T11:00:00"), // 2h
      occupantType: "deadline-task",
      occupantId: task.id,
    });
    await createTimeSlot({
      startAt: new Date("2026-07-22T09:00:00"),
      endAt: new Date("2026-07-22T10:30:00"), // 1.5h
      occupantType: "deadline-task",
      occupantId: task.id,
    });

    const input = await buildHorizonSchedulerInput(horizonStart);

    expect(input.alreadyScheduledHoursByTaskId[task.id]).toBe(3.5);
  });

  it("extends horizonWeeks to cover a real far-future Deadline Task", async () => {
    await createDeadlineTask({
      title: "Thesis",
      dueAt: new Date(horizonStart.getTime() + (DEFAULT_HORIZON_WEEKS + 3) * 7 * DAY_MS),
      estimatedHours: 20,
    });

    const input = await buildHorizonSchedulerInput(horizonStart);

    expect(input.horizonWeeks).toBeGreaterThanOrEqual(DEFAULT_HORIZON_WEEKS + 3);
  });
});

describe("runSchedulerForHorizon", () => {
  it("persists slots spanning multiple future weeks and is idempotent on a second run", async () => {
    await createTrackableItem({
      title: "Deep Work",
      type: "book",
      unitCount: 3,
      estimatedDays: 5,
      status: "in-progress",
    });

    const first = await runSchedulerForHorizon(horizonStart);
    expect(first.createdSlotIds.length).toBeGreaterThan(0);

    const second = await runSchedulerForHorizon(horizonStart);
    expect(second.createdSlotIds).toEqual([]); // nothing left to fill
  });
});
