import { describe, expect, it } from "vitest";
import { reorderWithinType } from "./priority-order";

interface Item {
  id: string;
  type: "book" | "course";
}

describe("reorderWithinType", () => {
  it("moves a book within the book subsequence without touching course positions", () => {
    const full: Item[] = [
      { id: "b1", type: "book" },
      { id: "c1", type: "course" },
      { id: "b2", type: "book" },
      { id: "c2", type: "course" },
      { id: "b3", type: "book" },
    ];
    // Drag b3 to the front of the book subsequence: [b3, b1, b2].
    const newBookOrder: Item[] = [
      { id: "b3", type: "book" },
      { id: "b1", type: "book" },
      { id: "b2", type: "book" },
    ];

    const result = reorderWithinType(full, "book", newBookOrder);

    expect(result.map((item) => item.id)).toEqual(["b3", "c1", "b1", "c2", "b2"]);
  });

  it("leaves the full order unchanged when the type's order is unchanged", () => {
    const full: Item[] = [
      { id: "b1", type: "book" },
      { id: "c1", type: "course" },
    ];

    const result = reorderWithinType(full, "course", [{ id: "c1", type: "course" }]);

    expect(result.map((item) => item.id)).toEqual(["b1", "c1"]);
  });
});
