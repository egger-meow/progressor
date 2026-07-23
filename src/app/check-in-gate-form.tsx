"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PendingCheckIn } from "@/server/check-ins";
import { submitCheckInsAction } from "./check-in-actions";
import { formatDateLabel, formatTimeLabel } from "./week";
import styles from "./page.module.css";

type Answer = "yes" | "no";

// Was two instant-submit buttons per row — project owner, 2026-07-22:
// "at least have the reaction i selected" (no visible confirmation of
// what was picked before the round-trip fired) and "why no something
// like 提交" (expected to pick every answer first, then submit once).
// Selecting an answer now only updates local state — instant, no server
// round-trip, so the pressed button visibly highlights right away — and
// nothing is sent until 提交 is pressed, sticky at the panel's bottom so
// it's reachable without scrolling through every row first.
export function CheckInGateForm({
  pending,
  onSubmitted,
}: {
  pending: PendingCheckIn[];
  onSubmitted: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const answeredCount = pending.filter((slot) => answers[slot.id]).length;
  const allAnswered = answeredCount === pending.length;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allAnswered || isPending) {
      return;
    }
    const formData = new FormData();
    for (const [slotId, answer] of Object.entries(answers)) {
      formData.set(`answer:${slotId}`, answer);
    }
    startTransition(async () => {
      const completed = await submitCheckInsAction(formData);
      if (completed) {
        // This form calls the Server Action directly, so revalidatePath()
        // alone does not replace the layout's existing `pending` prop.
        // Hide the gate immediately, then fetch the refreshed layout so it
        // stays gone and the Weekly View reflects the recorded answers.
        onSubmitted();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.checkInGateForm}>
      <ul className={styles.checkInGateList}>
        {pending.map((slot) => {
          const answer = answers[slot.id];
          return (
            <li key={slot.id} className={styles.checkInGateItem}>
              <div className={styles.checkInGateItemInfo}>
                <span className={styles.slotKindChip}>{slot.occupantKind}</span>
                <span className={styles.checkInGateItemTitle}>{slot.occupantLabel}</span>
                {slot.occupantProgress ? (
                  <span className={styles.recordMeta}>{slot.occupantProgress}</span>
                ) : null}
                <span className={styles.checkInGateItemTime}>
                  {formatDateLabel(slot.startAt)} {formatTimeLabel(slot.startAt)}–
                  {formatTimeLabel(slot.endAt)}
                </span>
              </div>
              <div className={styles.checkInGateItemActions}>
                <button
                  type="button"
                  className={`${styles.slotChipButtonAccent}${answer && answer !== "yes" ? ` ${styles.checkInGateChoiceInactive}` : ""}`}
                  aria-pressed={answer === "yes"}
                  aria-label={`是，${slot.occupantLabel}（${formatDateLabel(slot.startAt)}）已完成`}
                  onClick={() => setAnswers((prev) => ({ ...prev, [slot.id]: "yes" }))}
                >
                  是，已完成
                </button>
                <button
                  type="button"
                  className={`${styles.buttonDanger}${answer && answer !== "no" ? ` ${styles.checkInGateChoiceInactive}` : ""}`}
                  aria-pressed={answer === "no"}
                  aria-label={`否，${slot.occupantLabel}（${formatDateLabel(slot.startAt)}）尚未完成`}
                  onClick={() => setAnswers((prev) => ({ ...prev, [slot.id]: "no" }))}
                >
                  否，尚未完成
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className={styles.checkInGateSubmitBar}>
        <span className={styles.checkInGateSubmitCount}>
          已回答 {answeredCount}／{pending.length}
        </span>
        <button type="submit" className={styles.button} disabled={!allAnswered || isPending}>
          {isPending ? "處理中…" : "提交"}
        </button>
      </div>
    </form>
  );
}
