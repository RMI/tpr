import React, { useCallback, useEffect, useState, useMemo } from "react";
import NormalizedStackedAreaChart from "./NormalizedStackedAreaChart";
import MultiLineChart from "./MultiLineChart";
import VerticalBarChart from "./VerticalBarChart";
import { geographyLabel } from "../utils/geographyUtils";

interface DataPoint {
  sector: string;
  metric: string;
  year: string;
  technology: string;
  value: number;
  unit: string;
  geography: string;
}

interface TimeSeries {
  data: DataPoint[];
}

export type PlotType =
  | "technologyMix"
  | "absoluteEmissions"
  | "emissionsIntensity"
  | "capacity"
  | "generation";

const PLOT_OPTIONS = [
  { value: "technologyMix", label: "Technology Mix" },
  { value: "absoluteEmissions", label: "Absolute Emissions" },
  { value: "emissionsIntensity", label: "Emissions Intensity" },
  { value: "capacity", label: "Capacity" },
  { value: "generation", label: "Generation" },
] as const;

interface PlotSelectorProps {
  timeseriesdata: TimeSeries | null;
  datasetId?: string;
  className?: string;
}

export const PlotSelector: React.FC<PlotSelectorProps> = ({
  timeseriesdata,
  datasetId,
  className = "",
}) => {
  const [selectedPlot, setSelectedPlot] = useState<PlotType>("technologyMix");
  const [selectedGeography, setSelectedGeography] = useState<string>("");

  // Get unique geographies from the dataset
  const availableGeographies = useMemo(() => {
    if (!timeseriesdata?.data) return [];
    return Array.from(
      new Set(timeseriesdata.data.map((d) => d.geography).filter(Boolean)),
    );
  }, [timeseriesdata]);

  // Set default geography on load
  useEffect(() => {
    if (availableGeographies.length > 0) {
      setSelectedGeography(availableGeographies[0]);
    }
  }, [availableGeographies, selectedPlot]);

  // Helper function to check if data exists for a specific metric
  const hasDataForMetric = useCallback(
    (data: TimeSeries | null, metric: string): boolean => {
      if (!data?.data) return false;
      const filtered = data.data.filter((d) => d.metric === metric);
      if (filtered.length === 0) return false;
      // Only plot if there is more than one unique year
      const uniqueYears = new Set(filtered.map((d) => d.year));
      return uniqueYears.size > 1;
    },
    [],
  );

  // Helper function to get available plot options based on data
  const getAvailablePlotOptions = useCallback(
    (data: TimeSeries | null): (typeof PLOT_OPTIONS)[number][] => {
      if (!data) return [];

      return PLOT_OPTIONS.filter((option) => {
        switch (option.value) {
          case "technologyMix":
            return hasDataForMetric(data, "technologyMix");
          case "absoluteEmissions":
            return hasDataForMetric(data, "absoluteEmissions");
          case "emissionsIntensity":
            return hasDataForMetric(data, "emissionsIntensity");
          case "capacity":
            return hasDataForMetric(data, "capacity");
          case "generation":
            return hasDataForMetric(data, "generation");
          default:
            return false;
        }
      });
    },
    [hasDataForMetric],
  );

  // Memoize the available options
  const availablePlotOptions = useMemo(
    () => getAvailablePlotOptions(timeseriesdata),
    [timeseriesdata, getAvailablePlotOptions],
  );

  // Update selected plot if current selection becomes invalid
  useEffect(() => {
    if (timeseriesdata && availablePlotOptions.length > 0) {
      if (!availablePlotOptions.find((opt) => opt.value === selectedPlot)) {
        setSelectedPlot(availablePlotOptions[0].value);
      }
    }
  }, [timeseriesdata, selectedPlot, availablePlotOptions]);

  // Filter data by selected geography before passing to chart components
  const filteredData = useMemo(() => {
    if (!timeseriesdata?.data || !selectedGeography) return { data: [] };
    return {
      data: timeseriesdata.data.filter(
        (d) => d.geography === selectedGeography,
      ),
    };
  }, [timeseriesdata, selectedGeography]);

  // Only render when all required state is ready
  if (
    !timeseriesdata ||
    getAvailablePlotOptions(timeseriesdata).length === 0 ||
    availableGeographies.length === 0 ||
    !selectedGeography
  ) {
    return null;
  }

  const renderPlot = () => {
    if (!filteredData) return null;

    switch (selectedPlot) {
      case "technologyMix":
        return (
          <div className="flex flex-col items-center">
            <NormalizedStackedAreaChart
              key={`${datasetId}-${selectedPlot}-${selectedGeography}`}
              data={filteredData}
              width={450}
              height={300}
              sector="power"
              metric="technologyMix"
            />
          </div>
        );
      case "absoluteEmissions":
        return (
          <div className="flex flex-col items-center">
            <VerticalBarChart
              key={`${datasetId}-${selectedPlot}-${selectedGeography}`}
              data={filteredData}
              width={450}
              height={300}
              metric="absoluteEmissions"
            />
          </div>
        );
      case "emissionsIntensity":
        return (
          <div className="flex flex-col items-center">
            <VerticalBarChart
              key={`${datasetId}-${selectedPlot}-${selectedGeography}`}
              data={filteredData}
              width={450}
              height={300}
              metric="emissionsIntensity"
            />
          </div>
        );
      case "capacity":
        return (
          <div className="flex flex-col items-center">
            <MultiLineChart
              key={`${datasetId}-${selectedPlot}-${selectedGeography}`}
              data={filteredData}
              width={450}
              height={300}
              metric="capacity"
            />
          </div>
        );
      case "generation":
        return (
          <div className="flex flex-col items-center">
            <MultiLineChart
              key={`${datasetId}-${selectedPlot}-${selectedGeography}`}
              data={filteredData}
              width={450}
              height={300}
              metric="generation"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`bg-neutral-50 border border-neutral-200 rounded-lg p-4 ${className}`}
    >
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:gap-4">
          <div className="flex-1">
            <label
              htmlFor="plot-select"
              className="text-sm font-medium text-rmigray-700 mb-2 block"
            >
              Select Plot
            </label>
            <select
              id="plot-select"
              value={selectedPlot}
              onChange={(e) => setSelectedPlot(e.target.value as PlotType)}
              className="block w-full rounded-md border-rmigray-300 shadow-sm focus:border-energy focus:ring-energy sm:text-sm"
            >
              {availablePlotOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 mt-3 sm:mt-0">
            <label
              htmlFor="geography-select"
              className="text-sm font-medium text-rmigray-700 mb-2 block"
            >
              Select Geography
            </label>
            <select
              id="geography-select"
              value={selectedGeography}
              onChange={(e) => setSelectedGeography(e.target.value)}
              className="block w-full rounded-md border-rmigray-300 shadow-sm focus:border-energy focus:ring-energy sm:text-sm"
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
        </div>
      </div>

      <div className="mb-4">{renderPlot()}</div>
    </div>
  );
};

export type { TimeSeries, DataPoint };
