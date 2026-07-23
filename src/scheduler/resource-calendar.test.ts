import { describe, expect, it } from "vitest";
import {
  createResourceCalendar,
  hasPoolCapacity,
  acquirePool,
  releasePool,
  bestGapOnDay,
  markBusy,
} from "./resource-calendar";
import { DAILY_WINDOW_START, DAILY_WINDOW_END, SESSION_DURATION_MS } from "./constants";
import { combineDateAndTime } from "./time";

const day = new Date("2026-07-20T00:00:00"); // Monday

describe("resource-calendar — WIP pool", () => {
  it("starts at capacity when initialActiveCountByPool pre-reserves in-progress items", () => {
    const calendar = createResourceCalendar(
      [],
      [{ type: "book", maxInProgress: 2 }],
      new Map([["book", 2]]),
    );

    expect(hasPoolCapacity(calendar, "book")).toBe(false);
  });

  it("acquirePool/releasePool move capacity, never going below zero", () => {
    const calendar = createResourceCalendar(
      [],
      [{ type: "book", maxInProgress: 1 }],
      new Map(),
    );

    expect(hasPoolCapacity(calendar, "book")).toBe(true);
    acquirePool(calendar, "book");
    expect(hasPoolCapacity(calendar, "book")).toBe(false);
    releasePool(calendar, "book");
    expect(hasPoolCapacity(calendar, "book")).toBe(true);
    releasePool(calendar, "book"); // no-op, must not go negative
    releasePool(calendar, "book");
    expect(hasPoolCapacity(calendar, "book")).toBe(true);
  });

  it("a type absent from wipLimits has zero capacity, same as selectEligibleItems", () => {
    const calendar = createResourceCalendar([], [], new Map());
    expect(hasPoolCapacity(calendar, "book")).toBe(false);
  });

  it("null pool (Deadline Task) always has capacity", () => {
    const calendar = createResourceCalendar([], [], new Map());
    expect(hasPoolCapacity(calendar, null)).toBe(true);
    acquirePool(calendar, null); // no-op
    expect(hasPoolCapacity(calendar, null)).toBe(true);
  });
});

describe("resource-calendar — bestGapOnDay", () => {
  it("returns the full-window gap when nothing is busy", () => {
    const calendar = createResourceCalendar([], [], new Map());
    const gap = bestGapOnDay(calendar, day, SESSION_DURATION_MS);
    expect(gap).toEqual({
      start: combineDateAndTime(day, DAILY_WINDOW_START),
      end: new Date(combineDateAndTime(day, DAILY_WINDOW_START).getTime() + SESSION_DURATION_MS),
    });
  });

  it("returns null once the day's Slack budget is exhausted", () => {
    const calendar = createResourceCalendar([], [], new Map());
    // Fill almost the whole daily window so remaining room dips under the
    // MIN_SLACK_SHARE_PER_DAY-guarded budget.
    markBusy(calendar, {
      start: combineDateAndTime(day, DAILY_WINDOW_START),
      end: combineDateAndTime(day, DAILY_WINDOW_END),
    });
    expect(bestGapOnDay(calendar, day, SESSION_DURATION_MS)).toBeNull();
  });

  it("respects notAfter, capping the returned gap's end", () => {
    const calendar = createResourceCalendar([], [], new Map());
    const notAfter = new Date(combineDateAndTime(day, DAILY_WINDOW_START).getTime() + 60 * 60 * 1000);
    const gap = bestGapOnDay(calendar, day, 60 * 60 * 1000, notAfter);
    expect(gap?.end.getTime()).toBe(notAfter.getTime());
  });
});
