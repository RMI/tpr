import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { PathwayMetadataType, PathwayScopeSelection, Sector } from "../types";
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

/** Move the selected token to the front so a selection can never hide in "+N more". */
function pinSelected(items: string[], selected: string | null): string[] {
  if (selected === null || !items.includes(selected)) return items;
  return [selected, ...items.filter((item) => item !== selected)];
}

const LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-wider text-rmigray-500";
const ROW_CONTROL_CLASS =
  "text-[10px] underline text-rmigray-500 hover:text-bluespruce focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bluespruce focus-visible:ring-offset-1 rounded";

/**
 * One scope axis: its label, its options as toggle badges, and the two controls
 * that keep it usable — clearing the axis, and revealing options that the
 * single-row collapse has pushed into "+N more", which would otherwise be
 * visible in the overflow tooltip but not selectable.
 *
 * The controls sit in the label cell rather than beside the badges so they
 * never take part in BadgeArray's width measurement.
 */
const RibbonRow: React.FC<{
  label: string;
  labelId: string;
  /** Present only when this axis is scoped. */
  onClear?: () => void;
  expandable: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  children: React.ReactNode;
}> = ({
  label,
  labelId,
  onClear,
  expandable,
  expanded,
  onToggleExpand,
  children,
}) => (
  <>
    <div className="flex flex-col items-start pt-1">
      <span
        id={labelId}
        className={LABEL_CLASS}
      >
        {label}
      </span>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className={ROW_CONTROL_CLASS}
        >
          {`Clear ${label.toLowerCase()}`}
        </button>
      )}
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

interface PathwayContextRibbonProps {
  pathway: PathwayMetadataType;
  /**
   * The active scope. `null` on an axis means no preference, which leaves every
   * consumer rendering exactly as it does unfiltered.
   */
  scope: PathwayScopeSelection;
  onScopeChange: (next: PathwayScopeSelection) => void;
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
  scope,
  onScopeChange,
  children,
}) => {
  const [condensed, sentinelRef] = useCondensedOnScroll();
  const [expanded, setExpanded] = useState({ sector: false, geography: false });
  const baseId = useId();

  const geographies = pinSelected(
    sortGeographiesForDetails(flattenGeography(pathway.geography)),
    scope.geography,
  );
  const sectors = pinSelected(
    pathway.sectors.map((s) => s.name),
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
            <RibbonRow
              label="Sector"
              labelId={`${baseId}-sector`}
              onClear={
                scope.sector === null
                  ? undefined
                  : () => onScopeChange({ ...scope, sector: null })
              }
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
                onSelect={(next) => onScopeChange({ ...scope, sector: next })}
              >
                {sectors}
              </BadgeArray>
            </RibbonRow>

            <RibbonRow
              label="Geography"
              labelId={`${baseId}-geography`}
              onClear={
                scope.geography === null
                  ? undefined
                  : () => onScopeChange({ ...scope, geography: null })
              }
              expandable={geographies.length > 1}
              expanded={expanded.geography}
              onToggleExpand={() =>
                setExpanded((prev) => ({ ...prev, geography: !prev.geography }))
              }
            >
              <BadgeArray<string>
                variant={geographies.map((geo) =>
                  geographyVariant(geographyKind(geo)),
                )}
                toLabel={(geo) => geographyLabel(normalizeGeography(geo))}
                tooltipGetter={tooltipForGeography}
                maxRows={expanded.geography ? Infinity : 1}
                selected={scope.geography}
                onSelect={(next) =>
                  onScopeChange({ ...scope, geography: next })
                }
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
