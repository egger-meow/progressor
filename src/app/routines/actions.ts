"use server";

import { redirect } from "next/navigation";
import {
  createRoutine,
  removeRoutine,
  updateRoutine,
  type RoutineCadence,
  type TimeOfDayPreference,
} from "@/server/routines";
import { parseTagsInput } from "../tag-utils";

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

// The TimePicker (src/app/time-picker.tsx) always carries a real "HH:mm"
// value — it has no "empty" state — so a separate checkbox is what says
// whether that value should actually be used as preferredStartTime, or
// ignored in favor of the timeOfDayPreference bucket below it.
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

// A group of checked boxes sharing one name — formData.getAll returns
// every checked value, and unchecked boxes simply don't appear at all, so
// there's no need for an explicit "（無偏好）" sentinel option anymore.
function readTimeOfDayPreferences(formData: FormData): TimeOfDayPreference[] {
  return formData.getAll("timeOfDayPreference").map(String) as TimeOfDayPreference[];
}

function readEditableFields(formData: FormData) {
  return {
    title: String(formData.get("title")),
    category: String(formData.get("category")),
    cadence: String(formData.get("cadence")) as RoutineCadence,
    anchor: parseAnchor(String(formData.get("anchor") ?? "")),
    timeOfDayPreferences: readTimeOfDayPreferences(formData),
    tags: parseTagsInput(String(formData.get("tags") ?? "")),
  };
}

export async function createRoutineAction(formData: FormData): Promise<void> {
  try {
    await createRoutine({
      ...readEditableFields(formData),
      preferredStartTime: readPreferredStartTime(formData),
      durationMinutes: readDurationMinutes(formData),
    });
  } catch (error) {
    redirectToRoutines(error instanceof Error ? error.message : "新增常規事件失敗");
  }
  redirectToRoutines();
}

export async function updateRoutineAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  try {
    await updateRoutine(id, {
      title: String(formData.get("title")),
      category: String(formData.get("category")),
      cadence: String(formData.get("cadence")) as RoutineCadence,
      anchor: parseAnchor(String(formData.get("anchor") ?? "")),
      timeOfDayPreferences: readTimeOfDayPreferences(formData),
      preferredStartTime: readPreferredStartTime(formData) ?? null,
      durationMinutes: readDurationMinutes(formData),
      tags: parseTagsInput(String(formData.get("tags") ?? "")),
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
