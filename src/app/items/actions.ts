"use server";

import { redirect } from "next/navigation";
import {
  createTrackableItem,
  removeTrackableItem,
  reorderTrackableItems,
  updateTrackableItem,
  type TrackableItemStatus,
  type TrackableItemType,
} from "@/server/trackable-items";
import { runScheduler } from "@/server/scheduler-runs";
import { addDays, startOfWeek } from "../week";

function redirectToItems(error?: string): never {
  const params = new URLSearchParams();
  if (error) {
    params.set("error", error);
  }
  const query = params.toString();
  redirect(query ? `/items?${query}` : "/items");
}

function readEditableFields(formData: FormData) {
  return {
    title: String(formData.get("title")),
    unitCount: Number(formData.get("unitCount")),
    unitsCompleted: Number(formData.get("unitsCompleted") ?? 0),
    estimatedDays: Number(formData.get("estimatedDays")),
    status: String(formData.get("status")) as TrackableItemStatus,
  };
}

export async function createTrackableItemAction(formData: FormData): Promise<void> {
  try {
    await createTrackableItem({
      ...readEditableFields(formData),
      type: String(formData.get("type")) as TrackableItemType,
    });
  } catch (error) {
    redirectToItems(error instanceof Error ? error.message : "新增失敗");
  }
  redirectToItems();
}

export async function updateTrackableItemAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  try {
    // type and priority are not part of the edit form: type is immutable
    // once created, priority is managed exclusively via drag-and-drop.
    await updateTrackableItem(id, readEditableFields(formData));
  } catch (error) {
    redirectToItems(error instanceof Error ? error.message : "更新失敗");
  }
  redirectToItems();
}

export async function deleteTrackableItemAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  try {
    await removeTrackableItem(id);
  } catch (error) {
    redirectToItems(error instanceof Error ? error.message : "刪除失敗");
  }
  redirectToItems();
}

// Called directly from the PriorityList client component (not bound to a
// <form>), per the project owner's explicit decision that dragging to
// reorder priority should instantly regenerate the current week's
// Schedule (INBOX.md, 2026-07-20) rather than waiting for a manual
// "Generate Schedule" click. Relies on the Scheduler's re-run idempotency
// fix (src/scheduler/hard-constraints.ts, flexible-placement.ts) so this
// can safely be called on every drop without duplicating anything already
// on the board.
export async function reorderItemsAction(
  orderedIds: string[],
): Promise<{ addedSlotCount: number }> {
  await reorderTrackableItems(orderedIds);

  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 7);
  const { createdSlotIds } = await runScheduler(weekStart, weekEnd);

  return { addedSlotCount: createdSlotIds.length };
}
