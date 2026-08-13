import React from "react";
import clsx from "clsx";
import { X, ChevronDown } from "lucide-react";

type ShellProps = {
  /** e.g., "Temperature (°C)" */
  label: string;
  /** is this facet currently filtering? (controls pill coloring + clear-X) */
  active: boolean;
  /** short summary shown on the pill, e.g., "1.2–1.6", "≥ 1.2", "3 selected", "all" */
  summary: string;
  /** clear the facet entirely */
  onClear: () => void;
  /** panel header (left/right actions, toggles, etc.) */
  header?: React.ReactNode;
  /** panel body (checkbox list or NumericRange). May be a function to get { close } */
  children: React.ReactNode | ((api: { close: () => void }) => React.ReactNode);
  /** optional note pinned under the panel body (e.g. a disclaimer). Omitted → no footer element at all. */
  footer?: React.ReactNode;
  /** Tailwind width for the panel (optional) */
  menuWidthClassName?: string;
  /** Tailwind min width for the trigger (optional, defaults to min-w-32) */
  triggerMinWidthClassName?: string;
  /** Number of characters of ghost text to reserve space for (default 2) */
  reserveSpace?: number;
};

export default function DropdownFacetShell({
  label,
  active,
  summary,
  onClear,
  header,
  children,
  footer,
  menuWidthClassName,
  triggerMinWidthClassName = "min-w-32",
  // Number of characters of ghost text to reserve space for
  reserveSpace = 2,
}: ShellProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [menuMinWidthPx, setMenuMinWidthPx] = React.useState<number>(0);

  React.useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const updateMenuMinWidth = React.useCallback(() => {
    if (!triggerRef.current) return;
    const w = triggerRef.current.getBoundingClientRect().width;
    setMenuMinWidthPx(Math.max(0, Math.floor(w)));
  }, []);
  React.useEffect(() => {
    updateMenuMinWidth();
    const onResize = () => updateMenuMinWidth();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateMenuMinWidth]);

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        className={clsx(
          "inline-flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500",
          active
            ? "text-energy-800 bg-energy-100 border border-energy-100"
            : "text-rmigray-800 bg-white border border-gray-300 hover:bg-gray-50",
          triggerMinWidthClassName,
        )}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="truncate inline-flex items-baseline">
          <span className="relative inline-block [font-variant-numeric:tabular-nums]">
            {/* ghost text keeps pill width stable */}
            <span
              aria-hidden
              className="opacity-0 select-none whitespace-pre"
            >
              {label}: {"9".repeat(reserveSpace)}
            </span>
            <span className="absolute inset-0 whitespace-pre">
              {label}
              {summary ? <strong>{": " + summary}</strong> : "..."}
            </span>
          </span>
        </span>

        {/* Right icon: X when active, ChevronDown when inactive */}
        <span className="ml-2 inline-flex h-5 w-5 items-center justify-center flex-shrink-0">
          {active ? (
            <span
              role="button"
              aria-label={`Clear ${label}`}
              className="inline-flex h-5 w-5 items-center justify-center rounded cursor-pointer hover:bg-energy-200 focus:outline-none"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <X
                size={16}
                aria-hidden
              />
            </span>
          ) : (
            <ChevronDown
              size={16}
              aria-hidden
            />
          )}
        </span>
      </button>

      {open && (
        <div
          ref={menuRef}
          className="relative z-20"
        >
          <div
            role="dialog"
            aria-label={label}
            className={clsx(
              "absolute z-20 mt-2 origin-top-right rounded-md border border-gray-200 bg-white shadow-lg focus:outline-none",
              menuWidthClassName ?? null,
            )}
            style={
              menuWidthClassName
                ? undefined
                : {
                    minWidth: menuMinWidthPx
                      ? `${menuMinWidthPx}px`
                      : undefined,
                  }
            }
          >
            {/* Header row: left/right zones */}
            <div className="flex items-start justify-between px-2 pb-2 text-xs gap-2">
              {header ?? <div />}
            </div>

            {/* Body */}
            <div className="p-2">
              {typeof children === "function"
                ? (children as (api: { close: () => void }) => React.ReactNode)(
                    {
                      close: () => setOpen(false),
                    },
                  )
                : children}
            </div>

            {/* Optional footnote. Guarded so facets without one render exactly as before. */}
            {footer && (
              <div className="border-t border-gray-200 px-2 py-2 text-xs italic text-rmigray-500">
                {footer}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
