import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import {
  createRoutine,
  getRoutine,
  listRoutines,
  removeRoutine,
  updateRoutine,
} from "./routines";

afterEach(async () => {
  await prisma.routine.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("createRoutine", () => {
  it("creates a daily routine with no anchor", async () => {
    const routine = await createRoutine({
      title: "Morning stretch",
      category: "health",
      cadence: "daily",
    });
    expect(routine.anchor).toBeNull();
  });

  it("creates a weekly routine with multiple weekday anchors", async () => {
    const routine = await createRoutine({
      title: "Gym: chest/shoulder",
      category: "gym",
      cadence: "weekly",
      anchor: [1, 3],
      timeOfDayPreference: "morning",
    });
    expect(routine.anchor).toEqual([1, 3]);
    expect(routine.timeOfDayPreference).toBe("morning");
  });

  it("creates a monthly routine with a day-of-month anchor", async () => {
    const routine = await createRoutine({
      title: "Tutoring invoice",
      category: "tutoring",
      cadence: "monthly",
      anchor: [1],
    });
    expect(routine.anchor).toEqual([1]);
  });

  it("rejects weekly cadence without an anchor", async () => {
    await expect(
      createRoutine({ title: "x", category: "gym", cadence: "weekly" }),
    ).rejects.toThrow(/requires a non-empty anchor/);
  });

  it("rejects an out-of-range weekly anchor", async () => {
    await expect(
      createRoutine({
        title: "x",
        category: "gym",
        cadence: "weekly",
        anchor: [7],
      }),
    ).rejects.toThrow(/Invalid anchor value/);
  });

  it("rejects an out-of-range monthly anchor", async () => {
    await expect(
      createRoutine({
        title: "x",
        category: "tutoring",
        cadence: "monthly",
        anchor: [32],
      }),
    ).rejects.toThrow(/Invalid anchor value/);
  });

  it("rejects an invalid cadence", async () => {
    await expect(
      createRoutine({
        title: "x",
        category: "gym",
        // @ts-expect-error deliberately invalid input to prove runtime validation
        cadence: "yearly",
      }),
    ).rejects.toThrow(/Invalid Routine cadence/);
  });

  it("rejects an invalid time-of-day preference", async () => {
    await expect(
      createRoutine({
        title: "x",
        category: "gym",
        cadence: "daily",
        // @ts-expect-error deliberately invalid input to prove runtime validation
        timeOfDayPreference: "midnight",
      }),
    ).rejects.toThrow(/Invalid Time-of-Day Preference/);
  });

  it("creates a routine with a concrete preferredStartTime", async () => {
    const routine = await createRoutine({
      title: "Gym",
      category: "gym",
      cadence: "daily",
      preferredStartTime: "18:30",
    });
    expect(routine.preferredStartTime).toBe("18:30");
  });

  it("defaults preferredStartTime to null when omitted", async () => {
    const routine = await createRoutine({
      title: "Gym",
      category: "gym",
      cadence: "daily",
    });
    expect(routine.preferredStartTime).toBeNull();
  });

  it("rejects a malformed preferredStartTime", async () => {
    await expect(
      createRoutine({
        title: "x",
        category: "gym",
        cadence: "daily",
        preferredStartTime: "6:30pm",
      }),
    ).rejects.toThrow(/Invalid preferredStartTime/);
  });
});

describe("updateRoutine", () => {
  it("updates title/category without touching cadence or anchor", async () => {
    const routine = await createRoutine({
      title: "Gym",
      category: "gym",
      cadence: "weekly",
      anchor: [1, 2],
    });
    const updated = await updateRoutine(routine.id, { title: "Gym: legs" });
    expect(updated.title).toBe("Gym: legs");
    expect(updated.anchor).toEqual([1, 2]);
  });

  it("sets and clears preferredStartTime", async () => {
    const routine = await createRoutine({
      title: "Gym",
      category: "gym",
      cadence: "daily",
    });

    const withTime = await updateRoutine(routine.id, { preferredStartTime: "07:00" });
    expect(withTime.preferredStartTime).toBe("07:00");

    const cleared = await updateRoutine(routine.id, { preferredStartTime: null });
    expect(cleared.preferredStartTime).toBeNull();
  });

  it("clears the anchor when cadence changes to daily", async () => {
    const routine = await createRoutine({
      title: "Gym",
      category: "gym",
      cadence: "weekly",
      anchor: [1, 2],
    });
    const updated = await updateRoutine(routine.id, { cadence: "daily" });
    expect(updated.anchor).toBeNull();
  });

  it("rejects changing cadence to weekly without supplying a new anchor", async () => {
    const routine = await createRoutine({
      title: "Stretch",
      category: "health",
      cadence: "daily",
    });
    await expect(
      updateRoutine(routine.id, { cadence: "weekly" }),
    ).rejects.toThrow(/requires a non-empty anchor/);
  });

  it("clears timeOfDayPreference when explicitly set to null", async () => {
    const routine = await createRoutine({
      title: "Gym",
      category: "gym",
      cadence: "weekly",
      anchor: [1],
      timeOfDayPreference: "morning",
    });
    const updated = await updateRoutine(routine.id, {
      timeOfDayPreference: null,
    });
    expect(updated.timeOfDayPreference).toBeNull();
  });

  it("throws for a nonexistent routine", async () => {
    await expect(updateRoutine("does-not-exist", { title: "x" })).rejects.toThrow(
      /Routine not found/,
    );
  });
});

describe("getRoutine / listRoutines", () => {
  it("lists routines alphabetically by title with parsed anchors", async () => {
    await createRoutine({ title: "Z routine", category: "gym", cadence: "daily" });
    await createRoutine({
      title: "A routine",
      category: "gym",
      cadence: "weekly",
      anchor: [2, 4],
    });

    const routines = await listRoutines();
    expect(routines.map((r) => r.title)).toEqual(["A routine", "Z routine"]);
    expect(routines[0].anchor).toEqual([2, 4]);
  });

  it("returns null for a nonexistent routine", async () => {
    expect(await getRoutine("does-not-exist")).toBeNull();
  });
});

describe("removeRoutine", () => {
  it("deletes an existing routine", async () => {
    const routine = await createRoutine({ title: "Gym", category: "gym", cadence: "daily" });
    await removeRoutine(routine.id);
    expect(await getRoutine(routine.id)).toBeNull();
  });

  it("throws rather than silently no-op-ing for an unknown id", async () => {
    await expect(removeRoutine("does-not-exist")).rejects.toThrow(/not found/);
  });
});
