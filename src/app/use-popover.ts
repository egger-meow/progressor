"use client";

import { useEffect, useRef, useState } from "react";

// Shared open/close/position logic for TimePicker and DatePicker
// (src/app/time-picker.tsx, date-picker.tsx). The panel is rendered via a
// portal to document.body with position:fixed rather than a plain
// position:absolute child, because both pickers get used inside the
// Weekly View's grid (.weekGrid has overflow-x/y: auto — see
// page.module.css) which would otherwise clip the popover instead of
// letting it float over the rest of the page.
export function usePopover<T extends HTMLElement>() {
  const triggerRef = useRef<T>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  function open() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({ top: rect.bottom + 6, left: rect.left });
    }
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
  }

  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      close();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    // capture:true so a scroll inside .weekGrid's horizontally-scrolling
    // container (which doesn't bubble to window by default) still closes
    // the popover instead of leaving it floating over the wrong cell.
    function handleScrollOrResize() {
      close();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  return { triggerRef, panelRef, isOpen, position, open, close, toggle };
}
