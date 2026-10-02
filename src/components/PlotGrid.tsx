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
import {
  getMetricDefinition,
  getSectorDefinition,
} from "../utils/timeseriesTaxonomy";
import { getSectorSegmentTooltip } from "../utils/tooltipUtils";

/** Panel size for the small multiples — two columns at desktop width. */
const PANEL_DIMS = { width: 420, height: 260 };

/**
 * The plots are power-sector only: `PlotPanel` and `MultiLineChart` both
 * hardcode `sector="power"`. Naming it once here keeps that assumption visible
 * and gives the segment tooltip the sector it needs to scope its lookup.
 */
const PLOT_SECTOR = getSectorDefinition("power");

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
  /**
   * The sector from the ribbon's scope selection (#872). The plots are
   * Power-only, so any other sector gets an explanation rather than Power
   * series relabelled.
   */
  requestedSector?: string | null;
  /** Which plots to render, in order. Defaults to all of them. */
  plotTypes?: PlotType[];
  /** Panel heading. Omit for a bare grid with no surrounding panel. */
  title?: React.ReactNode;
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
  requestedSector = null,
  plotTypes,
  title,
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

  /**
   * The surrounding panel, matching the Key Features panel so the two sections
   * of a tab read as one system. Omitting `title` yields a bare grid.
   */
  const panel = (content: React.ReactNode) =>
    title ? (
      <div
        className={`bg-neutral-50 border border-neutral-200 rounded-lg p-4 ${className}`}
      >
        <h3 className="text-lg font-medium text-rmigray-800 mb-3">{title}</h3>
        {content}
      </div>
    ) : (
      <div className={className}>{content}</div>
    );

  if (panels.length === 0 || !resolution.used) {
    return panel(
      <p className="text-sm text-rmigray-400 italic">
        No timeseries data available for this pathway.
      </p>,
    );
  }

  /*
    The charts are Power-only: PlotPanel and MultiLineChart both hardcode
    sector="power", and hasDataForMetric filters on it. Answering a selection
    for another sector with Power series under its heading would be a lie, so
    say so instead. The gate is PLOT_SECTOR rather than the sectors present in
    the data, because the hardcoding lives in PlotPanel — a dataset carrying
    Steel rows still would not make these charts Steel charts. Move this when
    PlotPanel takes a sector.
  */
  if (requestedSector !== null && requestedSector !== PLOT_SECTOR.displayName) {
    return panel(
      <p className="text-sm text-rmigray-600">
        {`The benchmark plots cover the ${PLOT_SECTOR.displayName} sector only, so there is nothing to show for ${requestedSector}. Clear the sector selection above to see them.`}
      </p>,
    );
  }

  const used = resolution.used;
  const usedKind = geographyKind(used);
  const usedLabel = geographyLabel(normalizeGeography(used));

  return panel(
    <>
      {/*
        One sentence for the whole grid, not one per panel: every panel resolves
        to the same geography, so repeating it under each chart said the same
        thing up to five times.

        The wording avoids claiming the geography is unavailable "for this
        pathway" — once the request comes from the ribbon it is one of the
        pathway's own declared geographies, and what is missing is the
        timeseries, not the coverage.
      */}
      {resolution.fellBack && resolution.requested ? (
        <p className="mb-3 text-sm text-rmigray-600">
          {`No timeseries data for ${geographyLabel(resolution.requested)}; showing ${usedLabel} instead.`}
        </p>
      ) : null}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {panels.map((opt) => {
          // `sectorScope` is optional on MetricDefinition, so a metric may simply
          // not declare a segment — render the badge only when one exists rather
          // than an empty pill.
          const segment = getMetricDefinition(
            PLOT_SECTOR.key,
            opt.value,
          ).sectorScope;

          return (
            <figure
              key={opt.value}
              className="min-w-0 m-0 rounded-lg border border-neutral-200 bg-white p-4"
            >
              <figcaption className="text-xs font-semibold text-rmigray-500 uppercase tracking-wide mb-3">
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
              <div className="mt-1 flex flex-wrap items-center">
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
            </figure>
          );
        })}
      </div>
    </>,
  );
};

export default PlotGrid;
