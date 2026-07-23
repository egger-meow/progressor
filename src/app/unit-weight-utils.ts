// Per-unit multiplier overrides are entered as a comma-separated list of
// "章節:倍率" pairs (e.g. "8:2.5, 15:1.8") — same sparse-list convention as
// tags/anchor (see tag-utils.ts), chosen so a book with 24 chapters only
// needs an entry for the 1-2 unusually long ones instead of a full
// always-visible per-chapter grid. Parsing that raw input is a UI-layer
// concern, distinct from src/server/trackable-items.ts's persisted-format
// normalization.
export function parseUnitWeightOverridesInput(raw: string): Record<number, number> {
  const result: Record<number, number> = {};
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const [keyPart, valuePart] = trimmed.split(":");
    const unitIndex = Number(keyPart?.trim());
    const multiplier = Number(valuePart?.trim());
    if (Number.isInteger(unitIndex) && unitIndex > 0 && Number.isFinite(multiplier) && multiplier > 0) {
      result[unitIndex] = multiplier;
    }
  }
  return result;
}

export function formatUnitWeightOverridesInput(overrides: Record<number, number>): string {
  return Object.entries(overrides)
    .map(([unitIndex, multiplier]) => `${unitIndex}:${multiplier}`)
    .sort((a, b) => Number(a.split(":")[0]) - Number(b.split(":")[0]))
    .join(", ");
}
