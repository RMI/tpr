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
import {
  getMetricDefinition,
  getSectorDefinition,
} from "../utils/timeseriesTaxonomy";
import { getSectorSegmentTooltip } from "../utils/tooltipUtils";
import { useElementWidth } from "../hooks/useElementWidth";

/**
 * Panel size before the columns have been measured, and the panel height
 * throughout: #842 asks for width only, and a constant height is what keeps
 * the columns baseline-aligned with each other.
 */
const CHART_DIMS: Record<number, { width: number; height: number }> = {
  2: { width: 400, height: 240 },
  3: { width: 320, height: 240 },
};

/** Quantise the measured width so a window drag does not re-run d3 per pixel. */
const WIDTH_STEP = 20;

/**
 * Stable empty default for `requestedGeographies`. An inline `{}` would be a
 * new object every render, invalidating the memo below on every pass.
 */
const NO_REQUESTS: Readonly<Record<string, string | null>> = Object.freeze({});

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
   * Each column's requested geography, keyed by pathway id and written in that
   * publisher's own spelling.
   *
   * Per column rather than one shared value because tokens are
   * publication-specific — a token one publisher declares may not exist in
   * another's data at all. A missing or null entry means "no preference",
   * resolving to the broadest geography that column has.
   */
  requestedGeographies?: Readonly<Record<string, string | null>>;
  /**
   * The shared sector the reader asked for. The plots are Power-only, so any
   * other sector gets an explanation rather than Power series relabelled.
   */
  requestedSector?: string | null;
}

const ComparisonPlots: React.FC<ComparisonPlotsProps> = ({
  entries,
  requestedGeographies = NO_REQUESTS,
  requestedSector = null,
}) => {
  const n = entries.length;

  /*
    Size the charts to the column they sit in (#842), rather than to a constant
    that only matched one viewport width.

    One observer suffices: every column is `1fr`, so they share a width. The
    charts already re-scale on a width change — MultiLineChart and
    NormalizedStackedAreaChart both list `width` in their effect deps — so no
    remount is needed, and `dims` stays OUT of PlotPanel's key: keying on it
    would drop the shared hover state on every resize tick.
  */
  const [columnWidth, firstColumnRef] = useElementWidth(WIDTH_STEP);
  const fallbackDims = CHART_DIMS[n] ?? CHART_DIMS[3];
  const dims = useMemo(
    () => ({
      width: columnWidth ?? fallbackDims.width,
      height: fallbackDims.height,
    }),
    [columnWidth, fallbackDims],
  );

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

    There is no geography control here: the scope header above owns that axis,
    one dropdown per column. Two geography controls on one page would
    contradict each other, and this one offered the raw union of every column's
    timeseries tokens — a list in which most entries were unplottable for most
    columns.
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
          requestedGeographies[entry.pathwayId] ?? null,
          entry.pathwayGeography ?? null,
        );
      }),
    [entries, requestedGeographies],
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

  /*
    Switching plot type or geography remounts every panel; without this, a
    hover captured just before the switch would linger and apply to the
    newly-mounted panels until the next real hover/leave event.

    Keyed on what the panels actually RESOLVED to, not on the requested
    selection: the request arrives as an object, and depending on its identity
    would clear the shared hover on every render that happened to rebuild it,
    which is the same failure mode as putting `dims` in PlotPanel's key.
  */
  const resolvedKey = resolutions.map((r) => r.used ?? "").join("|");
  useEffect(() => {
    setHoveredPoint(null);
  }, [selectedPlot, resolvedKey]);

  const hasAnyData = availablePlotOptions.length > 0;

  // Which part of the sector the selected metric describes. One value for the
  // whole grid, because it follows the shared plot type rather than the pathway.
  const segment = getMetricDefinition(
    PLOT_SECTOR.key,
    selectedPlot,
  ).sectorScope;

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

      {/*
        Which part of the sector the selected metric describes. A property of
        the metric, not of the pathway, so every column shows the same one —
        but it belongs in each column's caption alongside the geography, the
        way the detail page captions its small multiples.

        `sectorScope` is optional on MetricDefinition, so a metric may declare
        no segment; render the badge only when one exists rather than an empty
        pill.
      */}
      {entries.map((entry, idx) => {
        const resolution = resolutions[idx];
        const used = resolution?.used ?? "";
        const usedKind = geographyKind(used);
        const note = resolution ? geographyFallbackNote(resolution) : null;

        return (
          <div
            key={entry.pathwayId}
            // Only the first column is measured; they are all `1fr`.
            ref={idx === 0 ? firstColumnRef : undefined}
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
                {segment ? (
                  <Badge
                    variant="sectorSegment"
                    tooltip={getSectorSegmentTooltip(
                      PLOT_SECTOR.displayName,
                      segment,
                    )}
                  >
                    {segment}
                  </Badge>
                ) : null}
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
