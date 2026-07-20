"use server";

import { redirect } from "next/navigation";
import {
  createRoutine,
  removeRoutine,
  updateRoutine,
  type RoutineCadence,
  type TimeOfDayPreference,
} from "@/server/routines";

function redirectToRoutines(error?: string): never {
  const params = new URLSearchParams();
  if (error) {
    params.set("error", error);
  }
  const query = params.toString();
  redirect(query ? `/routines?${query}` : "/routines");
}

// Anchor is entered as a comma-separated list ("1,3,5") rather than a
// checkbox grid — simpler to build reliably, and Routine anchors are a
// short, occasional-edit list, not a frequent-input field.
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

function readEditableFields(formData: FormData) {
  const timeOfDayRaw = String(formData.get("timeOfDayPreference") ?? "");
  return {
    title: String(formData.get("title")),
    category: String(formData.get("category")),
    cadence: String(formData.get("cadence")) as RoutineCadence,
    anchor: parseAnchor(String(formData.get("anchor") ?? "")),
    timeOfDayPreference: timeOfDayRaw
      ? (timeOfDayRaw as TimeOfDayPreference)
      : undefined,
  };
}

export async function createRoutineAction(formData: FormData): Promise<void> {
  try {
    await createRoutine(readEditableFields(formData));
  } catch (error) {
    redirectToRoutines(error instanceof Error ? error.message : "新增常規事件失敗");
  }
  redirectToRoutines();
}

export async function updateRoutineAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  try {
    const timeOfDayRaw = String(formData.get("timeOfDayPreference") ?? "");
    await updateRoutine(id, {
      title: String(formData.get("title")),
      category: String(formData.get("category")),
      cadence: String(formData.get("cadence")) as RoutineCadence,
      anchor: parseAnchor(String(formData.get("anchor") ?? "")),
      timeOfDayPreference: timeOfDayRaw ? (timeOfDayRaw as TimeOfDayPreference) : null,
    });
  } catch (error) {
    redirectToRoutines(error instanceof Error ? error.message : "更新常規事件失敗");
  }
  redirectToRoutines();
}

export async function deleteRoutineAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  try {
    await removeRoutine(id);
  } catch (error) {
    redirectToRoutines(error instanceof Error ? error.message : "刪除常規事件失敗");
  }
  redirectToRoutines();
}
