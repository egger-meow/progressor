import { describe, expect, it } from "vitest";
import { computeSchedule } from "./index";
import type { SchedulerInput } from "./types";

// A realistic mixed fixture exercising every layer of the Scheduler
// together (ROADMAP.md Phase 2 exit condition): books/courses at
// different priorities with one WIP Limit already at its cap, a Fixed
// Commitment, a Deadline Task, and a Routine, all in one target week.
const weekStart = new Date("2026-07-13T00:00:00"); // Monday
const weekEnd = new Date("2026-07-20T00:00:00");

function buildFixture(): SchedulerInput {
  return {
    weekStart,
    weekEnd,
    trackableItems: [
      {
        id: "book-a",
        title: "Book A (already in progress)",
        type: "book",
        priority: 1,
        status: "in-progress",
        unitCount: 20,
        unitsCompleted: 4,
        estimatedDays: 10,
      },
      {
        id: "book-b",
        title: "Book B (blocked by WIP Limit)",
        type: "book",
        priority: 2,
        status: "not-started",
        unitCount: 12,
        unitsCompleted: 0,
        estimatedDays: 6,
      },
      {
        id: "course-a",
        title: "Course A (promotable)",
        type: "course",
        priority: 1,
        status: "not-started",
        unitCount: 8,
        unitsCompleted: 0,
        estimatedDays: 4,
      },
    ],
    routines: [
      {
        id: "routine-gym",
        title: "Gym",
        category: "gym",
        cadence: "weekly",
        anchor: [1, 4], // Monday, Thursday
        timeOfDayPreference: null,
        preferredStartTime: null,
        durationMinutes: 120,
      },
    ],
    fixedCommitments: [
      {
        id: "fc-lecture",
        title: "Algorithms Lecture",
        dayOfWeek: 1, // Monday
        startTime: "09:00",
        endTime: "10:00",
        ignoreSemesterBounds: false,
      },
    ],
    deadlineTasks: [
      {
        id: "dt-essay",
        title: "Essay",
        dueAt: new Date("2026-07-16T23:00:00"), // Thursday evening
        estimatedHours: 2,
      },
    ],
    adHocEvents: [],
    wipLimits: [
      { type: "book", maxInProgress: 1 }, // already at cap via book-a
      { type: "course", maxInProgress: 1 },
    ],
    existingSlots: [],
    semester: null,
  };
}

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("computeSchedule (end-to-end fixture)", () => {
  it("never violates a WIP Limit: only the promotable item gets a session per type", () => {
    const output = computeSchedule(buildFixture());

    const bookSlots = output.slots.filter(
      (s) => s.occupantType === "trackable-item" && s.occupantId === "book-a",
    );
    const blockedBookSlots = output.slots.filter(
      (s) => s.occupantType === "trackable-item" && s.occupantId === "book-b",
    );
    const courseSlots = output.slots.filter(
      (s) => s.occupantType === "trackable-item" && s.occupantId === "course-a",
    );

    expect(bookSlots).toHaveLength(1); // already in-progress, always placed
    expect(blockedBookSlots).toHaveLength(0); // WIP Limit at cap, never promoted
    expect(courseSlots).toHaveLength(1); // separate type, its own capacity
  });

  it("never double-books two non-Slack items into overlapping time", () => {
    const output = computeSchedule(buildFixture());

    for (let i = 0; i < output.slots.length; i++) {
      for (let j = i + 1; j < output.slots.length; j++) {
        const a = output.slots[i];
        const b = output.slots[j];
        const overlaps = a.startAt < b.endAt && b.startAt < a.endAt;
        expect(overlaps).toBe(false);
      }
    }
  });

  it("honors the Fixed Commitment and Deadline Task, with no conflicts in this fixture", () => {
    const output = computeSchedule(buildFixture());

    expect(output.conflicts).toEqual([]);

    const fixedSlot = output.slots.find((s) => s.occupantType === "fixed-commitment");
    expect(fixedSlot).toEqual({
      startAt: new Date("2026-07-13T09:00:00"),
      endAt: new Date("2026-07-13T10:00:00"),
      occupantType: "fixed-commitment",
      occupantId: "fc-lecture",
    });

    const deadlineSlot = output.slots.find((s) => s.occupantType === "deadline-task");
    expect(deadlineSlot).toBeDefined();
    expect(deadlineSlot!.endAt <= new Date("2026-07-16T23:00:00")).toBe(true);
  });

  it("places both Routine occurrences without displacing the Fixed Commitment", () => {
    const output = computeSchedule(buildFixture());

    const routineSlots = output.slots.filter((s) => s.occupantType === "routine");
    expect(routineSlots).toHaveLength(2);
    expect(routineSlots.map((s) => dayKey(s.startAt)).sort()).toEqual([
      "2026-07-13", // Monday
      "2026-07-16", // Thursday
    ]);
  });

  it("keeps every day's flexible Trackable Item time within the Slack budget", () => {
    const output = computeSchedule(buildFixture());

    const dailyWindowMs = 15 * 60 * 60 * 1000; // 08:00-23:00
    const slackBudgetMs = dailyWindowMs * 0.8; // MIN_SLACK_SHARE_PER_DAY = 0.2

    const flexibleMsByDay = new Map<string, number>();
    for (const slot of output.slots) {
      if (slot.occupantType !== "trackable-item") continue;
      const key = dayKey(slot.startAt);
      const duration = slot.endAt.getTime() - slot.startAt.getTime();
      flexibleMsByDay.set(key, (flexibleMsByDay.get(key) ?? 0) + duration);
    }

    for (const usedMs of flexibleMsByDay.values()) {
      expect(usedMs).toBeLessThanOrEqual(slackBudgetMs);
    }
    expect(flexibleMsByDay.size).toBeGreaterThan(0); // the mechanism was actually exercised
  });

  it("reports a Deadline Task conflict, not a fabricated placement, when it truly cannot fit", () => {
    const fixture = buildFixture();
    // Due almost immediately, before any session could realistically land.
    fixture.deadlineTasks = [
      { id: "dt-impossible", title: "Impossible Essay", dueAt: new Date(weekStart), estimatedHours: 2 },
    ];

    const output = computeSchedule(fixture);

    expect(output.slots.some((s) => s.occupantType === "deadline-task")).toBe(false);
    expect(output.conflicts).toContainEqual({
      reason: "deadline-task-unplaceable",
      occupantType: "deadline-task",
      occupantId: "dt-impossible",
      message: expect.stringContaining("Impossible Essay"),
    });
  });
});
