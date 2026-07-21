import { describe, expect, it } from "vitest";
import { buildHourRows, formatHourParam, parseHour, semesterWeekIndex, startOfWeek } from "./week";

describe("parseHour", () => {
  it("extracts the hour from an HH:MM time param", () => {
    expect(parseHour("08:00")).toBe(8);
    expect(parseHour("23:30")).toBe(23);
  });
});

describe("formatHourParam", () => {
  it("formats an hour as a zero-padded HH:00 string", () => {
    expect(formatHourParam(8)).toBe("08:00");
    expect(formatHourParam(23)).toBe("23:00");
  });
});

describe("buildHourRows", () => {
  const day = new Date(2026, 6, 20); // Mon 2026-07-20

  it("covers exactly the given window when no extra hours are given", () => {
    const rows = buildHourRows(day, 8, 23);
    expect(rows).toHaveLength(15);
    expect(rows[0].hour).toBe(8);
    expect(rows[rows.length - 1].hour).toBe(22);
    expect(rows[0].rowStart.getHours()).toBe(8);
    expect(rows[0].rowEnd.getHours()).toBe(9);
  });

  it("widens the window to include an hour before the window start", () => {
    const rows = buildHourRows(day, 8, 23, [6]);
    expect(rows[0].hour).toBe(6);
    expect(rows[rows.length - 1].hour).toBe(22);
  });

  it("widens the window to include an hour at or after the window end", () => {
    const rows = buildHourRows(day, 8, 23, [23]);
    expect(rows[0].hour).toBe(8);
    expect(rows[rows.length - 1].hour).toBe(23);
  });

  it("does not widen the window for an hour already inside it", () => {
    const rows = buildHourRows(day, 8, 23, [12]);
    expect(rows).toHaveLength(15);
  });
});

describe("semesterWeekIndex", () => {
  it("returns null when no Semester is configured", () => {
    expect(semesterWeekIndex(new Date("2026-09-07T00:00:00"), null)).toBeNull();
  });

  it("returns 1 for the week containing the Semester's startDate", () => {
    const semester = { startDate: new Date("2026-09-02T00:00:00"), weekCount: 16 }; // a Wednesday
    const weekOneMonday = startOfWeek(semester.startDate);
    expect(semesterWeekIndex(weekOneMonday, semester)).toBe(1);
  });

  it("counts up across later weeks", () => {
    const semester = { startDate: new Date("2026-09-07T00:00:00"), weekCount: 16 }; // a Monday
    expect(semesterWeekIndex(new Date("2026-09-14T00:00:00"), semester)).toBe(2);
    expect(semesterWeekIndex(new Date("2026-10-05T00:00:00"), semester)).toBe(5);
  });

  it("returns null for a week before the Semester starts", () => {
    const semester = { startDate: new Date("2026-09-07T00:00:00"), weekCount: 16 };
    expect(semesterWeekIndex(new Date("2026-08-31T00:00:00"), semester)).toBeNull();
  });

  it("returns null for a week after weekCount ends", () => {
    const semester = { startDate: new Date("2026-09-07T00:00:00"), weekCount: 2 };
    expect(semesterWeekIndex(new Date("2026-09-21T00:00:00"), semester)).toBeNull();
  });
});
