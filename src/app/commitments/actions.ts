"use server";

import { redirect } from "next/navigation";
import {
  createDeadlineTask,
  createFixedCommitment,
  removeDeadlineTask,
  removeFixedCommitment,
  updateDeadlineTask,
  updateFixedCommitment,
} from "@/server/semester-commitments";

function redirectToCommitments(error?: string): never {
  const params = new URLSearchParams();
  if (error) {
    params.set("error", error);
  }
  const query = params.toString();
  redirect(query ? `/commitments?${query}` : "/commitments");
}

export async function createFixedCommitmentAction(formData: FormData): Promise<void> {
  try {
    await createFixedCommitment({
      title: String(formData.get("title")),
      dayOfWeek: Number(formData.get("dayOfWeek")),
      startTime: String(formData.get("startTime")),
      endTime: String(formData.get("endTime")),
    });
  } catch (error) {
    redirectToCommitments(error instanceof Error ? error.message : "新增固定事務失敗");
  }
  redirectToCommitments();
}

export async function updateFixedCommitmentAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  try {
    await updateFixedCommitment(id, {
      title: String(formData.get("title")),
      dayOfWeek: Number(formData.get("dayOfWeek")),
      startTime: String(formData.get("startTime")),
      endTime: String(formData.get("endTime")),
    });
  } catch (error) {
    redirectToCommitments(error instanceof Error ? error.message : "更新固定事務失敗");
  }
  redirectToCommitments();
}

export async function deleteFixedCommitmentAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  try {
    await removeFixedCommitment(id);
  } catch (error) {
    redirectToCommitments(error instanceof Error ? error.message : "刪除固定事務失敗");
  }
  redirectToCommitments();
}

export async function createDeadlineTaskAction(formData: FormData): Promise<void> {
  try {
    await createDeadlineTask({
      title: String(formData.get("title")),
      dueAt: new Date(String(formData.get("dueAt"))),
      estimatedDays: Number(formData.get("estimatedDays")),
    });
  } catch (error) {
    redirectToCommitments(error instanceof Error ? error.message : "新增截止任務失敗");
  }
  redirectToCommitments();
}

export async function updateDeadlineTaskAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  try {
    await updateDeadlineTask(id, {
      title: String(formData.get("title")),
      dueAt: new Date(String(formData.get("dueAt"))),
      estimatedDays: Number(formData.get("estimatedDays")),
    });
  } catch (error) {
    redirectToCommitments(error instanceof Error ? error.message : "更新截止任務失敗");
  }
  redirectToCommitments();
}

export async function deleteDeadlineTaskAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  try {
    await removeDeadlineTask(id);
  } catch (error) {
    redirectToCommitments(error instanceof Error ? error.message : "刪除截止任務失敗");
  }
  redirectToCommitments();
}
