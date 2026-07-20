import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { createTrackableItem, listTrackableItems, setWipLimit } from "@/server/trackable-items";
import { reorderItemsAction } from "./actions";

afterEach(async () => {
  await prisma.timeSlot.deleteMany();
  await prisma.trackableItem.deleteMany();
  await prisma.wipLimit.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// End-to-end coverage for the drag-and-drop priority list's actual code
// path (src/app/items/priority-list.tsx calls this directly, not through
// a <form>): persist the new order, then instantly regenerate the
// current week's Schedule — the project owner's explicit decision
// (INBOX.md, 2026-07-20) that dragging should not wait for a manual
// "Generate Schedule" click.
describe("reorderItemsAction", () => {
  it("persists the new priority order and regenerates without throwing", async () => {
    await setWipLimit("book", 3);
    const a = await createTrackableItem({
      title: "A",
      type: "book",
      priority: 1,
      unitCount: 10,
      estimatedDays: 5,
      status: "not-started",
    });
    const b = await createTrackableItem({
      title: "B",
      type: "book",
      priority: 2,
      unitCount: 10,
      estimatedDays: 5,
      status: "not-started",
    });

    const result = await reorderItemsAction([b.id, a.id]);

    const items = await listTrackableItems("book");
    expect(items.map((i) => i.title)).toEqual(["B", "A"]);
    expect(typeof result.addedSlotCount).toBe("number");
  });

  it("does not add duplicate slots when called twice in a row for the same order (idempotent instant regenerate)", async () => {
    await setWipLimit("book", 3);
    const a = await createTrackableItem({
      title: "A",
      type: "book",
      priority: 1,
      unitCount: 10,
      estimatedDays: 5,
      status: "in-progress",
    });
    const b = await createTrackableItem({
      title: "B",
      type: "book",
      priority: 2,
      unitCount: 10,
      estimatedDays: 5,
      status: "in-progress",
    });

    const first = await reorderItemsAction([a.id, b.id]);
    const slotsAfterFirst = await prisma.timeSlot.count();

    const second = await reorderItemsAction([b.id, a.id]);
    const slotsAfterSecond = await prisma.timeSlot.count();

    expect(first.addedSlotCount).toBeGreaterThan(0);
    expect(second.addedSlotCount).toBe(0);
    expect(slotsAfterSecond).toBe(slotsAfterFirst);
  });
});
