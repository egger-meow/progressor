import { describe, expect, it } from "vitest";
import { computeHorizonSchedule, type HorizonSchedulerInput } from "./horizon";
import type {
  SchedulerFixedCommitment,
  SchedulerTrackableItem,
  SchedulerCategoryItemSchedule,
} from "./types";

const horizonStart = new Date("2026-07-20T00:00:00"); // Monday

function baseInput(overrides: Partial<HorizonSchedulerInput> = {}): HorizonSchedulerInput {
  return {
    horizonStart,
    horizonWeeks: 3,
    trackableItems: [],
    routines: [],
    fixedCommitments: [],
    deadlineTasks: [],
    categoryItemSchedules: [],
    adHocEvents: [],
    wipLimits: [],
    existingSlots: [],
    semester: null,
    alreadyScheduledSessionsByItemId: {},
    alreadyScheduledHoursByTaskId: {},
    ...overrides,
  };
}

function fixedCommitment(
  overrides: Partial<SchedulerFixedCommitment> = {},
): SchedulerFixedCommitment {
  return {
    id: "fc-1",
    title: "Class",
    dayOfWeek: 1, // Monday
    startTime: "09:00",
    endTime: "10:00",
    ignoreSemesterBounds: true,
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

function categorySchedule(
  overrides: Partial<SchedulerCategoryItemSchedule> = {},
): SchedulerCategoryItemSchedule {
  return {
    type: "book",
    cadence: "weekly",
    anchor: [1], // Monday
    timeOfDayPreferences: [],
    preferredStartTime: null,
    durationMinutes: 60,
    ...overrides,
  };
}

describe("computeHorizonSchedule", () => {
  it("places a Fixed Commitment once per week across the whole horizon", () => {
    const input = baseInput({
      fixedCommitments: [fixedCommitment()],
      horizonWeeks: 3,
    });

    const output = computeHorizonSchedule(input);

    const fcSlots = output.slots.filter((s) => s.occupantType === "fixed-commitment");
    expect(fcSlots).toHaveLength(3);
  });

  it("spreads a flexible Trackable Item's remaining sessions across the whole horizon, not just one", () => {
    const input = baseInput({
      trackableItems: [trackableItem({ unitCount: 5, unitsCompleted: 0 })],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
      horizonWeeks: 3, // 21 days, plenty of room for 5 sessions
    });

    const output = computeHorizonSchedule(input);

    const itemSlots = output.slots.filter(
      (s) => s.occupantType === "trackable-item" && s.occupantId === "ti-1",
    );
    expect(itemSlots).toHaveLength(5);
    expect(output.conflicts).toEqual([]);
  });

  it("stops a category-scheduled item's occurrences once its own remaining-chapter budget is exhausted", () => {
    // Project owner, 2026-07-23: a 13-chapter book with a shared daily
    // book slot kept getting a NEW session every single day forever,
    // because this placer never checked unitCount against how many
    // sessions it had already handed out — 157 sessions for a 13-chapter
    // book, running months past when it should've finished. Weekly
    // cadence here so the fix is exercised across the horizon.ts week
    // loop (categoryScheduledCounts threading), not just within one call.
    const input = baseInput({
      categoryItemSchedules: [categorySchedule()],
      trackableItems: [trackableItem({ unitCount: 1, unitsCompleted: 0 })], // only 1 unit total
      wipLimits: [{ type: "book", maxInProgress: 3 }],
      horizonWeeks: 3,
    });

    const output = computeHorizonSchedule(input);

    // Weekly cadence, anchored Monday, across 3 weeks would fire 3 times,
    // but the item only has 1 chapter left — must stop after 1.
    const itemSlots = output.slots.filter(
      (s) => s.occupantType === "trackable-item" && s.occupantId === "ti-1",
    );
    expect(itemSlots).toHaveLength(1);
  });

  it("keeps a category-scheduled item going across weeks until its own remaining-chapter budget runs out, not before", () => {
    const input = baseInput({
      categoryItemSchedules: [categorySchedule()],
      trackableItems: [trackableItem({ unitCount: 2, unitsCompleted: 0 })], // 2 units -> 2 sessions
      wipLimits: [{ type: "book", maxInProgress: 3 }],
      horizonWeeks: 3,
    });

    const output = computeHorizonSchedule(input);

    const itemSlots = output.slots.filter(
      (s) => s.occupantType === "trackable-item" && s.occupantId === "ti-1",
    );
    expect(itemSlots).toHaveLength(2);
  });

  it("is idempotent: already-scheduled sessions/occurrences are not duplicated on a re-run", () => {
    const input = baseInput({
      fixedCommitments: [fixedCommitment()],
      trackableItems: [trackableItem({ unitCount: 2, unitsCompleted: 0 })],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
      horizonWeeks: 2,
      existingSlots: [
        {
          id: "existing-fc",
          startAt: new Date("2026-07-20T09:00:00"),
          endAt: new Date("2026-07-20T10:00:00"),
          occupantType: "fixed-commitment",
          occupantId: "fc-1",
        },
      ],
      alreadyScheduledSessionsByItemId: { "ti-1": 1 },
    });

    const output = computeHorizonSchedule(input);

    const fcSlots = output.slots.filter((s) => s.occupantType === "fixed-commitment");
    expect(fcSlots).toHaveLength(1); // week 2's occurrence only; week 1's already existed

    const itemSlots = output.slots.filter(
      (s) => s.occupantType === "trackable-item" && s.occupantId === "ti-1",
    );
    expect(itemSlots).toHaveLength(1); // 2 total - 1 already scheduled
  });
});
