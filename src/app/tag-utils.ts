// Tags are entered as a comma-separated list in forms (same convention as
// Routine's "anchor" field, see routines/actions.ts) — parsing that raw
// input is a UI-layer concern, distinct from src/server/tags.ts's
// persisted-format normalization.
export function parseTagsInput(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function formatTagsInput(tags: string[]): string {
  return tags.join(", ");
}
