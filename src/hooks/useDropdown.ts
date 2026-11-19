import { useCallback, useEffect, useRef, useState } from "react";

export interface Dropdown<T extends HTMLElement> {
  open: boolean;
  /** Put on the button that opens the panel. */
  triggerRef: React.RefObject<T | null>;
  /** Put on the panel, so a click inside it does not count as "outside". */
  menuRef: React.RefObject<HTMLDivElement | null>;
  toggle: () => void;
  close: () => void;
}

/**
 * Open/close state for a dropdown panel: toggling trigger, click-outside, and
 * Escape.
 *
 * Extracted from `DropdownFacetShell` so the comparison page's per-column
 * geography control shares it rather than hand-rolling the same three
 * behaviours. That duplication has already cost this repo once —
 * `ResourcesDropdown` rolled its own click-outside and omitted Escape entirely.
 *
 * Closing returns focus to the trigger. Without that, dismissing the panel with
 * Escape drops focus to the document body and a keyboard reader loses their
 * place in the page.
 */
export function useDropdown<T extends HTMLElement>(): Dropdown<T> {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<T | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Restore focus only when the panel was actually open, so an unrelated
  // re-render cannot steal focus back to the trigger.
  const close = useCallback(() => {
    setOpen((wasOpen) => {
      if (wasOpen) triggerRef.current?.focus();
      return false;
    });
  }, []);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      // The trigger's own click handler toggles; closing here too would make
      // the two cancel out and the panel would never close from the trigger.
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return { open, triggerRef, menuRef, toggle, close };
}

export default useDropdown;
