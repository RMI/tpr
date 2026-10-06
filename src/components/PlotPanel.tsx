import React, { useMemo } from "react";
import type { PlotType, TimeSeries, HoveredPoint } from "./PlotSelector";
import NormalizedStackedAreaChart from "./NormalizedStackedAreaChart";
import MultiLineChart from "./MultiLineChart";

/**
 * The canonical plot order and labels, shared by every surface that renders
 * benchmark plots (the comparison page's shared selector and the detail page's
 * small multiples). Kept here rather than in `PlotSelector` so the two consumers
 * cannot drift.
 */
export const PLOT_OPTIONS: { value: PlotType; label: string }[] = [
  { value: "technologyMix", label: "Technology Mix" },
  { value: "absoluteEmissions", label: "Absolute Emissions" },
  { value: "emissionsIntensity", label: "Emissions Intensity" },
  { value: "capacity", label: "Capacity" },
  { value: "generation", label: "Generation" },
];

/** Just the plot types, in canonical order — for callers taking a subset. */
export const PLOT_ORDER: PlotType[] = PLOT_OPTIONS.map((opt) => opt.value);

/** Does this pathway carry a plottable series for `metric` at any geography? */
export function hasDataForMetric(
  data: TimeSeries | null,
  metric: string,
): boolean {
  if (!data?.data) return false;
  const filtered = data.data.filter(
    (d) => d.sector === "power" && d.metric === metric,
  );
  if (filtered.length === 0) return false;
  return new Set(filtered.map((d) => d.year)).size > 1;
}

/** Does this pathway carry a plottable series for `metric` at `geo` specifically? */
export function hasDataForMetricAndGeo(
  data: TimeSeries | null,
  metric: string,
  geo: string,
): boolean {
  if (!data?.data) return false;
  const filtered = data.data.filter(
    (d) => d.sector === "power" && d.metric === metric && d.geography === geo,
  );
  if (filtered.length === 0) return false;
  return new Set(filtered.map((d) => d.year)).size > 1;
}

export interface PlotPanelProps {
  timeseriesdata: TimeSeries | null;
  datasetId?: string;
  plotType: PlotType;
  selectedGeography: string;
  dims: { width: number; height: number };
  yMin?: number;
  yMax?: number;
  hoveredPoint?: HoveredPoint | null;
  onHoverPoint?: (point: HoveredPoint | null) => void;
}

/**
 * One chart for one pathway, one plot type and one geography.
 *
 * The `key` on every chart is deliberate: `NormalizedStackedAreaChart` captures
 * its d3 data in a `useState` initializer and never re-derives it, so switching
 * plot type or geography has to remount rather than re-render.
 */
export const PlotPanel: React.FC<PlotPanelProps> = ({
  timeseriesdata,
  datasetId,
  plotType,
  selectedGeography,
  dims,
  yMin,
  yMax,
  hoveredPoint,
  onHoverPoint,
}) => {
  const filteredData = useMemo(() => {
    if (!timeseriesdata?.data || !selectedGeography) return { data: [] };
    return {
      data: timeseriesdata.data.filter(
        (d) => d.geography === selectedGeography,
      ),
    };
  }, [timeseriesdata, selectedGeography]);

  if (
    !timeseriesdata ||
    !selectedGeography ||
    !hasDataForMetricAndGeo(timeseriesdata, plotType, selectedGeography)
  ) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-rmigray-400 italic text-center px-4">
        For this pathway, there is currently no data available for the selected
        combination of sector, region, and metric.
      </div>
    );
  }

  const key = `${datasetId ?? ""}-${plotType}-${selectedGeography}`;

  const renderChart = () => {
    switch (plotType) {
      case "technologyMix":
        return (
          <NormalizedStackedAreaChart
            key={key}
            data={filteredData}
            width={dims.width}
            height={dims.height}
            sector="power"
            metric="technologyMix"
            externalHoveredPoint={hoveredPoint}
            onHoverPoint={onHoverPoint}
          />
        );
      case "absoluteEmissions":
        return (
          <MultiLineChart
            key={key}
            data={filteredData}
            width={dims.width}
            height={dims.height}
            metric="absoluteEmissions"
            yMin={yMin}
            yMax={yMax}
            externalHoveredPoint={hoveredPoint}
            onHoverPoint={onHoverPoint}
          />
        );
      case "emissionsIntensity":
        return (
          <MultiLineChart
            key={key}
            data={filteredData}
            width={dims.width}
            height={dims.height}
            metric="emissionsIntensity"
            yMin={yMin}
            yMax={yMax}
            externalHoveredPoint={hoveredPoint}
            onHoverPoint={onHoverPoint}
          />
        );
      case "capacity":
        return (
          <MultiLineChart
            key={key}
            data={filteredData}
            width={dims.width}
            height={dims.height}
            metric="capacity"
            yMin={yMin}
            yMax={yMax}
            externalHoveredPoint={hoveredPoint}
            onHoverPoint={onHoverPoint}
          />
        );
      case "generation":
        return (
          <MultiLineChart
            key={key}
            data={filteredData}
            width={dims.width}
            height={dims.height}
            metric="generation"
            yMin={yMin}
            yMax={yMax}
            externalHoveredPoint={hoveredPoint}
            onHoverPoint={onHoverPoint}
          />
        );
      default:
        return null;
    }
  };

  return <div className="overflow-x-auto">{renderChart()}</div>;
};

export default PlotPanel;
