import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, ChevronRight, Info } from "lucide-react";
import { pathwayMetadata } from "../data/pathwayMetadata";
import {
  columnGeographyOptions,
  columnsGeographyDivergence,
  comparisonBlock,
  decodeColumnGeographies,
  defaultGeographyForColumn,
  encodeColumnGeographies,
  resolveSharedSector,
  sharedSectors,
  type ColumnGeographyOption,
} from "../utils/comparisonScope";
import { PathwayMetadataType } from "../types";
import { useUrlParamState } from "../hooks/useUrlParamState";
import ComparisonScopeHeader from "../components/ComparisonScopeHeader";
import { useComparison, MAX_COMPARED } from "../context/ComparisonContext";
import {
  fetchTimeseriesIndex,
  datasetsForPathway,
} from "../utils/timeseriesIndex";
import { TimeSeries } from "../components/PlotSelector";
import {
  geographyVariant,
  REGION_MAPPING_DISCLAIMER,
} from "../utils/geographyUtils";
import BadgeArray, { BadgeVariant } from "../components/BadgeArray";
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
      // Same helper the scope header's per-column control reads, so this
      // read-only view and the selectable one cannot drift.
      const options = columnGeographyOptions(pathway, availabilities[idx]);
      return (
        <div
          key={pathway.id}
          className="min-w-0"
        >
          <BadgeArray
            variant={options.map((option): BadgeVariant => {
              const base = geographyVariant(option.kind);
              return option.available ? base : `${base}-pub`;
            })}
            toLabel={(token) =>
              options.find((o) => o.token === token)?.label ?? ""
            }
            visibleCount={Infinity}
          >
            {options.map((option) => option.token)}
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
  const [searchParams, setSearchParams] = useSearchParams();
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
      .slice(0, MAX_COMPARED);
  }, [searchParams]);

  const pathways = useMemo(
    () =>
      ids
        .map((id) => pathwayMetadata.find((p) => p.id === id))
        .filter((p): p is PathwayMetadataType => p !== undefined),
    [ids],
  );

  /*
    Alex's hard restriction: a comparison needs one sector in common. The tray
    can no longer assemble an illegal set (see PathwayCard), but `?ids=` is
    read straight from the query string and validated only for existence, so a
    hand-edited or stale shared link still has to be caught here.
  */
  const block = useMemo(() => comparisonBlock(pathways), [pathways]);

  // Sync URL IDs back into context so the ribbon stays current, including when
  // the URL resolves to 0–1 valid IDs (clears stale state). Skipped for a
  // blocked set only: a bad link must not clobber the reader's own selection.
  useEffect(() => {
    if (block !== null) return;
    setComparedPathwayIds(ids);
  }, [ids, block, setComparedPathwayIds]);

  const n = pathways.length;

  const availabilities = useMemo(
    () =>
      pathways.map((p) => pathwayToolAvailability(index.byPathway[p.id] ?? [])),
    [pathways],
  );

  /*
    The scope, backed by the URL.

    `pathwayMetadata` is read at module load and `ids` resolve synchronously
    above, so the legal option sets exist at first render — no deferred seeding
    effect is needed here, unlike the detail page.

    Defaults are computed with no filters: `ComparisonRibbon` already wrote the
    reader's search scope into the URL at navigation time, so resolving an
    absent param against session filters here would mean a shared link showed
    the recipient's scope rather than the sender's.
  */
  const sectorOptions = useMemo(() => sharedSectors(pathways), [pathways]);

  const [sector, setSector] = useUrlParamState({
    param: "sector",
    options: sectorOptions,
    defaultValue: useMemo(
      () => resolveSharedSector({ sector: null }, pathways),
      [pathways],
    ),
  });

  /** Each column's own geographies, keyed by pathway id. */
  const geographyOptions = useMemo(() => {
    const byPathway: Record<string, ColumnGeographyOption[]> = {};
    pathways.forEach((pathway, idx) => {
      byPathway[pathway.id] = columnGeographyOptions(
        pathway,
        availabilities[idx],
      );
    });
    return byPathway;
  }, [pathways, availabilities]);

  const geographyDefaults = useMemo(() => {
    const byPathway: Record<string, string | null> = {};
    for (const pathway of pathways) {
      byPathway[pathway.id] = defaultGeographyForColumn(
        { geography: null },
        pathway,
        geographyOptions[pathway.id] ?? [],
      );
    }
    return byPathway;
  }, [pathways, geographyOptions]);

  /*
    Geography is one value per column, so it cannot use `useUrlParamState` —
    that hook is a single scalar validated against a single option set. The
    same four behaviours are kept by hand: validate each column's token against
    that column's options, delete the param when every column is at its
    default, a functional updater so `?ids=` and `?sector=` survive, and
    `{ replace: false }` so Back steps through selections.
  */
  const selectedGeographies = useMemo(() => {
    const fromUrl = decodeColumnGeographies(searchParams.get("geography"));
    const resolved: Record<string, string | null> = {};
    for (const pathway of pathways) {
      const requested = fromUrl[pathway.id];
      const legal = (geographyOptions[pathway.id] ?? []).some(
        (option) => option.token === requested,
      );
      resolved[pathway.id] = legal
        ? requested
        : (geographyDefaults[pathway.id] ?? null);
    }
    return resolved;
  }, [searchParams, pathways, geographyOptions, geographyDefaults]);

  const handleGeographyChange = (pathwayId: string, next: string): void => {
    const merged: Record<string, string> = {};
    for (const pathway of pathways) {
      const token =
        pathway.id === pathwayId ? next : selectedGeographies[pathway.id];
      // Only non-default choices need saying; a column at its default stays
      // out of the URL so the common case has no `geography` param at all.
      if (token && token !== geographyDefaults[pathway.id]) {
        merged[pathway.id] = token;
      }
    }

    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        const encoded = encodeColumnGeographies(merged);
        if (encoded === "") params.delete("geography");
        else params.set("geography", encoded);
        return params;
      },
      { replace: false },
    );
  };

  const divergence = useMemo(
    () => columnsGeographyDivergence(selectedGeographies, pathways),
    [selectedGeographies, pathways],
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
              pathwayGeography: p.geography,
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
              pathwayGeography: p.geography,
            };
          } catch {
            return {
              pathwayId: p.id,
              timeseriesdata: null,
              datasetId: first.datasetId,
              pathwayGeography: p.geography,
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

  if (block !== null) {
    const names = block.offenders
      .map(
        (p) =>
          `${p.publication.publisher.short ?? p.publication.publisher.full}: ${p.name.full}`,
      )
      .join(", ");
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-xl font-semibold text-rmigray-800 mb-2">
          These pathways cannot be compared
        </h2>
        <p className="text-rmigray-600 mb-4 max-w-xl mx-auto">
          {`${names} shares no sector with the others, and a comparison needs one sector in common.`}
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

  /*
    The five comparison sections, as nodes rather than inline JSX, so their
    order can be a data decision below.
  */
  const sectionNodes: Record<string, React.ReactNode> = {
    plots: (
      <>
        {/* ── Benchmark Metric Plots ── */}
        <div className="mt-8">
          <ComparisonPlots
            entries={plotEntries}
            requestedGeographies={selectedGeographies}
            requestedSector={sector}
          />
        </div>
      </>
    ),
    keyFeatures: (
      <>
        {/* ── Key Features ── */}
        <div className="mt-8">
          <ComparisonKeyFeatures pathways={pathways} />
        </div>
      </>
    ),
    geographies: (
      <>
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
                    className="text-white/80 cursor-help"
                  />
                }
                tooltip={
                  <>
                    <span className="block">
                      {GEOGRAPHY_AVAILABILITY_TOOLTIP}
                    </span>
                    <span className="mt-2 block italic">
                      {REGION_MAPPING_DISCLAIMER}
                    </span>
                  </>
                }
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
      </>
    ),
    sectors: (
      <>
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
                    className="text-white/80 cursor-help"
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
      </>
    ),
    metrics: (
      <>
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
                    className="text-white/80 cursor-help"
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
      </>
    ),
  };

  /*
    A fixed order. The geographies section used to float to the top whenever
    the columns disagreed; with a geography control in the header under each
    column, the discrepancy is stated where the reader chose it and the section
    stays put.
  */
  const sectionOrder = [
    "plots",
    "keyFeatures",
    "geographies",
    "sectors",
    "metrics",
  ];

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

      {/*
        The cards are static. A sticky scope header and three sticky ~200px
        cards cannot share a viewport; the header's condensed bar restates the
        column names once these have scrolled away.
      */}
      <div className={colClass}>
        {pathways.map((p) => (
          <PathwaySummaryCard
            key={p.id}
            pathway={p}
          />
        ))}
      </div>

      <ComparisonScopeHeader
        pathways={pathways}
        sectorOptions={sectorOptions}
        selectedSector={sector}
        onSectorChange={setSector}
        geographyOptions={geographyOptions}
        selectedGeographies={selectedGeographies}
        onGeographyChange={handleGeographyChange}
        divergence={divergence}
      />

      {sectionOrder.map((key) => (
        <React.Fragment key={key}>{sectionNodes[key]}</React.Fragment>
      ))}
    </div>
  );
};

export default ComparisonPage;
