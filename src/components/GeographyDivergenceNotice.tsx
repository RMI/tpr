import React from "react";
import type { GeographyDivergence } from "../utils/comparisonScope";
import { geographyLabel } from "../utils/geographyUtils";

interface GeographyDivergenceNoticeProps {
  /** The selected geography token, in the publisher's own spelling. */
  token: string;
  divergence: GeographyDivergence;
}

// Pinned to "en" so the copy is deterministic rather than following the
// reader's locale: the surrounding prose is English either way.
const conjoin = (items: string[]): string =>
  new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(
    items,
  );

/**
 * Says that the compared publishers describe the selected geography
 * differently, and how.
 *
 * Two distinct failures, each with its own consequence for the reader:
 *
 *  - `notDeclared` — a publisher does not publish this geography at all, so its
 *    column is showing something else entirely.
 *  - `membersDiffer` — everyone publishes it, but they disagree on which
 *    countries it contains, so the columns are not like-for-like.
 *
 * Props in, prose out, following `ScopeFilterNotice`. No `aria-live`: this can
 * only change in response to the reader's own click on the scope badges, so a
 * live announcement would interrupt rather than inform.
 */
export const GeographyDivergenceNotice: React.FC<
  GeographyDivergenceNoticeProps
> = ({ token, divergence }) => {
  if (divergence.kind === "none") return null;

  const label = geographyLabel(token);

  if (divergence.kind === "notDeclared") {
    const many = divergence.missing.length > 1;
    return (
      <p className="mt-1 text-xs text-rmigray-700">
        {`${conjoin(divergence.missing)} ${many ? "do" : "does"} not publish ${label}. ${
          many ? "Their columns fall" : "Its column falls"
        } back to the closest geography ${many ? "they" : "it"} does cover, named under each chart.`}
      </p>
    );
  }

  const differences = divergence.exclusives.map(
    ({ publisher, countries }) =>
      `only ${publisher} includes ${conjoin(countries.map(geographyLabel))}`,
  );

  return (
    <p className="mt-1 text-xs text-rmigray-700">
      {`Publishers do not agree on what ${label} covers: ${conjoin(
        differences,
      )}. Figures below are not exactly like-for-like.`}
    </p>
  );
};

export default GeographyDivergenceNotice;
