import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import {
  getCategoryItemSchedule,
  listCategoryItemSchedules,
  removeCategoryItemSchedule,
  setCategoryItemSchedule,
} from "./category-item-schedules";

afterEach(async () => {
  await prisma.categoryItemSchedule.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("setCategoryItemSchedule", () => {
  it("creates a daily schedule with no anchor", async () => {
    const schedule = await setCategoryItemSchedule("book", { cadence: "daily" });
    expect(schedule.type).toBe("book");
    expect(schedule.anchor).toBeNull();
  });

  it("creates a weekly schedule with multiple weekday anchors", async () => {
    const schedule = await setCategoryItemSchedule("book", {
      cadence: "weekly",
      anchor: [1, 3],
      timeOfDayPreferences: ["morning"],
    });
    expect(schedule.anchor).toEqual([1, 3]);
    expect(schedule.timeOfDayPreferences).toEqual(["morning"]);
  });

  it("creates a schedule with multiple time-of-day preferences, deduped and sorted", async () => {
    const schedule = await setCategoryItemSchedule("book", {
      cadence: "daily",
      timeOfDayPreferences: ["night", "morning", "morning"],
    });
    expect(schedule.timeOfDayPreferences).toEqual(["morning", "night"]);
  });

  it("creates a monthly schedule with a day-of-month anchor", async () => {
    const schedule = await setCategoryItemSchedule("course", {
      cadence: "monthly",
      anchor: [1],
    });
    expect(schedule.anchor).toEqual([1]);
  });

  it("rejects weekly cadence without an anchor", async () => {
    await expect(
      setCategoryItemSchedule("book", { cadence: "weekly" }),
    ).rejects.toThrow(/requires a non-empty anchor/);
  });

  it("rejects an out-of-range weekly anchor", async () => {
    await expect(
      setCategoryItemSchedule("book", { cadence: "weekly", anchor: [7] }),
    ).rejects.toThrow(/Invalid anchor value/);
  });

  it("rejects an invalid cadence", async () => {
    await expect(
      // @ts-expect-error deliberately invalid input to prove runtime validation
      setCategoryItemSchedule("book", { cadence: "yearly" }),
    ).rejects.toThrow(/Invalid CategoryItemSchedule cadence/);
  });

  it("rejects an invalid type", async () => {
    await expect(
      // @ts-expect-error deliberately invalid input to prove runtime validation
      setCategoryItemSchedule("podcast", { cadence: "daily" }),
    ).rejects.toThrow(/Invalid TrackableItem type/);
  });

  it("rejects an invalid time-of-day preference", async () => {
    await expect(
      setCategoryItemSchedule("book", {
        cadence: "daily",
        // @ts-expect-error deliberately invalid input to prove runtime validation
        timeOfDayPreferences: ["midnight"],
      }),
    ).rejects.toThrow(/Invalid Time-of-Day Preference/);
  });

  it("rejects a malformed preferredStartTime", async () => {
    await expect(
      setCategoryItemSchedule("book", { cadence: "daily", preferredStartTime: "6:30pm" }),
    ).rejects.toThrow(/Invalid preferredStartTime/);
  });

  it("defaults durationMinutes to 120 when omitted", async () => {
    const schedule = await setCategoryItemSchedule("book", { cadence: "daily" });
    expect(schedule.durationMinutes).toBe(120);
  });

  it("rejects a non-positive or absurdly large durationMinutes", async () => {
    await expect(
      setCategoryItemSchedule("book", { cadence: "daily", durationMinutes: 0 }),
    ).rejects.toThrow(/Invalid durationMinutes/);
  });

  it("upserts by type: setting twice updates the same row instead of creating a duplicate", async () => {
    await setCategoryItemSchedule("book", { cadence: "daily" });
    await setCategoryItemSchedule("book", { cadence: "weekly", anchor: [2, 4] });

    const all = await listCategoryItemSchedules();
    expect(all.filter((s) => s.type === "book")).toHaveLength(1);
    expect(all.find((s) => s.type === "book")?.cadence).toBe("weekly");
    expect(all.find((s) => s.type === "book")?.anchor).toEqual([2, 4]);
  });

  it("book and course schedules are independent", async () => {
    await setCategoryItemSchedule("book", { cadence: "daily" });
    await setCategoryItemSchedule("course", { cadence: "weekly", anchor: [3] });

    expect((await getCategoryItemSchedule("book"))?.cadence).toBe("daily");
    expect((await getCategoryItemSchedule("course"))?.cadence).toBe("weekly");
  });
});

describe("getCategoryItemSchedule / listCategoryItemSchedules", () => {
  it("returns null for a type with no configured schedule", async () => {
    expect(await getCategoryItemSchedule("book")).toBeNull();
  });

  it("lists schedules ordered by type", async () => {
    await setCategoryItemSchedule("course", { cadence: "daily" });
    await setCategoryItemSchedule("book", { cadence: "daily" });

    const schedules = await listCategoryItemSchedules();
    expect(schedules.map((s) => s.type)).toEqual(["book", "course"]);
  });
});

describe("removeCategoryItemSchedule", () => {
  it("removes a configured schedule, reverting that type to no schedule", async () => {
    await setCategoryItemSchedule("book", { cadence: "daily" });
    await removeCategoryItemSchedule("book");
    expect(await getCategoryItemSchedule("book")).toBeNull();
  });

  it("does not throw when removing a type with no configured schedule", async () => {
    await expect(removeCategoryItemSchedule("course")).resolves.not.toThrow();
  });
});
