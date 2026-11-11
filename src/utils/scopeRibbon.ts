import type { Geography } from "../types";
import { geographyLabel, normalizeGeography } from "./geographyUtils";
import type { ScopeAvailability } from "./scopeAvailability";

/*
 * The rules behind the detail page's scope ribbon, kept free of React so they
 * can be tested on their own.
 *
 * The ribbon shows one Sector control and three Geography slots -- Global,
 * Region, Country -- and each control is in one of four states depending on how
 * many options it has and how many of those have data. Which tokens have data
 * is not decided here: `scopeAvailability` owns that rule, and this module only
 * decides how to present what it says.
 */

export type GeographyLevel = "global" | "region" | "country";

/** The three geography slots, in the order the ribbon always renders them. */
export const GEOGRAPHY_LEVELS: readonly GeographyLevel[] = [
  "global",
  "region",
  "country",
];

/** What a slot or the sector control is called when it has no value to show. */
export const LEVEL_NAME: Record<GeographyLevel | "sector", string> = {
  sector: "Sector",
  global: "Global",
  region: "Region",
  country: "Country",
};

/** Plural nouns for the "none of this pathway's N …" tooltip. */
const LEVEL_PLURAL: Record<GeographyLevel | "sector", string> = {
  sector: "sectors",
  global: "geographies",
  region: "regions",
  country: "countries",
};

/** A dropdown longer than this gets a search field. */
export const SEARCH_THRESHOLD = 8;

/** Header above the options a pathway declares but has no data for. */
export const NO_DATA_GROUP_LABEL = "Covered · no data yet";

export interface RibbonOption {
  token: string;
  label: string;
  hasData: boolean;
}

/**
 * The tokens a pathway declares at each geography level.
 *
 * The level is the BUCKET a token is declared in, never a guess from its label.
 * `geographyKind` infers a kind from the string, which is how IEA's "CN" region
 * once rendered as a country. The data already says which is which.
 */
export function geographyLevels(
  geography: Geography | null | undefined,
): Record<GeographyLevel, string[]> {
  if (!geography || typeof geography !== "object") {
    return { global: [], region: [], country: [] };
  }
  return {
    global: geography.global ? ["Global"] : [],
    region: Object.keys(geography.regions ?? {}),
    country: [...(geography.country ?? [])],
  };
}

/** Which slot holds a token, or null when the pathway does not declare it. */
export function levelOf(
  token: string | null | undefined,
  geography: Geography | null | undefined,
): GeographyLevel | null {
  if (!token) return null;
  const levels = geographyLevels(geography);
  for (const level of GEOGRAPHY_LEVELS) {
    if (levels[level].includes(token)) return level;
  }
  return null;
}

/** Display label for a geography token: the same one the pills used. */
export function geographyDisplayLabel(token: string): string {
  return geographyLabel(normalizeGeography(token));
}

/**
 * Options with data first, then those without, each group alphabetical by
 * display label.
 *
 * Every declared option is returned, selectable or not. That deliberately
 * reverses #1046 for this ribbon (Sebastian, 2026-11-05).
 *
 * This is the DISPLAY order, for scanning. Which option the page opens on is
 * still `defaultScopeFor`'s job, with its own order, and the two are meant to
 * differ.
 */
export function orderOptions(options: readonly RibbonOption[]): {
  withData: RibbonOption[];
  withoutData: RibbonOption[];
} {
  const byLabel = (a: RibbonOption, b: RibbonOption) =>
    a.label.localeCompare(b.label);
  return {
    withData: options.filter((o) => o.hasData).sort(byLabel),
    withoutData: options.filter((o) => !o.hasData).sort(byLabel),
  };
}

/** Build the option list for the sector control. */
export function sectorOptions(
  sectors: readonly string[],
  availability: ScopeAvailability,
): RibbonOption[] {
  return sectors.map((sector) => ({
    token: sector,
    label: sector,
    hasData: availability.hasSector(sector),
  }));
}

/** Build the option list for one geography slot. */
export function geographyOptions(
  tokens: readonly string[],
  availability: ScopeAvailability,
): RibbonOption[] {
  return tokens.map((token) => ({
    token,
    label: geographyDisplayLabel(token),
    hasData: availability.hasGeography(token),
  }));
}

export type SlotState =
  | {
      /** Greyed, unclickable, focusable, with a tooltip saying why. */
      kind: "inactive";
      label: string;
      tooltip: string;
    }
  | {
      /** One option with data: a button for geography, read-only for sector. */
      kind: "single";
      option: RibbonOption;
    }
  | {
      /** Two or more options, at least one with data. */
      kind: "dropdown";
      withData: RibbonOption[];
      withoutData: RibbonOption[];
    };

/**
 * The state of one control, from how many options it has and how many have
 * data. The four cases, from spec §3.3:
 *
 * | declared | with data | state                                   |
 * |----------|-----------|-----------------------------------------|
 * | 0        | -         | inactive, labelled with the level name  |
 * | 1+       | 0         | inactive; the option's name if only one |
 * | 1        | 1         | single                                  |
 * | 2+       | 1+        | dropdown                                |
 *
 * A level is never hidden, whatever its state (Sebastian's rule): an unusable
 * slot is greyed and explains itself instead.
 */
export function slotState(
  level: GeographyLevel | "sector",
  options: readonly RibbonOption[],
): SlotState {
  const name = LEVEL_NAME[level];

  if (options.length === 0) {
    return { kind: "inactive", label: name, tooltip: notDeclaredText(level) };
  }

  const withDataCount = options.filter((o) => o.hasData).length;

  if (withDataCount === 0) {
    if (options.length === 1) {
      // Keeps the option's name, although a greyed name can look like a
      // selection (Sebastian, 2026-11-05). No real pathway hits this today.
      const only = options[0];
      return {
        kind: "inactive",
        label: only.label,
        tooltip: `No data for ${only.label} in TPR yet.`,
      };
    }
    return {
      kind: "inactive",
      label: name,
      tooltip: `None of this pathway's ${options.length} ${LEVEL_PLURAL[level]} has data in TPR yet.`,
    };
  }

  if (options.length === 1) {
    return { kind: "single", option: options[0] };
  }

  return { kind: "dropdown", ...orderOptions(options) };
}

/** Tooltip for a level the pathway does not declare at all. */
function notDeclaredText(level: GeographyLevel | "sector"): string {
  switch (level) {
    case "global":
      return "This pathway doesn't cover Global.";
    case "region":
      return "This pathway doesn't include any regions.";
    case "country":
      return "This pathway doesn't include any countries.";
    case "sector":
      // Not in the spec's tooltip table. The schema requires `sectors` but
      // allows it to be empty, so the state is reachable in principle. Wording
      // follows the region and country rows. No real pathway hits it today.
      return "This pathway doesn't include any sectors.";
  }
}

/** The closing line of the read-only sector's tooltip. */
export function onlySectorText(sector: string): string {
  return `${sector} is the only sector this pathway covers.`;
}

/** Whether a list is long enough to need a search field. */
export function needsSearch(optionCount: number): boolean {
  return optionCount > SEARCH_THRESHOLD;
}

/**
 * Filter a list by a search query, matching the display label or the token,
 * case-insensitively.
 *
 * Matching the token as well as the label matters for countries: the library's
 * names put the familiar word second ("People's Republic of China"), so a
 * reader typing "CN" or "china" still finds it.
 */
export function filterOptions(
  options: readonly RibbonOption[],
  query: string,
): RibbonOption[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [...options];
  return options.filter(
    (o) =>
      o.label.toLocaleLowerCase().includes(q) ||
      o.token.toLocaleLowerCase().includes(q),
  );
}
