import { describe, expect, it } from "vitest";
import { repairSchedule } from "./repair";
import type { SchedulerExistingTimeSlot, SchedulerInput } from "./types";

// ROADMAP.md Phase 3 exit condition's three named disruption scenarios:
// skip today's reading session, insert a same-day Ad-hoc Event, mark a
// Chapter/Video done early. Each gets its own describe block below,
// fixture-based like the rest of src/scheduler/.

const weekStart = new Date("2026-07-13T00:00:00"); // Monday
const weekEnd = new Date("2026-07-20T00:00:00");

function baseInput(overrides: Partial<SchedulerInput> = {}): SchedulerInput {
  return {
    weekStart,
    weekEnd,
    trackableItems: [
      {
        id: "book-a",
        title: "Book A (in progress)",
        type: "book",
        priority: 1,
        status: "in-progress",
        unitCount: 20,
        unitsCompleted: 4,
        estimatedDays: 10,
      },
      {
        id: "book-b",
        title: "Book B (eligible, not yet placed)",
        type: "book",
        priority: 2,
        status: "not-started",
        unitCount: 12,
        unitsCompleted: 0,
        estimatedDays: 6,
      },
      {
        id: "course-a",
        title: "Course A (in progress)",
        type: "course",
        priority: 1,
        status: "in-progress",
        unitCount: 8,
        unitsCompleted: 1,
        estimatedDays: 4,
      },
    ],
    routines: [],
    fixedCommitments: [],
    deadlineTasks: [],
    adHocEvents: [],
    // Spare book capacity (2 slots, 1 used) is what makes Book B a live
    // backfill candidate once Book A's session is freed up; course is at
    // its cap so Course A alone stays eligible there.
    wipLimits: [
      { type: "book", maxInProgress: 2 },
      { type: "course", maxInProgress: 1 },
    ],
    existingSlots: [],
    ...overrides,
  };
}

function slot(
  id: string,
  startAt: string,
  endAt: string,
  occupantType: SchedulerExistingTimeSlot["occupantType"],
  occupantId: string | null,
): SchedulerExistingTimeSlot {
  return { id, startAt: new Date(startAt), endAt: new Date(endAt), occupantType, occupantId };
}

describe("repairSchedule: skip-session", () => {
  it("removes the skipped Time Slot and backfills its window from the next eligible, not-yet-placed item", () => {
    const input = baseInput({
      existingSlots: [
        slot("slot-book-a", "2026-07-13T10:00:00", "2026-07-13T12:00:00", "trackable-item", "book-a"),
        slot("slot-course-a", "2026-07-13T14:00:00", "2026-07-13T16:00:00", "trackable-item", "course-a"),
      ],
    });

    const result = repairSchedule(input, { kind: "skip-session", slotId: "slot-book-a" });

    expect(result.removedSlotIds).toEqual(["slot-book-a"]);
    expect(result.addedSlots).toEqual([
      {
        startAt: new Date("2026-07-13T10:00:00"),
        endAt: new Date("2026-07-13T12:00:00"),
        occupantType: "trackable-item",
        occupantId: "book-b",
      },
    ]);
    expect(result.conflicts).toEqual([]);
  });

  it("never backfills the skipped item's own freed window with itself", () => {
    // No other eligible, not-yet-placed item exists (Book B removed, and
    // Course A already has this week's session) — the freed window must
    // stay empty, not silently re-filled by Book A again.
    const input = baseInput({
      trackableItems: baseInput().trackableItems.filter((item) => item.id !== "book-b"),
      existingSlots: [
        slot("slot-book-a", "2026-07-13T10:00:00", "2026-07-13T12:00:00", "trackable-item", "book-a"),
        slot("slot-course-a", "2026-07-13T14:00:00", "2026-07-13T16:00:00", "trackable-item", "course-a"),
      ],
    });

    const result = repairSchedule(input, { kind: "skip-session", slotId: "slot-book-a" });

    expect(result.removedSlotIds).toEqual(["slot-book-a"]);
    expect(result.addedSlots).toEqual([]);
  });

  it("leaves every unrelated Time Slot untouched", () => {
    const input = baseInput({
      existingSlots: [
        slot("slot-book-a", "2026-07-13T10:00:00", "2026-07-13T12:00:00", "trackable-item", "book-a"),
        slot("slot-course-a", "2026-07-13T14:00:00", "2026-07-13T16:00:00", "trackable-item", "course-a"),
      ],
    });

    const result = repairSchedule(input, { kind: "skip-session", slotId: "slot-book-a" });

    expect(result.removedSlotIds).not.toContain("slot-course-a");
    expect(result.addedSlots.some((s) => s.occupantId === "course-a")).toBe(false);
  });

  it("throws rather than silently no-op-ing when the slot isn't a flexible Trackable Item session", () => {
    const input = baseInput({
      existingSlots: [slot("slot-fc", "2026-07-13T09:00:00", "2026-07-13T10:00:00", "fixed-commitment", "fc-1")],
    });

    expect(() => repairSchedule(input, { kind: "skip-session", slotId: "slot-fc" })).toThrow();
  });
});

describe("repairSchedule: insert-ad-hoc-event", () => {
  it("always places the Ad-hoc Event, evicts an overlapping flexible session, and relocates it elsewhere in the week", () => {
    const input = baseInput({
      existingSlots: [slot("slot-book-a", "2026-07-13T10:00:00", "2026-07-13T12:00:00", "trackable-item", "book-a")],
    });

    const result = repairSchedule(input, {
      kind: "insert-ad-hoc-event",
      event: { id: "ahe-1", title: "Coffee with a friend", notes: null },
      startAt: new Date("2026-07-13T11:00:00"),
      endAt: new Date("2026-07-13T13:00:00"),
    });

    expect(result.addedSlots).toContainEqual({
      startAt: new Date("2026-07-13T11:00:00"),
      endAt: new Date("2026-07-13T13:00:00"),
      occupantType: "ad-hoc-event",
      occupantId: "ahe-1",
    });
    expect(result.removedSlotIds).toEqual(["slot-book-a"]);
    const relocated = result.addedSlots.find((s) => s.occupantId === "book-a");
    expect(relocated).toBeDefined();
    // Wherever it landed, it must not overlap the Ad-hoc Event that
    // displaced it in the first place.
    const ahEnd = new Date("2026-07-13T13:00:00").getTime();
    const ahStart = new Date("2026-07-13T11:00:00").getTime();
    const noOverlap =
      relocated!.endAt.getTime() <= ahStart || relocated!.startAt.getTime() >= ahEnd;
    expect(noOverlap).toBe(true);
    expect(result.conflicts).toEqual([]);
  });

  it("flags, but does not evict, an overlap with a Fixed Commitment", () => {
    const input = baseInput({
      fixedCommitments: [{ id: "fc-1", title: "Lecture", dayOfWeek: 1, startTime: "09:00", endTime: "10:30" }],
      existingSlots: [slot("slot-fc", "2026-07-13T09:00:00", "2026-07-13T10:30:00", "fixed-commitment", "fc-1")],
    });

    const result = repairSchedule(input, {
      kind: "insert-ad-hoc-event",
      event: { id: "ahe-1", title: "Surprise visit", notes: null },
      startAt: new Date("2026-07-13T10:00:00"),
      endAt: new Date("2026-07-13T11:00:00"),
    });

    expect(result.removedSlotIds).toEqual([]);
    expect(result.conflicts).toEqual([
      {
        reason: "ad-hoc-event-overlap",
        occupantType: "ad-hoc-event",
        occupantId: "ahe-1",
        message: expect.stringContaining("Fixed Commitment"),
      },
    ]);
  });

  it("flags, but does not evict, an overlap with a Deadline Task session", () => {
    const input = baseInput({
      existingSlots: [slot("slot-dt", "2026-07-13T09:00:00", "2026-07-13T11:00:00", "deadline-task", "dt-1")],
    });

    const result = repairSchedule(input, {
      kind: "insert-ad-hoc-event",
      event: { id: "ahe-1", title: "Emergency", notes: null },
      startAt: new Date("2026-07-13T10:00:00"),
      endAt: new Date("2026-07-13T12:00:00"),
    });

    expect(result.removedSlotIds).toEqual([]);
    expect(result.conflicts).toEqual([
      {
        reason: "ad-hoc-event-overlap",
        occupantType: "ad-hoc-event",
        occupantId: "ahe-1",
        message: expect.stringContaining("Deadline Task"),
      },
    ]);
  });

  it("leaves a Routine occurrence overlap alone — no eviction, no conflict", () => {
    const input = baseInput({
      routines: [{ id: "routine-gym", title: "Gym", category: "gym", cadence: "weekly", anchor: [1], timeOfDayPreference: null }],
      existingSlots: [slot("slot-routine", "2026-07-13T09:00:00", "2026-07-13T11:00:00", "routine", "routine-gym")],
    });

    const result = repairSchedule(input, {
      kind: "insert-ad-hoc-event",
      event: { id: "ahe-1", title: "Skip gym today", notes: null },
      startAt: new Date("2026-07-13T09:30:00"),
      endAt: new Date("2026-07-13T10:30:00"),
    });

    expect(result.removedSlotIds).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });

  it("leaves every unrelated Time Slot untouched", () => {
    const input = baseInput({
      existingSlots: [
        slot("slot-book-a", "2026-07-13T10:00:00", "2026-07-13T12:00:00", "trackable-item", "book-a"),
        slot("slot-course-a", "2026-07-14T14:00:00", "2026-07-14T16:00:00", "trackable-item", "course-a"),
      ],
    });

    const result = repairSchedule(input, {
      kind: "insert-ad-hoc-event",
      event: { id: "ahe-1", title: "Coffee", notes: null },
      startAt: new Date("2026-07-13T11:00:00"),
      endAt: new Date("2026-07-13T13:00:00"),
    });

    expect(result.removedSlotIds).not.toContain("slot-course-a");
  });
});

describe("repairSchedule: item-completed", () => {
  const now = new Date("2026-07-13T08:00:00"); // Monday morning

  it("removes only the completed item's future session this week and backfills it from the next eligible item", () => {
    const input = baseInput({
      trackableItems: baseInput().trackableItems.map((item) =>
        item.id === "book-a" ? { ...item, status: "done" as const, unitsCompleted: item.unitCount } : item,
      ),
      existingSlots: [
        slot("slot-book-a", "2026-07-13T10:00:00", "2026-07-13T12:00:00", "trackable-item", "book-a"),
        slot("slot-course-a", "2026-07-13T14:00:00", "2026-07-13T16:00:00", "trackable-item", "course-a"),
      ],
    });

    const result = repairSchedule(input, { kind: "item-completed", itemId: "book-a", now });

    expect(result.removedSlotIds).toEqual(["slot-book-a"]);
    expect(result.addedSlots).toEqual([
      {
        startAt: new Date("2026-07-13T10:00:00"),
        endAt: new Date("2026-07-13T12:00:00"),
        occupantType: "trackable-item",
        occupantId: "book-b",
      },
    ]);
  });

  it("never removes a past session — only future history-preserving behavior", () => {
    const pastSlotTime = new Date("2026-07-13T06:00:00"); // before `now`
    const input = baseInput({
      trackableItems: baseInput().trackableItems.map((item) =>
        item.id === "book-a" ? { ...item, status: "done" as const, unitsCompleted: item.unitCount } : item,
      ),
      existingSlots: [
        {
          id: "slot-book-a-past",
          startAt: pastSlotTime,
          endAt: new Date(pastSlotTime.getTime() + 2 * 60 * 60 * 1000),
          occupantType: "trackable-item",
          occupantId: "book-a",
        },
      ],
    });

    const result = repairSchedule(input, { kind: "item-completed", itemId: "book-a", now });

    expect(result.removedSlotIds).toEqual([]);
    expect(result.addedSlots).toEqual([]);
  });

  it("is a no-op when the completed item has no session scheduled this week", () => {
    const input = baseInput({
      trackableItems: baseInput().trackableItems.map((item) =>
        item.id === "book-a" ? { ...item, status: "done" as const, unitsCompleted: item.unitCount } : item,
      ),
      existingSlots: [],
    });

    const result = repairSchedule(input, { kind: "item-completed", itemId: "book-a", now });

    expect(result).toEqual({ removedSlotIds: [], addedSlots: [], conflicts: [] });
  });
});

describe("repairSchedule: documented time budget", () => {
  it("touches only the disrupted slot(s), never re-examining the full week's placement, across a busy fixture", () => {
    // A busy but unremarkable week: several unrelated Time Slots already
    // on the board. A repair should complete near-instantly (it never
    // re-runs full-week placement, see repair.ts's header comment) and
    // must never report a removed/added slot outside what the disruption
    // actually touches.
    const unrelatedSlots: SchedulerExistingTimeSlot[] = [];
    for (let day = 0; day < 7; day++) {
      unrelatedSlots.push(
        slot(
          `unrelated-${day}`,
          `2026-07-${13 + day}T18:00:00`,
          `2026-07-${13 + day}T19:00:00`,
          "trackable-item",
          "course-a",
        ),
      );
    }
    const input = baseInput({
      existingSlots: [
        ...unrelatedSlots,
        slot("slot-book-a", "2026-07-13T10:00:00", "2026-07-13T12:00:00", "trackable-item", "book-a"),
      ],
    });

    const started = performance.now();
    const result = repairSchedule(input, { kind: "skip-session", slotId: "slot-book-a" });
    const elapsedMs = performance.now() - started;

    // Generous threshold — the point isn't a tight benchmark, it's
    // evidence the operation is nowhere near a full recompute: an
    // interactive UI action should feel instant, not trigger a spinner.
    expect(elapsedMs).toBeLessThan(50);
    expect(result.removedSlotIds).toEqual(["slot-book-a"]);
    for (const id of unrelatedSlots.map((s) => s.id)) {
      expect(result.removedSlotIds).not.toContain(id);
    }
  });
});
