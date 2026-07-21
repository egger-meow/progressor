import { describe, expect, it } from "vitest";
import { normalizeTags, parseTags, serializeTags } from "./tags";

describe("normalizeTags", () => {
  it("returns an empty array for undefined", () => {
    expect(normalizeTags(undefined)).toEqual([]);
  });

  it("trims whitespace, drops empty entries, and dedupes", () => {
    expect(normalizeTags([" trader ", "trader", "", "   ", "學校課"])).toEqual([
      "trader",
      "學校課",
    ]);
  });
});

describe("serializeTags / parseTags", () => {
  it("round-trips a normalized list", () => {
    expect(parseTags(serializeTags(["trader", " 學校課 "]))).toEqual(["trader", "學校課"]);
  });

  it("parseTags treats null/undefined/malformed JSON as no tags", () => {
    expect(parseTags(null)).toEqual([]);
    expect(parseTags(undefined)).toEqual([]);
    expect(parseTags("not json")).toEqual([]);
    expect(parseTags('{"not":"an array"}')).toEqual([]);
  });

  it("parseTags drops non-string entries from otherwise-valid JSON arrays", () => {
    expect(parseTags('["trader", 5, null, "ok"]')).toEqual(["trader", "ok"]);
  });
});
