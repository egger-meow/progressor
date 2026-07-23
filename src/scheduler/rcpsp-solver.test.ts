import { describe, expect, it } from "vitest";
import { solveRCPSP } from "./rcpsp-solver";
import { planActivities, type Activity } from "./activity-planner";
import { createResourceCalendar } from "./resource-calendar";
import { addDays } from "./time";
import type { SchedulerTrackableItem, SchedulerDeadlineTask } from "./types";

const horizonStart = new Date("2026-07-20T00:00:00"); // Monday
const horizonEnd = addDays(horizonStart, 21); // 3 weeks, plenty of room

function trackableItem(overrides: Partial<SchedulerTrackableItem> = {}): SchedulerTrackableItem {
  return {
    id: "ti-1",
    title: "A Book",
    type: "book",
    priority: 1,
    status: "in-progress",
    unitCount: 10,
    unitsCompleted: 0,
    estimatedDays: 5,
    unitWeightMultiplier: 1,
    unitWeightOverrides: {},
    currentUnitSessionsCompleted: 0,
    ...overrides,
  };
}

function deadlineTask(overrides: Partial<SchedulerDeadlineTask> = {}): SchedulerDeadlineTask {
  return {
    id: "dt-1",
    title: "Homework",
    dueAt: new Date("2026-08-10T00:00:00"),
    estimatedHours: 3,
    ...overrides,
  };
}

function emptyCalendar(wipLimits: { type: "book" | "course"; maxInProgress: number }[] = []) {
  return createResourceCalendar([], wipLimits, new Map());
}

describe("solveRCPSP — precedence", () => {
  it("never places a chain's later session before an earlier one, or on the same day", () => {
    const activities = planActivities({
      trackableItems: [trackableItem({ unitCount: 3, unitsCompleted: 0 })],
      deadlineTasks: [],
      categoryScheduledTypes: new Set(),
      alreadyScheduledSessionsByItemId: {},
      alreadyScheduledHoursByTaskId: {},
      horizonStart,
    });
    const calendar = emptyCalendar([{ type: "book", maxInProgress: 3 }]);

    const { slots } = solveRCPSP(activities, calendar, horizonStart, horizonEnd);

    expect(slots).toHaveLength(3);
    const days = slots.map((s) => s.startAt.getTime()).sort((a, b) => a - b);
    expect(new Set(days.map((d) => new Date(d).toDateString())).size).toBe(3); // 3 distinct days
    expect(days[0]).toBeLessThan(days[1]);
    expect(days[1]).toBeLessThan(days[2]);
  });
});

describe("solveRCPSP — priority + WIP pool", () => {
  it("higher priority (lower number) not-started item wins the only pool slot when both chains outlast a short horizon", () => {
    // Both chains are far longer than the horizon can hold, so the pool
    // never frees mid-run — this isolates priority ordering under real
    // resource contention (a chain short enough to finish and release the
    // pool would let the lower-priority item through too, which is
    // correct WIP behavior, not what this test is about).
    const shortHorizonEnd = addDays(horizonStart, 5);
    const activities = planActivities({
      trackableItems: [
        trackableItem({ id: "high", status: "not-started", priority: 1, unitCount: 10 }),
        trackableItem({ id: "low", status: "not-started", priority: 2, unitCount: 10 }),
      ],
      deadlineTasks: [],
      categoryScheduledTypes: new Set(),
      alreadyScheduledSessionsByItemId: {},
      alreadyScheduledHoursByTaskId: {},
      horizonStart,
    });
    const calendar = emptyCalendar([{ type: "book", maxInProgress: 1 }]);

    const { slots, conflicts } = solveRCPSP(activities, calendar, horizonStart, shortHorizonEnd);

    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.occupantId === "high")).toBe(true);
    expect(conflicts).toEqual([]);
  });

  it("releases the pool once an in-progress item's chain completes, admitting the next promotable item", () => {
    const activities = planActivities({
      trackableItems: [
        trackableItem({ id: "active", status: "in-progress", unitCount: 1, unitsCompleted: 0 }),
        trackableItem({ id: "waiting", status: "not-started", priority: 5, unitCount: 1 }),
      ],
      deadlineTasks: [],
      categoryScheduledTypes: new Set(),
      alreadyScheduledSessionsByItemId: {},
      alreadyScheduledHoursByTaskId: {},
      horizonStart,
    });
    const calendar = createResourceCalendar(
      [],
      [{ type: "book", maxInProgress: 1 }],
      new Map([["book", 1]]), // "active" pre-reserves the only slot
    );

    const { slots } = solveRCPSP(activities, calendar, horizonStart, horizonEnd);

    const occupants = slots.map((s) => s.occupantId).sort();
    expect(occupants).toEqual(["active", "waiting"]);
  });

  it("leaves a promotable item permanently unplaced (no conflict) when the pool never frees", () => {
    const activities = planActivities({
      trackableItems: [
        // A long-running in-progress item that never finishes inside the
        // horizon, permanently holding the type's only slot.
        trackableItem({ id: "long", status: "in-progress", unitCount: 100, unitsCompleted: 0 }),
        trackableItem({ id: "queued", status: "not-started", priority: 5, unitCount: 1 }),
      ],
      deadlineTasks: [],
      categoryScheduledTypes: new Set(),
      alreadyScheduledSessionsByItemId: {},
      alreadyScheduledHoursByTaskId: {},
      horizonStart,
    });
    const calendar = createResourceCalendar(
      [],
      [{ type: "book", maxInProgress: 1 }],
      new Map([["book", 1]]),
    );

    const { slots, conflicts } = solveRCPSP(activities, calendar, horizonStart, horizonEnd);

    expect(slots.some((s) => s.occupantId === "queued")).toBe(false);
    expect(conflicts).toEqual([]);
  });
});

describe("solveRCPSP — Deadline Tasks", () => {
  it("spreads an hours budget across multiple distinct days with zero conflicts when it fits before dueAt", () => {
    const activities = planActivities({
      trackableItems: [],
      deadlineTasks: [deadlineTask({ estimatedHours: 10, dueAt: addDays(horizonStart, 14) })],
      categoryScheduledTypes: new Set(),
      alreadyScheduledSessionsByItemId: {},
      alreadyScheduledHoursByTaskId: {},
      horizonStart,
    });
    const calendar = emptyCalendar();

    const { slots, conflicts } = solveRCPSP(activities, calendar, horizonStart, horizonEnd);

    expect(slots).toHaveLength(5); // 10h / 2h chunks
    expect(conflicts).toEqual([]);
    const distinctDays = new Set(slots.map((s) => s.startAt.toDateString()));
    expect(distinctDays.size).toBe(5);
  });

  it("raises exactly one conflict for a task that cannot fit before its deadline, not one per chunk", () => {
    const activities = planActivities({
      trackableItems: [],
      deadlineTasks: [
        deadlineTask({ estimatedHours: 6, dueAt: addDays(horizonStart, 2) }), // 3 chunks needed, only 2 days available
      ],
      categoryScheduledTypes: new Set(),
      alreadyScheduledSessionsByItemId: {},
      alreadyScheduledHoursByTaskId: {},
      horizonStart,
    });
    const calendar = emptyCalendar();

    const { slots, conflicts } = solveRCPSP(activities, calendar, horizonStart, horizonEnd);

    expect(slots).toHaveLength(2); // whatever fit is still placed
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].occupantId).toBe("dt-1");
    expect(conflicts[0].reason).toBe("deadline-task-unplaceable");
  });
});

describe("solveRCPSP — re-entrancy", () => {
  it("an occupant whose remaining work is already fully covered produces zero additional Activities/placements", () => {
    const activities = planActivities({
      trackableItems: [trackableItem({ unitCount: 3, unitsCompleted: 3 })],
      deadlineTasks: [deadlineTask({ estimatedHours: 3 })],
      categoryScheduledTypes: new Set(),
      alreadyScheduledSessionsByItemId: { "ti-1": 0 },
      alreadyScheduledHoursByTaskId: { "dt-1": 3 },
      horizonStart,
    });

    expect(activities).toEqual([]);

    const { slots, conflicts } = solveRCPSP(
      activities as Activity[],
      emptyCalendar(),
      horizonStart,
      horizonEnd,
    );
    expect(slots).toEqual([]);
    expect(conflicts).toEqual([]);
  });
});
