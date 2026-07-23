import { describe, expect, it } from "vitest";
import { placeFlexibleTrackableItems } from "./flexible-placement";
import type { KindedInterval } from "./objective";
import type { SchedulerInput, SchedulerTrackableItem } from "./types";

const weekStart = new Date("2026-07-13T00:00:00"); // Monday
const weekEnd = new Date("2026-07-20T00:00:00");

function baseInput(overrides: Partial<SchedulerInput> = {}): SchedulerInput {
  return {
    weekStart,
    weekEnd,
    trackableItems: [],
    routines: [],
    fixedCommitments: [],
    deadlineTasks: [],
    categoryItemSchedules: [],
    adHocEvents: [],
    wipLimits: [],
    existingSlots: [],
    semester: null,
    ...overrides,
  };
}

// Avoid Date#toISOString for local-date formatting in these fixtures --
// it converts to UTC and can shift the calendar day depending on the
// machine's timezone, unlike getFullYear/getMonth/getDate.
function dateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function trackableItem(overrides: Partial<SchedulerTrackableItem> = {}): SchedulerTrackableItem {
  return {
    id: "ti-1",
    title: "A Book",
    type: "book",
    priority: 1,
    status: "not-started",
    unitCount: 10,
    unitsCompleted: 0,
    estimatedDays: 5,
    unitWeightMultiplier: 1,
    unitWeightOverrides: {},
    currentUnitSessionsCompleted: 0,
    ...overrides,
  };
}

describe("placeFlexibleTrackableItems", () => {
  it("places a session for an already in-progress item", () => {
    const input = baseInput({
      trackableItems: [trackableItem({ status: "in-progress" })],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });

    const result = placeFlexibleTrackableItems(input, []);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T08:00:00"),
        endAt: new Date("2026-07-13T10:00:00"),
        occupantType: "trackable-item",
        occupantId: "ti-1",
      },
    ]);
  });

  it("does not place a second session for an item that already has one this week (re-run idempotency)", () => {
    const input = baseInput({
      trackableItems: [trackableItem({ status: "in-progress" })],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
      existingSlots: [
        {
          id: "ts-1",
          startAt: new Date("2026-07-14T08:00:00"),
          endAt: new Date("2026-07-14T10:00:00"),
          occupantType: "trackable-item",
          occupantId: "ti-1",
        },
      ],
    });

    const result = placeFlexibleTrackableItems(input, []);

    expect(result.slots).toEqual([]);
  });

  it("promotes only the highest-priority not-started item up to the WIP Limit", () => {
    const input = baseInput({
      trackableItems: [
        trackableItem({ id: "ti-low-priority", priority: 2 }),
        trackableItem({ id: "ti-high-priority", priority: 1 }),
      ],
      wipLimits: [{ type: "book", maxInProgress: 1 }],
    });

    const result = placeFlexibleTrackableItems(input, []);

    expect(result.slots).toHaveLength(1);
    expect(result.slots[0].occupantId).toBe("ti-high-priority");
  });

  it("gives book and course independent WIP Limit capacity", () => {
    const input = baseInput({
      trackableItems: [
        trackableItem({ id: "book-1", type: "book" }),
        trackableItem({ id: "course-1", type: "course" }),
      ],
      wipLimits: [
        { type: "book", maxInProgress: 1 },
        { type: "course", maxInProgress: 1 },
      ],
    });

    const result = placeFlexibleTrackableItems(input, []);

    expect(result.slots.map((s) => s.occupantId).sort()).toEqual(["book-1", "course-1"]);
  });

  it("always includes already in-progress items even if that exceeds the current WIP Limit", () => {
    const input = baseInput({
      trackableItems: [
        trackableItem({ id: "ti-1", status: "in-progress", priority: 1 }),
        trackableItem({ id: "ti-2", status: "in-progress", priority: 2 }),
      ],
      wipLimits: [{ type: "book", maxInProgress: 1 }],
    });

    const result = placeFlexibleTrackableItems(input, []);

    expect(result.slots.map((s) => s.occupantId).sort()).toEqual(["ti-1", "ti-2"]);
  });

  it("places higher-priority items first, and lets day-balance spread the next one to a still-empty day", () => {
    // Both candidates start with an identical, maximally-good free-block
    // score (a fully empty 08:00-23:00 day) since nothing is busy yet, so
    // ties resolve to the earliest day in search order -- ti-first lands
    // Monday 08:00. Once ti-first occupies part of Monday, every other day
    // is *more* empty than Monday (objective.ts's daily-balance term), so
    // ti-second is steered to Tuesday instead of stacking onto Monday's
    // remaining 10:00-23:00 gap the way plain first-fit packing would have
    // done -- this is the intended "optimize for the best schedule, not
    // just a valid one" behavior (project owner, 2026-07-22 /goal), not a
    // regression: priority still decides placement *order*, but "best slot"
    // now also accounts for spreading load across the week.
    const input = baseInput({
      trackableItems: [
        trackableItem({ id: "ti-second", status: "in-progress", priority: 2 }),
        trackableItem({ id: "ti-first", status: "in-progress", priority: 1 }),
      ],
      wipLimits: [{ type: "book", maxInProgress: 5 }],
    });

    const result = placeFlexibleTrackableItems(input, []);

    const first = result.slots.find((s) => s.occupantId === "ti-first")!;
    const second = result.slots.find((s) => s.occupantId === "ti-second")!;
    expect(first.startAt).toEqual(new Date("2026-07-13T08:00:00")); // Monday
    expect(second.startAt).toEqual(new Date("2026-07-14T08:00:00")); // Tuesday
  });

  it("respects the daily Slack minimum, skipping to the next day once a day is packed enough", () => {
    const input = baseInput({
      trackableItems: [trackableItem({ status: "in-progress" })],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });
    // 10.5h already used out of the 15h window -- adding a 2h session
    // would exceed the 80% (12h) Slack budget.
    const busy = [
      { start: new Date("2026-07-13T08:00:00"), end: new Date("2026-07-13T18:30:00") },
    ];

    const result = placeFlexibleTrackableItems(input, busy);

    expect(result.slots).toHaveLength(1);
    expect(dateParam(result.slots[0].startAt)).toBe("2026-07-14");
  });

  it("does not double-book time already claimed by a hard constraint or Routine", () => {
    const input = baseInput({
      trackableItems: [trackableItem({ status: "in-progress" })],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });
    const busy = [
      { start: new Date("2026-07-13T08:00:00"), end: new Date("2026-07-13T10:00:00") },
    ];

    const result = placeFlexibleTrackableItems(input, busy);

    // The core invariant this test protects: never overlaps the busy
    // interval, on any day. Where exactly it lands beyond that is
    // objective.ts's call -- here, Monday's remaining 10:00-23:00 gap and
    // every other day's fully-empty 08:00-23:00 window both score a
    // maximal free-block, so the daily-balance term picks the emptier day
    // (Tuesday) over Monday's partially-used one, same reasoning as the
    // priority-order test above.
    for (const slot of result.slots) {
      const overlapsHardConstraint =
        slot.startAt < busy[0].end && busy[0].start < slot.endAt;
      expect(overlapsHardConstraint).toBe(false);
    }
    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-14T08:00:00"),
        endAt: new Date("2026-07-14T10:00:00"),
        occupantType: "trackable-item",
        occupantId: "ti-1",
      },
    ]);
  });

  it("silently gives no session to an item with no room anywhere this week", () => {
    const input = baseInput({
      trackableItems: [trackableItem({ status: "in-progress" })],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });
    const busy = Array.from({ length: 7 }, (_, offset) => {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + offset);
      const param = dateParam(day);
      return {
        start: new Date(`${param}T08:00:00`),
        end: new Date(`${param}T23:00:00`),
      };
    });

    const result = placeFlexibleTrackableItems(input, busy);

    expect(result.slots).toEqual([]);
  });

  it("picks a gap that preserves free time over an earlier gap it would fill exactly, when both are on the only available day", () => {
    // Monday's window (08:00-23:00) is carved into two gaps by one busy
    // block: gap1 = 08:00-10:00 (exactly 2h -- fits the session with zero
    // leftover) and gap2 = 13:40-23:00 (9h20m -- fits with a large, useful
    // leftover). Plain first-fit would take gap1 (the earlier one) since
    // it's found first; objective.ts's free-block term scores gap2 higher
    // (leftoverMs 0 vs. ~7h20m), so the optimizer takes gap2 instead. Every
    // other day is filled solid so this isolates the choice to these two
    // gaps rather than day-balance picking a different day entirely.
    const input = baseInput({
      trackableItems: [trackableItem({ status: "in-progress" })],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });
    const otherDaysFull = Array.from({ length: 6 }, (_, offset) => {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + offset + 1);
      const param = dateParam(day);
      return {
        start: new Date(`${param}T08:00:00`),
        end: new Date(`${param}T23:00:00`),
      };
    });
    const busy = [
      { start: new Date("2026-07-13T10:00:00"), end: new Date("2026-07-13T13:40:00") },
      ...otherDaysFull,
    ];

    const result = placeFlexibleTrackableItems(input, busy);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T13:40:00"),
        endAt: new Date("2026-07-13T15:40:00"),
        occupantType: "trackable-item",
        occupantId: "ti-1",
      },
    ]);
  });

  it("avoids a gap that's back-to-back with a different-kind occupant when an equally-good gap without one exists (ContextSwitching)", () => {
    // Monday's window is carved into two gaps, both leftover 310min (well
    // past the free-block cap, so they tie on that term) and both on the
    // same day (tying on daily-balance too) -- the only difference is what
    // touches each gap's start: gap1 is preceded by a Fixed Commitment (a
    // genuine activity switch), gap2 is preceded by another Trackable Item
    // session (continuity, never penalized). Every other day is filled
    // solid so day-balance can't be the explanation for whichever gap
    // wins.
    const input = baseInput({
      trackableItems: [trackableItem({ status: "in-progress" })],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });
    const fixedCommitmentBlock = {
      start: new Date("2026-07-13T08:00:00"),
      end: new Date("2026-07-13T08:20:00"),
    };
    const anotherTrackableItemSession = {
      start: new Date("2026-07-13T15:30:00"),
      end: new Date("2026-07-13T15:50:00"),
    };
    const otherDaysFull = Array.from({ length: 6 }, (_, offset) => {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + offset + 1);
      const param = dateParam(day);
      return {
        start: new Date(`${param}T08:00:00`),
        end: new Date(`${param}T23:00:00`),
      };
    });
    const busy = [fixedCommitmentBlock, anotherTrackableItemSession, ...otherDaysFull];
    const kindedBusy: KindedInterval[] = [
      { ...fixedCommitmentBlock, occupantType: "fixed-commitment" },
      { ...anotherTrackableItemSession, occupantType: "trackable-item" },
      ...otherDaysFull.map((interval) => ({ ...interval, occupantType: "fixed-commitment" as const })),
    ];

    const result = placeFlexibleTrackableItems(input, busy, kindedBusy);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T15:50:00"),
        endAt: new Date("2026-07-13T17:50:00"),
        occupantType: "trackable-item",
        occupantId: "ti-1",
      },
    ]);
  });
});
