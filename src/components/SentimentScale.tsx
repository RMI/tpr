import React from "react";
import TextWithTooltip from "./TextWithTooltip";
import Badge from "./Badge";

// Segment colors ordered from unfavorable (index 0) to favorable (index n-1)
const PALETTE_7 = [
  { bg: "bg-rmired-400", text: "text-rmired-400" },
  { bg: "bg-rmired-200", text: "text-rmired-200" },
  { bg: "bg-rmired-100", text: "text-rmired-100" },
  { bg: "bg-neutral-500", text: "text-neutral-500" },
  { bg: "bg-success-400", text: "text-success-400" },
  { bg: "bg-success-600", text: "text-success-600" },
  { bg: "bg-success-800", text: "text-success-800" },
];

const PALETTE_3 = [
  { bg: "bg-rmired-400", text: "text-rmired-400" },
  { bg: "bg-neutral-500", text: "text-neutral-500" },
  { bg: "bg-success-600", text: "text-success-600" },
];

/** Returns the ordered color palette for the given scale configuration. */
export function getSentimentPalette(
  valuesCount: number,
  greenEnd: "first" | "last",
): { bg: string; text: string }[] {
  const base = valuesCount === 3 ? [...PALETTE_3] : [...PALETTE_7];
  return greenEnd === "first" ? base.reverse() : base;
}

interface SentimentScaleProps {
  /** Ordered scale values, excluding "No information" */
  values: string[];
  selectedValue: string;
  /** Which end of the values array is the favorable/green end */
  greenEnd: "first" | "last";
  tooltipGetter?: (value: string) => string;
  /** When false, suppresses the label/badge rendered below the scale bars */
  showLabel?: boolean;
}

const SentimentScale: React.FC<SentimentScaleProps> = ({
  values,
  selectedValue,
  greenEnd,
  tooltipGetter,
  showLabel = true,
}) => {
  const isNoInfo =
    selectedValue === "No information" || !values.includes(selectedValue);
  const selectedIndex = values.indexOf(selectedValue);

  const palette = getSentimentPalette(values.length, greenEnd);

  return (
    <div>
      <div className="flex gap-0.5 items-center">
        {values.map((value, i) => {
          const isSelected = !isNoInfo && i === selectedIndex;
          const bar = (
            <div
              className={`${isSelected ? "h-3" : "h-1.5"} w-full rounded-sm ${palette[i]?.bg ?? "bg-neutral-500"} ${
                isNoInfo || !isSelected ? "opacity-20" : ""
              }`}
            />
          );
          return tooltipGetter ? (
            <TextWithTooltip
              key={value}
              text={bar}
              tooltip={tooltipGetter(value)}
              position="top"
              className="flex-1 !block"
            />
          ) : (
            <div
              key={value}
              style={{ flex: 1 }}
            >
              {bar}
            </div>
          );
        })}
      </div>
      {showLabel && (
        <div className="mt-1.5">
          {isNoInfo ? (
            <Badge>No information</Badge>
          ) : selectedValue && selectedIndex >= 0 ? (
            <span
              className={`text-xs font-semibold ${palette[selectedIndex]?.text ?? "text-rmigray-500"}`}
            >
              {selectedValue}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SentimentScale;
