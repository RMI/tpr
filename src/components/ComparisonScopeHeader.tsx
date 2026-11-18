import React, { useEffect, useId, useRef } from "react";
import type { PathwayMetadataType } from "../types";
import { EMPTY_AXIS_CLASS, LABEL_CLASS } from "./ScopeAxisRow";
import GeographyDivergenceNotice from "./GeographyDivergenceNotice";
import { useCondensedOnScroll } from "./PathwayContextRibbon";
import ScopeDropdown from "./ScopeDropdown";
import {
  ChoiceButton,
  InactiveSlot,
  OrSeparator,
  ReadOnlySector,
} from "./ScopeRibbonControls";
import type {
  ColumnGeographyDivergence,
  ColumnGeographyOption,
} from "../utils/comparisonScope";
import { normalizeGeography } from "../utils/geographyUtils";
import type { ScopeAvailability } from "../utils/scopeAvailability";
import {
  GEOGRAPHY_LEVELS,
  geographyLevels,
  geographyOptions as ribbonGeographyOptions,
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
 * (comparison-ribbon-spec, Sebastian 2026-11-18), replacing the sector badge
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
          <div className="px-6 pt-2 flex items-center gap-2 min-w-0">
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
                    size="compact"
                  />
                ) : (
                  <ScopeDropdown
                    level="sector"
                    withData={sectorSlot.withData}
                    withoutData={sectorSlot.withoutData}
                    selectedToken={selectedSector}
                    onSelect={selectSector}
                    geography={null}
                    size="compact"
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
            <div
              role="group"
              aria-labelledby={`${baseId}-geography`}
              className="grid gap-x-6"
              style={{ gridTemplateColumns: columns }}
            >
              {pathways.map((pathway) => (
                <ColumnGeographySlots
                  key={pathway.id}
                  pathway={pathway}
                  name={`Geography for ${columnLabel(pathway)} (${pathway.publication.year})`}
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

/**
 * One column's Global or Region or Country slots, as on the detail ribbon, at
 * the compact size.
 *
 * What a slot can select comes from the column's own options, the same flags
 * that validate the URL, so the controls and the URL cannot disagree. Looked
 * up by the normalised token, since `columnGeographyOptions` normalises its
 * tokens and `geographyLevels` reads the raw keys; no pathway differs today.
 */
const ColumnGeographySlots: React.FC<{
  pathway: PathwayMetadataType;
  name: string;
  options: readonly ColumnGeographyOption[];
  selected: string | null;
  onSelect: (token: string) => void;
}> = ({ pathway, name, options, selected, onSelect }) => {
  const available = new Set(
    options.filter((o) => o.available).map((o) => o.token),
  );
  const availability: ScopeAvailability = {
    hasSector: () => true,
    hasGeography: (token) => available.has(normalizeGeography(token)),
  };
  const levels = geographyLevels(pathway.geography);
  const pick = (token: string) => {
    if (token !== selected) onSelect(token);
  };

  return (
    <div
      role="group"
      aria-label={name}
      className="flex min-w-0 flex-wrap items-center gap-x-0.5 gap-y-1"
    >
      {GEOGRAPHY_LEVELS.map((level, index) => {
        const state = slotState(
          level,
          ribbonGeographyOptions(levels[level], availability),
        );
        return (
          <React.Fragment key={level}>
            {index > 0 && <OrSeparator />}
            {state.kind === "inactive" ? (
              <InactiveSlot
                level={level}
                label={state.label}
                tooltip={state.tooltip}
                size="compact"
              />
            ) : state.kind === "single" ? (
              <ChoiceButton
                level={level}
                option={state.option}
                selected={selected === state.option.token}
                onSelect={pick}
                geography={pathway.geography}
                size="compact"
              />
            ) : (
              <ScopeDropdown
                level={level}
                withData={state.withData}
                withoutData={state.withoutData}
                selectedToken={selected}
                onSelect={pick}
                geography={pathway.geography}
                size="compact"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ComparisonScopeHeader;
