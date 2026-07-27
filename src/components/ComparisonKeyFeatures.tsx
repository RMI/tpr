import React from "react";
import { PathwayMetadataType } from "../types";
import { GROUPS, FeatureItem } from "./KeyFeatures";

interface ComparisonKeyFeaturesProps {
  pathways: PathwayMetadataType[];
}

const ComparisonKeyFeatures: React.FC<ComparisonKeyFeaturesProps> = ({
  pathways,
}) => {
  const n = pathways.length;

  return (
    <div
      className="grid gap-x-6"
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
    >
      {GROUPS.map((group, groupIdx) => (
        <React.Fragment key={group.label}>
          {/* Group header — spans all pathway columns, styled as a section heading */}
          <div
            className={`${groupIdx > 0 ? "mt-6" : ""} mb-3 bg-bluespruce px-3 py-1`}
            style={{ gridColumn: "1 / -1" }}
          >
            <h3 className="text-base font-semibold text-white">
              {group.label}
            </h3>
          </div>

          {/* One row per feature: label spans all columns, then N content cells side by side */}
          {group.features.map((feature, featureIdx) => (
            <React.Fragment key={feature.key}>
              {/* Single label above all pathway cells */}
              <div
                className="pt-3 pb-1"
                style={{ gridColumn: "1 / -1" }}
              >
                <p className="text-xs font-semibold text-rmigray-500 uppercase tracking-wide">
                  {feature.label}
                </p>
              </div>

              {/* Content cells — one per pathway, no label inside */}
              {pathways.map((pathway) => (
                <div
                  key={pathway.id}
                  className="pb-3 min-w-0"
                >
                  <FeatureItem
                    feature={feature}
                    keyFeatures={pathway.keyFeatures}
                    showLabel={false}
                  />
                </div>
              ))}

              {/* Separator between feature rows, not after the last one */}
              {featureIdx < group.features.length - 1 && (
                <div
                  className="border-b border-neutral-200"
                  style={{ gridColumn: "1 / -1" }}
                />
              )}
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ComparisonKeyFeatures;
