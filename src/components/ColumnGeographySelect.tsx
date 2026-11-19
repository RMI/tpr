import React, { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import Badge from "./Badge";
import { useDropdown } from "../hooks/useDropdown";
import { geographyVariant } from "../utils/geographyUtils";
import type { ColumnGeographyOption } from "../utils/comparisonScope";

interface ColumnGeographySelectProps {
  /** The pathway this column shows. Names the control for assistive tech. */
  pathwayName: string;
  /**
   * This pathway's own geographies, from `columnGeographyOptions`. Only the
   * available ones are offered (#1046).
   */
  options: ColumnGeographyOption[];
  selected: string | null;
  onSelect: (token: string) => void;
}

/**
 * The geography control for one comparison column.
 *
 * A dropdown rather than a badge row because the lists do not fit: IEA declares
 * 15 geographies and NGFS declares 152 (Global, 8 regions and 143 countries).
 * A single row collapses those behind "+N more", and expanding them would bury
 * the page under badges.
 *
 * One control per column rather than one for the page, because geography tokens
 * are publication-specific — across the loadable pathways no token is declared
 * by more than one publisher, so a shared value would put every other column
 * into a fallback. The column carries the provenance, which is what lets the
 * options be labelled plainly.
 *
 * Options are the badges the Geographies coverage section shows, but only those
 * the column has something to show for: timeseries data or key features
 * recorded there (#1046, #869). Listing the rest as options that cannot be
 * chosen (#1017) took up space for nothing a reader could pick. The coverage
 * section, further down the page, still lists them all, and the panel's footer
 * says so.
 *
 * Built on `useDropdown` — the same open/close, click-outside and Escape
 * behaviour as the search page's filter dropdowns.
 */
export const ColumnGeographySelect: React.FC<ColumnGeographySelectProps> = ({
  pathwayName,
  options,
  selected,
  onSelect,
}) => {
  const { open, triggerRef, menuRef, toggle, close } =
    useDropdown<HTMLButtonElement>();
  const listRef = useRef<HTMLDivElement | null>(null);

  const choices = options.filter((option) => option.available);
  const current = choices.find((option) => option.token === selected);

  /*
    Focus the selected option when the panel opens, as a listbox should: with
    152 options, dropping focus at the top would leave a keyboard reader
    arrowing through the list to find where they already are.
  */
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const buttons = [...list.querySelectorAll<HTMLButtonElement>("button")];
    const target =
      buttons.find((b) => b.getAttribute("aria-selected") === "true") ??
      buttons[0];
    target?.focus();
  }, [open]);

  const onListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const list = listRef.current;
    if (!list) return;
    const buttons = [...list.querySelectorAll<HTMLButtonElement>("button")];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;

    const step: Record<string, number | undefined> = {
      ArrowDown: 1,
      ArrowUp: -1,
    };
    const delta = step[event.key];

    if (delta !== undefined) {
      event.preventDefault();
      // Clamped rather than wrapping: the ends of the list are a useful
      // landmark when it is long.
      buttons[
        Math.min(buttons.length - 1, Math.max(0, index + delta))
      ]?.focus();
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      buttons[0]?.focus();
    }
    if (event.key === "End") {
      event.preventDefault();
      buttons[buttons.length - 1]?.focus();
    }
  };

  return (
    <div className="min-w-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        // The visible text is a geography, so the control needs to say which
        // column it belongs to. Position alone is not accessible.
        aria-label={`Geography for ${pathwayName}`}
        disabled={choices.length === 0}
        className="inline-flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-left text-xs text-rmigray-800 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-rmigray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bluespruce focus-visible:ring-offset-1"
      >
        <span className="truncate">
          {current?.label ??
            (choices.length === 0 ? "No geography" : "Select a geography")}
        </span>
        <ChevronDown
          size={14}
          aria-hidden
          className="flex-shrink-0"
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="relative z-30"
        >
          <div className="absolute z-30 mt-1 min-w-full rounded-md border border-gray-200 bg-white shadow-lg">
            <div
              ref={listRef}
              role="listbox"
              aria-label={`Geography for ${pathwayName}`}
              onKeyDown={onListKeyDown}
              className="max-h-64 overflow-auto p-1"
            >
              {choices.map((option) => (
                <button
                  key={option.token}
                  type="button"
                  role="option"
                  aria-selected={option.token === selected}
                  onClick={() => {
                    onSelect(option.token);
                    close();
                  }}
                  className={`flex w-full items-center rounded px-1 py-0.5 text-left hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bluespruce ${
                    option.token === selected ? "bg-neutral-100" : ""
                  }`}
                >
                  <Badge variant={geographyVariant(option.kind)}>
                    {option.label}
                  </Badge>
                </button>
              ))}
            </div>
            <p className="border-t border-gray-200 px-2 py-2 text-xs italic text-rmigray-500">
              Only geographies with data in this tool are listed. The
              Geographies section below shows the pathway&rsquo;s full coverage.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnGeographySelect;
