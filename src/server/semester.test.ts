import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { getSemester, setSemester } from "./semester";

beforeEach(async () => {
  await prisma.semester.deleteMany();
});

describe("getSemester", () => {
  it("returns null when no Semester has been configured", async () => {
    expect(await getSemester()).toBeNull();
  });
});

describe("setSemester", () => {
  it("persists a new Semester and getSemester returns it", async () => {
    const startDate = new Date("2026-09-01T00:00:00");
    await setSemester({ startDate, weekCount: 16 });

    const semester = await getSemester();
    expect(semester).not.toBeNull();
    expect(semester!.startDate.getTime()).toBe(startDate.getTime());
    expect(semester!.weekCount).toBe(16);
  });

  it("overwrites the existing Semester rather than creating a second one (singleton)", async () => {
    await setSemester({ startDate: new Date("2026-09-01T00:00:00"), weekCount: 16 });
    await setSemester({ startDate: new Date("2027-02-01T00:00:00"), weekCount: 18 });

    const semester = await getSemester();
    expect(semester!.startDate.toISOString()).toBe(new Date("2027-02-01T00:00:00").toISOString());
    expect(semester!.weekCount).toBe(18);
    expect(await prisma.semester.count()).toBe(1);
  });

  it("rejects an invalid startDate", async () => {
    await expect(
      setSemester({ startDate: new Date("not-a-date"), weekCount: 16 }),
    ).rejects.toThrow(/startDate/);
  });

  it("rejects a non-positive weekCount", async () => {
    await expect(
      setSemester({ startDate: new Date("2026-09-01T00:00:00"), weekCount: 0 }),
    ).rejects.toThrow(/weekCount/);
    await expect(
      setSemester({ startDate: new Date("2026-09-01T00:00:00"), weekCount: -1 }),
    ).rejects.toThrow(/weekCount/);
  });
});
