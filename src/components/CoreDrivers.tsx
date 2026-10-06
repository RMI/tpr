import React from "react";
import { PathwayMetadataType } from "../types";

export type CoreDrivers = PathwayMetadataType["coreDrivers"];
export type CoreDriverKey = keyof CoreDrivers;

/**
 * Display labels for the core drivers, in the wireframe's reading order.
 *
 * Every field is required-but-nullable: null means "not a core driver for this
 * pathway" — a real statement, distinct from a driver that is present but
 * undescribed. That is why a null driver is rendered rather than hidden.
 */
export const CORE_DRIVER_LABELS: { key: CoreDriverKey; label: string }[] = [
  { key: "policies", label: "Policy drivers" },
  { key: "emissionsTargets", label: "Emissions target (driver)" },
  { key: "technologyCosts", label: "Technology cost drivers" },
  { key: "investmentChange", label: "Investment change" },
  { key: "macroeconomicDrivers", label: "Macroeconomic drivers" },
  { key: "behavioralShifts", label: "Behavioral shifts" },
  { key: "otherDrivers", label: "Other drivers" },
];

export const NOT_A_CORE_DRIVER_TEXT = "Not a core driver for this pathway.";

export function coreDriverLabel(key: CoreDriverKey): string {
  return CORE_DRIVER_LABELS.find((d) => d.key === key)?.label ?? key;
}

export interface CoreDriverItemProps {
  driverKey: CoreDriverKey;
  coreDrivers: CoreDrivers;
  /** Matches FeatureItem's default so a driver reads as a peer of a key feature. */
  labelClassName?: string;
  showLabel?: boolean;
}

/**
 * One core driver: its label and either the authored prose or the explicit
 * "not a core driver" note.
 *
 * The label is a `<p>`, never a heading — `KeyFeatures` renders these inside a
 * group whose own `<h4>` heading the tests use to locate groups, so an extra
 * heading here would silently change what those queries match.
 */
export const CoreDriverItem: React.FC<CoreDriverItemProps> = ({
  driverKey,
  coreDrivers,
  labelClassName = "text-xs font-medium text-rmigray-500",
  showLabel = true,
}) => {
  const value = coreDrivers?.[driverKey] ?? null;

  return (
    <div>
      {showLabel && (
        <p className={`${labelClassName} mb-1.5`}>
          {coreDriverLabel(driverKey)}
        </p>
      )}
      {value ? (
        <p className="whitespace-pre-line text-sm text-rmigray-700">{value}</p>
      ) : (
        <p className="text-sm italic text-rmigray-400">
          {NOT_A_CORE_DRIVER_TEXT}
        </p>
      )}
    </div>
  );
};

export default CoreDriverItem;
