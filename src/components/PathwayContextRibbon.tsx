import React, { useEffect, useId, useRef, useState } from "react";
import { PathwayMetadataType, PathwayScopeSelection } from "../types";
import { LABEL_CLASS } from "./ScopeAxisRow";
import ScopeDropdown from "./ScopeDropdown";
import {
  ChoiceButton,
  InactiveSlot,
  OrSeparator,
  ReadOnlySector,
} from "./ScopeRibbonControls";
import {
  GEOGRAPHY_LEVELS,
  geographyLevels,
  geographyOptions,
  sectorOptions,
  slotState,
} from "../utils/scopeRibbon";
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
   * Which tokens have something to show (#1017). Everything the pathway declares
   * is listed; this decides which of those can be selected.
   */
  availability: ScopeAvailability;
  /** The tab list, rendered at the bottom of the sticky stack. */
  children: React.ReactNode;
}

/**
 * The sticky context bar under the title header: the Sector control and the
 * Global / Region / Country slots, plus the tab list, plus a condensed
 * restatement of the title that appears once the full header scrolls away.
 *
 * The condensed bar, the scope controls and the tab list share ONE sticky
 * wrapper (pinned at the top, below the environment banner when there is one),
 * with the bar as its first in-flow child. That is what removes the need for a
 * `top-[Npx]` offset on the rows below: the bar pushes them down by exactly its
 * own height, measured by the browser rather than by us, so the layout survives
 * the controls wrapping onto a second line.
 *
 * Dropdowns rather than the pill rows they replaced: the pills could not hold
 * long lists (JRC-GECO-1.5C-2025 declares 14 sectors and 42 geographies), and
 * told the reader nothing about whether a value was Global, a region or a
 * country beyond a shade of green.
 *
 * Every option the pathway declares is listed, with those lacking data last and
 * unpickable. That deliberately reverses #1046 for this ribbon (Sebastian,
 * 2026-11-05). Which options can be picked is unchanged: `scopeAvailability`,
 * computed by the caller from the bundled timeseries index, so the controls
 * never change after mount. The rules for each control are in `scopeRibbon`.
 */
export const PathwayContextRibbon: React.FC<PathwayContextRibbonProps> = ({
  pathway,
  scope,
  onScopeChange,
  availability,
  children,
}) => {
  const [condensed, sentinelRef] = useCondensedOnScroll();
  const baseId = useId();

  const sectorSlot = slotState(
    "sector",
    sectorOptions(
      (pathway.sectors ?? []).map((s) => s.name),
      availability,
    ),
  );
  const levels = geographyLevels(pathway.geography);
  const geographySlots = GEOGRAPHY_LEVELS.map((level) => ({
    level,
    state: slotState(level, geographyOptions(levels[level], availability)),
  }));

  // Re-picking the current value is a no-op, not a clear: both axes always
  // carry a value (spec §5.4), and an identical update would only re-render.
  const selectSector = (sector: string) => {
    if (sector !== scope.sector) onScopeChange({ ...scope, sector });
  };
  // One geography across all three slots: picking in one replaces the others.
  const selectGeography = (geography: string) => {
    if (geography !== scope.geography) onScopeChange({ ...scope, geography });
  };

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
          <div className="px-6 pt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <div
              role="group"
              aria-labelledby={`${baseId}-sector`}
              className="flex items-center gap-2 min-w-0"
            >
              <span
                id={`${baseId}-sector`}
                className={LABEL_CLASS}
              >
                Sector
              </span>
              {sectorSlot.kind === "inactive" ? (
                <InactiveSlot
                  level="sector"
                  label={sectorSlot.label}
                  tooltip={sectorSlot.tooltip}
                />
              ) : sectorSlot.kind === "single" ? (
                <ReadOnlySector option={sectorSlot.option} />
              ) : (
                <ScopeDropdown
                  level="sector"
                  withData={sectorSlot.withData}
                  withoutData={sectorSlot.withoutData}
                  selectedToken={scope.sector}
                  onSelect={selectSector}
                  geography={pathway.geography}
                />
              )}
            </div>

            <div
              role="group"
              aria-labelledby={`${baseId}-geography`}
              className="flex flex-wrap items-center gap-x-1.5 gap-y-2 min-w-0"
            >
              <span
                id={`${baseId}-geography`}
                className={`${LABEL_CLASS} mr-0.5`}
              >
                Geography
              </span>
              {geographySlots.map(({ level, state }, index) => (
                <React.Fragment key={level}>
                  {index > 0 && <OrSeparator />}
                  {state.kind === "inactive" ? (
                    <InactiveSlot
                      level={level}
                      label={state.label}
                      tooltip={state.tooltip}
                    />
                  ) : state.kind === "single" ? (
                    <ChoiceButton
                      level={level}
                      option={state.option}
                      selected={scope.geography === state.option.token}
                      onSelect={selectGeography}
                      geography={pathway.geography}
                    />
                  ) : (
                    <ScopeDropdown
                      level={level}
                      withData={state.withData}
                      withoutData={state.withoutData}
                      selectedToken={scope.geography}
                      onSelect={selectGeography}
                      geography={pathway.geography}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          {children}
        </div>
      </div>
    </>
  );
};

export default PathwayContextRibbon;
