// Shared tag handling for the models that carry a free-text `tags` column
// (TrackableItem, Routine, FixedCommitment, DeadlineTask) — added
// 2026-07-21 so records can be labelled across categories (e.g. a course
// tagged "學校課", a book tagged "trader"), independent of `type`/
// `category`. Stored as a JSON-encoded string array, the same convention
// Routine.anchor already uses (see prisma/schema.prisma).

export function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

export function serializeTags(tags: string[] | undefined): string {
  return JSON.stringify(normalizeTags(tags));
}

export function parseTags(json: string | null | undefined): string[] {
  if (!json) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}
