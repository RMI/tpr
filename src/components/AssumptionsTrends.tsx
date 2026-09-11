import React from "react";
import {
  CoreDriverItem,
  CORE_DRIVER_LABELS,
  coreDriverLabel,
} from "./CoreDrivers";
import type { CoreDrivers } from "./CoreDrivers";

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
    {CORE_DRIVER_LABELS.map(({ key }) => (
      <div
        key={key}
        className="rounded-lg border border-neutral-200 bg-white p-4"
      >
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-rmigray-500">
          {coreDriverLabel(key)}
        </h3>
        <CoreDriverItem
          driverKey={key}
          coreDrivers={coreDrivers}
          showLabel={false}
        />
      </div>
    ))}
  </div>
);

export default AssumptionsTrends;
