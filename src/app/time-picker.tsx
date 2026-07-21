"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { usePopover } from "./use-popover";
import styles from "./page.module.css";

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const MERIDIEMS = ["上午", "下午"] as const;
type Meridiem = (typeof MERIDIEMS)[number];

function parseTime(value: string): { hour24: number; minute: number } {
  const [h, m] = value.split(":").map(Number);
  return {
    hour24: Number.isFinite(h) ? h : 9,
    minute: Number.isFinite(m) ? m : 0,
  };
}

function to12Hour(hour24: number): { hour12: number; meridiem: Meridiem } {
  const meridiem: Meridiem = hour24 < 12 ? "上午" : "下午";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, meridiem };
}

function to24Hour(hour12: number, meridiem: Meridiem): number {
  const normalized = hour12 % 12;
  return meridiem === "上午" ? normalized : normalized + 12;
}

// Click-based replacement for <input type="time"> — project owner,
// 2026-07-21, wanted setting hour/minute/上午-下午 to be mouse-driven
// instead of typing into (or fiddling with) the native time input's tiny
// segments. The underlying value stays a 24-hour "HH:MM" string in a
// hidden input, so every Server Action that reads formData.get(name)
// needs no changes at all.
export function TimePicker({
  name,
  defaultValue = "09:00",
}: {
  name: string;
  defaultValue?: string;
}) {
  const parsed = parseTime(defaultValue);
  const [hour24, setHour24] = useState(parsed.hour24);
  const [minute, setMinute] = useState(parsed.minute);
  const { triggerRef, panelRef, isOpen, position, toggle, close } =
    usePopover<HTMLButtonElement>();

  const { hour12, meridiem } = to12Hour(hour24);
  const value = `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  return (
    <div className={styles.pickerField}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        ref={triggerRef}
        className={styles.pickerTrigger}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {meridiem} {hour12}:{String(minute).padStart(2, "0")}
      </button>
      {isOpen
        ? createPortal(
            <div
              ref={panelRef}
              className={styles.timePickerPanel}
              style={{ position: "fixed", top: position.top, left: position.left }}
              role="dialog"
              aria-label="選擇時間"
            >
              <div className={styles.timePickerMeridiem}>
                {MERIDIEMS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={
                      m === meridiem ? styles.pickerCellActive : styles.pickerCell
                    }
                    onClick={() => setHour24(to24Hour(hour12, m))}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className={styles.timePickerColumns}>
                <div className={styles.timePickerColumn}>
                  <span className={styles.timePickerColumnLabel}>時</span>
                  <div className={styles.timePickerGrid}>
                    {HOURS_12.map((h) => (
                      <button
                        key={h}
                        type="button"
                        className={h === hour12 ? styles.pickerCellActive : styles.pickerCell}
                        onClick={() => setHour24(to24Hour(h, meridiem))}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.timePickerColumn}>
                  <span className={styles.timePickerColumnLabel}>分</span>
                  <div className={styles.timePickerGrid}>
                    {MINUTES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={m === minute ? styles.pickerCellActive : styles.pickerCell}
                        onClick={() => setMinute(m)}
                      >
                        {String(m).padStart(2, "0")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button type="button" className={styles.pickerDoneButton} onClick={close}>
                完成
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
