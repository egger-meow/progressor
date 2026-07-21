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
    timeOfDayPreference: null,
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

    expect(result.slots).toHaveLength(7);
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
        schedule({ cadence: "weekly", anchor: [1], timeOfDayPreference: "evening" }),
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
        schedule({ cadence: "weekly", anchor: [1], timeOfDayPreference: "evening" }),
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
