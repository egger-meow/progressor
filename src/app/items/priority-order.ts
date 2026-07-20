// Pure array logic backing the per-type drag-and-drop reordering in
// priority-list.tsx. Book and Course priority is edited as two separate
// visual lists (INBOX.md, 2026-07-20: "books and course different kind,
// sorted books only books and course are course"), but the underlying
// Trackable Item store still has one flat `priority` column shared by both
// types (see src/server/trackable-items.ts's reorderTrackableItems) — that
// column also fixes the relative book/course interleave the Scheduler uses
// when both types compete for the same week's slack time. Splicing only
// within the dragged type and leaving every other-type item in its existing
// position preserves that interleave exactly as it was, so this UI change
// needs no Scheduler behavior change alongside it.
export function reorderWithinType<T extends { id: string; type: string }>(
  fullOrder: T[],
  type: string,
  newTypeOrder: T[],
): T[] {
  const queue = [...newTypeOrder];
  return fullOrder.map((item) => (item.type === type ? queue.shift()! : item));
}
