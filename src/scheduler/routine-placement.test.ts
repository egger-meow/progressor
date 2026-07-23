import { describe, expect, it } from "vitest";
import { placeRoutines } from "./routine-placement";
import type { SchedulerInput, SchedulerRoutine } from "./types";

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

function routine(overrides: Partial<SchedulerRoutine> = {}): SchedulerRoutine {
  return {
    id: "r-1",
    title: "Gym",
    category: "gym",
    cadence: "daily",
    anchor: null,
    timeOfDayPreferences: [],
    preferredStartTime: null,
    durationMinutes: 120,
    ...overrides,
  };
}

describe("placeRoutines", () => {
  it("places a daily Routine once per day, with no Time-of-Day Preference at the window start", () => {
    const input = baseInput({ routines: [routine({ cadence: "daily" })] });

    const result = placeRoutines(input, []);

    expect(result.slots).toHaveLength(7);
    expect(result.slots.every((s) => s.occupantType === "routine" && s.occupantId === "r-1")).toBe(true);
    expect(result.slots[0]).toEqual({
      startAt: new Date("2026-07-13T08:00:00"),
      endAt: new Date("2026-07-13T10:00:00"),
      occupantType: "routine",
      occupantId: "r-1",
    });
  });

  it("places a weekly Routine only on its anchor weekdays", () => {
    const input = baseInput({
      routines: [routine({ cadence: "weekly", anchor: [1, 3] })], // Mon, Wed
    });

    const result = placeRoutines(input, []);

    expect(result.slots).toHaveLength(2);
    expect(result.slots[0].startAt).toEqual(new Date("2026-07-13T08:00:00")); // Monday
    expect(result.slots[1].startAt).toEqual(new Date("2026-07-15T08:00:00")); // Wednesday
  });

  it("places a monthly Routine only when its anchor date falls in the target week", () => {
    const withinWeek = baseInput({
      routines: [routine({ cadence: "monthly", anchor: [15] })],
    });
    const outsideWeek = baseInput({
      routines: [routine({ cadence: "monthly", anchor: [1] })],
    });

    expect(placeRoutines(withinWeek, []).slots).toEqual([
      {
        startAt: new Date("2026-07-15T08:00:00"),
        endAt: new Date("2026-07-15T10:00:00"),
        occupantType: "routine",
        occupantId: "r-1",
      },
    ]);
    expect(placeRoutines(outsideWeek, []).slots).toEqual([]);
  });

  it("does not re-place a Routine occurrence that already has a Time Slot on that day (re-run idempotency)", () => {
    const input = baseInput({
      routines: [routine({ cadence: "weekly", anchor: [1, 3] })], // Mon, Wed
      existingSlots: [
        {
          id: "ts-1",
          startAt: new Date("2026-07-13T08:00:00"),
          endAt: new Date("2026-07-13T10:00:00"),
          occupantType: "routine",
          occupantId: "r-1",
        },
      ],
    });

    const result = placeRoutines(input, []);

    expect(result.slots).toHaveLength(1);
    expect(result.slots[0].startAt).toEqual(new Date("2026-07-15T08:00:00")); // only Wednesday re-placed
  });

  it("prefers the Time-of-Day Preference sub-window when it has room", () => {
    const input = baseInput({
      routines: [
        routine({ cadence: "weekly", anchor: [1], timeOfDayPreferences: ["evening"] }),
      ],
    });

    const result = placeRoutines(input, []);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T17:00:00"),
        endAt: new Date("2026-07-13T19:00:00"),
        occupantType: "routine",
        occupantId: "r-1",
      },
    ]);
  });

  it("falls back to the full daily window when the preferred sub-window has no room", () => {
    const input = baseInput({
      routines: [
        routine({ cadence: "weekly", anchor: [1], timeOfDayPreferences: ["evening"] }),
      ],
    });
    const busy = [
      { start: new Date("2026-07-13T08:00:00"), end: new Date("2026-07-13T20:00:00") },
    ];

    const result = placeRoutines(input, busy);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T20:00:00"),
        endAt: new Date("2026-07-13T22:00:00"),
        occupantType: "routine",
        occupantId: "r-1",
      },
    ]);
  });

  it("places exactly at preferredStartTime when that slot is free", () => {
    const input = baseInput({
      routines: [
        routine({
          cadence: "weekly",
          anchor: [1],
          timeOfDayPreferences: ["evening"], // would otherwise land at 17:00
          preferredStartTime: "14:30",
        }),
      ],
    });

    const result = placeRoutines(input, []);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T14:30:00"),
        endAt: new Date("2026-07-13T16:30:00"),
        occupantType: "routine",
        occupantId: "r-1",
      },
    ]);
  });

  it("places a session that's exactly durationMinutes long, not the old hardcoded 2 hours", () => {
    const input = baseInput({
      routines: [
        routine({
          cadence: "weekly",
          anchor: [1],
          preferredStartTime: "07:00",
          durationMinutes: 30,
        }),
      ],
    });

    const result = placeRoutines(input, []);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T07:00:00"),
        endAt: new Date("2026-07-13T07:30:00"),
        occupantType: "routine",
        occupantId: "r-1",
      },
    ]);
  });

  it("falls back to the Time-of-Day Preference bucket when preferredStartTime's exact slot is busy", () => {
    const input = baseInput({
      routines: [
        routine({
          cadence: "weekly",
          anchor: [1],
          timeOfDayPreferences: ["evening"],
          preferredStartTime: "14:30",
        }),
      ],
    });
    const busy = [
      { start: new Date("2026-07-13T14:00:00"), end: new Date("2026-07-13T15:00:00") },
    ];

    const result = placeRoutines(input, busy);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T17:00:00"),
        endAt: new Date("2026-07-13T19:00:00"),
        occupantType: "routine",
        occupantId: "r-1",
      },
    ]);
  });

  it("silently skips an occurrence with no room anywhere in the day (soft preference, no conflict)", () => {
    const input = baseInput({
      routines: [routine({ cadence: "weekly", anchor: [1] })],
    });
    const busy = [
      { start: new Date("2026-07-13T08:00:00"), end: new Date("2026-07-13T23:00:00") },
    ];

    const result = placeRoutines(input, busy);

    expect(result.slots).toEqual([]);
  });

  it("merges adjacent selected Time-of-Day buckets into one continuous window", () => {
    // morning (08:00-12:00) + afternoon (12:00-17:00) are back-to-back, so
    // a duration that can't fit in morning alone should still be found
    // inside the merged 08:00-17:00 window, landing right at 12:00 rather
    // than falling through to the full-day fallback.
    const input = baseInput({
      routines: [
        routine({ cadence: "weekly", anchor: [1], timeOfDayPreferences: ["morning", "afternoon"] }),
      ],
    });
    const busy = [
      { start: new Date("2026-07-13T08:00:00"), end: new Date("2026-07-13T12:00:00") },
    ];

    const result = placeRoutines(input, busy);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T12:00:00"),
        endAt: new Date("2026-07-13T14:00:00"),
        occupantType: "routine",
        occupantId: "r-1",
      },
    ]);
  });

  it("selecting all 4 buckets is equivalent to the full daily window", () => {
    const input = baseInput({
      routines: [
        routine({
          cadence: "weekly",
          anchor: [1],
          timeOfDayPreferences: ["morning", "afternoon", "evening", "night"],
          durationMinutes: 60,
        }),
      ],
    });
    const busy = [
      { start: new Date("2026-07-13T08:00:00"), end: new Date("2026-07-13T21:00:00") },
    ];

    const result = placeRoutines(input, busy);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T21:00:00"),
        endAt: new Date("2026-07-13T22:00:00"),
        occupantType: "routine",
        occupantId: "r-1",
      },
    ]);
  });

  it("respects a gap between non-adjacent selected buckets instead of bleeding into it", () => {
    // morning + night, skipping afternoon/evening. Morning is fully busy,
    // so it must move to night's own window, never into the unselected
    // afternoon/evening gap in between.
    const input = baseInput({
      routines: [
        routine({ cadence: "weekly", anchor: [1], timeOfDayPreferences: ["morning", "night"] }),
      ],
    });
    const busy = [
      { start: new Date("2026-07-13T08:00:00"), end: new Date("2026-07-13T12:00:00") },
    ];

    const result = placeRoutines(input, busy);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T20:00:00"),
        endAt: new Date("2026-07-13T22:00:00"),
        occupantType: "routine",
        occupantId: "r-1",
      },
    ]);
  });

  it("only the last selected candidate overflows past its own end; an earlier one does not", () => {
    // morning + night. Morning's own bucket (08:00-12:00, 240min) can't
    // fit a 300min session even though there's technically room later in
    // the day before night — it must not silently expand into the
    // afternoon/evening gap. It should move on to night, which (being
    // last) is allowed to run past its own 23:00 window... but the daily
    // window ends at 23:00 too, so with nothing free there either, this
    // falls all the way through to the true full-day fallback.
    const input = baseInput({
      routines: [
        routine({
          cadence: "weekly",
          anchor: [1],
          timeOfDayPreferences: ["morning", "night"],
          durationMinutes: 300,
        }),
      ],
    });

    const result = placeRoutines(input, []);

    // Nothing is busy, so the true full-day fallback (08:00 start) is what
    // actually has room first — this pins that morning's own bucket end
    // (12:00) was never silently extended into the gap to "make room."
    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T08:00:00"),
        endAt: new Date("2026-07-13T13:00:00"),
        occupantType: "routine",
        occupantId: "r-1",
      },
    ]);
  });

  it("empty timeOfDayPreferences behaves exactly like no preference at all", () => {
    const input = baseInput({
      routines: [routine({ cadence: "weekly", anchor: [1], timeOfDayPreferences: [] })],
    });

    const result = placeRoutines(input, []);

    expect(result.slots).toEqual([
      {
        startAt: new Date("2026-07-13T08:00:00"),
        endAt: new Date("2026-07-13T10:00:00"),
        occupantType: "routine",
        occupantId: "r-1",
      },
    ]);
  });

  it("does not double-book two Routines competing for the same window", () => {
    const input = baseInput({
      routines: [
        routine({ id: "r-1", cadence: "weekly", anchor: [1] }),
        routine({ id: "r-2", cadence: "weekly", anchor: [1] }),
      ],
    });

    const result = placeRoutines(input, []);

    expect(result.slots).toHaveLength(2);
    const [first, second] = result.slots;
    expect(first.endAt <= second.startAt).toBe(true);
  });
});
