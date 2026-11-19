import React from "react";

interface ScopeFilterNoticeProps {
  /** Rows currently shown. */
  shown: number;
  /** Rows the pathway records in total. */
  total: number;
  /** The active scope in prose, from `scopeSelectionLabel`. */
  label: string;
  /** What the rows are, pluralised by the caller: "rows", "dependencies". */
  noun: string;
}

/**
 * Says that a scope selection is hiding content, and how much.
 *
 * Rendered only when something is actually hidden — the ribbon already states
 * the selection, so repeating it when nothing changed would be noise. Clearing
 * is the ribbon's job: one control in one place, rather than a button on each
 * of the three surfaces a selection can affect.
 */
export const ScopeFilterNotice: React.FC<ScopeFilterNoticeProps> = ({
  shown,
  total,
  label,
  noun,
}) => (
  <p className="mb-4 text-sm text-rmigray-700">
    {`Showing ${shown} of ${total} ${noun} for ${label}.`}
  </p>
);

export default ScopeFilterNotice;
