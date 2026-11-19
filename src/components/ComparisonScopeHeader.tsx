import React, { useEffect, useId, useRef, useState } from "react";
import type { PathwayMetadataType } from "../types";
import { EMPTY_AXIS_CLASS, LABEL_CLASS } from "./ScopeAxisRow";
import GeographyDivergenceNotice from "./GeographyDivergenceNotice";
import { useCondensedOnScroll } from "./PathwayContextRibbon";
import ScopeDropdown from "./ScopeDropdown";
import { ReadOnlySector } from "./ScopeRibbonControls";
import ColumnGeographyControl, {
  SEGMENT_CLASS,
  SEGMENT_SELECTED_CLASS,
  SWITCH_TRACK_CLASS,
  SegmentFace,
} from "./ColumnGeographyControl";
import type {
  ColumnGeographyDivergence,
  ColumnGeographyOption,
} from "../utils/comparisonScope";
import {
  GEOGRAPHY_LEVELS,
  sectorOptions as ribbonSectorOptions,
  slotState,
} from "../utils/scopeRibbon";

interface ComparisonScopeHeaderProps {
  /** The compared pathways, in column order. */
  pathways: readonly PathwayMetadataType[];
  /** Sector names every compared pathway declares — one shared axis. */
  sectorOptions: string[];
  /**
   * Whether a sector has something to show in any column (#1017). Every shared
   * sector is listed; the others are greyed, last (ribbon spec D2).
   */
  isSectorAvailable: (sector: string) => boolean;
  selectedSector: string | null;
  onSectorChange: (next: string) => void;
  /**
   * Each column's own geographies, keyed by pathway id. Its `available` flags
   * decide what the column's slots can select.
   */
  geographyOptions: Readonly<Record<string, ColumnGeographyOption[]>>;
  /** Each column's chosen geography, keyed by pathway id. */
  selectedGeographies: Readonly<Record<string, string | null>>;
  onGeographyChange: (pathwayId: string, next: string) => void;
  /** Whether the columns are showing the same thing. */
  divergence: ColumnGeographyDivergence;
  /**
   * Called with the sticky bar's height whenever it changes — the condensed
   * names sliding in, the controls wrapping, the divergence notice — so content
   * frozen below it (#1033) can sit flush against it.
   */
  onHeightChange?: (height: number) => void;
}

/**
 * "Publisher: Pathway", so two columns with the same short pathway name (two
 * editions of IEA NZE, or two publishers' "Reference") stay distinguishable.
 * Both the condensed bar and each column's geography group name add the
 * publication year, which separates two editions of the same pathway.
 * `||` rather than `??`: some publishers have an empty short name.
 */
const columnLabel = (pathway: PathwayMetadataType): string =>
  `${pathway.publication.publisher.short || pathway.publication.publisher.full}: ${
    pathway.name.short || pathway.name.full
  }`;

/**
 * The comparison page's sticky scope bar: one shared Sector control, the
 * Global / Region / Country slots for each column, and a condensed restatement
 * of the column names that appears once the pathway cards scroll away.
 *
 * The detail page's ribbon controls and rules, at their compact size
 * (design decision, 2026-11-18), replacing the sector badge
 * row and the per-column geography select.
 *
 * The two axes are deliberately shaped differently, because they are different
 * kinds of thing:
 *
 *  - **Sector** is a closed vocabulary, so the axis is the intersection of what
 *    the pathways declare and one shared value scopes every column.
 *  - **Geography** is publication-specific. A token resolves to an ISO set only
 *    against its own publisher's `regions` mapping, and across the loadable
 *    pathways no token is declared by more than one publisher — so a shared
 *    value would put every column but one into a fallback. Each column gets its
 *    own slots over its own geographies, mirroring the Geographies coverage
 *    section further down the page.
 *
 * The geography row sits on the same column grid as the sections below, so each
 * control lines up under the pathway it belongs to.
 */
export const ComparisonScopeHeader: React.FC<ComparisonScopeHeaderProps> = ({
  pathways,
  sectorOptions,
  isSectorAvailable,
  selectedSector,
  onSectorChange,
  geographyOptions,
  selectedGeographies,
  onGeographyChange,
  divergence,
  onHeightChange,
}) => {
  const [condensed, sentinelRef] = useCondensedOnScroll();

  // Kept in a ref so a caller passing an inline callback does not recreate
  // the observer on every render.
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const onHeightChangeRef = useRef(onHeightChange);
  onHeightChangeRef.current = onHeightChange;

  useEffect(() => {
    const el = stickyRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onHeightChangeRef.current?.(entry.contentRect?.height ?? 0);
      }
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const baseId = useId();

  // The sector axis has no geography; only `hasSector` is read.
  const sectorSlot = slotState(
    "sector",
    ribbonSectorOptions(sectorOptions, {
      hasSector: isSectorAvailable,
      hasGeography: () => true,
    }),
  );
  // Re-picking the current value is a no-op, as on the ribbon.
  const selectSector = (next: string) => {
    if (next !== selectedSector) onSectorChange(next);
  };
  const columns = `repeat(${pathways.length}, minmax(0, 1fr))`;
  const [showNames, gridRef, measureRef] = useSwitchNamesFit();

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

      <div
        ref={stickyRef}
        className="sticky top-(--env-banner-height) z-20"
      >
        {/*
          Condensed column names, with the publication year on the right; the
          year never truncates, so the name gives way first. aria-hidden
          because it restates the pathway cards above, which stay in the
          accessibility tree whether or not they are on screen — and it holds
          no focusables, so nothing is lost.
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
                className="flex items-baseline justify-between gap-2 min-w-0 text-xs"
              >
                <span className="font-semibold truncate">
                  {columnLabel(pathway)}
                </span>
                <span className="shrink-0 tabular-nums text-white/80">
                  {pathway.publication.year}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur border-b border-neutral-200">
          <div className="px-6 pt-2 flex h-9 items-center gap-2 min-w-0">
            <span
              id={`${baseId}-sector`}
              className={LABEL_CLASS}
            >
              Sector
            </span>
            {/*
              No shared sector that can be selected: today's sentence rather
              than a greyed control above several columns (spec C4).
            */}
            {sectorSlot.kind === "inactive" ? (
              <p className={EMPTY_AXIS_CLASS}>
                These pathways share no sector with information to compare.
              </p>
            ) : (
              <div
                role="group"
                aria-labelledby={`${baseId}-sector`}
                className="min-w-0"
              >
                {sectorSlot.kind === "single" ? (
                  <ReadOnlySector
                    option={sectorSlot.option}
                    size="segment"
                  />
                ) : (
                  <ScopeDropdown
                    level="sector"
                    withData={sectorSlot.withData}
                    withoutData={sectorSlot.withoutData}
                    selectedToken={selectedSector}
                    onSelect={selectSector}
                    geography={null}
                    size="segment"
                  />
                )}
              </div>
            )}
          </div>

          {/*
            Geography breaks out of the two-cell axis grid above and onto the
            page's own column grid, so each column's slots sit under it. The
            label spans the row as a caption rather than taking a label cell,
            which is what keeps that alignment exact.
          */}
          <div className="px-6 pt-1.5 pb-2">
            <span
              id={`${baseId}-geography`}
              className={`${LABEL_CLASS} block mb-1`}
            >
              Geography
            </span>
            <SwitchMeasure ref={measureRef} />
            <div
              ref={gridRef}
              role="group"
              aria-labelledby={`${baseId}-geography`}
              className="grid gap-x-6"
              style={{ gridTemplateColumns: columns }}
            >
              {pathways.map((pathway) => (
                <ColumnGeographyControl
                  key={pathway.id}
                  name={`${columnLabel(pathway)} (${pathway.publication.year})`}
                  geography={pathway.geography}
                  options={geographyOptions[pathway.id] ?? []}
                  selected={selectedGeographies[pathway.id] ?? null}
                  onSelect={(token) => onGeographyChange(pathway.id, token)}
                  showNames={showNames}
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

/**
 * Whether the level switch can show its names in every column: names whenever
 * the whole switch fits, icons only when it does not (design decision,
 * 2026-11-18).
 *
 * Measured rather than a fixed breakpoint: a 3-column tablet column is 213px
 * and the switch with names about 212px, a margin of 1px that a fixed rule
 * would lose to font rendering. The switch is the same in every column, so
 * one hidden measure serves them all. Its width depends on which level is
 * selected (that segment is semibold), so the measure holds the three switches
 * that can appear and takes the widest. Measuring all three segments in bold
 * would be wider than any real switch, and lose names that fit.
 *
 * jsdom has no ResizeObserver and no layout, so there it shows names.
 */
function useSwitchNamesFit(): [
  boolean,
  React.RefObject<HTMLDivElement | null>,
  React.RefObject<HTMLDivElement | null>,
] {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [fits, setFits] = useState(true);

  useEffect(() => {
    const grid = gridRef.current;
    const measure = measureRef.current;
    if (!grid || !measure || typeof ResizeObserver === "undefined") return;

    const check = () => {
      const column = grid.firstElementChild;
      if (!column) return;
      const columnWidth = column.getBoundingClientRect().width;
      const switchWidth = Math.max(
        ...Array.from(
          measure.querySelectorAll<HTMLElement>("[data-switch-copy]"),
          (copy) => copy.getBoundingClientRect().width,
        ),
      );
      if (columnWidth > 0 && switchWidth > 0) {
        setFits(switchWidth <= columnWidth);
      }
    };
    // Both: the column for resizes, the copies for late-loading fonts.
    const observer = new ResizeObserver(check);
    observer.observe(grid);
    measure
      .querySelectorAll("[data-switch-copy]")
      .forEach((copy) => observer.observe(copy));
    check();

    return () => observer.disconnect();
  }, []);

  return [fits, gridRef, measureRef];
}

/**
 * The hidden measure: the three switches that can appear, with names, one per
 * selected level. In a zero-size clipped box, so it never widens the page (a
 * bare absolutely positioned copy gave 90px of sideways scroll at 375px in
 * the prototype). Spans rather than buttons, so nothing in it is focusable.
 */
const SwitchMeasure: React.FC<{
  ref: React.Ref<HTMLDivElement>;
}> = ({ ref }) => (
  <div
    ref={ref}
    aria-hidden="true"
    className="h-0 w-0 overflow-hidden"
  >
    <div className="flex w-max flex-col items-start">
      {GEOGRAPHY_LEVELS.map((selected) => (
        <span
          key={selected}
          data-switch-copy=""
          className={SWITCH_TRACK_CLASS}
        >
          {GEOGRAPHY_LEVELS.map((level) => (
            <span
              key={level}
              className={`${SEGMENT_CLASS} ${level === selected ? SEGMENT_SELECTED_CLASS : ""}`}
            >
              <SegmentFace
                level={level}
                showName
              />
            </span>
          ))}
        </span>
      ))}
    </div>
  </div>
);

export default ComparisonScopeHeader;
