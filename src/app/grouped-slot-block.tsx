import type { TimeSlotWithLabel } from "@/server/time-slots";
import { deleteTimeSlotAction, skipSessionAction, completeItemAction } from "./actions";
import { formatTimeLabel } from "./week";
import styles from "./page.module.css";

export interface SlotGroup {
  slots: TimeSlotWithLabel[];
}

// Two Time Slots merge into one visual block only when they're genuinely
// the same time-zone occupied by the same kind of thing — never just
// "same day." A CategoryItemSchedule occurrence (category-placement.ts)
// places one Time Slot per eligible item, all sharing the identical
// [startAt, endAt), which is exactly what this key matches on. Every other
// occupant kind (Routine/Fixed Commitment/Deadline Task/Ad-hoc Event/Slack)
// never merges with anything — each keeps its own unique key.
export function groupKey(slot: TimeSlotWithLabel): string {
  if (slot.occupantType !== "trackable-item") {
    return `single:${slot.id}`;
  }
  return `group:${slot.occupantKind}:${new Date(slot.startAt).getTime()}:${new Date(slot.endAt).getTime()}`;
}

// Renders instead of SlotCard when 2+ Time Slots share the exact same
// [startAt, endAt) and occupantKind — e.g. every in-progress Book sharing
// one CategoryItemSchedule occurrence. Only the shared kind/time is always
// visible; per-item title+progress only appears once expanded — project
// owner, 2026-07-21: "all books together in a time zone...not different
// books separated, only details looks what the books' progress."
export function GroupedSlotBlock({ group, expandHref }: { group: SlotGroup; expandHref: string }) {
  const first = group.slots[0];
  return (
    <div className={styles.slotItem}>
      <a
        href={expandHref}
        className={styles.slotItemMain}
        aria-label={`展開：${first.occupantKind}，${group.slots.length} 項進行中`}
      >
        <span className={styles.slotKindChip}>{first.occupantKind}</span>
        <span className={styles.slotTime}>
          {formatTimeLabel(new Date(first.startAt))}–{formatTimeLabel(new Date(first.endAt))}
        </span>
        <span className={styles.slotOccupant}>{group.slots.length} 項進行中</span>
      </a>
    </div>
  );
}

// The expanded detail panel — rendered via the same floating-overlay slot
// SlotEditForm/InlineAddForm already use (HourCellOverlay), triggered by
// GroupedSlotBlock's expandHref (a plain "?expand=<slotId>" query param, no
// client JS, same pattern as "?edit="/"?add=").
export function GroupedSlotDetailPanel({ group, weekParam }: { group: SlotGroup; weekParam: string }) {
  const first = group.slots[0];
  return (
    <div className={styles.addForm}>
      <h3>
        {first.occupantKind}（{formatTimeLabel(new Date(first.startAt))}–
        {formatTimeLabel(new Date(first.endAt))}）
      </h3>
      <ul className={styles.recordList}>
        {group.slots.map((slot) => (
          <li key={slot.id} className={styles.recordCard}>
            <span className={styles.recordMain}>
              <span className={styles.recordTitle}>{slot.occupantLabel}</span>
              {slot.occupantProgress ? (
                <span className={styles.recordMeta}>{slot.occupantProgress}</span>
              ) : null}
              {slot.occupantTags.length > 0 ? (
                <span className={styles.tagList}>
                  {slot.occupantTags.map((tag) => (
                    <span key={tag} className={styles.tagChip}>
                      {tag}
                    </span>
                  ))}
                </span>
              ) : null}
            </span>
            <span className={styles.slotActions}>
              <form action={skipSessionAction} className={styles.inlineForm}>
                <input type="hidden" name="slotId" value={slot.id} />
                <input type="hidden" name="week" value={weekParam} />
                <button type="submit" className={styles.slotChipButton}>
                  跳過
                </button>
              </form>
              <form action={completeItemAction} className={styles.inlineForm}>
                <input type="hidden" name="itemId" value={slot.occupantId ?? ""} />
                <input type="hidden" name="week" value={weekParam} />
                <button type="submit" className={styles.slotChipButtonAccent}>
                  標記完成
                </button>
              </form>
              <form action={deleteTimeSlotAction} className={styles.inlineForm}>
                <input type="hidden" name="id" value={slot.id} />
                <input type="hidden" name="week" value={weekParam} />
                <button type="submit" className={styles.buttonDanger}>
                  移除
                </button>
              </form>
            </span>
          </li>
        ))}
      </ul>
      <a href={`/?week=${weekParam}`} className={styles.linkAction}>
        關閉
      </a>
    </div>
  );
}
