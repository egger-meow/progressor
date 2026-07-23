"use server";

import { redirect } from "next/navigation";
import {
  createTimeSlot,
  removeTimeSlot,
  updateTimeSlot,
  type OccupantType,
} from "@/server/time-slots";
import { runSchedulerForHorizon } from "@/server/scheduler-runs";
import { skipSession, insertAdHocEvent, completeItemEarly } from "@/server/scheduler-repair";
import { confirmCheckIn } from "@/server/check-ins";
import { combineDateAndTime, parseDateParam, addDays, startOfWeek } from "./week";

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
    redirectToWeek(week, error instanceof Error ? error.message : "新增時段失敗");
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
    redirectToWeek(week, error instanceof Error ? error.message : "更新時段失敗");
  }

  redirectToWeek(week);
}

export async function deleteTimeSlotAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const week = String(formData.get("week"));

  try {
    await removeTimeSlot(id);
  } catch (error) {
    redirectToWeek(week, error instanceof Error ? error.message : "移除時段失敗");
  }

  redirectToWeek(week);
}

// Runs the Whole-Future Persisted Scheduling Engine (src/scheduler/horizon.ts,
// 2026-07-23) anchored at the REAL current week — not whichever week's
// form this was submitted from — so switching to any future week becomes
// a pure DB read instead of requiring another click from inside it. Only
// fills genuinely empty time (see src/server/scheduler-runs.ts's re-run
// policy); never touches an existing Time Slot, so this is safe to click
// repeatedly. The redirect still returns to whichever week the click came
// from.
export async function generateScheduleAction(formData: FormData): Promise<void> {
  const week = String(formData.get("week"));

  let message: string | undefined;
  try {
    const result = await runSchedulerForHorizon(startOfWeek(new Date()));
    if (result.output.conflicts.length > 0) {
      message = result.output.conflicts.map((c) => c.message).join("; ");
    }
  } catch (error) {
    message = error instanceof Error ? error.message : "產生課表失敗";
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
    message = error instanceof Error ? error.message : "跳過時段失敗";
  }

  redirectToWeek(week, message);
}

// "This one session is done" — advances the item's progress by exactly
// one sitting (src/server/trackable-items.ts's advanceTrackableItemProgress,
// via the same confirmCheckIn the daily check-in gate's 是，已完成 answer
// uses). Not to be confused with completeItemAction below, which finishes
// the WHOLE item regardless of which session's card it's clicked from —
// project owner, 2026-07-23: every session showed the same chapter forever
// because nothing before this advanced progress per session at all.
export async function advanceSessionAction(formData: FormData): Promise<void> {
  const week = String(formData.get("week"));
  const slotId = String(formData.get("slotId"));

  let message: string | undefined;
  try {
    await confirmCheckIn(slotId);
  } catch (error) {
    message = error instanceof Error ? error.message : "完成本次失敗";
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
    message = error instanceof Error ? error.message : "標記完成失敗";
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
    message = error instanceof Error ? error.message : "新增臨時事件失敗";
  }

  redirectToWeek(week, message);
}
