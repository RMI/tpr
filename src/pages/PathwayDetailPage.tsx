import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Markdown from "../components/Markdown";
import { pathwayMetadata } from "../data/pathwayMetadata";
import { PathwayMetadataType } from "../types";
import BadgeArray from "../components/BadgeArray";
import {
  flattenGeography,
  geographyKind,
  geographyLabel,
  geographyVariant,
  normalizeGeography,
  sortGeographiesForDetails,
} from "../utils/geographyUtils";
import { ArrowLeft, Info } from "lucide-react";
import {
  getPathwayTypeTooltip,
  getSectorTooltip,
  getMetricTooltip,
} from "../utils/tooltipUtils";
import KeyFeatures from "../components/KeyFeatures";
import DownloadDataset from "../components/DownloadDataset";
import {
  fetchTimeseriesIndex,
  datasetsForPathway,
  summarizeSummary,
} from "../utils/timeseriesIndex";
import PublicationBlock from "../components/PublicationBlock";
import { PlotSelector, TimeSeries } from "../components/PlotSelector";
import getTemperatureColor from "../utils/getTemperatureColor";
import TextWithTooltip from "../components/TextWithTooltip";
import {
  pathwayToolAvailability,
  sortByAvailability,
  GEOGRAPHY_AVAILABILITY_TOOLTIP,
  SECTOR_AVAILABILITY_TOOLTIP,
  METRIC_AVAILABILITY_TOOLTIP,
} from "../utils/timeseriesAvailability";

const PathwayDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [pathway, setPathway] = useState<PathwayMetadataType | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeseriesdata, setTimeseriesdata] = useState<TimeSeries | null>(null);

  useEffect(() => {
    setLoading(true);
    // Simulate API call with timeout
    const timer = setTimeout(() => {
      const foundPathway = pathwayMetadata.find((s) => s.id === id) || null;
      setPathway(foundPathway);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [id]);

  // Timeseries index state
  const [tsIndexLoaded, setTsIndexLoaded] = useState(false);
  const [datasets, setDatasets] = useState<
    Array<{
      datasetId: string;
      label?: string;
      path: string;
      summary?: unknown;
    }>
  >([]);

  const formatTemp = (t: number | undefined | null) =>
    t == null ? null : `${t}°C`;

  useEffect(() => {
    let isMounted = true;

    const loadDatasets = async (): Promise<void> => {
      try {
        const idx = await fetchTimeseriesIndex();
        if (!isMounted) return;

        const pathwayId: string = pathway?.id ?? "";

        if (idx && pathwayId) {
          setDatasets(datasetsForPathway(idx, pathwayId));
        } else {
          setDatasets([]);
        }
        setTsIndexLoaded(true);
      } catch (err) {
        console.error("Failed to load timeseries index:", err);
      }
    };

    void loadDatasets(); // explicitly mark ignored promise to satisfy no-floating-promises
    return () => {
      isMounted = false;
    };
  }, [pathway]); // depend on the full object to avoid eslint warning

  useEffect(() => {
    if (datasets.length > 0) {
      fetch(datasets[0].path.replace(/\.csv$/, ".json"))
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data: TimeSeries) => setTimeseriesdata(data))
        .catch((error) => console.error("Error fetching JSON:", error));
    }
  }, [datasets]);

  const availability = useMemo(
    () => pathwayToolAvailability(datasets),
    [datasets],
  );

  const sortedGeos = useMemo(
    () =>
      sortByAvailability(
        sortGeographiesForDetails(flattenGeography(pathway?.geography)),
        (geo) => availability.hasGeography(geo),
      ),
    [pathway, availability],
  );

  const sortedSectors = useMemo(
    () =>
      sortByAvailability(pathway?.sectors ?? [], (s) =>
        availability.hasSector(s.name),
      ),
    [pathway, availability],
  );

  const sortedMetrics = useMemo(
    () =>
      sortByAvailability(pathway?.metric ?? [], (m) =>
        availability.hasMetric(m),
      ),
    [pathway, availability],
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-100 rounded w-96 mb-4"></div>
          <div className="h-4 bg-neutral-100 rounded w-64 mb-8"></div>
          <div className="h-32 bg-neutral-100 rounded w-full mb-4"></div>
          <div className="h-32 bg-neutral-100 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!pathway) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-rmigray-800 mb-4">
          Pathway Not Found
        </h2>
        <p className="text-rmigray-600 mb-6">
          The pathway you're looking for doesn't exist or has been removed.
        </p>
        <Link
          to="/pathway"
          className="inline-flex items-center px-4 py-2 bg-energy text-white rounded-md hover:bg-energy-700 transition-colors duration-200"
        >
          <ArrowLeft
            size={16}
            className="mr-2"
          />
          Back to Pathways
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to="/pathway"
        className="inline-flex items-center text-rmigray-600 hover:text-energy-700 mb-6 transition-colors duration-200"
      >
        <ArrowLeft
          size={16}
          className="mr-1"
        />
        Back to pathways
      </Link>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-bluespruce p-6 text-white">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {pathway.name.full +
              (pathway.name.short ? ` (${pathway.name.short})` : "")}
          </h1>

          <div className="mt-2 space-y-4">
            <p className="text-white">{pathway.description}</p>

            <div className="space-y-1 inline-block">
              <div className="flex text-[10px] font-semibold text-white tracking-wider uppercase">
                <span className="w-30 text-center">Type</span>

                {pathway.modelYearNetzero && (
                  <span className="w-30 text-center">Net zero by</span>
                )}

                {typeof pathway.modelTempIncrease === "number" && (
                  <span className="w-30 text-center">Warming by 2100</span>
                )}
              </div>

              <div className="flex overflow-hidden rounded-full bg-neutral-100/90 text-sm font-medium text-rmigray-800 shadow-sm">
                <span
                  className="w-30 px-3 py-1 text-center"
                  title={getPathwayTypeTooltip(pathway.pathwayType)}
                >
                  {pathway.pathwayType}
                </span>

                {pathway.modelYearNetzero && (
                  <span className="w-30 px-3 py-1 border-l bg-rmiblue-100 border-white/60 text-center">
                    {pathway.modelYearNetzero}
                  </span>
                )}

                {typeof pathway.modelTempIncrease === "number" && (
                  <span
                    className={
                      "w-30 px-3 py-1 border-l border-white/60 text-center " +
                      getTemperatureColor(pathway.modelTempIncrease)
                    }
                  >
                    {formatTemp(pathway.modelTempIncrease)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between text-xs sm:text-sm text-white gap-1">
              <p className="sm:max-w-[60%]">
                <span className="font-semibold">Publisher:</span>{" "}
                {pathway.publication.publisher.full}
              </p>
              <p className="sm:text-right">
                <span className="font-semibold">Published:</span>{" "}
                {pathway.publication.year}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7">
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-rmigray-800 mb-3">
                  Expert Overview
                </h2>
                <div className="prose text-rmigray-700">
                  <Markdown>{pathway.expertOverview}</Markdown>
                </div>
              </section>

              <section className="mt-8">
                <div className="prose text-rmigray-700">
                  <h4>Supplemental Information</h4>
                  <PublicationBlock publication={pathway.publication} />

                  {tsIndexLoaded && datasets.length > 0
                    ? datasets.map((d) => {
                        const label = d.label ?? d.datasetId;
                        const summary = summarizeSummary(d.summary);
                        return (
                          <DownloadDataset
                            key={d.datasetId}
                            label={label}
                            href={d.path}
                            summary={summary}
                          />
                        );
                      })
                    : null}
                </div>
              </section>
            </div>

            <div className="md:col-span-5">
              <PlotSelector
                timeseriesdata={timeseriesdata}
                datasetId={datasets[0]?.datasetId}
                className="mb-6"
              />

              <KeyFeatures keyFeatures={pathway.keyFeatures} />

              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium text-rmigray-800 mb-3 flex items-center gap-1.5">
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
                </h3>
                <BadgeArray
                  variant={sortedGeos.map((geo) => {
                    const base = geographyVariant(geographyKind(geo));
                    return availability.hasGeography(geo)
                      ? base
                      : `${base}-pub`;
                  })}
                  toLabel={(geo) => geographyLabel(normalizeGeography(geo))}
                  visibleCount={Infinity}
                >
                  {sortedGeos}
                </BadgeArray>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium text-rmigray-800 mb-3 flex items-center gap-1.5">
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
                </h3>
                <BadgeArray
                  variant={sortedSectors.map((s) =>
                    availability.hasSector(s.name) ? "sector" : "sector-pub",
                  )}
                  tooltipGetter={getSectorTooltip}
                  visibleCount={Infinity}
                >
                  {sortedSectors.map((s) => s.name)}
                </BadgeArray>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium text-rmigray-800 mb-3 flex items-center gap-1.5">
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
                </h3>
                <BadgeArray
                  variant={sortedMetrics.map((m) =>
                    availability.hasMetric(m) ? "metric" : "metric-pub",
                  )}
                  tooltipGetter={getMetricTooltip}
                  visibleCount={Infinity}
                >
                  {sortedMetrics}
                </BadgeArray>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PathwayDetailPage;
