"use server";

// Server Action for the Daily Check-In Gate (src/app/check-in-gate.tsx +
// check-in-gate-form.tsx, wired into layout.tsx so it wraps every route).
// One batch submission for every answer collected client-side — see
// check-in-gate-form.tsx's header comment for why this replaced two
// instant-submit-per-row actions.

import { revalidatePath } from "next/cache";
import { submitCheckIns, type CheckInAnswer } from "@/server/check-ins";
import { addDays, startOfWeek } from "./week";

export async function submitCheckInsAction(formData: FormData): Promise<boolean> {
  const answers: CheckInAnswer[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("answer:")) {
      continue;
    }
    const slotId = key.slice("answer:".length);
    if (value === "yes" || value === "no") {
      answers.push({ slotId, answer: value });
    }
  }

  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 7);
  try {
    await submitCheckIns(answers, weekStart, weekEnd);
    return true;
  } catch {
    // Nowhere at the layout level to surface a `?error=` banner — leaving
    // whatever's left pending (the gate keeps showing it) is the safe
    // failure mode, the user can just retry.
    return false;
  } finally {
    // The gate is rendered from layout.tsx (wraps every route), calling
    // listPendingCheckIns() once per request — the form is invoked here as
    // a plain async function inside startTransition, not via a `<form
    // action={...}>` or redirect(), so nothing told Next.js to re-fetch
    // that Server Component after this ran. Without this, 提交 silently
    // no-ops from the user's point of view: the mutation succeeds but the
    // exact same stale `pending` list keeps rendering, forever. Revalidate
    // the whole layout (not just "/") since the gate can appear on
    // /items, /routines, /commitments too, and the user should stay on
    // whichever page they were on, not get redirected to "/".
    revalidatePath("/", "layout");
  }
}
