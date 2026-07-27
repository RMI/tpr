import React from "react";
import TextWithTooltip from "./TextWithTooltip";
import Badge from "./Badge";

export const NEUTRAL_SELECTED_COLOR = {
  bg: "bg-rmiblue-400",
  text: "text-rmiblue-400",
};

interface NeutralScaleProps {
  /** Ordered scale values, excluding "No information" */
  values: string[];
  selectedValue: string;
  tooltipGetter?: (value: string) => string;
  /** When false, suppresses the label/badge rendered below the scale bars */
  showLabel?: boolean;
}

const NeutralScale: React.FC<NeutralScaleProps> = ({
  values,
  selectedValue,
  tooltipGetter,
  showLabel = true,
}) => {
  const isNoInfo =
    selectedValue === "No information" || !values.includes(selectedValue);
  const selectedIndex = values.indexOf(selectedValue);

  return (
    <div>
      <div className="flex gap-0.5 items-center">
        {values.map((value, i) => {
          const isSelected = !isNoInfo && i === selectedIndex;
          const bar = (
            <div
              className={`${isSelected ? "h-3" : "h-1.5"} w-full rounded-sm ${
                isSelected ? "bg-rmiblue-400" : "bg-neutral-200"
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
              className={`text-xs font-semibold ${NEUTRAL_SELECTED_COLOR.text}`}
            >
              {selectedValue}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default NeutralScale;
