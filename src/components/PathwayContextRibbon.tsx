import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { PathwayMetadataType, PathwayScopeSelection, Sector } from "../types";
import BadgeArray, { type BadgeVariant } from "./BadgeArray";
import ScopeAxisRow, { pinSelected } from "./ScopeAxisRow";
import RegionMembersTooltip from "./RegionMembersTooltip";
import {
  flattenGeography,
  geographyKind,
  geographyLabel,
  geographyVariant,
  normalizeGeography,
  sortGeographiesForDetails,
} from "../utils/geographyUtils";
import { getSectorTooltip } from "../utils/tooltipUtils";
import { sortByAvailability } from "../utils/timeseriesAvailability";
import type { ScopeAvailability } from "../utils/scopeAvailability";
import { getPathwayTypeTooltip } from "../utils/tooltipUtils";
import getTemperatureColor from "../utils/getTemperatureColor";

/**
 * Watch a sentinel element and report whether it has scrolled off the top.
 *
 * Returns `[condensed, sentinelRef]`; put the sentinel immediately *after* the
 * element that should collapse, so the flag flips exactly when that element's
 * bottom edge reaches the viewport top — which is also the moment the sticky
 * bar below it pins. A sentinel above the header would fire while the header is
 * still fully on screen and shove content mid-viewport.
 *
 * Follows the IntersectionObserver precedent in `OnPageIndex`, not the scroll
 * listener in `PathwaySearch`.
 */
export function useCondensedOnScroll(): [
  boolean,
  React.RefObject<HTMLDivElement | null>,
] {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;

    // On non-production builds the sticky bars pin below EnvironmentBanner,
    // not at the viewport top, so "scrolled past" starts at its bottom edge.
    const bannerHeight =
      document.querySelector("[data-env-banner]")?.getBoundingClientRect()
        .height ?? 0;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // `isIntersecting` is also false when the sentinel sits BELOW the
          // viewport — a short window, or the initial callback before any
          // scroll. Only a sentinel that left via the top means "scrolled past".
          const top = entry.boundingClientRect?.top ?? -1;
          setCondensed(!entry.isIntersecting && top < bannerHeight);
        }
      },
      { rootMargin: `-${bannerHeight}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, []);

  return [condensed, sentinelRef];
}

interface PathwayContextRibbonProps {
  pathway: PathwayMetadataType;
  /**
   * The active scope. `null` on an axis means no preference, which leaves every
   * consumer rendering exactly as it does unfiltered.
   */
  scope: PathwayScopeSelection;
  onScopeChange: (next: PathwayScopeSelection) => void;
  /**
   * Which tokens have something to show. Those that do render filled and can be
   * selected; the rest render outlined and cannot (#1017).
   */
  availability: ScopeAvailability;
  /** The tab list, rendered at the bottom of the sticky stack. */
  children: React.ReactNode;
}

/**
 * The sticky context bar under the title header: which sectors and geographies
 * this pathway covers, plus the tab list, plus a condensed restatement of the
 * title that appears once the full header scrolls away.
 *
 * The condensed bar, the ribbon rows and the tab list share ONE sticky wrapper
 * (pinned at the top, below the environment banner when there is one), with the
 * bar as its first in-flow child. That is what removes the need for a
 * `top-[Npx]` offset on the rows below: the bar pushes them down by exactly its
 * own height, measured by the browser rather than by us, so the layout survives
 * the ribbon wrapping to two lines and the bar losing a pill.
 *
 * The badges are availability-aware, like the coverage panels on the Scope
 * tab: a token with nothing to show is outlined and cannot be selected, and
 * the available ones sort first. The caller computes availability from the
 * bundled timeseries index (`getTimeseriesIndex`), which is there on the first
 * render, so the badges never restyle after mount.
 */
export const PathwayContextRibbon: React.FC<PathwayContextRibbonProps> = ({
  pathway,
  scope,
  onScopeChange,
  availability,
  children,
}) => {
  const [condensed, sentinelRef] = useCondensedOnScroll();
  const [expanded, setExpanded] = useState({ sector: false, geography: false });
  const baseId = useId();

  const geographies = pinSelected(
    sortByAvailability(
      sortGeographiesForDetails(flattenGeography(pathway.geography)),
      availability.hasGeography,
    ),
    scope.geography,
  );
  const sectors = pinSelected(
    sortByAvailability(
      pathway.sectors.map((s) => s.name),
      availability.hasSector,
    ),
    scope.sector,
  );

  const tooltipForGeography = useCallback(
    (geo: string) =>
      geographyKind(geo) === "region" ? (
        <RegionMembersTooltip
          geography={pathway.geography}
          label={geo}
        />
      ) : undefined,
    [pathway.geography],
  );

  const hasNetzero = Boolean(pathway.modelYearNetzero);
  const hasTemp = typeof pathway.modelTempIncrease === "number";

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

      <div className="sticky top-(--env-banner-height) z-20">
        {/*
          Condensed title. aria-hidden because it restates the <h1> above, which
          stays in the accessibility tree whether or not it is on screen — one
          heading, not two.
        */}
        <div
          aria-hidden="true"
          className={`overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none ${
            condensed ? "h-10" : "h-0"
          }`}
        >
          <div className="h-10 bg-bluespruce text-white px-6 flex items-center gap-4">
            <span className="text-sm font-semibold truncate min-w-0 flex-1">
              {pathway.name.short || pathway.name.full}
            </span>
            <span className="flex shrink-0 overflow-hidden rounded-full bg-neutral-100/90 text-xs font-medium text-rmigray-800 shadow-sm">
              <span
                className="px-2.5 py-0.5 whitespace-nowrap"
                title={getPathwayTypeTooltip(pathway.pathwayType)}
              >
                {pathway.pathwayType}
              </span>
              {hasNetzero && (
                <span className="px-2.5 py-0.5 border-l border-white/60 bg-rmiblue-100 whitespace-nowrap">
                  {pathway.modelYearNetzero}
                </span>
              )}
              {hasTemp && (
                <span
                  className={`px-2.5 py-0.5 border-l border-white/60 whitespace-nowrap ${getTemperatureColor(
                    pathway.modelTempIncrease as number,
                  )}`}
                >
                  {`${pathway.modelTempIncrease}°C`}
                </span>
              )}
            </span>
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
                variant={sectors.map((sector) =>
                  availability.hasSector(sector) ? "sector" : "sector-pub",
                )}
                // The scope selection is `string` so a stale value degrades
                // rather than failing to type; the lookup falls back to
                // "No tooltip available." for anything unrecognised.
                tooltipGetter={(sector) => getSectorTooltip(sector as Sector)}
                maxRows={expanded.sector ? Infinity : 1}
                selected={scope.sector}
                isSelectable={availability.hasSector}
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
                variant={geographies.map((geo): BadgeVariant => {
                  const base = geographyVariant(geographyKind(geo));
                  return availability.hasGeography(geo) ? base : `${base}-pub`;
                })}
                toLabel={(geo) => geographyLabel(normalizeGeography(geo))}
                tooltipGetter={tooltipForGeography}
                maxRows={expanded.geography ? Infinity : 1}
                selected={scope.geography}
                isSelectable={availability.hasGeography}
                // Ignored on null, as for sector above.
                onSelect={(next) =>
                  next === null
                    ? undefined
                    : onScopeChange({ ...scope, geography: next })
                }
              >
                {geographies}
              </BadgeArray>
            </ScopeAxisRow>
          </div>
          {children}
        </div>
      </div>
    </>
  );
};

export default PathwayContextRibbon;
