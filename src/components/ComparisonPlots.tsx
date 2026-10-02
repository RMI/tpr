import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { PlotType, TimeSeries, HoveredPoint } from "./PlotSelector";
import { PlotPanel, PLOT_OPTIONS, hasDataForMetric } from "./PlotPanel";
import { geographyLabel } from "../utils/geographyUtils";

// Width/height per panel depending on how many pathways are compared
const CHART_DIMS: Record<number, { width: number; height: number }> = {
  2: { width: 400, height: 240 },
  3: { width: 320, height: 240 },
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

  // Switching plot type or geography remounts every panel; without this, a
  // hover captured just before the switch would linger and apply to the
  // newly-mounted panels until the next real hover/leave event.
  useEffect(() => {
    setHoveredPoint(null);
  }, [selectedPlot, selectedGeography]);

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
