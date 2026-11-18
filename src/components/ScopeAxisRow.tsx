/*
 * Shared styling for the scope bars: the detail page's ribbon
 * (`PathwayContextRibbon`) and the comparison page's `ComparisonScopeHeader`.
 * The axis row component that lived here, with its "Show all" control (#1026),
 * went with the badge rows both bars replaced with the ribbon's dropdowns.
 */

export const LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wider text-rmigray-500";

/**
 * For the note an axis shows in place of its controls when nothing on it can
 * be selected, sized to sit where a control would.
 */
export const EMPTY_AXIS_CLASS = "py-0.5 text-xs italic text-rmigray-500";
