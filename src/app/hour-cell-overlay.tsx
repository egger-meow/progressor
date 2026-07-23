"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import styles from "./page.module.css";

// Wraps one hour-grid cell's compact content (a "+" button, a slot card, a
// continuation bar). When `overlay` is given — the SSR-decided edit/add/
// expand form for this one cell (?edit=/?add=/?expand=) — it renders as a
// centered modal panel portaled to document.body instead of growing inline
// in the grid: an edit form inflating just its own row's height made
// neighboring days look jagged/misaligned next to it (project owner,
// 2026-07-21 — "参差不齊 after some blocks have event"). The compact
// content keeps every row the same height regardless of what's being
// edited; the form floats on top.
//
// Positioning is deliberately NOT anchor-relative anymore. An earlier
// version measured the triggering cell's position and clamped the panel
// against the viewport edges — but that math still let tall/wide content
// (an expanded occupant picker, a multi-book detail list) get clipped at
// the bottom or side in some cell positions (project owner, 2026-07-22,
// screenshot showing the panel's content cut off below the fold: "click
// time table...content below lower bound would never seen"; and again the
// same day on the grouped detail panel: "bro still cut wtf, I dont wanna
// see any cut in any cases...why not just set that more centered in the
// screen"). Centering the panel in the viewport with a hard
// viewport-bounded max-height/width and its own scroll removes the whole
// class of clipping bugs instead of patching the clamp math again — the
// panel can never be positioned partially off-screen because it isn't
// positioned relative to anything that could be near an edge.
// Standard top-right modal close affordance — project owner, 2026-07-22:
// "關閉 should be like a x on right up which is more intuitive", replacing
// the previous text link buried at the bottom of each panel's content.
function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function HourCellOverlay({
  overlay,
  children,
  className,
  style,
  panelClassName,
  closeHref,
}: {
  overlay?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  panelClassName?: string;
  // Where the backdrop click should navigate to close the overlay — same
  // destination as the panel's own 取消/關閉 link (dropping the ?edit=/
  // ?add=/?expand= query param). Optional: cell wrappers without an
  // overlay never render a backdrop at all.
  closeHref?: string;
}) {
  // createPortal needs document.body, which doesn't exist during SSR.
  // Gating on a client-only mounted flag (set in an effect, so it's false
  // during the server render and the first client render) avoids ever
  // calling createPortal before document.body exists.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className={className} style={style}>
      {children}
      {overlay && mounted
        ? createPortal(
            <div className={styles.hourOverlayBackdrop}>
              {closeHref ? (
                <Link
                  href={closeHref}
                  scroll={false}
                  className={styles.hourOverlayBackdropClose}
                  aria-label="關閉"
                  tabIndex={-1}
                />
              ) : null}
              <div
                className={`${styles.hourOverlayPanel}${panelClassName ? ` ${panelClassName}` : ""}`}
              >
                {closeHref ? (
                  <Link href={closeHref} scroll={false} className={styles.hourOverlayCloseButton} aria-label="關閉">
                    <CloseIcon />
                  </Link>
                ) : null}
                {overlay}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
