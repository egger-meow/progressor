import { describe, expect, it } from "vitest";
import { placeFlexibleTrackableItems } from "./flexible-placement";
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

  it("places higher-priority items in earlier free time than lower-priority items", () => {
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
    expect(first.startAt).toEqual(new Date("2026-07-13T08:00:00"));
    expect(second.startAt).toEqual(new Date("2026-07-13T10:00:00"));
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

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T10:00:00"),
        endAt: new Date("2026-07-13T12:00:00"),
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
});
