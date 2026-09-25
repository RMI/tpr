import React, { useCallback, useEffect, useRef, useState } from "react";
import { PathwayMetadataType } from "../types";
import BadgeArray from "./BadgeArray";
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

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // `isIntersecting` is also false when the sentinel sits BELOW the
          // viewport — a short window, or the initial callback before any
          // scroll. Only a sentinel that left via the top means "scrolled past".
          const top = entry.boundingClientRect?.top ?? -1;
          setCondensed(!entry.isIntersecting && top < 0);
        }
      },
      { threshold: 0 },
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, []);

  return [condensed, sentinelRef];
}

/** One label + badge row of the ribbon. */
const RibbonRow: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <>
    <span className="text-[10px] font-semibold uppercase tracking-wider text-rmigray-500 pt-1">
      {label}
    </span>
    <div className="min-w-0">{children}</div>
  </>
);

interface PathwayContextRibbonProps {
  pathway: PathwayMetadataType;
  /** The tab list, rendered at the bottom of the sticky stack. */
  children: React.ReactNode;
}

/**
 * The sticky context bar under the title header: which sectors and geographies
 * this pathway covers, plus the tab list, plus a condensed restatement of the
 * title that appears once the full header scrolls away.
 *
 * The condensed bar, the ribbon rows and the tab list share ONE `sticky top-0`
 * wrapper, with the bar as its first in-flow child. That is what removes the
 * need for a `top-[Npx]` offset on the rows below: the bar pushes them down by
 * exactly its own height, measured by the browser rather than by us, so the
 * layout survives the ribbon wrapping to two lines and the bar losing a pill.
 *
 * The badges here are deliberately NOT availability-aware, unlike the coverage
 * panels on the Scope tab. Availability is derived from the timeseries index,
 * which loads asynchronously, so availability-aware badges would visibly
 * restyle a moment after mount — in the most prominent chrome on the page. This
 * keeps the ribbon a pure function of `pathway`.
 */
export const PathwayContextRibbon: React.FC<PathwayContextRibbonProps> = ({
  pathway,
  children,
}) => {
  const [condensed, sentinelRef] = useCondensedOnScroll();

  const geographies = sortGeographiesForDetails(
    flattenGeography(pathway.geography),
  );
  const sectors = pathway.sectors.map((s) => s.name);

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

      <div className="sticky top-0 z-20">
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
            <RibbonRow label="Sector">
              <BadgeArray
                variant="sector"
                tooltipGetter={getSectorTooltip}
              >
                {sectors}
              </BadgeArray>
            </RibbonRow>

            <RibbonRow label="Geography">
              <BadgeArray
                variant={geographies.map((geo) =>
                  geographyVariant(geographyKind(geo)),
                )}
                toLabel={(geo) => geographyLabel(normalizeGeography(geo))}
                tooltipGetter={tooltipForGeography}
              >
                {geographies}
              </BadgeArray>
            </RibbonRow>
          </div>
          {children}
        </div>
      </div>
    </>
  );
};

export default PathwayContextRibbon;
