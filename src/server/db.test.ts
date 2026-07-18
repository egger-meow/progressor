import { describe, expect, it } from "vitest";
import { prisma } from "./db";

describe("prisma client", () => {
  it("is constructed", () => {
    expect(prisma).toBeDefined();
  });
});
