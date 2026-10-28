/**
 * The key-feature fallback resolver (#869): the value a pathway reports for the
 * scope the reader selected, and where it was found, so #859 can badge a value
 * inherited from a broader scope.
 *
 * Kept apart from keyFeatureScope, which answers search's question — which
 * entries *overlap* a filter — and has to keep answering it that way. This module
 * answers the detail page's: one value for one scope, by exact token lookup along
 * a fixed chain.
 *
 * The order is sector-preserving. The selected sector walks the whole geography
 * chain before `across sectors` is consulted, so `Power · Global` beats
 * `across sectors · TH`. There is no cost model to tune: swapping the axis
 * priority is swapping the two loops in {@link createKeyFeatureResolver}.
 */
import type {
  Geography,
  PathwayMetadataType,
  PathwayScopeSelection,
} from "../types";
import { geographyLabel } from "./geographyUtils";
import { asEntries } from "./keyFeatureScope";
import {
  ACROSS_REGIONS,
  ACROSS_SECTORS,
  GLOBAL_SCOPE,
  containsCodes,
  declaredGeographyTokens,
  declaredTokenCodes,
  isScopeLevelNotApplicable,
  MEASURE_NOT_APPLICABLE,
  widestGeography,
  widestSector,
  type KeyFeatureKey,
} from "./keyFeatureRules";

/** A concrete (sector, geography) pair. Unlike a selection, neither axis is null. */
export interface Scope {
  sector: string;
  geography: string;
}

export type ResolvedKeyFeature =
  | {
      status: "resolved";
      value: string | string[];
      /** Where the value was found. */
      sourceScope: Scope;
      /** What was asked for, with any empty axis filled by its widest value. */
      requestedScope: Scope;
      /** The source differs from the request on either axis. */
      isFallback: boolean;
      /**
       * Set when the walk skipped a `Not Applicable` cell (Electrification ×
       * Power) before finding this value. Names that cell's sector, so the badge
       * can say the feature does not apply there.
       */
      notApplicableSector?: string;
    }
  /**
   * Nothing usable anywhere on the chain. Not the same as an authored
   * `No information`, which is the pathway's answer and resolves.
   */
  | { status: "unavailable"; requestedScope: Scope };

type ResolvablePathway = Pick<
  PathwayMetadataType,
  "sectors" | "geography" | "keyFeatures"
>;

/**
 * The selection with each empty axis filled by the pathway's widest value: a
 * `null` sector becomes `widestSector`, or `across sectors` when there is none,
 * and a `null` geography becomes `widestGeography`.
 */
export function effectiveScope(
  pathway: ResolvablePathway,
  selection: PathwayScopeSelection,
): Scope {
  return {
    sector: selection.sector ?? widestSector(pathway) ?? ACROSS_SECTORS,
    geography: selection.geography ?? widestGeography(pathway),
  };
}

/**
 * The sectors to try, in order. `across sectors` is the union of the sectors the
 * pathway declares (#869), so it stands in only for one of them — a stale or
 * undeclared sector gets no fallback.
 */
function sectorChain(sector: string, pathway: ResolvablePathway): string[] {
  if (sector === ACROSS_SECTORS) return [ACROSS_SECTORS];
  const declared = (pathway.sectors ?? []).some((s) => s?.name === sector);
  return declared ? [sector, ACROSS_SECTORS] : [sector];
}

/**
 * The geographies to try, in order: the selection; every declared token whose
 * countries include all of the selection's, smallest first and ties in
 * declaration order; then `across regions`; then `Global`.
 *
 * Containment, not overlap: IEA's `Southeast Asia` falls back to `Asia Pacific`,
 * which contains it, and never to a region that merely shares a country with it.
 * Sorting by size rather than declaration order is what keeps that walk
 * outward when a publication lists the broader region first.
 *
 * A selection whose countries are unknown — a stale token, say —
 * is contained by nothing (see `containsCodes`), so it goes straight to
 * `[selected, across regions, Global]`.
 */
export function geographyChain(
  selected: string,
  geography: Geography | null | undefined,
): string[] {
  if (selected === GLOBAL_SCOPE) return [GLOBAL_SCOPE];
  if (selected === ACROSS_REGIONS) return [ACROSS_REGIONS, GLOBAL_SCOPE];

  const wanted = declaredTokenCodes(selected, geography) ?? new Set<string>();
  const containing = declaredGeographyTokens(geography)
    .filter((token) => token !== selected)
    .map((token) => ({
      token,
      codes: declaredTokenCodes(token, geography) ?? new Set<string>(),
    }))
    .filter(({ codes }) => containsCodes(codes, wanted))
    // Array#sort is stable, so equal sizes keep declaration order.
    .sort((a, b) => a.codes.size - b.codes.size)
    .map(({ token }) => token);

  return [...new Set([selected, ...containing, ACROSS_REGIONS, GLOBAL_SCOPE])];
}

/**
 * A resolver for every keyFeature of one pathway at one selected scope.
 *
 * The effective scope and both chains depend only on the pathway and the
 * selection, so they are built once here and shared by each field it is asked
 * for — a panel resolves eleven fields per render, and the geography chain is
 * the costly part (a set per declared token, then a sort).
 *
 * Each field walks the sector chain (outer) × the geography chain (inner),
 * looking for an entry at exactly that `(sector, geography)` pair —
 * `validateScopedEntries` already guarantees that entry tokens are declared and
 * that each scope has one value. A missing entry, or a `Not applicable at this
 * scope level` cell, means "not recorded here" and the walk continues. Anything
 * else ends it, including an authored `No information`, `None` or `No new
 * technologies`: those are the pathway's answer, not an absence of one.
 *
 * A `Not Applicable` cell (Electrification × Power) is skipped the same way, and
 * the walk goes on to `across sectors`. Most pathways open on Power, so stopping
 * there would hide the pathway's electrification everywhere it is first seen;
 * inheriting the across-sectors value, badged and explained, shows it. A pathway
 * with nothing across sectors ends `unavailable`, as any exhausted chain does.
 * Malformed or non-array input degrades to "no entries", and so to
 * `unavailable`.
 */
export function createKeyFeatureResolver(
  pathway: ResolvablePathway,
  selection: PathwayScopeSelection,
): (field: KeyFeatureKey) => ResolvedKeyFeature {
  const requestedScope = effectiveScope(pathway, selection);
  const sectors = sectorChain(requestedScope.sector, pathway);
  const geographies = geographyChain(
    requestedScope.geography,
    pathway.geography,
  );

  return (field) => {
    const entries = asEntries(pathway.keyFeatures?.[field]);
    let notApplicableSector: string | undefined;
    for (const sector of sectors) {
      for (const geography of geographies) {
        const entry = entries.find(
          (e) => e.sector === sector && e.geography === geography,
        );
        if (!entry || entry.value == null) continue;
        if (isScopeLevelNotApplicable(entry.value)) continue;
        if (entry.value === MEASURE_NOT_APPLICABLE) {
          notApplicableSector ??= sector;
          continue;
        }
        return {
          status: "resolved",
          value: entry.value,
          sourceScope: { sector, geography },
          requestedScope,
          isFallback:
            sector !== requestedScope.sector ||
            geography !== requestedScope.geography,
          ...(notApplicableSector ? { notApplicableSector } : {}),
        };
      }
    }

    return { status: "unavailable", requestedScope };
  };
}

/**
 * Resolve one keyFeature for the selected scope — {@link createKeyFeatureResolver}
 * for a single field. Prefer the resolver when resolving several fields at once.
 */
export function resolveKeyFeature(
  pathway: ResolvablePathway,
  field: KeyFeatureKey,
  selection: PathwayScopeSelection,
): ResolvedKeyFeature {
  return createKeyFeatureResolver(pathway, selection)(field);
}

/**
 * Name a resolved scope for its badge: `"Across sectors · South East Asia"`,
 * `"Power · Thailand"`. The geography goes through `geographyLabel`, as in
 * `scopeSelectionLabel`, so a country reads as its name rather than its ISO code.
 */
export function sourceScopeLabel(scope: Scope): string {
  const sector =
    scope.sector === ACROSS_SECTORS ? "Across sectors" : scope.sector;
  const geography =
    scope.geography === ACROSS_REGIONS
      ? "Across regions"
      : geographyLabel(scope.geography);
  return `${sector} · ${geography}`;
}
