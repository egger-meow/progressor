import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import {
  createAdHocEvent,
  getAdHocEvent,
  listAdHocEvents,
  updateAdHocEvent,
} from "./ad-hoc-events";

afterEach(async () => {
  await prisma.adHocEvent.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("createAdHocEvent", () => {
  it("creates an event with optional notes", async () => {
    const event = await createAdHocEvent({ title: "See a friend", notes: "downtown" });
    expect(event.title).toBe("See a friend");
    expect(event.notes).toBe("downtown");
  });

  it("defaults notes to null", async () => {
    const event = await createAdHocEvent({ title: "See a friend" });
    expect(event.notes).toBeNull();
  });
});

describe("updateAdHocEvent", () => {
  it("updates the title", async () => {
    const event = await createAdHocEvent({ title: "Old title" });
    const updated = await updateAdHocEvent(event.id, { title: "New title" });
    expect(updated.title).toBe("New title");
  });

  it("throws for a nonexistent event", async () => {
    await expect(updateAdHocEvent("does-not-exist", { title: "x" })).rejects.toThrow(
      /AdHocEvent not found/,
    );
  });
});

describe("getAdHocEvent / listAdHocEvents", () => {
  it("returns null for a nonexistent id", async () => {
    expect(await getAdHocEvent("does-not-exist")).toBeNull();
  });

  it("lists events", async () => {
    await createAdHocEvent({ title: "A" });
    await createAdHocEvent({ title: "B" });
    const events = await listAdHocEvents();
    expect(events).toHaveLength(2);
  });
});
