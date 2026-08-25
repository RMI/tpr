import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PlotType, TimeSeries, HoveredPoint } from "./PlotSelector";
import NormalizedStackedAreaChart from "./NormalizedStackedAreaChart";
import MultiLineChart from "./MultiLineChart";
import { geographyLabel } from "../utils/geographyUtils";

const PLOT_OPTIONS: { value: PlotType; label: string }[] = [
  { value: "technologyMix", label: "Technology Mix" },
  { value: "absoluteEmissions", label: "Absolute Emissions" },
  { value: "emissionsIntensity", label: "Emissions Intensity" },
  { value: "capacity", label: "Capacity" },
  { value: "generation", label: "Generation" },
];

// Width/height per panel depending on how many pathways are compared
const CHART_DIMS: Record<number, { width: number; height: number }> = {
  2: { width: 400, height: 240 },
  3: { width: 320, height: 240 },
};

function hasDataForMetric(data: TimeSeries | null, metric: string): boolean {
  if (!data?.data) return false;
  const filtered = data.data.filter(
    (d) => d.sector === "power" && d.metric === metric,
  );
  if (filtered.length === 0) return false;
  return new Set(filtered.map((d) => d.year)).size > 1;
}

function hasDataForMetricAndGeo(
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

// ── Single pathway plot panel ────────────────────────────────────────────────

interface PlotPanelProps {
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

const PlotPanel: React.FC<PlotPanelProps> = ({
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

// ── Shared plot-type selector + N panels ─────────────────────────────────────

export interface ComparisonPlotsEntry {
  pathwayId: string;
  timeseriesdata: TimeSeries | null;
  datasetId?: string;
}

interface ComparisonPlotsProps {
  entries: ComparisonPlotsEntry[];
}

const ComparisonPlots: React.FC<ComparisonPlotsProps> = ({ entries }) => {
  const n = entries.length;
  const dims = CHART_DIMS[n] ?? CHART_DIMS[3];

  // Derive which plot types have data across any pathway (for any geography)
  const availablePlotOptions = useMemo(
    () =>
      PLOT_OPTIONS.filter((opt) =>
        entries.some((e) => hasDataForMetric(e.timeseriesdata, opt.value)),
      ),
    [entries],
  );

  const [selectedPlot, setSelectedPlot] = useState<PlotType>("technologyMix");

  useEffect(() => {
    if (
      availablePlotOptions.length > 0 &&
      !availablePlotOptions.find((o) => o.value === selectedPlot)
    ) {
      setSelectedPlot(availablePlotOptions[0].value);
    }
  }, [availablePlotOptions, selectedPlot]);

  // Union of all geographies across all compared pathways
  const availableGeographies = useMemo(() => {
    const geoSet = new Set<string>();
    entries.forEach((e) => {
      e.timeseriesdata?.data?.forEach((d) => {
        if (d.geography) geoSet.add(d.geography);
      });
    });
    return Array.from(geoSet);
  }, [entries]);

  const [selectedGeography, setSelectedGeography] = useState<string>("");

  useEffect(() => {
    if (
      availableGeographies.length > 0 &&
      !availableGeographies.includes(selectedGeography)
    ) {
      setSelectedGeography(availableGeographies[0]);
    }
  }, [availableGeographies, selectedGeography]);

  // Shared y-axis bounds across all pathways for the current plot type + geography
  const sharedYBounds = useMemo(() => {
    const isLineChart =
      selectedPlot === "capacity" ||
      selectedPlot === "generation" ||
      selectedPlot === "absoluteEmissions" ||
      selectedPlot === "emissionsIntensity";

    if (!isLineChart) return undefined;

    const allValues: number[] = [];
    entries.forEach((e) => {
      e.timeseriesdata?.data
        ?.filter(
          (d) =>
            d.geography === selectedGeography &&
            d.sector === "power" &&
            d.metric === selectedPlot,
        )
        .forEach((d) => allValues.push(d.value));
    });

    if (allValues.length === 0) return undefined;

    const yMax = Math.max(...allValues);
    // Emissions intensity axes always start at 0; other line charts use the natural data min.
    const yMin =
      selectedPlot === "emissionsIntensity" ? 0 : Math.min(...allValues);
    return { yMin, yMax };
  }, [entries, selectedPlot, selectedGeography]);

  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);

  const handleHoverPoint = useCallback((point: HoveredPoint | null) => {
    setHoveredPoint(point);
  }, []);

  const hasAnyData = availablePlotOptions.length > 0;

  const handlePlotChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedPlot(e.target.value as PlotType);
    },
    [],
  );

  const handleGeoChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedGeography(e.target.value);
    },
    [],
  );

  return (
    <div
      className="grid gap-x-6"
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, alignItems: "start" }}
    >
      {/* Shared filters — spans all pathway columns */}
      <div
        className="mb-4"
        style={{ gridColumn: "1 / -1" }}
      >
        {hasAnyData ? (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-rmigray-700 whitespace-nowrap">
                Plot type
              </label>
              <select
                value={selectedPlot}
                onChange={handlePlotChange}
                className="rounded-md border-rmigray-300 shadow-sm focus:border-energy focus:ring-energy sm:text-sm"
              >
                {availablePlotOptions.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {availableGeographies.length > 1 && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-rmigray-700 whitespace-nowrap">
                  Geography
                </label>
                <select
                  value={selectedGeography}
                  onChange={handleGeoChange}
                  className="rounded-md border-rmigray-300 shadow-sm focus:border-energy focus:ring-energy sm:text-sm"
                >
                  {availableGeographies.map((geo) => (
                    <option
                      key={geo}
                      value={geo}
                    >
                      {geographyLabel(geo)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-rmigray-400 italic">
            No timeseries data available for these pathways.
          </p>
        )}
      </div>

      {/* N chart panels — auto-placed one per column */}
      {entries.map((entry) => (
        <div
          key={entry.pathwayId}
          className="min-w-0"
        >
          <PlotPanel
            timeseriesdata={entry.timeseriesdata}
            datasetId={entry.datasetId}
            plotType={selectedPlot}
            selectedGeography={selectedGeography}
            dims={dims}
            yMin={sharedYBounds?.yMin}
            yMax={sharedYBounds?.yMax}
            hoveredPoint={hoveredPoint}
            onHoverPoint={handleHoverPoint}
          />
        </div>
      ))}
    </div>
  );
};

export default ComparisonPlots;
