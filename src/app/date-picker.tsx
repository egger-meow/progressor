"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { usePopover } from "./use-popover";
import { addDays, DAY_LABELS, formatDateParam, parseDateParam, startOfWeek } from "./week";
import styles from "./page.module.css";

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// DAY_LABELS is Monday-first ("週一".."週日"); Date.getDay() is Sunday-first
// (0-6) — this re-indexes so labels[0] always lines up with a Monday grid
// column, matching startOfWeek's own Monday convention (src/app/week.ts).
function mondayFirstIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

// Click-based replacement for <input type="date"> — same motivation as
// TimePicker (src/app/time-picker.tsx): picking a day by clicking a
// calendar grid is easier with a mouse than typing/spinning a native date
// input's segments. Keeps a "YYYY-MM-DD" string in a hidden input, so
// every Server Action that reads formData.get(name) needs no changes.
export function DatePicker({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const initial = parseDateParam(defaultValue);
  const [selected, setSelected] = useState(initial);
  const [viewMonth, setViewMonth] = useState(startOfMonth(initial));
  const { triggerRef, panelRef, isOpen, position, toggle, close } =
    usePopover<HTMLButtonElement>();

  const gridStart = startOfWeek(viewMonth);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = new Date();
  const value = formatDateParam(selected);

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
        {selected.getFullYear()}/{selected.getMonth() + 1}/{selected.getDate()}（
        {DAY_LABELS[mondayFirstIndex(selected)]}）
      </button>
      {isOpen
        ? createPortal(
            <div
              ref={panelRef}
              className={styles.datePickerPanel}
              style={{ position: "fixed", top: position.top, left: position.left }}
              role="dialog"
              aria-label="選擇日期"
            >
              <div className={styles.datePickerHeader}>
                <button
                  type="button"
                  className={styles.datePickerNav}
                  onClick={() => setViewMonth((m) => addMonths(m, -1))}
                  aria-label="上個月"
                >
                  &lsaquo;
                </button>
                <span>
                  {viewMonth.getFullYear()} 年 {viewMonth.getMonth() + 1} 月
                </span>
                <button
                  type="button"
                  className={styles.datePickerNav}
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  aria-label="下個月"
                >
                  &rsaquo;
                </button>
              </div>
              <div className={styles.datePickerWeekdays}>
                {DAY_LABELS.map((label) => (
                  <span key={label}>{label[1]}</span>
                ))}
              </div>
              <div className={styles.datePickerGrid}>
                {days.map((day) => {
                  const inMonth = day.getMonth() === viewMonth.getMonth();
                  const isSelected = isSameDay(day, selected);
                  const isToday = isSameDay(day, today);
                  const classNames = [styles.datePickerCell];
                  if (!inMonth) classNames.push(styles.datePickerCellMuted);
                  if (isToday) classNames.push(styles.datePickerCellToday);
                  if (isSelected) classNames.push(styles.pickerCellActive);
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      className={classNames.join(" ")}
                      onClick={() => {
                        setSelected(day);
                        close();
                      }}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
