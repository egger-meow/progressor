"use client";

import { useLayoutEffect, useState } from "react";
import styles from "./page.module.css";

// Client-only, persisted-in-localStorage preference for which fields a
// SlotCard shows in the compact grid (see page.tsx) — project owner,
// 2026-07-21: "加一個像是要顯示什麼的選擇器...預設時間跟標籤就夠了".
// Deliberately not server state: this is a per-browser display
// preference, not data, so it never touches Prisma. Applied via data
// attributes on #weekly-view (see WEEKLY_VIEW_ID) rather than React state
// driving conditional rendering, so the CSS in page.module.css (not a
// re-render) is what shows/hides each field.
const STORAGE_KEY = "progressor:weekly-view:display-options";
export const WEEKLY_VIEW_ID = "weekly-view";

type DisplayOptionKey = "time" | "tags" | "kind";

const DEFAULT_OPTIONS: Record<DisplayOptionKey, boolean> = {
  time: true,
  tags: true,
  kind: false,
};

const OPTION_LABELS: Record<DisplayOptionKey, string> = {
  time: "時間",
  tags: "標籤",
  kind: "類別",
};

const DATA_KEYS: Record<DisplayOptionKey, string> = {
  time: "showTime",
  tags: "showTags",
  kind: "showKind",
};

function applyToDom(options: Record<DisplayOptionKey, boolean>) {
  const el = document.getElementById(WEEKLY_VIEW_ID);
  if (!el) {
    return;
  }
  for (const key of Object.keys(options) as DisplayOptionKey[]) {
    el.dataset[DATA_KEYS[key]] = String(options[key]);
  }
}

function readStoredOptions(): Record<DisplayOptionKey, boolean> {
  if (typeof window === "undefined") {
    return DEFAULT_OPTIONS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_OPTIONS;
    }
    const parsed = JSON.parse(raw) as Partial<Record<DisplayOptionKey, boolean>>;
    return { ...DEFAULT_OPTIONS, ...parsed };
  } catch {
    return DEFAULT_OPTIONS;
  }
}

export function DisplayOptionsControl() {
  // Lazy-init reads localStorage synchronously on first client render, so
  // the DOM-sync effect below never has to correct a stale default —
  // avoids a visible flash of the wrong fields for a returning visitor.
  const [options, setOptions] = useState<Record<DisplayOptionKey, boolean>>(readStoredOptions);

  useLayoutEffect(() => {
    applyToDom(options);
  }, [options]);

  function toggle(key: DisplayOptionKey) {
    setOptions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className={styles.displayOptions}>
      <span className={styles.displayOptionsLabel}>顯示：</span>
      {(Object.keys(OPTION_LABELS) as DisplayOptionKey[]).map((key) => (
        <label key={key} className={styles.displayOptionChip}>
          <input type="checkbox" checked={options[key]} onChange={() => toggle(key)} />
          {OPTION_LABELS[key]}
        </label>
      ))}
    </div>
  );
}
