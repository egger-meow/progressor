import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import {
  createTrackableItem,
  DEFAULT_WIP_LIMIT,
  getTrackableItem,
  getWipLimit,
  listTrackableItems,
  removeTrackableItem,
  reorderTrackableItems,
  setWipLimit,
  updateTrackableItem,
  WipLimitExceededError,
} from "./trackable-items";

afterEach(async () => {
  await prisma.trackableItem.deleteMany();
  await prisma.wipLimit.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function bookInput(overrides: Partial<Parameters<typeof createTrackableItem>[0]> = {}) {
  return {
    title: "Designing Data-Intensive Applications",
    type: "book" as const,
    priority: 1,
    unitCount: 12,
    estimatedDays: 20,
    ...overrides,
  };
}

describe("createTrackableItem", () => {
  it("creates a book with not-started/0-completed defaults", async () => {
    const book = await createTrackableItem(bookInput());
    expect(book.status).toBe("not-started");
    expect(book.unitsCompleted).toBe(0);
    expect(book.type).toBe("book");
  });

  it("creates a course", async () => {
    const course = await createTrackableItem(
      bookInput({ type: "course", title: "CS 101", unitCount: 30, estimatedDays: 40 }),
    );
    expect(course.type).toBe("course");
    expect(course.unitCount).toBe(30);
  });

  it("rejects an invalid type", async () => {
    // @ts-expect-error deliberately invalid input to prove runtime validation
    await expect(createTrackableItem(bookInput({ type: "podcast" }))).rejects.toThrow(
      /Invalid TrackableItem type/,
    );
  });

  it("rejects unitCount <= 0", async () => {
    await expect(createTrackableItem(bookInput({ unitCount: 0 }))).rejects.toThrow(
      /unitCount must be > 0/,
    );
  });

  it("rejects unitsCompleted greater than unitCount", async () => {
    await expect(
      createTrackableItem(bookInput({ unitCount: 5, unitsCompleted: 6 })),
    ).rejects.toThrow(/unitsCompleted must be between/);
  });

  it("rejects estimatedDays <= 0", async () => {
    await expect(createTrackableItem(bookInput({ estimatedDays: 0 }))).rejects.toThrow(
      /estimatedDays must be > 0/,
    );
  });

  it("defaults priority to last place (max existing priority + 1) when omitted", async () => {
    await createTrackableItem(bookInput({ title: "First", priority: 5 }));
    const { priority: _omit, ...withoutPriority } = bookInput({ title: "Second" });
    void _omit;
    const second = await createTrackableItem(withoutPriority);
    expect(second.priority).toBe(6);
  });

  it("defaults the very first item's priority to 1 when omitted", async () => {
    const { priority: _omit, ...withoutPriority } = bookInput({ title: "Only" });
    void _omit;
    const item = await createTrackableItem(withoutPriority);
    expect(item.priority).toBe(1);
  });
});

describe("reorderTrackableItems", () => {
  it("persists a full drag-and-drop reorder as sequential 1-indexed priorities", async () => {
    const a = await createTrackableItem(bookInput({ title: "A", priority: 1 }));
    const b = await createTrackableItem(bookInput({ title: "B", priority: 2 }));
    const c = await createTrackableItem(bookInput({ title: "C", priority: 3 }));

    await reorderTrackableItems([c.id, a.id, b.id]);

    const items = await listTrackableItems("book");
    expect(items.map((i) => i.title)).toEqual(["C", "A", "B"]);
    expect(items.map((i) => i.priority)).toEqual([1, 2, 3]);
  });
});

describe("listTrackableItems / getTrackableItem", () => {
  it("lists items ordered by priority ascending, optionally filtered by type", async () => {
    await createTrackableItem(bookInput({ title: "Low priority book", priority: 5 }));
    await createTrackableItem(bookInput({ title: "High priority book", priority: 1 }));
    await createTrackableItem(bookInput({ type: "course", title: "A course", priority: 2 }));

    const books = await listTrackableItems("book");
    expect(books.map((b) => b.title)).toEqual(["High priority book", "Low priority book"]);

    const all = await listTrackableItems();
    expect(all).toHaveLength(3);
  });
});

describe("tags", () => {
  it("defaults to an empty array when omitted", async () => {
    const book = await createTrackableItem(bookInput());
    expect(book.tags).toEqual([]);
  });

  it("trims, dedupes, and drops empty entries on create", async () => {
    const book = await createTrackableItem(
      bookInput({ tags: [" trader ", "trader", "", "  "] }),
    );
    expect(book.tags).toEqual(["trader"]);
  });

  it("round-trips through listTrackableItems and getTrackableItem", async () => {
    const created = await createTrackableItem(bookInput({ tags: ["trader", "學校課"] }));
    const listed = await listTrackableItems("book");
    expect(listed.find((b) => b.id === created.id)?.tags).toEqual(["trader", "學校課"]);
    expect((await getTrackableItem(created.id))?.tags).toEqual(["trader", "學校課"]);
  });

  it("updateTrackableItem replaces tags when provided, leaves them untouched otherwise", async () => {
    const book = await createTrackableItem(bookInput({ tags: ["trader"] }));
    const withoutTagsChange = await updateTrackableItem(book.id, { title: "Renamed" });
    expect(withoutTagsChange.tags).toEqual(["trader"]);

    const retagged = await updateTrackableItem(book.id, { tags: ["學校課"] });
    expect(retagged.tags).toEqual(["學校課"]);
  });
});

describe("targetDate / unitWeightMultiplier", () => {
  it("defaults targetDate to null and unitWeightMultiplier to 1.0 when omitted", async () => {
    const book = await createTrackableItem(bookInput());
    expect(book.targetDate).toBeNull();
    expect(book.unitWeightMultiplier).toBe(1.0);
  });

  it("persists an explicit targetDate independently of estimatedDays", async () => {
    const targetDate = new Date("2026-09-01T00:00:00Z");
    const book = await createTrackableItem(bookInput({ targetDate, estimatedDays: 20 }));
    expect(book.targetDate?.getTime()).toBe(targetDate.getTime());
    expect(book.estimatedDays).toBe(20);
  });

  it("rejects an invalid targetDate", async () => {
    await expect(
      createTrackableItem(bookInput({ targetDate: new Date("not-a-date") })),
    ).rejects.toThrow(/targetDate must be a valid Date or null/);
  });

  it("rejects unitWeightMultiplier <= 0", async () => {
    await expect(
      createTrackableItem(bookInput({ unitWeightMultiplier: 0 })),
    ).rejects.toThrow(/unitWeightMultiplier must be > 0/);
  });

  it("updateTrackableItem sets/clears targetDate independently of estimatedDays, leaves it untouched when omitted", async () => {
    const book = await createTrackableItem(bookInput({ estimatedDays: 20 }));
    const targetDate = new Date("2026-10-01T00:00:00Z");

    const withTarget = await updateTrackableItem(book.id, { targetDate });
    expect(withTarget.targetDate?.getTime()).toBe(targetDate.getTime());
    expect(withTarget.estimatedDays).toBe(20);

    const untouched = await updateTrackableItem(book.id, { title: "Renamed" });
    expect(untouched.targetDate?.getTime()).toBe(targetDate.getTime());

    const cleared = await updateTrackableItem(book.id, { targetDate: null });
    expect(cleared.targetDate).toBeNull();
  });

  it("updateTrackableItem replaces unitWeightMultiplier when provided, leaves it untouched otherwise", async () => {
    const book = await createTrackableItem(bookInput({ unitWeightMultiplier: 1.5 }));
    const untouched = await updateTrackableItem(book.id, { title: "Renamed" });
    expect(untouched.unitWeightMultiplier).toBe(1.5);

    const updated = await updateTrackableItem(book.id, { unitWeightMultiplier: 2 });
    expect(updated.unitWeightMultiplier).toBe(2);
  });
});

describe("WIP limit enforcement", () => {
  it("defaults to DEFAULT_WIP_LIMIT when nothing is configured", async () => {
    expect(await getWipLimit("book")).toBe(DEFAULT_WIP_LIMIT);
    expect(await getWipLimit("course")).toBe(DEFAULT_WIP_LIMIT);
  });

  it("rejects creating a new in-progress item beyond the configured limit, not silently", async () => {
    await setWipLimit("book", 1);
    await createTrackableItem(bookInput({ title: "A", status: "in-progress" }));

    await expect(
      createTrackableItem(bookInput({ title: "B", status: "in-progress" })),
    ).rejects.toThrow(WipLimitExceededError);

    // the rejected item must not have been silently created anyway
    const books = await listTrackableItems("book");
    expect(books.map((b) => b.title)).toEqual(["A"]);
  });

  it("rejects updating an item to in-progress beyond the configured limit", async () => {
    await setWipLimit("course", 1);
    await createTrackableItem(bookInput({ type: "course", title: "C1", status: "in-progress" }));
    const c2 = await createTrackableItem(bookInput({ type: "course", title: "C2" }));

    await expect(updateTrackableItem(c2.id, { status: "in-progress" })).rejects.toThrow(
      WipLimitExceededError,
    );
    const reloaded = await listTrackableItems("course");
    expect(reloaded.find((c) => c.id === c2.id)?.status).toBe("not-started");
  });

  it("enforces book and course limits independently", async () => {
    await setWipLimit("book", 1);
    await setWipLimit("course", 1);
    await createTrackableItem(bookInput({ title: "A", status: "in-progress" }));

    // starting an in-progress course must not be blocked by the book limit
    const course = await createTrackableItem(
      bookInput({ type: "course", title: "B", status: "in-progress" }),
    );
    expect(course.status).toBe("in-progress");
  });

  it("allows starting a new item once an in-progress one frees a slot", async () => {
    await setWipLimit("book", 1);
    const a = await createTrackableItem(bookInput({ title: "A", status: "in-progress" }));
    await updateTrackableItem(a.id, { status: "paused" });

    const b = await createTrackableItem(bookInput({ title: "B", status: "in-progress" }));
    expect(b.status).toBe("in-progress");
  });

  it("does not re-check the limit when an already in-progress item is updated without changing status", async () => {
    await setWipLimit("book", 1);
    const a = await createTrackableItem(bookInput({ title: "A", status: "in-progress" }));

    const updated = await updateTrackableItem(a.id, { unitsCompleted: 3 });
    expect(updated.unitsCompleted).toBe(3);
    expect(updated.status).toBe("in-progress");
  });
});

describe("removeTrackableItem", () => {
  it("deletes an existing item", async () => {
    const book = await createTrackableItem(bookInput());
    await removeTrackableItem(book.id);
    expect(await listTrackableItems("book")).toEqual([]);
  });

  it("throws rather than silently no-op-ing for an unknown id", async () => {
    await expect(removeTrackableItem("does-not-exist")).rejects.toThrow(/not found/);
  });
});

describe("persistence across restart", () => {
  it("survives a fresh PrismaClient connecting to the same database file", async () => {
    const created = await createTrackableItem(bookInput({ title: "Persisted Book" }));

    // A brand-new client (not the app's cached singleton) proves the data
    // lives in the SQLite file itself, not in-memory state that would be
    // lost on an app restart.
    const freshClient = new PrismaClient();
    try {
      const found = await freshClient.trackableItem.findUnique({
        where: { id: created.id },
      });
      expect(found?.title).toBe("Persisted Book");
    } finally {
      await freshClient.$disconnect();
    }
  });
});
