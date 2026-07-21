"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./page.module.css";

// Wraps one hour-grid cell's compact content (a "+" button, a slot card, a
// continuation bar). When `overlay` is given — the SSR-decided edit/add
// form for this one cell (?edit=/?add=) — it renders as a floating panel
// portaled to document.body instead of growing inline in the grid: an
// edit form inflating just its own row's height made neighboring days
// look jagged/misaligned next to it (project owner, 2026-07-21 — "参差不齊
// after some blocks have event"). The compact content keeps every row the
// same height regardless of what's being edited; the form floats on top.
export function HourCellOverlay({
  overlay,
  children,
  className,
  style,
}: {
  overlay?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Measuring the anchor's layout position has to happen after the DOM
  // has actually painted, so it can't be computed during render — but
  // calling setState synchronously in the effect body itself trips
  // react-hooks/set-state-in-effect. Deferring the setState calls into a
  // requestAnimationFrame callback (rather than calling them directly in
  // the effect) satisfies that rule and also avoids measuring before
  // layout has settled.
  useEffect(() => {
    if (!overlay) {
      const frame = requestAnimationFrame(() => setPosition(null));
      return () => cancelAnimationFrame(frame);
    }
    const frame = requestAnimationFrame(() => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const maxLeft = window.innerWidth - 292;
      const maxTop = window.innerHeight - 340;
      setPosition({
        top: Math.max(8, Math.min(rect.top, maxTop)),
        left: Math.max(8, Math.min(rect.right + 8, maxLeft)),
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [overlay]);

  return (
    <div ref={anchorRef} className={className} style={style}>
      {children}
      {overlay && position
        ? createPortal(
            <div
              className={styles.hourOverlayPanel}
              style={{ position: "fixed", top: position.top, left: position.left }}
            >
              {overlay}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
