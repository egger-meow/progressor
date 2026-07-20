import { describe, expect, it } from "vitest";
import {
  placeFixedCommitments,
  placeDeadlineTasks,
  placeHardConstraints,
} from "./hard-constraints";
import type { SchedulerInput } from "./types";

const weekStart = new Date("2026-07-13T00:00:00");
const weekEnd = new Date("2026-07-20T00:00:00");

function baseInput(overrides: Partial<SchedulerInput> = {}): SchedulerInput {
  return {
    weekStart,
    weekEnd,
    trackableItems: [],
    routines: [],
    fixedCommitments: [],
    deadlineTasks: [],
    adHocEvents: [],
    wipLimits: [],
    existingSlots: [],
    ...overrides,
  };
}

describe("placeFixedCommitments", () => {
  it("places a single commitment at its anchored day/time with no conflicts", () => {
    const input = baseInput({
      fixedCommitments: [
        { id: "fc-1", title: "Algorithms Lecture", dayOfWeek: 1, startTime: "10:00", endTime: "11:00" },
      ],
    });

    const result = placeFixedCommitments(input);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T10:00:00"),
        endAt: new Date("2026-07-13T11:00:00"),
        occupantType: "fixed-commitment",
        occupantId: "fc-1",
      },
    ]);
    expect(result.conflicts).toEqual([]);
  });

  it("places both commitments and reports a conflict when two overlap", () => {
    const input = baseInput({
      fixedCommitments: [
        { id: "fc-1", title: "Lecture A", dayOfWeek: 2, startTime: "09:00", endTime: "10:00" },
        { id: "fc-2", title: "Lecture B", dayOfWeek: 2, startTime: "09:30", endTime: "10:30" },
      ],
    });

    const result = placeFixedCommitments(input);

    expect(result.slots).toHaveLength(2);
    expect(result.conflicts).toHaveLength(2);
    expect(result.conflicts.every((c) => c.reason === "fixed-commitment-unplaceable")).toBe(true);
    expect(result.conflicts.map((c) => c.occupantId).sort()).toEqual(["fc-1", "fc-2"]);
  });

  it("still places a commitment that overlaps an existing Ad-hoc Event, but flags it", () => {
    const input = baseInput({
      fixedCommitments: [
        { id: "fc-1", title: "Study Group", dayOfWeek: 3, startTime: "14:00", endTime: "15:00" },
      ],
      existingSlots: [
        {
          id: "ts-1",
          startAt: new Date("2026-07-15T14:30:00"),
          endAt: new Date("2026-07-15T15:30:00"),
          occupantType: "ad-hoc-event",
          occupantId: "ahe-1",
        },
      ],
    });

    const result = placeFixedCommitments(input);

    expect(result.slots).toHaveLength(1);
    expect(result.conflicts).toEqual([
      {
        reason: "fixed-commitment-unplaceable",
        occupantType: "fixed-commitment",
        occupantId: "fc-1",
        message: expect.stringContaining("overlaps an existing Ad-hoc Event"),
      },
    ]);
  });

  it("does not re-place a commitment that already has an occurrence Time Slot on that day (re-run idempotency)", () => {
    const input = baseInput({
      fixedCommitments: [
        { id: "fc-1", title: "Algorithms Lecture", dayOfWeek: 1, startTime: "10:00", endTime: "11:00" },
      ],
      existingSlots: [
        {
          id: "ts-1",
          startAt: new Date("2026-07-13T10:00:00"),
          endAt: new Date("2026-07-13T11:00:00"),
          occupantType: "fixed-commitment",
          occupantId: "fc-1",
        },
      ],
    });

    const result = placeFixedCommitments(input);

    expect(result.slots).toEqual([]);
  });

  it("does not flag a conflict for non-overlapping commitments", () => {
    const input = baseInput({
      fixedCommitments: [
        { id: "fc-1", title: "Lecture A", dayOfWeek: 1, startTime: "09:00", endTime: "10:00" },
        { id: "fc-2", title: "Lecture B", dayOfWeek: 1, startTime: "10:00", endTime: "11:00" },
      ],
    });

    const result = placeFixedCommitments(input);

    expect(result.slots).toHaveLength(2);
    expect(result.conflicts).toEqual([]);
  });
});

describe("placeDeadlineTasks", () => {
  it("places a session on the earliest free day before the deadline", () => {
    const input = baseInput({
      deadlineTasks: [
        { id: "dt-1", title: "Essay", dueAt: new Date("2026-07-16T12:00:00"), estimatedDays: 1 },
      ],
    });

    const result = placeDeadlineTasks(input, []);

    expect(result.conflicts).toEqual([]);
    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T08:00:00"),
        endAt: new Date("2026-07-13T10:00:00"),
        occupantType: "deadline-task",
        occupantId: "dt-1",
      },
    ]);
  });

  it("skips busy time and finds the next free window the same day", () => {
    const input = baseInput({
      deadlineTasks: [
        { id: "dt-1", title: "Essay", dueAt: new Date("2026-07-16T12:00:00"), estimatedDays: 1 },
      ],
    });
    const busy = [
      { start: new Date("2026-07-13T08:00:00"), end: new Date("2026-07-13T09:00:00") },
    ];

    const result = placeDeadlineTasks(input, busy);

    expect(result.conflicts).toEqual([]);
    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T09:00:00"),
        endAt: new Date("2026-07-13T11:00:00"),
        occupantType: "deadline-task",
        occupantId: "dt-1",
      },
    ]);
  });

  it("reports a conflict, and places nothing, when the deadline has already passed", () => {
    const input = baseInput({
      deadlineTasks: [
        { id: "dt-1", title: "Overdue Essay", dueAt: new Date(weekStart), estimatedDays: 1 },
      ],
    });

    const result = placeDeadlineTasks(input, []);

    expect(result.slots).toEqual([]);
    expect(result.conflicts).toEqual([
      {
        reason: "deadline-task-unplaceable",
        occupantType: "deadline-task",
        occupantId: "dt-1",
        message: expect.stringContaining("Overdue Essay"),
      },
    ]);
  });

  it("does not double-book two Deadline Tasks into the same window", () => {
    const input = baseInput({
      deadlineTasks: [
        { id: "dt-1", title: "First", dueAt: new Date("2026-07-16T12:00:00"), estimatedDays: 1 },
        { id: "dt-2", title: "Second", dueAt: new Date("2026-07-16T12:00:00"), estimatedDays: 1 },
      ],
    });

    const result = placeDeadlineTasks(input, []);

    expect(result.conflicts).toEqual([]);
    expect(result.slots).toHaveLength(2);
    const [first, second] = result.slots;
    expect(first.startAt < second.startAt).toBe(true);
    expect(first.endAt <= second.startAt).toBe(true);
  });
});

describe("placeHardConstraints", () => {
  it("reports a genuine capacity conflict when a Fixed Commitment fills the only eligible day", () => {
    const input = baseInput({
      fixedCommitments: [
        { id: "fc-1", title: "All-day Retreat", dayOfWeek: 1, startTime: "08:00", endTime: "23:00" },
      ],
      deadlineTasks: [
        { id: "dt-1", title: "Quiz Prep", dueAt: new Date("2026-07-13T10:01:00"), estimatedDays: 1 },
      ],
    });

    const result = placeHardConstraints(input);

    const fixedSlot = result.slots.find((s) => s.occupantType === "fixed-commitment");
    expect(fixedSlot).toBeDefined();
    expect(result.slots.some((s) => s.occupantType === "deadline-task")).toBe(false);
    expect(result.conflicts).toContainEqual({
      reason: "deadline-task-unplaceable",
      occupantType: "deadline-task",
      occupantId: "dt-1",
      message: expect.stringContaining("Quiz Prep"),
    });
  });

  it("combines Fixed Commitment and Deadline Task placement with no overlap", () => {
    const input = baseInput({
      fixedCommitments: [
        { id: "fc-1", title: "Morning Class", dayOfWeek: 1, startTime: "08:00", endTime: "09:00" },
      ],
      deadlineTasks: [
        { id: "dt-1", title: "Essay", dueAt: new Date("2026-07-16T12:00:00"), estimatedDays: 1 },
      ],
    });

    const result = placeHardConstraints(input);

    expect(result.conflicts).toEqual([]);
    expect(result.slots).toHaveLength(2);
    const fixedSlot = result.slots.find((s) => s.occupantType === "fixed-commitment")!;
    const deadlineSlot = result.slots.find((s) => s.occupantType === "deadline-task")!;
    expect(deadlineSlot.startAt >= fixedSlot.endAt).toBe(true);
  });
});
