"use server";

import { redirect } from "next/navigation";
import {
  createTimeSlot,
  removeTimeSlot,
  updateTimeSlot,
  type OccupantType,
} from "@/server/time-slots";
import { combineDateAndTime } from "./week";

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
