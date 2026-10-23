import React from "react";

/** Move the selected token to the front so a selection can never hide in "+N more". */
export function pinSelected(
  items: string[],
  selected: string | null,
): string[] {
  if (selected === null || !items.includes(selected)) return items;
  return [selected, ...items.filter((item) => item !== selected)];
}

export const LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wider text-rmigray-500";
const ROW_CONTROL_CLASS =
  "text-[10px] underline text-rmigray-500 hover:text-bluespruce focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bluespruce focus-visible:ring-offset-1 rounded";

/**
 * One scope axis: its label, its options as toggle badges, and a control that
 * reveals options the single-row collapse has pushed into "+N more", which
 * would otherwise be visible in the overflow tooltip but not selectable.
 *
 * There is no clear control: both axes always carry a value, so "no selection"
 * is not a state the reader can reach or would benefit from.
 *
 * The control sits in the label cell rather than beside the badges so it never
 * takes part in BadgeArray's width measurement.
 *
 * Shared by the detail page's `PathwayContextRibbon` and the comparison page's
 * `ComparisonScopeHeader` so the two scope bars cannot drift apart. Renders a
 * fragment of two cells, for a `grid-cols-[auto_1fr]` parent.
 */
export const ScopeAxisRow: React.FC<{
  label: string;
  labelId: string;
  expandable: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  children: React.ReactNode;
}> = ({ label, labelId, expandable, expanded, onToggleExpand, children }) => (
  <>
    <div className="flex flex-col items-start pt-1">
      <span
        id={labelId}
        className={LABEL_CLASS}
      >
        {label}
      </span>
      {expandable && (
        <button
          type="button"
          onClick={onToggleExpand}
          className={ROW_CONTROL_CLASS}
        >
          {expanded ? "Show fewer" : "Show all"}
        </button>
      )}
    </div>
    <div
      role="group"
      aria-labelledby={labelId}
      className="min-w-0 py-0.5"
    >
      {children}
    </div>
  </>
);

export default ScopeAxisRow;
