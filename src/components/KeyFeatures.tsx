import React from "react";
import { PathwayMetadataType } from "../types";
import { getKeyFeatureTooltip } from "../utils/tooltipUtils";
import TextWithTooltip from "./TextWithTooltip";
import Badge from "./Badge";
import SentimentScale, { getSentimentPalette } from "./SentimentScale";
import NeutralScale, { NEUTRAL_SELECTED_COLOR } from "./NeutralScale";

const PILL_SELECTED =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-rmiblue-100 text-rmiblue-800 border-rmiblue-200 mr-2 mb-1";
const PILL_UNSELECTED =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-neutral-50 text-neutral-400 border-neutral-200 mr-2 mb-1";

type FeatureKey = keyof PathwayMetadataType["keyFeatures"];

interface SingleSelectFeatureConfig {
  key: FeatureKey;
  label: string;
  type: "single-select";
  options: string[];
}

interface MultiSelectFeatureConfig {
  key: FeatureKey;
  label: string;
  type: "multi-select";
  options: string[];
}

interface SentimentFeatureConfig {
  key: FeatureKey;
  label: string;
  type: "sentiment";
  scaleValues: string[];
  greenEnd: "first" | "last";
}

interface NeutralFeatureConfig {
  key: FeatureKey;
  label: string;
  type: "neutral";
  scaleValues: string[];
}

export type FeatureConfig =
  | SingleSelectFeatureConfig
  | MultiSelectFeatureConfig
  | SentimentFeatureConfig
  | NeutralFeatureConfig;

interface GroupConfig {
  label: string;
  features: FeatureConfig[];
}

export const GROUPS: GroupConfig[] = [
  {
    label: "Emissions Boundary & Trajectory",
    features: [
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
    ],
  },
  {
    label: "Energy System & Transition Levers",
    features: [
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
    ],
  },
  {
    label: "Policy Environment",
    features: [
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
    ],
  },
  {
    label: "Technology & Feasibility Assumptions",
    features: [
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
          "Other new technologies",
        ],
      },
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
];

export interface FeatureItemProps {
  feature: FeatureConfig;
  keyFeatures: PathwayMetadataType["keyFeatures"];
  selectedOnly?: boolean;
  labelClassName?: string;
  showLabel?: boolean;
}

export const FeatureItem: React.FC<FeatureItemProps> = ({
  feature,
  keyFeatures,
  selectedOnly = false,
  labelClassName = "text-xs font-medium text-rmigray-500",
  showLabel = true,
}) => {
  const rawValue = keyFeatures[feature.key];

  const label = <p className={`${labelClassName} mb-1.5`}>{feature.label}</p>;

  if (feature.type === "single-select") {
    const selected =
      typeof rawValue === "string" && feature.options.includes(rawValue)
        ? rawValue
        : "No information";
    return (
      <div>
        {showLabel && label}
        <div className="flex flex-wrap">
          {selectedOnly ? (
            selected === "No information" ? (
              <Badge>No information</Badge>
            ) : (
              <TextWithTooltip
                text={<span className={PILL_SELECTED}>{selected}</span>}
                tooltip={getKeyFeatureTooltip(feature.key, selected)}
                position="right"
              />
            )
          ) : (
            feature.options.map((opt) => {
              if (opt === selected) {
                return (
                  <TextWithTooltip
                    key={opt}
                    text={<span className={PILL_SELECTED}>{opt}</span>}
                    tooltip={getKeyFeatureTooltip(feature.key, opt)}
                    position="right"
                  />
                );
              }
              return (
                <TextWithTooltip
                  key={opt}
                  text={<span className={PILL_UNSELECTED}>{opt}</span>}
                  tooltip={getKeyFeatureTooltip(feature.key, opt)}
                  position="right"
                />
              );
            })
          )}
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
        {showLabel && label}
        <div className="flex flex-wrap">
          {selectedOnly ? (
            validSelected.length === 0 ? (
              <Badge>No information</Badge>
            ) : (
              validSelected.map((opt) => (
                <TextWithTooltip
                  key={opt}
                  text={<span className={PILL_SELECTED}>{opt}</span>}
                  tooltip={getKeyFeatureTooltip(feature.key, opt)}
                  position="right"
                />
              ))
            )
          ) : (
            feature.options.map((opt) => {
              if (selectedArr.includes(opt)) {
                return (
                  <TextWithTooltip
                    key={opt}
                    text={<span className={PILL_SELECTED}>{opt}</span>}
                    tooltip={getKeyFeatureTooltip(feature.key, opt)}
                    position="right"
                  />
                );
              }
              return (
                <TextWithTooltip
                  key={opt}
                  text={<span className={PILL_UNSELECTED}>{opt}</span>}
                  tooltip={getKeyFeatureTooltip(feature.key, opt)}
                  position="right"
                />
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (feature.type === "sentiment") {
    const selectedValue =
      typeof rawValue === "string" && rawValue.trim()
        ? rawValue
        : "No information";
    const selectedIndex = feature.scaleValues.indexOf(selectedValue);
    const isNoInfo = selectedValue === "No information" || selectedIndex < 0;
    const palette = getSentimentPalette(
      feature.scaleValues.length,
      feature.greenEnd,
    );
    const textColor = palette[selectedIndex]?.text ?? "text-rmigray-500";
    const valueDisplay = isNoInfo ? (
      <Badge>No information</Badge>
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
            <p className={labelClassName}>{feature.label}</p>
            <div className={alignClass}>{valueDisplay}</div>
          </div>
        ) : (
          <div className={`mb-1.5 ${alignClass}`}>{valueDisplay}</div>
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
        : "No information";
    const selectedIndex = feature.scaleValues.indexOf(selectedValue);
    const isNoInfo = selectedValue === "No information" || selectedIndex < 0;
    const textColor = isNoInfo
      ? "text-rmigray-500"
      : NEUTRAL_SELECTED_COLOR.text;
    const valueDisplay = isNoInfo ? (
      <Badge>No information</Badge>
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
            <p className={labelClassName}>{feature.label}</p>
            <div className={alignClass}>{valueDisplay}</div>
          </div>
        ) : (
          <div className={`mb-1.5 ${alignClass}`}>{valueDisplay}</div>
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
  keyFeatures: PathwayMetadataType["keyFeatures"];
}

const KeyFeatures: React.FC<KeyFeaturesProps> = ({ keyFeatures }) => {
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 pt-4 pb-2 mb-6">
      <h3 className="text-lg font-medium text-rmigray-800 mb-3">
        Key Features
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {GROUPS.map((group, idx) => (
          <div
            key={group.label}
            className={[
              "py-4",
              idx >= 2 ? "border-t border-neutral-200" : "",
              idx % 2 === 1
                ? "md:pl-6 md:border-l md:border-neutral-200"
                : "md:pr-6",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <h4 className="text-xs font-semibold text-rmigray-500 uppercase tracking-wide mb-3">
              {group.label}
            </h4>
            <div className="space-y-4">
              {group.features.map((feature) => (
                <FeatureItem
                  key={feature.key}
                  feature={feature}
                  keyFeatures={keyFeatures}
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
