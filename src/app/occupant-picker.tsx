"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { usePopover } from "./use-popover";
import styles from "./page.module.css";

export interface OccupantOption {
  value: string; // "type|id", or "slack|"
  group: string; // category header shown above its options; "" (留白) gets no header
  title: string; // display text, without a redundant category prefix
}

// Click-based replacement for the flat native <select> — project owner,
// 2026-07-21, mistook a cramped native dropdown (only "留白（不指定）" visibly
// highlighted) for there being nothing else to pick, even though a second
// option existed underneath. Grouping by category and showing every option
// as its own row (like TimePicker/DatePicker) makes what's actually
// available legible at a glance instead of hidden inside a tiny dropdown.
export function OccupantPicker({
  name,
  options,
  defaultValue = "slack|",
}: {
  name: string;
  options: OccupantOption[];
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const { triggerRef, panelRef, isOpen, position, toggle, close } =
    usePopover<HTMLButtonElement>();

  const selected = options.find((option) => option.value === value);

  const groups: { group: string; options: OccupantOption[] }[] = [];
  for (const option of options) {
    let bucket = groups.find((g) => g.group === option.group);
    if (!bucket) {
      bucket = { group: option.group, options: [] };
      groups.push(bucket);
    }
    bucket.options.push(option);
  }

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
        {selected?.title ?? "留白（不指定）"}
      </button>
      {isOpen
        ? createPortal(
            <div
              ref={panelRef}
              className={styles.occupantPickerPanel}
              style={{ position: "fixed", top: position.top, left: position.left }}
              role="dialog"
              aria-label="選擇內容"
            >
              {groups.map(({ group, options: groupOptions }) => (
                <div key={group || "__slack"} className={styles.occupantPickerGroup}>
                  {group ? (
                    <span className={styles.occupantPickerGroupLabel}>{group}</span>
                  ) : null}
                  {groupOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        option.value === value
                          ? styles.occupantPickerOptionActive
                          : styles.occupantPickerOption
                      }
                      onClick={() => {
                        setValue(option.value);
                        close();
                      }}
                    >
                      {option.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
