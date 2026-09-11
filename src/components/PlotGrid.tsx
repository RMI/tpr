import React, { useMemo } from "react";
import type { PlotType, TimeSeries } from "./PlotSelector";
import { PlotPanel, PLOT_OPTIONS, hasDataForMetric } from "./PlotPanel";
import Badge from "./Badge";
import RegionMembersTooltip from "./RegionMembersTooltip";
import type { Geography } from "../types";
import {
  geographyKind,
  geographyLabel,
  geographyVariant,
  normalizeGeography,
} from "../utils/geographyUtils";
import { resolveGeography } from "../utils/geographyFallback";
import { getMetricDefinition } from "../utils/timeseriesTaxonomy";

/** Panel size for the small multiples — two columns at desktop width. */
const PANEL_DIMS = { width: 420, height: 260 };

interface PlotGridProps {
  timeseriesdata: TimeSeries | null;
  datasetId?: string;
  /** The pathway's own geography metadata, used to resolve region membership. */
  pathwayGeography: Geography | null | undefined;
  /**
   * The geography the reader asked for. Null means "no preference", which
   * resolves to the broadest geography in the data. This is the seam the global
   * header geography selector plugs into.
   */
  requestedGeography?: string | null;
  /** Which plots to render, in order. Defaults to all of them. */
  plotTypes?: PlotType[];
  className?: string;
}

/**
 * The benchmark plots as small multiples — one panel per plot type, all at the
 * same geography, rather than one plot behind a dropdown.
 *
 * Two distinct empty cases, deliberately handled differently:
 *  - a metric with no data at ANY geography is structurally absent for this
 *    pathway (JETP-CIPP-2023 carries only capacity and generation), so its
 *    panel is skipped entirely rather than rendered as an empty box;
 *  - a metric that exists but not at the resolved geography keeps its panel and
 *    shows PlotPanel's empty state, because that absence is informative.
 */
export const PlotGrid: React.FC<PlotGridProps> = ({
  timeseriesdata,
  datasetId,
  pathwayGeography,
  requestedGeography = null,
  plotTypes,
  className = "",
}) => {
  const availableGeographies = useMemo(() => {
    if (!timeseriesdata?.data) return [];
    return Array.from(
      new Set(timeseriesdata.data.map((d) => d.geography).filter(Boolean)),
    );
  }, [timeseriesdata]);

  const resolution = useMemo(
    () =>
      resolveGeography(
        availableGeographies,
        requestedGeography,
        pathwayGeography,
      ),
    [availableGeographies, requestedGeography, pathwayGeography],
  );

  const panels = useMemo(() => {
    const wanted = plotTypes
      ? PLOT_OPTIONS.filter((opt) => plotTypes.includes(opt.value))
      : PLOT_OPTIONS;
    return wanted.filter((opt) => hasDataForMetric(timeseriesdata, opt.value));
  }, [plotTypes, timeseriesdata]);

  if (panels.length === 0 || !resolution.used) {
    return (
      <p className={`text-sm text-rmigray-400 italic ${className}`}>
        No timeseries data available for this pathway.
      </p>
    );
  }

  const used = resolution.used;
  const usedKind = geographyKind(used);
  const usedLabel = geographyLabel(normalizeGeography(used));

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {panels.map((opt) => (
        <figure
          key={opt.value}
          className="min-w-0 m-0"
        >
          <figcaption className="text-sm font-medium text-rmigray-800 mb-1">
            {opt.label}
          </figcaption>

          <PlotPanel
            timeseriesdata={timeseriesdata}
            datasetId={datasetId}
            plotType={opt.value}
            selectedGeography={used}
            dims={PANEL_DIMS}
          />

          {/* Which geography and sector segment this panel actually shows —
              the reader cannot tell from the chart itself. */}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-rmigray-500">
            <Badge
              variant={geographyVariant(usedKind)}
              tooltip={
                usedKind === "region" ? (
                  <RegionMembersTooltip
                    geography={pathwayGeography}
                    label={used}
                  />
                ) : undefined
              }
            >
              {usedLabel}
            </Badge>
            <span>{getMetricDefinition("power", opt.value).sectorScope}</span>
          </div>

          {resolution.fellBack && resolution.requested ? (
            <p className="mt-1 text-xs text-rmigray-500 italic">
              {`${geographyLabel(resolution.requested)} is not available for this pathway; showing ${usedLabel}.`}
            </p>
          ) : null}
        </figure>
      ))}
    </div>
  );
};

export default PlotGrid;
