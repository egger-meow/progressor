"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTrackableItemAction, reorderItemsAction } from "./actions";
import { reorderWithinType } from "./priority-order";
import { formatDateParam } from "../week";
import styles from "../page.module.css";

export interface PriorityListItem {
  id: string;
  title: string;
  type: "book" | "course";
  status: string;
  unitsCompleted: number;
  unitCount: number;
  estimatedDays: number;
  unitWeightMultiplier: number;
  targetDate: Date | null;
  tags: string[];
}

const TYPE_LABELS: Record<PriorityListItem["type"], string> = {
  book: "書籍",
  course: "課程",
};

const STATUS_LABELS: Record<string, string> = {
  "not-started": "尚未開始",
  "in-progress": "進行中",
  paused: "暫停",
  done: "已完成",
};

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="3" r="1.3" />
      <circle cx="11" cy="3" r="1.3" />
      <circle cx="5" cy="8" r="1.3" />
      <circle cx="11" cy="8" r="1.3" />
      <circle cx="5" cy="13" r="1.3" />
      <circle cx="11" cy="13" r="1.3" />
    </svg>
  );
}

export function PriorityList({ items }: { items: PriorityListItem[] }) {
  const [order, setOrder] = useState(items);
  // Re-sync local order whenever the server gives us fresh props (e.g.
  // after router.refresh() following a reorder, or a plain page load).
  // This is React's documented "adjust state during render" pattern —
  // setting state directly in the render body, guarded so it only fires
  // when `items` actually changed — rather than a useEffect, which would
  // cause an extra cascading render.
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setOrder(items);
  }

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDrop(type: PriorityListItem["type"], targetId: string) {
    const draggedId = dragId;
    setDragId(null);
    setOverId(null);
    if (!draggedId || draggedId === targetId) {
      return;
    }

    const typeItems = order.filter((item) => item.type === type);
    const fromIndex = typeItems.findIndex((item) => item.id === draggedId);
    const toIndex = typeItems.findIndex((item) => item.id === targetId);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }
    const nextTypeItems = [...typeItems];
    const [moved] = nextTypeItems.splice(fromIndex, 1);
    nextTypeItems.splice(toIndex, 0, moved);

    const next = reorderWithinType(order, type, nextTypeItems);
    setOrder(next);
    setStatusMessage("正在重新排程…");

    startTransition(async () => {
      const result = await reorderItemsAction(next.map((item) => item.id));
      setStatusMessage(
        result.addedSlotCount > 0
          ? `已更新優先度，本週課表新增了 ${result.addedSlotCount} 個時段 — 查看「每週課表」`
          : "已更新優先度",
      );
      router.refresh();
    });
  }

  if (order.length === 0) {
    return <p className={styles.empty}>尚未新增任何書籍或課程。</p>;
  }

  function renderGroup(type: PriorityListItem["type"]) {
    const groupItems = order.filter((item) => item.type === type);
    if (groupItems.length === 0) {
      return <p className={styles.empty}>尚未新增任何{TYPE_LABELS[type]}。</p>;
    }

    return (
      <ul className={styles.priorityList}>
        {groupItems.map((item, index) => {
          const isDragging = dragId === item.id;
          const isOver = overId === item.id && dragId !== null && dragId !== item.id;
          const className = isDragging
            ? styles.priorityItemDragging
            : isOver
              ? styles.priorityItemDropTarget
              : styles.priorityItem;

          return (
            <li
              key={item.id}
              className={className}
              draggable
              onDragStart={() => setDragId(item.id)}
              onDragOver={(event) => {
                event.preventDefault();
                setOverId(item.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(type, item.id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
            >
              <span className={styles.dragHandle} aria-hidden="true">
                <GripIcon />
              </span>
              <span className={styles.priorityRank}>{index + 1}</span>
              <span className={styles.recordMain}>
                <span className={styles.recordTitle}>{item.title}</span>
                <span className={styles.recordMeta}>
                  {STATUS_LABELS[item.status] ?? item.status} · 已完成 {item.unitsCompleted}/
                  {item.unitCount} 單元 · 剩餘進度預估 {item.estimatedDays} 天
                  {item.unitWeightMultiplier !== 1 ? ` · 平均每單元 ${item.unitWeightMultiplier}x` : ""}
                  {item.targetDate ? ` · 目標 ${formatDateParam(new Date(item.targetDate))}` : ""}
                </span>
                {item.tags.length > 0 ? (
                  <span className={styles.tagList}>
                    {item.tags.map((tag) => (
                      <span key={tag} className={styles.tagChip}>
                        {tag}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
              <span className={styles.slotActions}>
                <a className={styles.linkAction} href={`/items?edit=${item.id}`}>
                  編輯
                </a>
                <form action={deleteTrackableItemAction} className={styles.inlineForm}>
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" className={styles.buttonDanger}>
                    刪除
                  </button>
                </form>
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div>
      <h2 className={styles.priorityGroupHeading}>書籍</h2>
      {renderGroup("book")}
      <h2 className={styles.priorityGroupHeading}>課程</h2>
      {renderGroup("course")}
      <p className={styles.priorityStatus} role="status" aria-live="polite">
        {isPending ? "正在重新排程…" : statusMessage}
      </p>
    </div>
  );
}
