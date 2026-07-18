"use server";

import { redirect } from "next/navigation";
import {
  createTrackableItem,
  removeTrackableItem,
  updateTrackableItem,
  type TrackableItemStatus,
  type TrackableItemType,
} from "@/server/trackable-items";

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
    priority: Number(formData.get("priority")),
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
    redirectToItems(error instanceof Error ? error.message : "Failed to create item");
  }
  redirectToItems();
}

export async function updateTrackableItemAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  try {
    // type is immutable once created — UpdateTrackableItemInput has no
    // "type" field, so it's simply never read from the edit form.
    await updateTrackableItem(id, readEditableFields(formData));
  } catch (error) {
    redirectToItems(error instanceof Error ? error.message : "Failed to update item");
  }
  redirectToItems();
}

export async function deleteTrackableItemAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  try {
    await removeTrackableItem(id);
  } catch (error) {
    redirectToItems(error instanceof Error ? error.message : "Failed to delete item");
  }
  redirectToItems();
}
