import React, { useId, useState } from "react";
import type { PathwayMetadataType, Sector } from "../types";
import BadgeArray from "./BadgeArray";
import ScopeAxisRow, { LABEL_CLASS, pinSelected } from "./ScopeAxisRow";
import ColumnGeographySelect from "./ColumnGeographySelect";
import GeographyDivergenceNotice from "./GeographyDivergenceNotice";
import { useCondensedOnScroll } from "./PathwayContextRibbon";
import type {
  ColumnGeographyDivergence,
  ColumnGeographyOption,
} from "../utils/comparisonScope";
import { getSectorTooltip } from "../utils/tooltipUtils";

interface ComparisonScopeHeaderProps {
  /** The compared pathways, in column order. */
  pathways: readonly PathwayMetadataType[];
  /** Sector names every compared pathway declares — one shared axis. */
  sectorOptions: string[];
  selectedSector: string | null;
  onSectorChange: (next: string) => void;
  /** Each column's own geographies, keyed by pathway id. */
  geographyOptions: Readonly<Record<string, ColumnGeographyOption[]>>;
  /** Each column's chosen geography, keyed by pathway id. */
  selectedGeographies: Readonly<Record<string, string | null>>;
  onGeographyChange: (pathwayId: string, next: string) => void;
  /** Whether the columns are showing the same thing. */
  divergence: ColumnGeographyDivergence;
}

const columnLabel = (pathway: PathwayMetadataType): string =>
  pathway.name.short || pathway.name.full;

/**
 * The comparison page's sticky scope bar: one shared sector axis, one geography
 * control per column, and a condensed restatement of the column names that
 * appears once the pathway cards scroll away.
 *
 * The two axes are deliberately shaped differently, because they are different
 * kinds of thing:
 *
 *  - **Sector** is a closed vocabulary, so the axis is the intersection of what
 *    the pathways declare and one shared value scopes every column. It stays a
 *    badge row.
 *  - **Geography** is publication-specific. A token resolves to an ISO set only
 *    against its own publisher's `regions` mapping, and across the loadable
 *    pathways no token is declared by more than one publisher — so a shared
 *    value would put every column but one into a fallback. Each column gets its
 *    own dropdown over its own geographies, mirroring the Geographies coverage
 *    section further down the page.
 *
 * The geography row sits on the same column grid as the sections below, so each
 * control lines up under the pathway it belongs to.
 */
export const ComparisonScopeHeader: React.FC<ComparisonScopeHeaderProps> = ({
  pathways,
  sectorOptions,
  selectedSector,
  onSectorChange,
  geographyOptions,
  selectedGeographies,
  onGeographyChange,
  divergence,
}) => {
  const [condensed, sentinelRef] = useCondensedOnScroll();
  const [sectorExpanded, setSectorExpanded] = useState(false);
  const baseId = useId();

  const sectors = pinSelected(sectorOptions, selectedSector);
  const columns = `repeat(${pathways.length}, minmax(0, 1fr))`;

  return (
    <>
      {/*
        1px rather than 0px: a zero-area target's intersectionRatio is
        unreliable at threshold 0. The negative margin cancels its own height
        so it costs no layout.
      */}
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className="h-px -mb-px"
      />

      <div className="sticky top-0 z-20">
        {/*
          Condensed column names. aria-hidden because it restates the pathway
          cards above, which stay in the accessibility tree whether or not they
          are on screen — and it holds no focusables, so nothing is lost.
        */}
        <div
          aria-hidden="true"
          className={`overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none ${
            condensed ? "h-8" : "h-0"
          }`}
        >
          <div
            className="h-8 bg-bluespruce text-white px-6 grid gap-x-6 items-center"
            style={{ gridTemplateColumns: columns }}
          >
            {pathways.map((pathway) => (
              <span
                key={pathway.id}
                className="text-xs font-semibold truncate"
              >
                {columnLabel(pathway)}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur border-b border-neutral-200">
          <div className="px-6 pt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 items-start">
            <ScopeAxisRow
              label="Sector"
              labelId={`${baseId}-sector`}
              expandable={sectors.length > 1}
              expanded={sectorExpanded}
              onToggleExpand={() => setSectorExpanded((prev) => !prev)}
            >
              <BadgeArray<string>
                variant="sector"
                // The scope selection is `string` so a stale value degrades
                // rather than failing to type; the lookup falls back to
                // "No tooltip available." for anything unrecognised.
                tooltipGetter={(sector) => getSectorTooltip(sector as Sector)}
                maxRows={sectorExpanded ? Infinity : 1}
                selected={selectedSector}
                // BadgeArray reports null when the pressed badge is clicked
                // again. Ignored: an axis always carries a value.
                onSelect={(next) =>
                  next === null ? undefined : onSectorChange(next)
                }
              >
                {sectors}
              </BadgeArray>
            </ScopeAxisRow>
          </div>

          {/*
            Geography breaks out of the two-cell axis grid above and onto the
            page's own column grid, so each dropdown sits under its column. The
            label spans the row as a caption rather than taking a label cell,
            which is what keeps that alignment exact.
          */}
          <div className="px-6 pt-2 pb-3">
            <span
              id={`${baseId}-geography`}
              className={`${LABEL_CLASS} block mb-1`}
            >
              Geography
            </span>
            <div
              role="group"
              aria-labelledby={`${baseId}-geography`}
              className="grid gap-x-6"
              style={{ gridTemplateColumns: columns }}
            >
              {pathways.map((pathway) => (
                <ColumnGeographySelect
                  key={pathway.id}
                  pathwayName={columnLabel(pathway)}
                  options={geographyOptions[pathway.id] ?? []}
                  selected={selectedGeographies[pathway.id] ?? null}
                  onSelect={(token) => onGeographyChange(pathway.id, token)}
                />
              ))}
            </div>
            <GeographyDivergenceNotice divergence={divergence} />
          </div>
        </div>
      </div>
    </>
  );
};

export default ComparisonScopeHeader;
