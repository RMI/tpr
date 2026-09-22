import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { PlotType, TimeSeries, HoveredPoint } from "./PlotSelector";
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
import {
  geographyFallbackNote,
  resolveGeography,
} from "../utils/geographyFallback";
import { getSectorDefinition } from "../utils/timeseriesTaxonomy";

// Width/height per panel depending on how many pathways are compared
const CHART_DIMS: Record<number, { width: number; height: number }> = {
  2: { width: 400, height: 240 },
  3: { width: 320, height: 240 },
};

/**
 * The plots are power-sector only: `PlotPanel` and `MultiLineChart` both
 * hardcode `sector="power"`. Naming it once here keeps that assumption visible,
 * matching `PlotGrid`.
 */
const PLOT_SECTOR = getSectorDefinition("power");

// ── Shared plot-type selector + N panels ─────────────────────────────────────

export interface ComparisonPlotsEntry {
  pathwayId: string;
  timeseriesdata: TimeSeries | null;
  datasetId?: string;
  /**
   * The pathway's own geography metadata. Region membership is
   * publication-specific, so the fallback for this column has to be resolved
   * against this pathway's mapping and no other's.
   */
  pathwayGeography?: Geography | null;
}

interface ComparisonPlotsProps {
  entries: ComparisonPlotsEntry[];
  /**
   * The shared geography the reader asked for, in the publisher's own spelling.
   * One request, resolved per column: a token that one publisher declares may
   * be absent from another's data, so each column reports what it actually
   * shows. Null means "no preference", resolving to the broadest available.
   */
  requestedGeography?: string | null;
  /**
   * The shared sector the reader asked for. The plots are Power-only, so any
   * other sector gets an explanation rather than Power series relabelled.
   */
  requestedSector?: string | null;
}

const ComparisonPlots: React.FC<ComparisonPlotsProps> = ({
  entries,
  requestedGeography = null,
  requestedSector = null,
}) => {
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

  /*
    One resolution per column.

    There is no geography control here: the scope header above owns that axis.
    Two geography controls on one page would contradict each other, and this
    one offered the raw union of every column's timeseries tokens — a list in
    which most entries were unplottable for most columns.
  */
  const resolutions = useMemo(
    () =>
      entries.map((entry) => {
        const available = new Set<string>();
        entry.timeseriesdata?.data?.forEach((d) => {
          if (d.geography) available.add(d.geography);
        });
        return resolveGeography(
          [...available],
          requestedGeography,
          entry.pathwayGeography ?? null,
        );
      }),
    [entries, requestedGeography],
  );

  // Shared y-axis bounds across all pathways for the current plot type.
  //
  // Each entry contributes the rows for ITS OWN resolved geography: filtering
  // everything on one token would compute the axis from rows no chart shows,
  // and leave columns that fell back scaled to someone else's data.
  const sharedYBounds = useMemo(() => {
    const isLineChart =
      selectedPlot === "capacity" ||
      selectedPlot === "generation" ||
      selectedPlot === "absoluteEmissions" ||
      selectedPlot === "emissionsIntensity";

    if (!isLineChart) return undefined;

    const allValues: number[] = [];
    entries.forEach((e, idx) => {
      const used = resolutions[idx]?.used;
      if (!used) return;
      e.timeseriesdata?.data
        ?.filter(
          (d) =>
            d.geography === used &&
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
  }, [entries, selectedPlot, resolutions]);

  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);

  const handleHoverPoint = useCallback((point: HoveredPoint | null) => {
    setHoveredPoint(point);
  }, []);

  // Switching plot type or geography remounts every panel; without this, a
  // hover captured just before the switch would linger and apply to the
  // newly-mounted panels until the next real hover/leave event.
  useEffect(() => {
    setHoveredPoint(null);
  }, [selectedPlot, requestedGeography]);

  const hasAnyData = availablePlotOptions.length > 0;

  const handlePlotChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedPlot(e.target.value as PlotType);
    },
    [],
  );

  /*
    The charts are Power-only, so a selection for another sector gets an
    explanation rather than Power series under its heading. Gated on
    PLOT_SECTOR rather than on the sectors present in the data, because the
    hardcoding lives in PlotPanel — a dataset carrying Steel rows still would
    not make these charts Steel charts. Move this when PlotPanel takes a sector.
  */
  if (requestedSector !== null && requestedSector !== PLOT_SECTOR.displayName) {
    return (
      <p className="text-sm text-rmigray-600">
        {`The benchmark plots cover the ${PLOT_SECTOR.displayName} sector only, so there is nothing to show for ${requestedSector}. Select ${PLOT_SECTOR.displayName} above to see them.`}
      </p>
    );
  }

  return (
    <div
      className="grid gap-x-6"
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, alignItems: "start" }}
    >
      {/* Shared plot-type selector — spans all pathway columns */}
      <div
        className="mb-4"
        style={{ gridColumn: "1 / -1" }}
      >
        {hasAnyData ? (
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
        ) : (
          <p className="text-sm text-rmigray-400 italic">
            No timeseries data available for these pathways.
          </p>
        )}
      </div>

      {/* N chart panels — auto-placed one per column */}
      {entries.map((entry, idx) => {
        const resolution = resolutions[idx];
        const used = resolution?.used ?? "";
        const usedKind = geographyKind(used);
        const note = resolution ? geographyFallbackNote(resolution) : null;

        return (
          <div
            key={entry.pathwayId}
            className="min-w-0"
          >
            <PlotPanel
              timeseriesdata={entry.timeseriesdata}
              datasetId={entry.datasetId}
              plotType={selectedPlot}
              selectedGeography={used}
              dims={dims}
              yMin={sharedYBounds?.yMin}
              yMax={sharedYBounds?.yMax}
              hoveredPoint={hoveredPoint}
              onHoverPoint={handleHoverPoint}
            />

            {/*
              Which geography this column actually shows. Per column rather
              than once for the grid, because the columns can differ — which is
              the whole reason the shared request is resolved separately.
            */}
            {used ? (
              <div className="mt-1 flex flex-wrap items-center">
                <Badge
                  variant={geographyVariant(usedKind)}
                  tooltip={
                    usedKind === "region" ? (
                      <RegionMembersTooltip
                        geography={entry.pathwayGeography}
                        label={used}
                      />
                    ) : undefined
                  }
                >
                  {geographyLabel(normalizeGeography(used))}
                </Badge>
              </div>
            ) : null}
            {note ? (
              <p className="mt-1 text-xs text-rmigray-600">{note}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default ComparisonPlots;
