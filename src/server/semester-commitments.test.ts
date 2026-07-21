import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import {
  createDeadlineTask,
  createFixedCommitment,
  getDeadlineTask,
  getFixedCommitment,
  listDeadlineTasks,
  listFixedCommitments,
  removeDeadlineTask,
  removeFixedCommitment,
  updateDeadlineTask,
  updateFixedCommitment,
} from "./semester-commitments";

afterEach(async () => {
  await prisma.fixedCommitment.deleteMany();
  await prisma.deadlineTask.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("createFixedCommitment", () => {
  it("creates a weekly class slot", async () => {
    const commitment = await createFixedCommitment({
      title: "CS101 Lecture",
      dayOfWeek: 2,
      startTime: "10:00",
      endTime: "11:30",
    });
    expect(commitment.dayOfWeek).toBe(2);
  });

  it("defaults ignoreSemesterBounds to false when omitted", async () => {
    const commitment = await createFixedCommitment({
      title: "CS101 Lecture",
      dayOfWeek: 2,
      startTime: "10:00",
      endTime: "11:30",
    });
    expect(commitment.ignoreSemesterBounds).toBe(false);
  });

  it("persists ignoreSemesterBounds: true when explicitly set", async () => {
    const commitment = await createFixedCommitment({
      title: "Meeting with Professor",
      dayOfWeek: 3,
      startTime: "15:00",
      endTime: "15:30",
      ignoreSemesterBounds: true,
    });
    expect(commitment.ignoreSemesterBounds).toBe(true);
  });

  it("rejects an out-of-range dayOfWeek", async () => {
    await expect(
      createFixedCommitment({
        title: "x",
        dayOfWeek: 7,
        startTime: "10:00",
        endTime: "11:00",
      }),
    ).rejects.toThrow(/Invalid dayOfWeek/);
  });

  it("rejects a malformed time", async () => {
    await expect(
      createFixedCommitment({
        title: "x",
        dayOfWeek: 1,
        startTime: "10am",
        endTime: "11:00",
      }),
    ).rejects.toThrow(/Invalid startTime/);
  });

  it("rejects startTime not before endTime", async () => {
    await expect(
      createFixedCommitment({
        title: "x",
        dayOfWeek: 1,
        startTime: "11:00",
        endTime: "10:00",
      }),
    ).rejects.toThrow(/must be before endTime/);
  });

  it("requires a recurring slot — a dueAt alone is not a valid substitute", async () => {
    // Deliberately a DeadlineTask's fields, not a FixedCommitment's — proves
    // the two are not interchangeable at runtime, not just in the types.
    const deadlineTaskShape = { title: "x", dueAt: new Date(), estimatedHours: 3 };
    await expect(
      createFixedCommitment(deadlineTaskShape as unknown as Parameters<typeof createFixedCommitment>[0]),
    ).rejects.toThrow(/Invalid dayOfWeek/);
  });
});

describe("createDeadlineTask", () => {
  it("creates a task with a due date", async () => {
    const task = await createDeadlineTask({
      title: "Homework 3",
      dueAt: new Date("2026-08-01T23:59:00Z"),
      estimatedHours: 4,
    });
    expect(task.estimatedHours).toBe(4);
  });

  it("requires a dueAt — a recurring slot alone is not a valid substitute", async () => {
    // Deliberately a FixedCommitment's fields, not a DeadlineTask's — proves
    // the two are not interchangeable at runtime, not just in the types.
    const fixedCommitmentShape = {
      title: "x",
      dayOfWeek: 1,
      startTime: "10:00",
      endTime: "11:00",
    };
    await expect(
      createDeadlineTask(fixedCommitmentShape as unknown as Parameters<typeof createDeadlineTask>[0]),
    ).rejects.toThrow(/requires a valid dueAt/);
  });

  it("rejects estimatedHours <= 0", async () => {
    await expect(
      createDeadlineTask({ title: "x", dueAt: new Date(), estimatedHours: 0 }),
    ).rejects.toThrow(/estimatedHours must be > 0/);
  });
});

describe("updateFixedCommitment / updateDeadlineTask", () => {
  it("updates a FixedCommitment's time range", async () => {
    const commitment = await createFixedCommitment({
      title: "Meeting",
      dayOfWeek: 3,
      startTime: "09:00",
      endTime: "10:00",
    });
    const updated = await updateFixedCommitment(commitment.id, {
      startTime: "09:30",
    });
    expect(updated.startTime).toBe("09:30");
    expect(updated.endTime).toBe("10:00");
  });

  it("rejects an update that makes the time range invalid", async () => {
    const commitment = await createFixedCommitment({
      title: "Meeting",
      dayOfWeek: 3,
      startTime: "09:00",
      endTime: "10:00",
    });
    await expect(
      updateFixedCommitment(commitment.id, { startTime: "11:00" }),
    ).rejects.toThrow(/must be before endTime/);
  });

  it("updates ignoreSemesterBounds", async () => {
    const commitment = await createFixedCommitment({
      title: "Meeting",
      dayOfWeek: 3,
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(commitment.ignoreSemesterBounds).toBe(false);

    const updated = await updateFixedCommitment(commitment.id, {
      ignoreSemesterBounds: true,
    });
    expect(updated.ignoreSemesterBounds).toBe(true);
  });

  it("updates a DeadlineTask's dueAt", async () => {
    const task = await createDeadlineTask({
      title: "Report",
      dueAt: new Date("2026-08-01T00:00:00Z"),
      estimatedHours: 2,
    });
    const newDueAt = new Date("2026-08-10T00:00:00Z");
    const updated = await updateDeadlineTask(task.id, { dueAt: newDueAt });
    expect(updated.dueAt.getTime()).toBe(newDueAt.getTime());
  });

  it("throws for a nonexistent FixedCommitment or DeadlineTask", async () => {
    await expect(
      updateFixedCommitment("does-not-exist", { title: "x" }),
    ).rejects.toThrow(/FixedCommitment not found/);
    await expect(
      updateDeadlineTask("does-not-exist", { title: "x" }),
    ).rejects.toThrow(/DeadlineTask not found/);
  });
});

describe("get / list", () => {
  it("lists FixedCommitments ordered by day then start time", async () => {
    await createFixedCommitment({
      title: "Wed class",
      dayOfWeek: 3,
      startTime: "10:00",
      endTime: "11:00",
    });
    await createFixedCommitment({
      title: "Mon class",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
    });
    const list = await listFixedCommitments();
    expect(list.map((c) => c.title)).toEqual(["Mon class", "Wed class"]);
  });

  it("lists DeadlineTasks ordered by dueAt ascending", async () => {
    await createDeadlineTask({
      title: "Later",
      dueAt: new Date("2026-09-01"),
      estimatedHours: 1,
    });
    await createDeadlineTask({
      title: "Sooner",
      dueAt: new Date("2026-08-01"),
      estimatedHours: 1,
    });
    const list = await listDeadlineTasks();
    expect(list.map((t) => t.title)).toEqual(["Sooner", "Later"]);
  });

  it("returns null for a nonexistent id", async () => {
    expect(await getFixedCommitment("does-not-exist")).toBeNull();
    expect(await getDeadlineTask("does-not-exist")).toBeNull();
  });
});

describe("tags", () => {
  it("defaults to an empty array for both kinds when omitted", async () => {
    const commitment = await createFixedCommitment({
      title: "資料探勘",
      dayOfWeek: 2,
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(commitment.tags).toEqual([]);

    const task = await createDeadlineTask({
      title: "Homework 1",
      dueAt: new Date("2026-08-01T00:00:00"),
      estimatedHours: 3,
    });
    expect(task.tags).toEqual([]);
  });

  it("trims/dedupes on create and round-trips through list/get", async () => {
    const commitment = await createFixedCommitment({
      title: "資料探勘",
      dayOfWeek: 2,
      startTime: "09:00",
      endTime: "10:00",
      tags: [" 學校課 ", "學校課"],
    });
    expect(commitment.tags).toEqual(["學校課"]);
    expect((await getFixedCommitment(commitment.id))?.tags).toEqual(["學校課"]);
    expect((await listFixedCommitments()).find((c) => c.id === commitment.id)?.tags).toEqual([
      "學校課",
    ]);
  });

  it("updateFixedCommitment / updateDeadlineTask replace tags when provided, leave untouched otherwise", async () => {
    const commitment = await createFixedCommitment({
      title: "Class",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
      tags: ["school"],
    });
    const unchanged = await updateFixedCommitment(commitment.id, { title: "Class renamed" });
    expect(unchanged.tags).toEqual(["school"]);
    const retagged = await updateFixedCommitment(commitment.id, { tags: ["work"] });
    expect(retagged.tags).toEqual(["work"]);

    const task = await createDeadlineTask({
      title: "Homework",
      dueAt: new Date("2026-08-01T00:00:00"),
      estimatedHours: 3,
      tags: ["school"],
    });
    const taskUnchanged = await updateDeadlineTask(task.id, { title: "Homework renamed" });
    expect(taskUnchanged.tags).toEqual(["school"]);
    const taskRetagged = await updateDeadlineTask(task.id, { tags: ["urgent"] });
    expect(taskRetagged.tags).toEqual(["urgent"]);
  });
});

describe("removeFixedCommitment / removeDeadlineTask", () => {
  it("deletes an existing FixedCommitment", async () => {
    const commitment = await createFixedCommitment({
      title: "Class",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
    });
    await removeFixedCommitment(commitment.id);
    expect(await getFixedCommitment(commitment.id)).toBeNull();
  });

  it("deletes an existing DeadlineTask", async () => {
    const task = await createDeadlineTask({
      title: "Report",
      dueAt: new Date("2026-08-01"),
      estimatedHours: 1,
    });
    await removeDeadlineTask(task.id);
    expect(await getDeadlineTask(task.id)).toBeNull();
  });

  it("throws rather than silently no-op-ing for an unknown id", async () => {
    await expect(removeFixedCommitment("does-not-exist")).rejects.toThrow(/not found/);
    await expect(removeDeadlineTask("does-not-exist")).rejects.toThrow(/not found/);
  });
});
