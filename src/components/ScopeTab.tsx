import React, { useLayoutEffect, useRef, useState } from "react";
import TextWithTooltip from "./TextWithTooltip";
import RegionMembersTooltip from "./RegionMembersTooltip";
import type { Geography } from "../types";
import {
  geographyLabel,
  hasMemberList,
  normalizeGeography,
} from "../utils/geographyUtils";
import {
  geographyFallbackNote,
  type GeographyResolution,
} from "../utils/geographyFallback";
import {
  ACROSS_REGIONS,
  ACROSS_SECTORS,
  GLOBAL_SCOPE,
} from "../utils/keyFeatureRules";
import type {
  ResolvedKeyFeature,
  ScopeReason,
  ScopeReasons,
} from "../utils/keyFeatureResolution";

/*
 * The scope tab (design decision, 2026-11-19). Every key
 * feature and chart panel is its own container, and the scope its value
 * actually comes from sits in a tab flush in the container's bottom-left
 * corner, always visible: one half per axis, each with its own colour and
 * its own tooltip. Grey means granularity, yellow means missing data.
 */

/** How a half is coloured: the axis's reason, as `scopeReasons` gives it. */
export type SegmentTone = ScopeReason;

export interface ScopeSegment {
  label: string;
  /**
   * The narrow form of an "X < Y" label: only X, where the value came from.
   * Shown when the full tab does not fit its container (§1.5); the colour
   * still says why, and the tooltip says the rest.
   */
  short?: string;
  tone: SegmentTone;
  tooltip: React.ReactNode;
}

/*
  Text stays rmigray-500 on every tone for contrast at 10px (solar-800 on
  solar-100 is too faint). Doesn't-apply is solar-100 at half strength: Power
  has no value of its own there by definition, not as a gap (P4).
*/
const SEGMENT_CLASS =
  "block max-w-full truncate whitespace-nowrap px-2 py-[3px] text-[10px] font-medium leading-4 text-rmigray-500";

export const SEGMENT_TONE_CLASS: Record<SegmentTone, string> = {
  match: "bg-neutral-100",
  marked: "bg-neutral-300",
  missing: "bg-solar-100",
  notApplicable: "bg-solar-100/50",
};

/*
  The phone-width rule (§1.5, V3): shorten "X < Y" halves only when the full
  tab does not fit. Measured, not a breakpoint, and without a hidden copy: the
  tab renders its full labels, and a truncated or clipped label shows it does
  not fit. The full width seen then is kept, and the tab goes back to full
  labels once its container is at least that wide again. One ResizeObserver
  serves every tab on the page, and only tabs with a short form use it.
*/
type Listener = () => void;
const listeners = new Map<Element, Set<Listener>>();
let sharedObserver: ResizeObserver | null = null;

function observe(el: Element, listener: Listener): () => void {
  if (typeof ResizeObserver === "undefined") return () => undefined;
  sharedObserver ??= new ResizeObserver((records) => {
    for (const record of records) {
      listeners.get(record.target)?.forEach((fn) => fn());
    }
  });
  let set = listeners.get(el);
  if (!set) {
    set = new Set();
    listeners.set(el, set);
    sharedObserver.observe(el);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) {
      listeners.delete(el);
      sharedObserver?.unobserve(el);
    }
  };
}

function useShortLabels(
  tabRef: React.RefObject<HTMLDivElement | null>,
  segments: readonly ScopeSegment[],
): boolean {
  const canShorten = segments.some((s) => s.short && s.short !== s.label);
  const labelsKey = segments.map((s) => s.label).join("|");
  const [short, setShort] = useState(false);
  const fullWidth = useRef<number | null>(null);
  const shortRef = useRef(short);
  shortRef.current = short;

  useLayoutEffect(() => {
    // New labels: start again from the full form.
    fullWidth.current = null;
    setShort(false);
    shortRef.current = false;
    const tab = tabRef.current;
    const box = tab?.parentElement;
    if (!canShorten || !tab || !box) return;

    const check = () => {
      if (shortRef.current) {
        if (
          fullWidth.current !== null &&
          box.clientWidth >= fullWidth.current
        ) {
          setShort(false);
        }
        return;
      }
      const labels = [
        ...tab.querySelectorAll<HTMLElement>("[data-scope-label]"),
      ];
      const overflows =
        tab.scrollWidth > tab.clientWidth ||
        labels.some((el) => el.scrollWidth > el.clientWidth);
      if (!overflows) return;
      // The white dividers are 1px each.
      fullWidth.current =
        labels.reduce((sum, el) => sum + el.scrollWidth, 0) +
        Math.max(labels.length - 1, 0);
      setShort(true);
    };
    check();
    return observe(box, check);
  }, [tabRef, canShorten, labelsKey]);

  return short;
}

export const ScopeTab: React.FC<{ segments: readonly ScopeSegment[] }> = ({
  segments,
}) => {
  const tabRef = useRef<HTMLDivElement>(null);
  const short = useShortLabels(tabRef, segments);
  return (
    <div
      ref={tabRef}
      role="list"
      aria-label="Scope shown"
      // Flush in the container's corner: its bottom-left radius is the
      // container's, less the 1px border.
      className="flex w-fit max-w-full overflow-hidden rounded-tr-md rounded-bl-[7px]"
    >
      {segments.map((segment, idx) => (
        <span
          key={idx}
          role="listitem"
          // Both halves shrink, so in a very narrow cell neither disappears:
          // each truncates, and its tooltip still names it in full.
          // leading-none: the label is an inline-block, and the page's 24px
          // line height would leave a 2px strip under its 22px colour.
          className={`min-w-0 leading-none ${idx > 0 ? "border-l border-white" : ""}`}
        >
          <TextWithTooltip
            position="top"
            className="max-w-full align-top"
            text={
              <span
                data-scope-label=""
                className={`${SEGMENT_CLASS} ${SEGMENT_TONE_CLASS[segment.tone]}`}
              >
                {short && segment.short ? segment.short : segment.label}
              </span>
            }
            tooltip={segment.tooltip}
          />
        </span>
      ))}
    </div>
  );
};

interface ScopedContainerProps {
  segments: readonly ScopeSegment[];
  children: React.ReactNode;
  /** The content's padding. Charts on the comparison page use less. */
  padding?: string;
}

/**
 * A bordered container whose scope tab sits flush in its bottom-left corner.
 * The content is not clipped: a chart wider than its box overflows as it
 * always has, rather than being cut off at the border.
 */
export const ScopedContainer: React.FC<ScopedContainerProps> = ({
  segments,
  children,
  padding = "p-4",
}) => (
  <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-neutral-200 bg-white">
    <div className={`min-w-0 flex-1 ${padding} pb-3`}>{children}</div>
    <ScopeTab segments={segments} />
  </div>
);

// ── Labels ───────────────────────────────────────────────────────────────────

/** A sector as the tab names it. */
export function sectorName(sector: string): string {
  return sector === ACROSS_SECTORS ? "Across sectors" : sector;
}

/** A geography as the tab names it: a country by its name, not its code. */
export function geographyName(geography: string): string {
  if (geography === GLOBAL_SCOPE) return "Global";
  if (geography === ACROSS_REGIONS) return "Across regions";
  return geographyLabel(normalizeGeography(geography));
}

// ── Key features ─────────────────────────────────────────────────────────────

/**
 * A key feature's two halves (§1.1, §1.2): the scope its value comes from, on
 * each axis, with the reason in each tooltip. An unavailable feature names the
 * scope the page looked at, neutral, since it has no value to explain.
 */
export function featureSegments(
  featureLabel: string,
  resolution: ResolvedKeyFeature,
  reasons: ScopeReasons,
): ScopeSegment[] {
  const requested = resolution.requestedScope;
  if (resolution.status === "unavailable") {
    const tooltip = "Nothing is recorded for this pathway at any scope.";
    return [
      { label: sectorName(requested.sector), tone: "match", tooltip },
      { label: geographyName(requested.geography), tone: "match", tooltip },
    ];
  }

  const source = resolution.sourceScope;
  const fromSector = sectorName(source.sector);
  const wantedSector = sectorName(requested.sector);
  const sector: ScopeSegment = {
    label: fromSector,
    tone: reasons.sector,
    tooltip: {
      match: `${fromSector}: the sector you selected.`,
      marked: `The publisher records this across all of the pathway's sectors, not for ${wantedSector} on its own.`,
      missing: `Nothing recorded for ${wantedSector}, so this is the value across all of the pathway's sectors.`,
      notApplicable: `${featureLabel} does not apply to the ${resolution.notApplicableSector ?? wantedSector} sector, so this is the value across all of the pathway's sectors.`,
    }[reasons.sector],
  };
  if (reasons.sector === "marked") {
    sector.label = `${fromSector} < ${wantedSector}`;
    sector.short = fromSector;
  }

  const fromGeography = geographyName(source.geography);
  const wantedGeography = geographyName(requested.geography);
  // "for Thailand", or "across regions" when nothing was selected and the
  // pathway's widest geography is the across-regions sentinel.
  const wantedGeographyPhrase =
    requested.geography === ACROSS_REGIONS
      ? "across regions"
      : `for ${wantedGeography}`;
  const geography: ScopeSegment = {
    label: fromGeography,
    tone: reasons.geography,
    tooltip:
      reasons.geography === "match"
        ? `${fromGeography}: the geography you selected.`
        : reasons.geography === "marked"
          ? `The publisher records this for ${fromGeography}, not for ${wantedGeography} on its own.`
          : `Nothing recorded ${wantedGeographyPhrase}, so this is the closest broader geography: ${fromGeography}.`,
  };
  if (reasons.geography === "marked") {
    geography.label = `${fromGeography} < ${wantedGeography}`;
    geography.short = fromGeography;
  }

  return [sector, geography];
}

// ── Charts ───────────────────────────────────────────────────────────────────

/**
 * A chart panel's two halves (§1.4). The charts are Power-only, so the sector
 * always matches. The geography half carries what the fallback sentence and
 * the geography badge used to: the sentence when the charts fell back (always
 * yellow, since timeseries have no publisher marker), and the members of a
 * region, as the badge's tooltip listed them (V2).
 */
export function chartSegments(
  resolution: GeographyResolution,
  sector: string,
  pathwayGeography: Geography | null | undefined,
): ScopeSegment[] {
  const used = resolution.used;
  if (!used) return [];
  const name = geographyName(used);
  const reason =
    geographyFallbackNote(resolution) ?? `${name}: the geography you selected.`;
  return [
    {
      label: sector,
      tone: "match",
      tooltip: `${sector}: the only sector the charts cover.`,
    },
    {
      label: name,
      tone: resolution.fellBack ? "missing" : "match",
      tooltip: hasMemberList(pathwayGeography, used) ? (
        <span className="block">
          <span className="mb-1 block">{reason}</span>
          <RegionMembersTooltip
            geography={pathwayGeography}
            label={used}
          />
        </span>
      ) : (
        reason
      ),
    },
  ];
}

export default ScopeTab;
