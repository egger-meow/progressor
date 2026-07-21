"use server";

import { redirect } from "next/navigation";
import {
  createTrackableItem,
  removeTrackableItem,
  reorderTrackableItems,
  setWipLimit,
  updateTrackableItem,
  type TrackableItemStatus,
  type TrackableItemType,
} from "@/server/trackable-items";
import {
  removeCategoryItemSchedule,
  setCategoryItemSchedule,
  type RoutineCadence,
  type TimeOfDayPreference,
} from "@/server/category-item-schedules";
import { runScheduler } from "@/server/scheduler-runs";
import { addDays, startOfWeek } from "../week";
import { parseTagsInput } from "../tag-utils";

function redirectToItems(error?: string): never {
  const params = new URLSearchParams();
  if (error) {
    params.set("error", error);
  }
  const query = params.toString();
  redirect(query ? `/items?${query}` : "/items");
}

// Mirrors src/app/routines/actions.ts's readPreferredStartTime: a checkbox
// gates whether the DatePicker's value is actually used, since DatePicker
// always resolves to a concrete date and has no "empty" state of its own.
function readTargetDate(formData: FormData): Date | null {
  const setTargetDate = formData.get("setTargetDate") === "on";
  return setTargetDate ? new Date(String(formData.get("targetDate"))) : null;
}

function readEditableFields(formData: FormData) {
  return {
    title: String(formData.get("title")),
    unitCount: Number(formData.get("unitCount")),
    unitsCompleted: Number(formData.get("unitsCompleted") ?? 0),
    estimatedDays: Number(formData.get("estimatedDays")),
    unitWeightMultiplier: Number(formData.get("unitWeightMultiplier") ?? 1),
    targetDate: readTargetDate(formData),
    status: String(formData.get("status")) as TrackableItemStatus,
    tags: parseTagsInput(String(formData.get("tags") ?? "")),
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

// Anchor is entered as a comma-separated list, same convention as
// src/app/routines/actions.ts's parseAnchor.
function parseAnchor(raw: string): number[] | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n));
}

// Mirrors src/app/routines/actions.ts's readPreferredStartTime: the
// TimePicker always carries a real "HH:mm" value, so a checkbox says
// whether it should actually be used. Each type's form is its own <form>
// element, so plain field names (not prefixed) are safe — formData only
// ever sees the one submitted form's fields.
function readPreferredStartTime(formData: FormData): string | undefined {
  const useExactTime = formData.get("useExactTime") === "on";
  return useExactTime ? String(formData.get("preferredStartTime")) : undefined;
}

function readDurationMinutes(formData: FormData): number | undefined {
  const raw = formData.get("durationMinutes");
  if (raw === null || raw === "") {
    return undefined;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export async function setCategoryItemScheduleAction(formData: FormData): Promise<void> {
  const type = String(formData.get("type")) as TrackableItemType;
  try {
    const timeOfDayRaw = String(formData.get("timeOfDayPreference") ?? "");
    await setCategoryItemSchedule(type, {
      cadence: String(formData.get("cadence")) as RoutineCadence,
      anchor: parseAnchor(String(formData.get("anchor") ?? "")),
      timeOfDayPreference: timeOfDayRaw ? (timeOfDayRaw as TimeOfDayPreference) : null,
      preferredStartTime: readPreferredStartTime(formData) ?? null,
      durationMinutes: readDurationMinutes(formData),
    });
  } catch (error) {
    redirectToItems(error instanceof Error ? error.message : "設定排程失敗");
  }
  redirectToItems();
}

export async function removeCategoryItemScheduleAction(formData: FormData): Promise<void> {
  const type = String(formData.get("type")) as TrackableItemType;
  try {
    await removeCategoryItemSchedule(type);
  } catch (error) {
    redirectToItems(error instanceof Error ? error.message : "移除排程失敗");
  }
  redirectToItems();
}

export async function setWipLimitsAction(formData: FormData): Promise<void> {
  try {
    await setWipLimit("book", Number(formData.get("bookLimit")));
    await setWipLimit("course", Number(formData.get("courseLimit")));
  } catch (error) {
    redirectToItems(error instanceof Error ? error.message : "更新同時進行上限失敗");
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
