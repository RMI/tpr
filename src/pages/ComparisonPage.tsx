import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Info } from "lucide-react";
import { pathwayMetadata } from "../data/pathwayMetadata";
import { PathwayMetadataType } from "../types";
import { useComparison } from "../context/ComparisonContext";
import {
  fetchTimeseriesIndex,
  datasetsForPathway,
} from "../utils/timeseriesIndex";
import { TimeSeries } from "../components/PlotSelector";
import {
  flattenGeography,
  geographyKind,
  geographyLabel,
  geographyVariant,
  normalizeGeography,
  sortGeographiesForDetails,
} from "../utils/geographyUtils";
import BadgeArray from "../components/BadgeArray";
import getTemperatureColor from "../utils/getTemperatureColor";
import { getSectorTooltip, getMetricTooltip } from "../utils/tooltipUtils";
import ComparisonKeyFeatures from "../components/ComparisonKeyFeatures";
import ComparisonPlots, {
  ComparisonPlotsEntry,
} from "../components/ComparisonPlots";
import { index } from "../data/index.gen";
import {
  pathwayToolAvailability,
  sortByAvailability,
  PathwayToolAvailability,
  GEOGRAPHY_AVAILABILITY_TOOLTIP,
  SECTOR_AVAILABILITY_TOOLTIP,
  METRIC_AVAILABILITY_TOOLTIP,
} from "../utils/timeseriesAvailability";
import TextWithTooltip from "../components/TextWithTooltip";

// ── Pathway summary card (compact) ──────────────────────────────────────────

const PathwaySummaryCard: React.FC<{ pathway: PathwayMetadataType }> = ({
  pathway,
}) => {
  const formattedTemp = pathway.modelTempIncrease
    ? `${pathway.modelTempIncrease}°C`
    : null;

  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden flex flex-col h-full">
      {/* Type / temp / net-zero header bar */}
      <div className="flex items-stretch">
        <div className="px-4 py-2 bg-neutral-100 flex-grow flex items-center min-w-0">
          <span className="text-xs font-medium text-rmigray-700 uppercase truncate">
            {pathway.pathwayType} Pathway
          </span>
        </div>
        <div className="flex items-stretch">
          {formattedTemp && (
            <div
              className={`px-3 py-2 flex items-center justify-center ${getTemperatureColor(pathway.modelTempIncrease)}`}
            >
              <span className="text-xs font-medium text-rmigray-700">
                {formattedTemp}
              </span>
            </div>
          )}
          {pathway.modelYearNetzero && (
            <div className="px-3 py-2 flex items-center bg-rmiblue-100">
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-rmigray-600 leading-tight whitespace-nowrap">
                  Net Zero By
                </span>
                <span className="text-xs font-medium text-rmigray-700">
                  {pathway.modelYearNetzero}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-sm font-semibold text-bluespruce mb-1.5 leading-snug">
          {(pathway.publication.publisher.short ??
            pathway.publication.publisher.full) +
            ": " +
            pathway.name.full}
        </h3>
        <p className="text-xs text-rmigray-600 line-clamp-3 mb-3">
          {pathway.description}
        </p>

        <div className="mt-auto">
          <div className="flex justify-between items-center mb-2 text-xs text-rmigray-500">
            <span>
              Publication:{" "}
              <span className="font-medium text-rmigray-700">
                {pathway.publication.title.short ??
                  pathway.publication.title.full}
              </span>
            </span>
            <span>{pathway.publication.year}</span>
          </div>
          <Link
            to={`/pathway/${pathway.id}`}
            className="bg-rmiblue-100 hover:bg-rmiblue-200 transition-colors h-9 flex items-center justify-center w-full rounded-sm"
          >
            <span className="text-xs text-bluespruce font-medium">
              View Details
            </span>
            <ChevronRight
              size={14}
              className="ml-1 text-bluespruce"
            />
          </Link>
        </div>
      </div>
    </div>
  );
};

// ── Geographies: one BadgeArray per pathway column ───────────────────────────

interface ComparisonGeographiesProps {
  pathways: PathwayMetadataType[];
  availabilities: PathwayToolAvailability[];
}

const ComparisonGeographies: React.FC<ComparisonGeographiesProps> = ({
  pathways,
  availabilities,
}) => (
  <>
    {pathways.map((pathway, idx) => {
      const availability = availabilities[idx];
      const sorted = sortByAvailability(
        sortGeographiesForDetails(flattenGeography(pathway.geography)),
        (geo) => availability.hasGeography(geo),
      );
      return (
        <div
          key={pathway.id}
          className="min-w-0"
        >
          <BadgeArray
            variant={sorted.map((geo) => {
              const base = geographyVariant(geographyKind(geo));
              return availability.hasGeography(geo) ? base : `${base}-pub`;
            })}
            toLabel={(geo) => geographyLabel(normalizeGeography(geo ?? ""))}
            visibleCount={Infinity}
          >
            {sorted}
          </BadgeArray>
        </div>
      );
    })}
  </>
);

// ── Section heading that spans all columns ───────────────────────────────────

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div
    className="mt-6 mb-3 bg-bluespruce px-3 py-1"
    style={{ gridColumn: "1 / -1" }}
  >
    <h2 className="text-base font-semibold text-white">{children}</h2>
  </div>
);

// ── Main page ────────────────────────────────────────────────────────────────

const ComparisonPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { setComparedPathwayIds } = useComparison();

  // Parse IDs from URL — the source of truth for which pathways to compare.
  // De-duplicate and validate against known pathways so an invalid/shared URL
  // can never leave the page or ribbon in an inconsistent state.
  const ids = useMemo(() => {
    const raw = searchParams.get("ids");
    if (!raw) return [];
    const seen = new Set<string>();
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((id) => pathwayMetadata.some((p) => p.id === id))
      .filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, 3);
  }, [searchParams]);

  // Always sync URL IDs back into context so the ribbon stays current,
  // including when the URL resolves to 0–1 valid IDs (clears stale state).
  useEffect(() => {
    setComparedPathwayIds(ids);
  }, [ids, setComparedPathwayIds]);

  const pathways = useMemo(
    () =>
      ids
        .map((id) => pathwayMetadata.find((p) => p.id === id))
        .filter((p): p is PathwayMetadataType => p !== undefined),
    [ids],
  );

  const n = pathways.length;

  const availabilities = useMemo(
    () =>
      pathways.map((p) => pathwayToolAvailability(index.byPathway[p.id] ?? [])),
    [pathways],
  );

  // Timeseries data state: one entry per pathway
  const [plotEntries, setPlotEntries] = useState<ComparisonPlotsEntry[]>([]);

  useEffect(() => {
    if (pathways.length === 0) return;
    let cancelled = false;

    const load = async () => {
      const idx = await fetchTimeseriesIndex();
      const results = await Promise.all(
        pathways.map(async (p) => {
          const datasets = datasetsForPathway(idx, p.id);
          if (datasets.length === 0) {
            return {
              pathwayId: p.id,
              timeseriesdata: null,
              datasetId: undefined,
            };
          }
          const first = datasets[0];
          try {
            const resp = await fetch(first.path.replace(/\.csv$/, ".json"));
            const data: TimeSeries = resp.ok
              ? ((await resp.json()) as TimeSeries)
              : { data: [] };
            return {
              pathwayId: p.id,
              timeseriesdata: data,
              datasetId: first.datasetId,
            };
          } catch {
            return {
              pathwayId: p.id,
              timeseriesdata: null,
              datasetId: first.datasetId,
            };
          }
        }),
      );
      if (!cancelled) setPlotEntries(results);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [pathways]);

  // Guard: need at least 2 valid pathways
  if (ids.length < 2) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-rmigray-600 mb-4">
          Select at least 2 pathways to compare.
        </p>
        <Link
          to="/pathway"
          className="inline-flex items-center text-bluespruce hover:text-energy"
        >
          <ArrowLeft
            size={16}
            className="mr-1"
          />
          Back to pathways
        </Link>
      </div>
    );
  }

  const colClass =
    n === 2 ? "grid grid-cols-2 gap-6" : "grid grid-cols-3 gap-6";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        to="/pathway"
        className="inline-flex items-center text-rmigray-600 hover:text-energy-700 mb-6 transition-colors"
      >
        <ArrowLeft
          size={16}
          className="mr-1"
        />
        Back to pathways
      </Link>

      {/* ── Pathway summary cards ── */}
      <div className={`${colClass} sticky top-0 z-20`}>
        {pathways.map((p) => (
          <PathwaySummaryCard
            key={p.id}
            pathway={p}
          />
        ))}
      </div>

      {/* ── Benchmark Metric Plots ── */}
      <div className="mt-8">
        <ComparisonPlots entries={plotEntries} />
      </div>

      {/* ── Key Features ── */}
      <div className="mt-8">
        <ComparisonKeyFeatures pathways={pathways} />
      </div>

      {/* ── Geographies ── */}
      <div
        className="grid gap-x-6 mt-8"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      >
        <SectionHeading>
          <span className="flex items-center gap-1.5">
            Geographies
            <TextWithTooltip
              text={
                <Info
                  size={14}
                  className="text-rmigray-400 cursor-help"
                />
              }
              tooltip={GEOGRAPHY_AVAILABILITY_TOOLTIP}
              ariaLabel="Geography availability information"
              position="right"
            />
          </span>
        </SectionHeading>
        <ComparisonGeographies
          pathways={pathways}
          availabilities={availabilities}
        />
      </div>

      {/* ── Sectors ── */}
      <div
        className="grid gap-x-6 mt-8"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      >
        <SectionHeading>
          <span className="flex items-center gap-1.5">
            Sectors
            <TextWithTooltip
              text={
                <Info
                  size={14}
                  className="text-rmigray-400 cursor-help"
                />
              }
              tooltip={SECTOR_AVAILABILITY_TOOLTIP}
              ariaLabel="Sector availability information"
              position="right"
            />
          </span>
        </SectionHeading>
        {pathways.map((p, idx) => {
          const sortedSectors = sortByAvailability(p.sectors, (s) =>
            availabilities[idx].hasSector(s.name),
          );
          return (
            <div
              key={p.id}
              className="min-w-0"
            >
              <BadgeArray
                variant={sortedSectors.map((s) =>
                  availabilities[idx].hasSector(s.name)
                    ? "sector"
                    : "sector-pub",
                )}
                tooltipGetter={getSectorTooltip}
                visibleCount={Infinity}
              >
                {sortedSectors.map((s) => s.name)}
              </BadgeArray>
            </div>
          );
        })}
      </div>

      {/* ── Benchmark Metrics (badge arrays) ── */}
      <div
        className="grid gap-x-6 mt-8"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      >
        <SectionHeading>
          <span className="flex items-center gap-1.5">
            Benchmark Metrics
            <TextWithTooltip
              text={
                <Info
                  size={14}
                  className="text-rmigray-400 cursor-help"
                />
              }
              tooltip={METRIC_AVAILABILITY_TOOLTIP}
              ariaLabel="Benchmark metric availability information"
              position="right"
            />
          </span>
        </SectionHeading>
        {pathways.map((p, idx) => {
          const sortedMetrics = sortByAvailability(p.metric, (m) =>
            availabilities[idx].hasMetric(m),
          );
          return (
            <div
              key={p.id}
              className="min-w-0"
            >
              <BadgeArray
                variant={sortedMetrics.map((m) =>
                  availabilities[idx].hasMetric(m) ? "metric" : "metric-pub",
                )}
                tooltipGetter={getMetricTooltip}
                visibleCount={Infinity}
              >
                {sortedMetrics}
              </BadgeArray>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ComparisonPage;
