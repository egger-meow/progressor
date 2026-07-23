"use client";

import { useState } from "react";
import type { PendingCheckIn } from "@/server/check-ins";
import { CheckInGateForm } from "./check-in-gate-form";
import styles from "./page.module.css";

// Rendered from layout.tsx (wraps every route) so a missed Book/Course/
// Deadline Task session forces a same-day yes/no answer before the rest of
// the app is usable — project owner, 2026-07-22: "user must answer to
// continue use the system." Renders nothing once `pending` is empty. The
// backdrop/panel shell stays a plain Server Component; only the
// select-then-submit interaction (CheckInGateForm) needs client state.
export function CheckInGate({ pending }: { pending: PendingCheckIn[] }) {
  const [dismissed, setDismissed] = useState(false);

  if (pending.length === 0 || dismissed) {
    return null;
  }

  return (
    <div className={styles.checkInGateBackdrop}>
      <div className={styles.checkInGatePanel}>
        <h2>昨天的進度</h2>
        <p className={styles.checkInGateHint}>
          以下時段已經過去，尚未確認是否完成 — 請先回答才能繼續使用。
        </p>
        <CheckInGateForm pending={pending} onSubmitted={() => setDismissed(true)} />
      </div>
    </div>
  );
}
