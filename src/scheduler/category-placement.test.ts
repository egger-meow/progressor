import { describe, expect, it } from "vitest";
import { placeCategoryItemSchedules } from "./category-placement";
import type { SchedulerCategoryItemSchedule, SchedulerInput, SchedulerTrackableItem } from "./types";

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

function schedule(
  overrides: Partial<SchedulerCategoryItemSchedule> = {},
): SchedulerCategoryItemSchedule {
  return {
    type: "book",
    cadence: "daily",
    anchor: null,
    timeOfDayPreferences: [],
    preferredStartTime: null,
    durationMinutes: 120,
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

describe("placeCategoryItemSchedules", () => {
  it("places a daily schedule once per day, at the window start with no preference set", () => {
    const input = baseInput({
      categoryItemSchedules: [schedule({ cadence: "daily" })],
      trackableItems: [trackableItem()],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });

    const result = placeCategoryItemSchedules(input, []);

    expect(result.slots).toHaveLength(5);
    expect(result.slots[0]).toEqual({
      startAt: new Date("2026-07-13T08:00:00"),
      endAt: new Date("2026-07-13T10:00:00"),
      occupantType: "trackable-item",
      occupantId: "ti-1",
    });
  });

  it("places a weekly schedule only on its anchor weekdays", () => {
    const input = baseInput({
      categoryItemSchedules: [schedule({ cadence: "weekly", anchor: [1, 3] })], // Mon, Wed
      trackableItems: [trackableItem()],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });

    const result = placeCategoryItemSchedules(input, []);

    expect(result.slots).toHaveLength(2);
    expect(result.slots[0].startAt).toEqual(new Date("2026-07-13T08:00:00")); // Monday
    expect(result.slots[1].startAt).toEqual(new Date("2026-07-15T08:00:00")); // Wednesday
  });

  it("all eligible items of a type share the identical window for a given occurrence, not separate carve-outs", () => {
    const input = baseInput({
      categoryItemSchedules: [schedule({ cadence: "daily" })],
      trackableItems: [
        trackableItem({ id: "book-a", priority: 1, status: "in-progress" }),
        trackableItem({ id: "book-b", priority: 2, status: "in-progress" }),
      ],
      wipLimits: [{ type: "book", maxInProgress: 2 }],
    });

    const result = placeCategoryItemSchedules(input, []);

    const monday = result.slots.filter(
      (s) => s.startAt.getTime() === new Date("2026-07-13T08:00:00").getTime(),
    );
    expect(monday).toHaveLength(2);
    expect(monday.map((s) => s.occupantId).sort()).toEqual(["book-a", "book-b"]);
    // Both share the exact same window, not two different times.
    expect(monday[0].startAt).toEqual(monday[1].startAt);
    expect(monday[0].endAt).toEqual(monday[1].endAt);
  });

  it("respects the WIP Limit: a not-started item beyond capacity never gets co-scheduled", () => {
    const input = baseInput({
      categoryItemSchedules: [schedule({ cadence: "daily" })],
      trackableItems: [
        trackableItem({ id: "book-a", priority: 1, status: "in-progress" }),
        trackableItem({ id: "book-b", priority: 2, status: "not-started" }),
      ],
      wipLimits: [{ type: "book", maxInProgress: 1 }], // already at cap via book-a
    });

    const result = placeCategoryItemSchedules(input, []);

    expect(result.slots.every((s) => s.occupantId === "book-a")).toBe(true);
    expect(result.slots.some((s) => s.occupantId === "book-b")).toBe(false);
  });

  it("silently skips a schedule with no eligible items this run (soft preference, no conflict)", () => {
    const input = baseInput({
      categoryItemSchedules: [schedule({ cadence: "daily" })],
      trackableItems: [],
    });

    const result = placeCategoryItemSchedules(input, []);

    expect(result.slots).toEqual([]);
  });

  it("does not re-place an item that already has a Time Slot that day (re-run idempotency)", () => {
    const input = baseInput({
      categoryItemSchedules: [schedule({ cadence: "weekly", anchor: [1, 3] })], // Mon, Wed
      trackableItems: [trackableItem()],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
      existingSlots: [
        {
          id: "ts-1",
          startAt: new Date("2026-07-13T08:00:00"),
          endAt: new Date("2026-07-13T10:00:00"),
          occupantType: "trackable-item",
          occupantId: "ti-1",
        },
      ],
    });

    const result = placeCategoryItemSchedules(input, []);

    expect(result.slots).toHaveLength(1);
    expect(result.slots[0].startAt).toEqual(new Date("2026-07-15T08:00:00")); // only Wednesday re-placed
  });

  it("fills in a newly-eligible item mid-week even when another item already has a slot that day", () => {
    const input = baseInput({
      categoryItemSchedules: [schedule({ cadence: "daily" })],
      trackableItems: [
        trackableItem({ id: "book-a", priority: 1, status: "in-progress" }),
        trackableItem({ id: "book-b", priority: 2, status: "in-progress" }),
      ],
      wipLimits: [{ type: "book", maxInProgress: 2 }],
      existingSlots: [
        {
          id: "ts-1",
          startAt: new Date("2026-07-13T08:00:00"),
          endAt: new Date("2026-07-13T10:00:00"),
          occupantType: "trackable-item",
          occupantId: "book-a",
        },
      ],
    });

    const result = placeCategoryItemSchedules(input, []);

    const monday = result.slots.filter(
      (s) => s.startAt.getTime() === new Date("2026-07-13T08:00:00").getTime(),
    );
    expect(monday).toHaveLength(1);
    expect(monday[0].occupantId).toBe("book-b");
  });

  it("prefers the Time-of-Day Preference sub-window when it has room", () => {
    const input = baseInput({
      categoryItemSchedules: [
        schedule({ cadence: "weekly", anchor: [1], timeOfDayPreferences: ["evening"] }),
      ],
      trackableItems: [trackableItem()],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });

    const result = placeCategoryItemSchedules(input, []);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T17:00:00"),
        endAt: new Date("2026-07-13T19:00:00"),
        occupantType: "trackable-item",
        occupantId: "ti-1",
      },
    ]);
  });

  it("still starts inside the Time-of-Day Preference bucket when duration is longer than the bucket itself", () => {
    // Regression: evening's bucket is 17:00-20:00 (180min). A 200min session
    // can never fit entirely inside it, so the search must not require
    // ending by the bucket's own end — it should still start at 17:00 and
    // run past 20:00, rather than silently failing the bucket search and
    // falling through to the full-day fallback (which would ignore the
    // preference entirely and land at 08:00 — project owner, 2026-07-22).
    const input = baseInput({
      categoryItemSchedules: [
        schedule({ cadence: "weekly", anchor: [1], timeOfDayPreferences: ["evening"], durationMinutes: 200 }),
      ],
      trackableItems: [trackableItem()],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });

    const result = placeCategoryItemSchedules(input, []);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T17:00:00"),
        endAt: new Date("2026-07-13T20:20:00"),
        occupantType: "trackable-item",
        occupantId: "ti-1",
      },
    ]);
  });

  it("places exactly at preferredStartTime when that slot is free", () => {
    const input = baseInput({
      categoryItemSchedules: [
        schedule({ cadence: "weekly", anchor: [1], preferredStartTime: "14:30" }),
      ],
      trackableItems: [trackableItem()],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });

    const result = placeCategoryItemSchedules(input, []);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T14:30:00"),
        endAt: new Date("2026-07-13T16:30:00"),
        occupantType: "trackable-item",
        occupantId: "ti-1",
      },
    ]);
  });

  it("falls back to the full daily window when the preferred sub-window has no room", () => {
    const input = baseInput({
      categoryItemSchedules: [
        schedule({ cadence: "weekly", anchor: [1], timeOfDayPreferences: ["evening"] }),
      ],
      trackableItems: [trackableItem()],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });
    const busy = [
      { start: new Date("2026-07-13T08:00:00"), end: new Date("2026-07-13T20:00:00") },
    ];

    const result = placeCategoryItemSchedules(input, busy);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T20:00:00"),
        endAt: new Date("2026-07-13T22:00:00"),
        occupantType: "trackable-item",
        occupantId: "ti-1",
      },
    ]);
  });

  it("silently skips an occurrence with no room anywhere in the day (soft preference, no conflict)", () => {
    const input = baseInput({
      categoryItemSchedules: [schedule({ cadence: "weekly", anchor: [1] })],
      trackableItems: [trackableItem()],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });
    const busy = [
      { start: new Date("2026-07-13T08:00:00"), end: new Date("2026-07-13T23:00:00") },
    ];

    const result = placeCategoryItemSchedules(input, busy);

    expect(result.slots).toEqual([]);
  });

  it("picks a gap that preserves free time over an earlier gap it would fill exactly (WCSP gap scoring, 2026-07-22)", () => {
    // Same reasoning/construction as flexible-placement.test.ts's analogous
    // test: the full daily window (08:00-23:00, no Time-of-Day Preference
    // set, so this hits findOccurrenceWindow's full-day fallback) is split
    // by one busy block into gap1 = 08:00-10:00 (exactly the 120min
    // duration, zero leftover) and gap2 = 13:40-23:00 (large leftover).
    // Plain first-fit (the old findFreeInterval) would take gap1 since
    // it's found first; pickBestGapInWindow scores gap2 higher (a bigger
    // leftover beats a zero leftover) and takes that instead.
    const input = baseInput({
      categoryItemSchedules: [schedule({ cadence: "weekly", anchor: [1] })], // Monday only
      trackableItems: [trackableItem()],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });
    const busy = [
      { start: new Date("2026-07-13T10:00:00"), end: new Date("2026-07-13T13:40:00") },
    ];

    const result = placeCategoryItemSchedules(input, busy);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T13:40:00"),
        endAt: new Date("2026-07-13T15:40:00"),
        occupantType: "trackable-item",
        occupantId: "ti-1",
      },
    ]);
  });

  it("stops placing an item once its own remaining-chapter budget is exhausted, even though the cadence would keep firing", () => {
    // Project owner, 2026-07-23: a shared daily book slot kept handing out
    // a NEW session every single day forever, with no regard for how many
    // chapters the book actually had left — 157 sessions for a 13-chapter
    // book. A daily cadence over 7 days must stop once unitCount is used up.
    const input = baseInput({
      categoryItemSchedules: [schedule({ cadence: "daily" })],
      trackableItems: [trackableItem({ unitCount: 3, unitsCompleted: 0 })], // 3 sessions total
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });

    const result = placeCategoryItemSchedules(input, []);

    expect(result.slots).toHaveLength(3);
    expect(result.scheduledCountByItemId["ti-1"]).toBe(3);
  });

  it("spaces a daily shared-book schedule across each item's estimated completion window", () => {
    const input = baseInput({
      categoryItemSchedules: [schedule({ cadence: "daily" })],
      trackableItems: [trackableItem({ unitCount: 13, estimatedDays: 40 })],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });

    const result = placeCategoryItemSchedules(input, []);

    expect(result.slots.map((slot) => slot.startAt.toDateString())).toEqual([
      new Date("2026-07-13T00:00:00").toDateString(),
      new Date("2026-07-16T00:00:00").toDateString(),
      new Date("2026-07-19T00:00:00").toDateString(),
    ]);
  });

  it("honors alreadyScheduledSessionsByItemId passed in (idempotency across a multi-week horizon run)", () => {
    const input = baseInput({
      categoryItemSchedules: [schedule({ cadence: "daily" })],
      trackableItems: [trackableItem({ unitCount: 3, unitsCompleted: 0 })],
      wipLimits: [{ type: "book", maxInProgress: 3 }],
    });

    // 2 sessions already accounted for (e.g. placed by an earlier week in
    // the same horizon run) — only 1 remains.
    const result = placeCategoryItemSchedules(input, [], { "ti-1": 2 });

    expect(result.slots).toHaveLength(1);
    expect(result.scheduledCountByItemId["ti-1"]).toBe(3);
  });

  it("keeps book and course schedules independently configured, but each still avoids the other's window (can't watch both at once)", () => {
    const input = baseInput({
      categoryItemSchedules: [
        schedule({ type: "book", cadence: "daily" }),
        schedule({ type: "course", cadence: "daily" }),
      ],
      trackableItems: [
        trackableItem({ id: "book-a", type: "book" }),
        trackableItem({ id: "course-a", type: "course" }),
      ],
      wipLimits: [
        { type: "book", maxInProgress: 3 },
        { type: "course", maxInProgress: 3 },
      ],
    });

    const result = placeCategoryItemSchedules(input, []);

    const monday = result.slots.filter((s) => s.startAt.toDateString() === new Date("2026-07-13").toDateString());
    expect(monday.map((s) => s.occupantId).sort()).toEqual(["book-a", "course-a"]);
    // Both schedules got placed, but at non-overlapping windows.
    const [first, second] = [...monday].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    expect(first.endAt <= second.startAt).toBe(true);
  });
});
