"use server";

import { redirect } from "next/navigation";
import {
  createTimeSlot,
  removeTimeSlot,
  updateTimeSlot,
  type OccupantType,
} from "@/server/time-slots";
import { runScheduler } from "@/server/scheduler-runs";
import { skipSession, insertAdHocEvent, completeItemEarly } from "@/server/scheduler-repair";
import { combineDateAndTime, parseDateParam, addDays } from "./week";

// Occupant <select> options are encoded as "type|id" (or "slack|") — see
// Weekly View form markup. Parsing that pair back apart is a UI-layer
// concern, so it lives here, not in src/server/time-slots.ts.
function parseOccupant(raw: string): { occupantType: OccupantType; occupantId?: string } {
  const [type, id] = raw.split("|");
  return {
    occupantType: type as OccupantType,
    occupantId: id ? id : undefined,
  };
}

function redirectToWeek(week: string, error?: string): never {
  const params = new URLSearchParams({ week });
  if (error) {
    params.set("error", error);
  }
  redirect(`/?${params.toString()}`);
}

export async function createTimeSlotAction(formData: FormData): Promise<void> {
  const week = String(formData.get("week"));
  const date = String(formData.get("date"));
  const startTime = String(formData.get("startTime"));
  const endTime = String(formData.get("endTime"));
  const occupant = parseOccupant(String(formData.get("occupant")));

  try {
    const startAt = combineDateAndTime(date, startTime);
    const endAt = combineDateAndTime(date, endTime);
    await createTimeSlot({ startAt, endAt, ...occupant });
  } catch (error) {
    redirectToWeek(week, error instanceof Error ? error.message : "Failed to create Time Slot");
  }

  redirectToWeek(week);
}

export async function updateTimeSlotAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const week = String(formData.get("week"));
  const date = String(formData.get("date"));
  const startTime = String(formData.get("startTime"));
  const endTime = String(formData.get("endTime"));
  const occupant = parseOccupant(String(formData.get("occupant")));

  try {
    const startAt = combineDateAndTime(date, startTime);
    const endAt = combineDateAndTime(date, endTime);
    await updateTimeSlot(id, { startAt, endAt, ...occupant });
  } catch (error) {
    redirectToWeek(week, error instanceof Error ? error.message : "Failed to update Time Slot");
  }

  redirectToWeek(week);
}

export async function deleteTimeSlotAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const week = String(formData.get("week"));

  try {
    await removeTimeSlot(id);
  } catch (error) {
    redirectToWeek(week, error instanceof Error ? error.message : "Failed to remove Time Slot");
  }

  redirectToWeek(week);
}

// Only fills genuinely empty time — see src/server/scheduler-runs.ts's
// header comment for the re-run policy. Never touches an existing Time
// Slot, so this is safe to click repeatedly.
export async function generateScheduleAction(formData: FormData): Promise<void> {
  const week = String(formData.get("week"));
  const weekStart = parseDateParam(week);
  const weekEnd = addDays(weekStart, 7);

  let message: string | undefined;
  try {
    const result = await runScheduler(weekStart, weekEnd);
    if (result.output.conflicts.length > 0) {
      message = result.output.conflicts.map((c) => c.message).join("; ");
    }
  } catch (error) {
    message = error instanceof Error ? error.message : "Failed to generate schedule";
  }

  redirectToWeek(week, message);
}

// Phase 3 repair actions — each applies a local edit (never a full
// recompute) via src/server/scheduler-repair.ts, then joins any
// SchedulerConflict into the same "?error=" banner used elsewhere.
function conflictMessage(conflicts: { message: string }[]): string | undefined {
  return conflicts.length > 0 ? conflicts.map((c) => c.message).join("; ") : undefined;
}

export async function skipSessionAction(formData: FormData): Promise<void> {
  const week = String(formData.get("week"));
  const slotId = String(formData.get("slotId"));
  const weekStart = parseDateParam(week);
  const weekEnd = addDays(weekStart, 7);

  let message: string | undefined;
  try {
    const result = await skipSession(weekStart, weekEnd, slotId);
    message = conflictMessage(result.conflicts);
  } catch (error) {
    message = error instanceof Error ? error.message : "Failed to skip session";
  }

  redirectToWeek(week, message);
}

export async function completeItemAction(formData: FormData): Promise<void> {
  const week = String(formData.get("week"));
  const itemId = String(formData.get("itemId"));
  const weekStart = parseDateParam(week);
  const weekEnd = addDays(weekStart, 7);

  let message: string | undefined;
  try {
    const result = await completeItemEarly(weekStart, weekEnd, itemId);
    message = conflictMessage(result.conflicts);
  } catch (error) {
    message = error instanceof Error ? error.message : "Failed to mark item done";
  }

  redirectToWeek(week, message);
}

export async function insertAdHocEventAction(formData: FormData): Promise<void> {
  const week = String(formData.get("week"));
  const date = String(formData.get("date"));
  const startTime = String(formData.get("startTime"));
  const endTime = String(formData.get("endTime"));
  const title = String(formData.get("title"));
  const notes = String(formData.get("notes") ?? "");

  let message: string | undefined;
  try {
    const startAt = combineDateAndTime(date, startTime);
    const endAt = combineDateAndTime(date, endTime);
    const weekStart = parseDateParam(week);
    const weekEnd = addDays(weekStart, 7);
    const result = await insertAdHocEvent(weekStart, weekEnd, {
      title,
      notes: notes || undefined,
      startAt,
      endAt,
    });
    message = conflictMessage(result.conflicts);
  } catch (error) {
    message = error instanceof Error ? error.message : "Failed to insert Ad-hoc Event";
  }

  redirectToWeek(week, message);
}
