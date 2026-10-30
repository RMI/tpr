import React from "react";
import clsx from "clsx";
import { PathwayMetadataType } from "../types";
import type { PathwayScopeSelection } from "../types";
import { getKeyFeatureTooltip } from "../utils/tooltipUtils";
import {
  createKeyFeatureResolver,
  sourceScopeLabel,
  type ResolvedKeyFeature,
  type Scope,
} from "../utils/keyFeatureResolution";
import { scopeSelectionLabel } from "../utils/scopeLabel";
import type { KeyFeatureKey } from "../utils/keyFeatureRules";
import TextWithTooltip from "./TextWithTooltip";
import Badge from "./Badge";
import SectionIntro from "./SectionIntro";
import SentimentScale, { getSentimentPalette } from "./SentimentScale";
import NeutralScale, { NEUTRAL_SELECTED_COLOR } from "./NeutralScale";
import { CoreDriverItem } from "./CoreDrivers";
import type { CoreDriverKey, CoreDrivers } from "./CoreDrivers";

const PILL_SELECTED =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-rmiblue-100 text-rmiblue-800 border-rmiblue-200 mr-2 mb-1";
const PILL_UNSELECTED =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-neutral-50 text-neutral-400 border-neutral-200 mr-2 mb-1";

interface SingleSelectFeatureConfig {
  key: KeyFeatureKey;
  label: string;
  type: "single-select";
  options: string[];
}

interface MultiSelectFeatureConfig {
  key: KeyFeatureKey;
  label: string;
  type: "multi-select";
  options: string[];
}

interface SentimentFeatureConfig {
  key: KeyFeatureKey;
  label: string;
  type: "sentiment";
  scaleValues: string[];
  greenEnd: "first" | "last";
}

interface NeutralFeatureConfig {
  key: KeyFeatureKey;
  label: string;
  type: "neutral";
  scaleValues: string[];
}

export type FeatureConfig =
  | SingleSelectFeatureConfig
  | MultiSelectFeatureConfig
  | SentimentFeatureConfig
  | NeutralFeatureConfig;

/**
 * Stable identifiers for the feature groups.
 *
 * Callers select groups by id rather than by label so a typo is a type error
 * instead of a silently empty panel, and so relabelling a group does not break
 * every call site.
 */
export type KeyFeatureGroupId =
  "policies" | "emissions" | "technology" | "investment" | "energy" | "other";

interface GroupConfig {
  id: KeyFeatureGroupId;
  label: string;
  features: FeatureConfig[];
  /**
   * Core drivers belonging to this theme. Rendered above the group's features,
   * so the authored narrative reads first and the enumerated values qualify it.
   */
  drivers?: CoreDriverKey[];
}

/**
 * The six themed groups of the "Assumptions & Trends" panel.
 *
 * Each group interleaves the free-text `coreDrivers` narrative with the
 * enumerated `keyFeatures` values for the same theme — a pathway's policy
 * story and its policy pills belong together, not in two separate sections.
 * Group order is the wireframe's reading order; the first three are also the
 * subset the At-a-glance tab shows.
 */
export const GROUPS: GroupConfig[] = [
  {
    id: "policies",
    label: "Policies",
    drivers: ["policies"],
    features: [
      {
        key: "policyAmbition",
        label: "Policy ambition",
        type: "neutral",
        scaleValues: [
          "No policies included",
          "Current/legislated policies",
          "Current and drafted policies",
          "NDCs, unconditional only",
          "NDCs incl. conditional targets",
          "High ambition policies",
          "Other policy ambition",
        ],
      },
      {
        key: "policyTypes",
        label: "Policy types",
        type: "multi-select",
        options: [
          "Carbon price",
          "Feed-in tariffs",
          "Performance standards",
          "Phaseout dates",
          "Subsidies",
          "Target technology shares",
          "Other",
          "None",
        ],
      },
    ],
  },
  {
    id: "emissions",
    label: "Emissions",
    drivers: ["emissionsTargets"],
    features: [
      {
        key: "emissionsTrajectory",
        label: "Emissions trajectory",
        type: "sentiment",
        scaleValues: [
          "Significant decrease",
          "Moderate decrease",
          "Minor decrease",
          "Low or no change",
          "Minor increase",
          "Moderate increase",
          "Significant increase",
        ],
        greenEnd: "first",
      },
      {
        key: "emissionsScope",
        label: "Emissions scope",
        type: "single-select",
        options: [
          "No information",
          "CO2",
          "CO2e (Kyoto)",
          "CO2e (CO2, Methane)",
          "CO2e (unspecified GHGs)",
          "Other emissions scope",
        ],
      },
    ],
  },
  {
    id: "technology",
    label: "Technology",
    drivers: ["technologyCosts"],
    features: [
      {
        key: "technologyCostTrend",
        label: "Technology cost trend",
        type: "sentiment",
        scaleValues: ["Decrease", "Low or no change", "Increase"],
        greenEnd: "first",
      },
      {
        key: "technologyCostsDetail",
        label: "Technology costs detail",
        type: "neutral",
        scaleValues: [
          "Total costs",
          "Capital costs, O&M, etc.",
          "Other cost breakdown",
        ],
      },
      {
        key: "newTechnologiesIncluded",
        label: "New technologies included",
        type: "multi-select",
        options: [
          "No information",
          "No new technologies",
          "CCUS",
          "DAC",
          "Green H2/ammonia",
          "SAF",
          "Battery storage",
          "EGS/AGS",
          "SMR",
          "Other new technologies",
        ],
      },
    ],
  },
  {
    id: "investment",
    label: "Investment",
    drivers: ["investmentChange"],
    features: [
      {
        key: "investmentNeeds",
        label: "Investment needs",
        type: "neutral",
        scaleValues: [
          "Total investment",
          "By sector",
          "By sector, part of value chain",
          "By technology",
          "By tech, part of value chain",
        ],
      },
    ],
  },
  {
    id: "energy",
    label: "Energy System",
    features: [
      {
        key: "energyDemand",
        label: "Energy demand",
        type: "sentiment",
        scaleValues: [
          "Significant decrease",
          "Moderate decrease",
          "Minor decrease",
          "Low or no change",
          "Minor increase",
          "Moderate increase",
          "Significant increase",
        ],
        greenEnd: "first",
      },
      {
        key: "electrification",
        label: "Electrification",
        type: "sentiment",
        scaleValues: [
          "Significant decrease",
          "Moderate decrease",
          "Minor decrease",
          "Low or no change",
          "Minor increase",
          "Moderate increase",
          "Significant increase",
        ],
        greenEnd: "last",
      },
      {
        key: "energyEfficiency",
        label: "Energy efficiency",
        type: "sentiment",
        scaleValues: [
          "Significant deterioration",
          "Moderate deterioration",
          "Minor deterioration",
          "Low or no change",
          "Minor improvement",
          "Moderate improvement",
          "Significant improvement",
        ],
        greenEnd: "last",
      },
    ],
  },
  {
    // Drivers with no enumerated counterpart. Featureless, so a surface that
    // renders only features shows nothing here — the comparison page skips
    // the group when none of its drivers is described.
    id: "other",
    label: "Other",
    drivers: ["macroeconomicDrivers", "behavioralShifts", "otherDrivers"],
    features: [],
  },
];

/** The visible text of every absent value, authored or not. */
const NO_INFORMATION = "No information";
/**
 * The visible text where a feature cannot apply to the sector and the pathway
 * reports nothing broader to show instead. Kept apart from "No information",
 * which means the pathway could say something here and doesn't.
 */
const NOT_APPLICABLE = "Not applicable";

/*
  Tooltip copy for the states the resolver tells apart (#869). Authored and
  exhausted "No information" read the same on the page and differ only here:
  one is the pathway's own answer, the other means nothing is recorded at any
  scope it reports.
*/
const AUTHORED_NO_INFORMATION_TOOLTIP = "The pathway does not report this.";
const UNAVAILABLE_TOOLTIP =
  "Nothing is recorded for this pathway at any scope.";

/** Why a feature has nothing to show for a sector it cannot apply to. */
function notApplicableTooltip(
  feature: FeatureConfig,
  notApplicableSector: string,
): string {
  return `${feature.label} does not apply to the ${notApplicableSector} sector.`;
}

/**
 * Why a value is inherited. A feature that cannot apply to the requested sector
 * says so, rather than claiming that sector simply has no value.
 */
function fallbackTooltip(
  feature: FeatureConfig,
  requested: Scope,
  notApplicableSector: string | undefined,
): string {
  const reason = notApplicableSector
    ? `${feature.label} does not apply to the ${notApplicableSector} sector`
    : `No value for ${scopeSelectionLabel(requested)}`;
  return `${reason}; showing the closest broader scope this pathway reports.`;
}

/** Nothing selected on either axis, which resolves at the pathway's widest. */
const WIDEST_SCOPE: PathwayScopeSelection = { sector: null, geography: null };

export interface FeatureItemProps {
  feature: FeatureConfig;
  /** The resolver's answer for the reader's scope (#869). */
  resolution: ResolvedKeyFeature;
  selectedOnly?: boolean;
  labelClassName?: string;
  showLabel?: boolean;
}

export const FeatureItem: React.FC<FeatureItemProps> = ({
  feature,
  resolution,
  selectedOnly = false,
  labelClassName = "text-xs font-medium text-rmigray-500",
  showLabel = true,
}) => {
  // v2 stores each feature as scoped {sector, geography, value} entries (#858);
  // the resolution carries the one for the reader's scope.
  const rawValue =
    resolution.status === "resolved" ? resolution.value : undefined;

  // Only a resolution can say which kind of absence this is, so the
  // widest-value path keeps its untooltipped badge.
  const notApplicableSector =
    resolution?.status === "unavailable"
      ? resolution.notApplicableSector
      : undefined;
  const absenceTooltip = notApplicableSector
    ? notApplicableTooltip(feature, notApplicableSector)
    : resolution?.status === "unavailable"
      ? UNAVAILABLE_TOOLTIP
      : resolution
        ? AUTHORED_NO_INFORMATION_TOOLTIP
        : undefined;
  const absenceBadge = (
    <Badge tooltip={absenceTooltip}>
      {notApplicableSector ? NOT_APPLICABLE : NO_INFORMATION}
    </Badge>
  );

  // Names the broader scope an inherited value came from (#859).
  const scopeBadge =
    resolution.status === "resolved" && resolution.isFallback ? (
      <Badge
        variant="scope"
        tooltip={fallbackTooltip(
          feature,
          resolution.requestedScope,
          resolution.notApplicableSector,
        )}
      >
        {sourceScopeLabel(resolution.sourceScope)}
      </Badge>
    ) : null;

  /*
    The feature label, with the scope badge beside it. Without a badge this is
    the plain label it always was; without a label (the comparison grid's
    cells) the badge stands alone, so an inherited value never appears without
    saying where it came from.
  */
  const header = (spacing?: string) => {
    if (!showLabel) return scopeBadge;
    if (!scopeBadge) {
      return <p className={clsx(labelClassName, spacing)}>{feature.label}</p>;
    }
    return (
      <div className={clsx("flex flex-wrap items-baseline gap-x-2", spacing)}>
        <p className={labelClassName}>{feature.label}</p>
        {scopeBadge}
      </div>
    );
  };

  // A selected "No information" pill explains the absence the way the badge
  // does; every other pill describes its own value.
  const pill = (opt: string, isSelected: boolean) => (
    <TextWithTooltip
      key={opt}
      text={
        <span className={isSelected ? PILL_SELECTED : PILL_UNSELECTED}>
          {opt}
        </span>
      }
      tooltip={
        isSelected && opt === NO_INFORMATION && absenceTooltip
          ? absenceTooltip
          : getKeyFeatureTooltip(feature.key, opt)
      }
      position="right"
    />
  );

  if (feature.type === "single-select") {
    const selected =
      typeof rawValue === "string" && feature.options.includes(rawValue)
        ? rawValue
        : NO_INFORMATION;
    return (
      <div>
        {header("mb-1.5")}
        <div className="flex flex-wrap">
          {selectedOnly
            ? selected === NO_INFORMATION
              ? absenceBadge
              : pill(selected, true)
            : feature.options.map((opt) => pill(opt, opt === selected))}
        </div>
      </div>
    );
  }

  if (feature.type === "multi-select") {
    const selectedArr = (
      Array.isArray(rawValue) ? rawValue : [rawValue]
    ) as string[];
    const validSelected = feature.options.filter((opt) =>
      selectedArr.includes(opt),
    );
    return (
      <div>
        {header("mb-1.5")}
        <div className="flex flex-wrap">
          {selectedOnly
            ? validSelected.length === 0
              ? absenceBadge
              : validSelected.map((opt) => pill(opt, true))
            : feature.options.map((opt) =>
                pill(opt, selectedArr.includes(opt)),
              )}
        </div>
      </div>
    );
  }

  if (feature.type === "sentiment") {
    const selectedValue =
      typeof rawValue === "string" && rawValue.trim()
        ? rawValue
        : NO_INFORMATION;
    const selectedIndex = feature.scaleValues.indexOf(selectedValue);
    const isNoInfo = selectedValue === NO_INFORMATION || selectedIndex < 0;
    const palette = getSentimentPalette(
      feature.scaleValues.length,
      feature.greenEnd,
    );
    const textColor = palette[selectedIndex]?.text ?? "text-rmigray-500";
    const valueDisplay = isNoInfo ? (
      absenceBadge
    ) : (
      <span className={`text-xs font-semibold ${textColor}`}>
        {selectedValue}
      </span>
    );
    const centerIdx = Math.floor(feature.scaleValues.length / 2);
    const alignClass =
      isNoInfo || selectedIndex < 0
        ? "text-left"
        : selectedIndex < centerIdx
          ? "text-left"
          : selectedIndex === centerIdx
            ? "text-center"
            : "text-right";
    return (
      <div>
        {showLabel ? (
          <div className="mb-1.5">
            {header()}
            <div className={alignClass}>{valueDisplay}</div>
          </div>
        ) : (
          <>
            {header()}
            <div className={`mb-1.5 ${alignClass}`}>{valueDisplay}</div>
          </>
        )}
        <SentimentScale
          values={feature.scaleValues}
          selectedValue={selectedValue}
          greenEnd={feature.greenEnd}
          showLabel={false}
          tooltipGetter={(v) => getKeyFeatureTooltip(feature.key, v)}
        />
      </div>
    );
  }

  if (feature.type === "neutral") {
    const selectedValue =
      typeof rawValue === "string" && rawValue.trim()
        ? rawValue
        : NO_INFORMATION;
    const selectedIndex = feature.scaleValues.indexOf(selectedValue);
    const isNoInfo = selectedValue === NO_INFORMATION || selectedIndex < 0;
    const textColor = isNoInfo
      ? "text-rmigray-500"
      : NEUTRAL_SELECTED_COLOR.text;
    const valueDisplay = isNoInfo ? (
      absenceBadge
    ) : (
      <span className={`text-xs font-semibold ${textColor}`}>
        {selectedValue}
      </span>
    );
    const centerIdx = Math.floor(feature.scaleValues.length / 2);
    const alignClass =
      isNoInfo || selectedIndex < 0
        ? "text-left"
        : selectedIndex < centerIdx
          ? "text-left"
          : selectedIndex === centerIdx
            ? "text-center"
            : "text-right";
    return (
      <div>
        {showLabel ? (
          <div className="mb-1.5">
            {header()}
            <div className={alignClass}>{valueDisplay}</div>
          </div>
        ) : (
          <>
            {header()}
            <div className={`mb-1.5 ${alignClass}`}>{valueDisplay}</div>
          </>
        )}
        <NeutralScale
          values={feature.scaleValues}
          selectedValue={selectedValue}
          showLabel={false}
          tooltipGetter={(v) => getKeyFeatureTooltip(feature.key, v)}
        />
      </div>
    );
  }

  return null;
};

interface KeyFeaturesProps {
  /**
   * The pathway whose key features to show. Each is resolved for `scope`
   * (#869), badging any value inherited from a broader scope.
   */
  pathway: PathwayMetadataType;
  /**
   * The scope to resolve for. An empty axis, or no scope at all, resolves at
   * the pathway's widest value on that axis.
   */
  scope?: PathwayScopeSelection;
  /**
   * The pathway's core drivers. Omit to render key features alone — no driver
   * prose appears unless this is supplied.
   */
  coreDrivers?: CoreDrivers;
  /** Which groups to render, by id. Defaults to all of them. */
  groups?: KeyFeatureGroupId[];
  /** Panel heading. Defaults to "Key Features". */
  title?: React.ReactNode;
  /** A short explanation of the panel, shown under the heading (#1029). */
  description?: React.ReactNode;
}

const KeyFeatures: React.FC<KeyFeaturesProps> = ({
  pathway,
  scope = WIDEST_SCOPE,
  coreDrivers,
  groups,
  title = "Key Features",
  description,
}) => {
  const visible = groups
    ? GROUPS.filter((group) => groups.includes(group.id))
    : GROUPS;

  if (visible.length === 0) return null;

  // One resolver per render, shared by every feature: the effective scope and
  // its fallback chains are the same for all of them.
  const resolve = createKeyFeatureResolver(pathway, scope);

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-6">
      {title ? (
        <h3
          className={`text-lg font-medium text-rmigray-800 ${description ? "mb-1" : "mb-3"}`}
        >
          {title}
        </h3>
      ) : null}
      {description ? <SectionIntro>{description}</SectionIntro> : null}
      {/*
        Each group is its own card, so the grid `gap` owns all separation — no
        index-derived borders, which could not have expressed "first row" across
        two different column counts anyway.
      */}
      <div
        className={`grid grid-cols-1 gap-4 ${
          visible.length > 1 ? "md:grid-cols-2 lg:grid-cols-3" : ""
        }`}
      >
        {visible.map((group) => (
          <div
            key={group.label}
            className="rounded-lg border border-neutral-200 bg-white p-4"
          >
            <h4 className="text-xs font-semibold text-rmigray-500 uppercase tracking-wide mb-3">
              {group.label}
            </h4>
            <div className="space-y-4">
              {coreDrivers
                ? (group.drivers ?? []).map((driverKey) => (
                    <CoreDriverItem
                      key={driverKey}
                      driverKey={driverKey}
                      coreDrivers={coreDrivers}
                    />
                  ))
                : null}
              {group.features.map((feature) => (
                <FeatureItem
                  key={feature.key}
                  feature={feature}
                  resolution={resolve(feature.key)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KeyFeatures;
