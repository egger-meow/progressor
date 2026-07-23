import { describe, expect, it } from "vitest";
import { planActivities, type ActivityPlannerInput } from "./activity-planner";
import { SESSION_DURATION_MS } from "./constants";
import type { SchedulerTrackableItem, SchedulerDeadlineTask } from "./types";

const horizonStart = new Date("2026-07-20T00:00:00"); // Monday

function baseInput(overrides: Partial<ActivityPlannerInput> = {}): ActivityPlannerInput {
  return {
    trackableItems: [],
    deadlineTasks: [],
    categoryScheduledTypes: new Set(),
    alreadyScheduledSessionsByItemId: {},
    alreadyScheduledHoursByTaskId: {},
    horizonStart,
    ...overrides,
  };
}

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

describe("planActivities — Trackable Items", () => {
  it("emits one chained Activity per remaining session, resourcePool = item.type", () => {
    const input = baseInput({
      trackableItems: [trackableItem({ unitCount: 3, unitsCompleted: 0 })],
    });

    const activities = planActivities(input);

    expect(activities).toHaveLength(3);
    expect(activities.map((a) => a.id)).toEqual([
      "ti-1:session:0",
      "ti-1:session:1",
      "ti-1:session:2",
    ]);
    expect(activities[0].precedingActivityId).toBeNull();
    expect(activities[1].precedingActivityId).toBe("ti-1:session:0");
    expect(activities[2].precedingActivityId).toBe("ti-1:session:1");
    expect(activities[2].isLastInChain).toBe(true);
    expect(activities.every((a) => a.resourcePool === "book")).toBe(true);
    expect(activities.every((a) => a.durationMs === SESSION_DURATION_MS)).toBe(true);
  });

  it("subtracts unitsCompleted and already-scheduled sessions from the remaining chain", () => {
    const input = baseInput({
      trackableItems: [trackableItem({ unitCount: 10, unitsCompleted: 4 })],
      alreadyScheduledSessionsByItemId: { "ti-1": 2 },
    });

    const activities = planActivities(input);

    expect(activities).toHaveLength(4); // 10 - 4 - 2
  });

  it("gates only a not-started/paused item's chain-head on pool capacity, never an in-progress one", () => {
    const input = baseInput({
      trackableItems: [
        trackableItem({ id: "in-progress", status: "in-progress", unitCount: 2 }),
        trackableItem({ id: "not-started", status: "not-started", unitCount: 2 }),
      ],
    });

    const activities = planActivities(input);
    const inProgressHead = activities.find((a) => a.id === "in-progress:session:0")!;
    const notStartedHead = activities.find((a) => a.id === "not-started:session:0")!;
    const notStartedTail = activities.find((a) => a.id === "not-started:session:1")!;

    expect(inProgressHead.gatedByPoolCapacity).toBe(false);
    expect(notStartedHead.gatedByPoolCapacity).toBe(true);
    expect(notStartedTail.gatedByPoolCapacity).toBe(false);
  });

  it("skips a done item and an item whose type has a CategoryItemSchedule", () => {
    const input = baseInput({
      trackableItems: [
        trackableItem({ id: "done", status: "done", unitCount: 5, unitsCompleted: 5 }),
        trackableItem({ id: "category-scheduled", type: "course" }),
      ],
      categoryScheduledTypes: new Set(["course"]),
    });

    expect(planActivities(input)).toEqual([]);
  });

  it("emits no Activities once remaining sessions reach zero", () => {
    const input = baseInput({
      trackableItems: [trackableItem({ unitCount: 3, unitsCompleted: 3 })],
    });

    expect(planActivities(input)).toEqual([]);
  });

  it("gives an overridden unit its own session count instead of the flat baseline", () => {
    // Baseline 1x; unit 2 (the only one still remaining) overridden to 3x.
    const input = baseInput({
      trackableItems: [
        trackableItem({
          unitCount: 3,
          unitsCompleted: 1,
          unitWeightMultiplier: 1,
          unitWeightOverrides: { 2: 3 },
        }),
      ],
    });

    const activities = planActivities(input);

    // unit 2 (override 3x) + unit 3 (baseline 1x) = 4 sessions total.
    expect(activities).toHaveLength(4);
    expect(activities.map((a) => a.id)).toEqual([
      "ti-1:session:0",
      "ti-1:session:1",
      "ti-1:session:2",
      "ti-1:session:3",
    ]);
  });

  it("subtracts currentUnitSessionsCompleted from the current unit's own (overridden) session budget", () => {
    const input = baseInput({
      trackableItems: [
        trackableItem({
          unitCount: 2,
          unitsCompleted: 0,
          unitWeightOverrides: { 1: 3 },
          currentUnitSessionsCompleted: 2, // 2 of the current unit's 3 sessions already logged
        }),
      ],
    });

    const activities = planActivities(input);

    // 1 remaining session for unit 1 (3 - 2) + 1 for unit 2 (baseline) = 2.
    expect(activities).toHaveLength(2);
  });
});

describe("planActivities — Deadline Tasks", () => {
  it("chunks estimatedHours into SESSION_DURATION_MS pieces, chained, dueDate on every chunk", () => {
    const input = baseInput({
      deadlineTasks: [deadlineTask({ estimatedHours: 5 })], // SESSION_DURATION_MS = 2h -> 2,2,1
    });

    const activities = planActivities(input);

    expect(activities).toHaveLength(3);
    expect(activities.map((a) => a.durationMs)).toEqual([
      SESSION_DURATION_MS,
      SESSION_DURATION_MS,
      1 * 60 * 60 * 1000,
    ]);
    expect(activities.every((a) => a.dueDate?.getTime() === input.deadlineTasks[0].dueAt.getTime())).toBe(
      true,
    );
    expect(activities.every((a) => a.resourcePool === null)).toBe(true);
    expect(activities.every((a) => a.gatedByPoolCapacity === false)).toBe(true);
    expect(activities[1].precedingActivityId).toBe("dt-1:chunk:0");
  });

  it("folds a too-small final sliver into the previous chunk instead of leaving it standalone", () => {
    // 4.25h -> 2h, 2h, 0.25h(=15min, below MIN_DEADLINE_SESSION_MS=30min)
    const input = baseInput({ deadlineTasks: [deadlineTask({ estimatedHours: 4.25 })] });

    const activities = planActivities(input);

    expect(activities).toHaveLength(2);
    expect(activities[1].durationMs).toBe(SESSION_DURATION_MS + 15 * 60 * 1000);
  });

  it("subtracts already-scheduled hours before chunking", () => {
    const input = baseInput({
      deadlineTasks: [deadlineTask({ estimatedHours: 3 })],
      alreadyScheduledHoursByTaskId: { "dt-1": 3 },
    });

    expect(planActivities(input)).toEqual([]);
  });
});
