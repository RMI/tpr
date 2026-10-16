import React from "react";
import type { ColumnGeographyDivergence } from "../utils/comparisonScope";
import { geographyLabel } from "../utils/geographyUtils";

interface GeographyDivergenceNoticeProps {
  divergence: ColumnGeographyDivergence;
}

// Pinned to "en" so the copy is deterministic rather than following the
// reader's locale: the surrounding prose is English either way.
const conjoin = (items: string[]): string =>
  new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(
    items,
  );

/**
 * Says that the columns are not showing the same thing, and how.
 *
 * Two cases, each with its own consequence for the reader:
 *
 *  - `membersDiffer` — the columns name one geography but their publishers
 *    disagree on which countries it contains.
 *  - `differentGeographies` — the columns are scoped to different geographies
 *    altogether, which per-column selection makes possible and sometimes
 *    deliberate.
 *
 * Props in, prose out, following `ScopeFilterNotice`. No `aria-live`: this can
 * only change in response to the reader's own choice in a column's dropdown, so
 * a live announcement would interrupt rather than inform.
 */
export const GeographyDivergenceNotice: React.FC<
  GeographyDivergenceNoticeProps
> = ({ divergence }) => {
  if (divergence.kind === "none") return null;

  if (divergence.kind === "membersDiffer") {
    const differences = divergence.exclusives.map(
      ({ column, countries }) =>
        `only ${column} includes ${conjoin(countries.map(geographyLabel))}`,
    );
    return (
      <p className="mt-2 text-xs text-rmigray-700">
        {`Publishers do not agree on what ${geographyLabel(
          divergence.token,
        )} covers: ${conjoin(
          differences,
        )}. Figures below are not exactly like-for-like.`}
      </p>
    );
  }

  const shown = divergence.columns.map(
    ({ column, label }) => `${column} shows ${label}`,
  );
  return (
    <p className="mt-2 text-xs text-rmigray-700">
      {`These columns are not showing the same geography: ${conjoin(
        shown,
      )}. Figures below are not like-for-like.`}
    </p>
  );
};

export default GeographyDivergenceNotice;
