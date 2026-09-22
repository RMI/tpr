import React, { useCallback, useId, useState } from "react";
import type {
  PathwayMetadataType,
  PathwayScopeSelection,
  Sector,
} from "../types";
import BadgeArray from "./BadgeArray";
import ScopeAxisRow, { pinSelected } from "./ScopeAxisRow";
import RegionMembersTooltip from "./RegionMembersTooltip";
import GeographyDivergenceNotice from "./GeographyDivergenceNotice";
import { useCondensedOnScroll } from "./PathwayContextRibbon";
import type {
  GeographyDivergence,
  SharedGeographyOption,
} from "../utils/comparisonScope";
import {
  geographyKind,
  geographyLabel,
  geographyVariant,
  normalizeGeography,
} from "../utils/geographyUtils";
import { getSectorTooltip } from "../utils/tooltipUtils";

interface ComparisonScopeHeaderProps {
  /** The compared pathways, in column order — the condensed bar names them. */
  pathways: readonly PathwayMetadataType[];
  /** Sector names every compared pathway declares. */
  sectorOptions: string[];
  /** Every geography token any compared pathway declares. */
  geographyOptions: SharedGeographyOption[];
  scope: PathwayScopeSelection;
  onScopeChange: (next: PathwayScopeSelection) => void;
  /** Whether the publishers describe the selected geography differently. */
  divergence: GeographyDivergence;
}

const columnLabel = (pathway: PathwayMetadataType): string =>
  pathway.name.short || pathway.name.full;

/**
 * The comparison page's sticky scope bar: one shared sector axis, one shared
 * geography axis, and a condensed restatement of the column names that appears
 * once the pathway cards scroll away.
 *
 * Structurally the detail page's `PathwayContextRibbon`, with two differences
 * the plural case forces:
 *
 *  - Geography options are the union of every pathway's tokens, not one
 *    pathway's, because a token only resolves against its own publisher's
 *    `regions` mapping. Each column resolves the shared selection for itself.
 *  - A divergence notice sits inside the geography group, where it explains the
 *    badge the reader just pressed rather than floating free of it.
 *
 * The condensed bar, the axis rows and anything the page passes as `children`
 * share ONE `sticky top-0` wrapper with the bar as its first in-flow child, so
 * the browser computes the offset and no `top-[Npx]` is needed.
 */
export const ComparisonScopeHeader: React.FC<ComparisonScopeHeaderProps> = ({
  pathways,
  sectorOptions,
  geographyOptions,
  scope,
  onScopeChange,
  divergence,
}) => {
  const [condensed, sentinelRef] = useCondensedOnScroll();
  const [expanded, setExpanded] = useState({ sector: false, geography: false });
  const baseId = useId();

  const sectors = pinSelected(sectorOptions, scope.sector);
  const geographies = pinSelected(
    geographyOptions.map((o) => o.token),
    scope.geography,
  );

  const optionFor = useCallback(
    (token: string) => geographyOptions.find((o) => o.token === token),
    [geographyOptions],
  );

  /*
    A shared token is resolved per column, but the members tooltip needs ONE
    mapping to list. Use the first pathway that declares the token: it is the
    publisher whose spelling the badge shows, so its membership is the one the
    label claims. Where publishers disagree, the divergence notice below says so
    rather than the tooltip quietly picking a winner.
  */
  const tooltipForGeography = useCallback(
    (token: string) => {
      if (geographyKind(token) !== "region") return undefined;
      const owner = pathways.find(
        (p) => p.id === optionFor(token)?.declaredBy[0],
      );
      if (!owner) return undefined;
      return (
        <RegionMembersTooltip
          geography={owner.geography}
          label={token}
        />
      );
    },
    [pathways, optionFor],
  );

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
            className="h-8 bg-bluespruce text-white px-6 grid gap-4 items-center"
            style={{
              gridTemplateColumns: `repeat(${pathways.length}, minmax(0, 1fr))`,
            }}
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
              expanded={expanded.sector}
              onToggleExpand={() =>
                setExpanded((prev) => ({ ...prev, sector: !prev.sector }))
              }
            >
              <BadgeArray<string>
                variant="sector"
                // The scope selection is `string` so a stale value degrades
                // rather than failing to type; the lookup falls back to
                // "No tooltip available." for anything unrecognised.
                tooltipGetter={(sector) => getSectorTooltip(sector as Sector)}
                maxRows={expanded.sector ? Infinity : 1}
                selected={scope.sector}
                // BadgeArray reports null when the pressed badge is clicked
                // again. Ignored: an axis always carries a value.
                onSelect={(next) =>
                  next === null
                    ? undefined
                    : onScopeChange({ ...scope, sector: next })
                }
              >
                {sectors}
              </BadgeArray>
            </ScopeAxisRow>

            <ScopeAxisRow
              label="Geography"
              labelId={`${baseId}-geography`}
              expandable={geographies.length > 1}
              expanded={expanded.geography}
              onToggleExpand={() =>
                setExpanded((prev) => ({ ...prev, geography: !prev.geography }))
              }
            >
              <BadgeArray<string>
                variant={geographies.map((token) =>
                  geographyVariant(geographyKind(token)),
                )}
                // The option label carries the publisher suffix; the token
                // stays the value, so it is what lands in the URL.
                toLabel={(token) =>
                  token == null
                    ? ""
                    : (optionFor(token)?.label ??
                      geographyLabel(normalizeGeography(token)))
                }
                tooltipGetter={tooltipForGeography}
                maxRows={expanded.geography ? Infinity : 1}
                selected={scope.geography}
                onSelect={(next) =>
                  next === null
                    ? undefined
                    : onScopeChange({ ...scope, geography: next })
                }
              >
                {geographies}
              </BadgeArray>
              {scope.geography !== null && (
                <GeographyDivergenceNotice
                  token={scope.geography}
                  divergence={divergence}
                />
              )}
            </ScopeAxisRow>
          </div>
        </div>
      </div>
    </>
  );
};

export default ComparisonScopeHeader;
