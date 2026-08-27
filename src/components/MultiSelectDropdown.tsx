import React from "react";
import type { FacetMode } from "../utils/searchUtils";
import clsx from "clsx";
import DropdownFacetShell from "./DropdownFacetShell";

export type Option<T extends string | number = string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type Props<T extends string | number = string> = {
  label?: string;
  options: Option<T>[];
  value?: T | T[] | null | undefined; // Accept null/undefined; emit T[] via onChange
  onChange: (next: T[]) => void;
  placeholder?: string;
  className?: string;
  /** Minimum width for the trigger button (Tailwind class). Defaults to 'min-w-32'. */
  triggerMinWidthClassName?: string;
  /** Optional fixed width class for the menu panel (e.g., 'w-96'). If omitted, we compute a minWidth >= trigger width. */
  menuWidthClassName?: string;
  // Optional ANY/ALL control (unused by default)
  mode?: FacetMode;
  onModeChange?: (m: FacetMode) => void;
  showModeToggle?: boolean;
  closeOnSelect?: boolean;
  /** Optional note pinned under the option list (e.g. a disclaimer about the options). */
  footer?: React.ReactNode;
};

export default function MultiSelectDropdown<
  T extends string | number = string,
>({
  label,
  options,
  value,
  onChange,
  placeholder = "Select",
  triggerMinWidthClassName = "min-w-32",
  menuWidthClassName,
  mode = "ANY",
  onModeChange,
  showModeToggle = false,
  closeOnSelect = false,
  footer,
}: Props<T>) {
  // Coerce scalar/null/undefined → T[]
  // Normalize current values to an array for easy checks
  const current = React.useMemo<T[]>(
    () =>
      Array.isArray(value)
        ? value.filter((v): v is T => v !== null && v !== undefined)
        : value === null || value === undefined
          ? []
          : [value],
    [value],
  );

  const isActive = current.length > 0;
  const displayLabel = label ?? placeholder;
  const summary = isActive ? current.length : null;

  // We compare using string forms to support number values safely
  const toKey = React.useCallback((v: T) => String(v), []);
  const selectedSet = React.useMemo(
    () => new Set(current.map(toKey)),
    [current, toKey],
  );

  const toggle = (v: T) => {
    const next: T[] = [];
    const key = toKey(v);
    const wasSelected = selectedSet.has(key);

    if (wasSelected) {
      for (const item of current) if (toKey(item) !== key) next.push(item);
    } else {
      next.push(...current, v);
    }

    onChange(next);
  };

  const enabled = options.filter((o) => !o.disabled);
  const allSelected =
    enabled.length > 0 && enabled.every((o) => selectedSet.has(toKey(o.value)));

  const clear = () => onChange([]);
  const selectAll = () => onChange(enabled.map((o) => o.value));

  return (
    <DropdownFacetShell
      label={displayLabel}
      active={isActive}
      summary={summary}
      onClear={clear}
      menuWidthClassName={menuWidthClassName}
      triggerMinWidthClassName={triggerMinWidthClassName}
      footer={footer}
      // number of digits in options.length
      reserveSpace={String(options.length).length}
      header={
        <>
          {/* Left: actions */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              className="underline disabled:opacity-50 whitespace-nowrap"
              onClick={selectAll}
              disabled={allSelected || enabled.length === 0}
            >
              Select all
            </button>
            <button
              type="button"
              className="underline disabled:opacity-50"
              onClick={clear}
              disabled={current.length === 0}
            >
              Clear
            </button>
          </div>
          {/* Right: ANY/ALL toggle */}
          {showModeToggle && onModeChange ? (
            <div className="text-right text-rmigray-500 px-0 py-0 inline-block">
              <div className="whitespace-nowrap">Show pathways matching</div>
              <div
                className="mt-1 flex items-center justify-end gap-1"
                data-testid="mode-explainer"
              >
                <div
                  className="border border-gray-200 rounded-md cursor-pointer select-none"
                  data-testid="mode-toggle"
                  role="button"
                  aria-label={`Toggle match mode (currently ${mode === "ANY" ? "Any" : "All"})`}
                  aria-live="polite"
                  tabIndex={0}
                  onClick={() => onModeChange?.(mode === "ANY" ? "ALL" : "ANY")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onModeChange?.(mode === "ANY" ? "ALL" : "ANY");
                    }
                  }}
                >
                  <span
                    className={clsx(
                      "px-[2px] py-[2px] rounded",
                      mode === "ANY" && "bg-energy-100 text-energy-800",
                    )}
                  >
                    Any
                  </span>
                  <span
                    className={clsx(
                      "px-[2px] py-[2px] rounded",
                      mode === "ALL" && "bg-energy-100 text-energy-800",
                    )}
                  >
                    All
                  </span>
                </div>
                <span>selected</span>
              </div>
            </div>
          ) : null}
        </>
      }
    >
      {(api: { close: () => void }) => (
        <ul
          className="max-h-64 overflow-auto"
          role="listbox"
          aria-multiselectable="true"
        >
          {options.map((o) => {
            const checked = selectedSet.has(toKey(o.value));
            return (
              <li key={toKey(o.value)}>
                <label
                  className={`flex items-center gap-2 px-2 py-1 ${o.disabled ? "opacity-50" : "cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={o.disabled}
                    onChange={() => {
                      toggle(o.value);
                      if (closeOnSelect) api.close();
                    }}
                  />
                  <span className="text-sm">{o.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </DropdownFacetShell>
  );
}
