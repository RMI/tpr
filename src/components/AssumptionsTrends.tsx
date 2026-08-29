import React from "react";
import { PathwayMetadataType } from "../types";

type CoreDrivers = PathwayMetadataType["coreDrivers"];

// The driver cards, in the reading order of the wireframe. Every field is
// required-but-nullable: null means "not a core driver for this pathway" (a real
// statement), as distinct from a driver that is present but undescribed.
const DRIVERS: { key: keyof CoreDrivers; label: string }[] = [
  { key: "policies", label: "Policies" },
  { key: "emissionsTargets", label: "Emissions targets" },
  { key: "technologyCosts", label: "Technology costs" },
  { key: "investmentChange", label: "Investment" },
  { key: "macroeconomicDrivers", label: "Macroeconomic drivers" },
  { key: "behavioralShifts", label: "Behavioral shifts" },
  { key: "otherDrivers", label: "Other drivers" },
];

interface AssumptionsTrendsProps {
  coreDrivers: CoreDrivers;
}

/**
 * The "Assumptions & Trends Overview" for the Overview tab: the core drivers that
 * shape a pathway's outcomes, one card each. A null driver is rendered as an
 * explicit "not a core driver" note rather than hidden, because the schema treats
 * that as authored information distinct from an undescribed driver.
 */
const AssumptionsTrends: React.FC<AssumptionsTrendsProps> = ({
  coreDrivers,
}) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
    {DRIVERS.map(({ key, label }) => {
      const value = coreDrivers?.[key] ?? null;
      return (
        <div
          key={key}
          className="rounded-lg border border-neutral-200 bg-white p-4"
        >
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-rmigray-500">
            {label}
          </h3>
          {value ? (
            <p className="whitespace-pre-line text-sm text-rmigray-700">
              {value}
            </p>
          ) : (
            <p className="text-sm italic text-rmigray-400">
              Not a core driver for this pathway.
            </p>
          )}
        </div>
      );
    })}
  </div>
);

export default AssumptionsTrends;
