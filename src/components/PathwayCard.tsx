import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import BadgeArray from "./BadgeArray";
import {
  flattenGeography,
  geographyKind,
  geographyLabel,
  geographyVariant,
  normalizeGeography,
  sortGeographiesForDetails,
} from "../utils/geographyUtils";
import { PathwayMetadataType } from "../types";
import { ChevronRight, Plus, Check, Info } from "lucide-react";
import HighlightedText from "./HighlightedText";
import { prioritizeMatches, prioritizeGeographies } from "../utils/sortUtils";
import { getSectorTooltip, getMetricTooltip } from "../utils/tooltipUtils";
import getTemperatureColor from "../utils/getTemperatureColor";
import { useComparison, MAX_COMPARED } from "../context/ComparisonContext";
import { index } from "../data/index.gen";
import {
  pathwayToolAvailability,
  sortByAvailability,
  GEOGRAPHY_AVAILABILITY_TOOLTIP,
  SECTOR_AVAILABILITY_TOOLTIP,
  METRIC_AVAILABILITY_TOOLTIP,
} from "../utils/timeseriesAvailability";
import TextWithTooltip from "./TextWithTooltip";

interface PathwayCardProps {
  pathway: PathwayMetadataType;
  searchTerm?: string;
}

const truncateText = (text: string, maxLength: number) =>
  text.length > maxLength ? text.slice(0, maxLength) + "..." : text;

const PathwayCard: React.FC<PathwayCardProps> = ({
  pathway,
  searchTerm = "",
}) => {
  const {
    addToComparison,
    removeFromComparison,
    isInComparison,
    comparedPathwayIds,
    ribbonExpanded,
  } = useComparison();
  const inComparison = isInComparison(pathway.id);
  const comparisonFull =
    comparedPathwayIds.length >= MAX_COMPARED && !inComparison;
  const availability = useMemo(
    () => pathwayToolAvailability(index.byPathway[pathway.id] ?? []),
    [pathway.id],
  );

  // Sort geography and sectors to prioritize matches, then by availability
  const sortedGeography = useMemo(
    () =>
      sortByAvailability(
        prioritizeGeographies(
          sortGeographiesForDetails(flattenGeography(pathway.geography)),
          searchTerm,
        ),
        (geo) => availability.hasGeography(geo),
      ),
    [pathway.geography, searchTerm, availability],
  );

  const sortedSectors = useMemo(
    () =>
      sortByAvailability(prioritizeMatches(pathway.sectors, searchTerm), (s) =>
        availability.hasSector(s.name),
      ),
    [pathway.sectors, searchTerm, availability],
  );

  const sortedMetrics = useMemo(
    () => sortByAvailability(pathway.metric, (m) => availability.hasMetric(m)),
    [pathway.metric, availability],
  );

  // Helper function to conditionally highlight text based on search term
  const highlightTextIfSearchMatch = (
    value: string | number | undefined | null | boolean,
  ) => {
    // If value is null or undefined, return empty string, otherwise cast to string.
    const text = value == null ? "" : String(value);

    // If there's a search term and it matches the text
    if (searchTerm && text.toLowerCase().includes(searchTerm.toLowerCase())) {
      return (
        <HighlightedText
          text={text}
          searchTerm={searchTerm}
        />
      );
    }
    // Otherwise return the plain text
    return text;
  };

  // Format temperature with °C
  const formattedTemp = pathway.modelTempIncrease
    ? `${pathway.modelTempIncrease}°C`
    : null;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full border border-neutral-200">
      <div className="flex items-stretch">
        <div className="px-5 py-3 bg-neutral-100 flex-grow flex items-center min-w-0">
          <span className="text-sm font-medium text-rmigray-700 uppercase truncate overflow-hidden whitespace-nowrap w-full">
            {highlightTextIfSearchMatch(pathway.pathwayType)} Pathway
          </span>
        </div>
        <div className="flex items-stretch h-[44px]">
          {" "}
          {/* Fixed height container */}
          {formattedTemp ? (
            <div
              className={`px-5 py-3 flex items-center justify-center ${getTemperatureColor(pathway.modelTempIncrease)}`}
            >
              <span className="text-sm font-medium text-rmigray-700">
                {highlightTextIfSearchMatch(formattedTemp)}
              </span>
            </div>
          ) : null}
          {pathway.modelYearNetzero ? (
            <div className="px-5 py-3 flex items-center bg-rmiblue-100 min-w-[80px]">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-rmigray-600 leading-tight h-[14px] whitespace-nowrap">
                  Net Zero By
                </span>
                <span className="text-sm font-medium text-rmigray-700 truncate overflow-hidden whitespace-nowrap max-w-[60px]">
                  {highlightTextIfSearchMatch(pathway.modelYearNetzero)}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-5 flex flex-col h-full">
        <div className="mb-4">
          <Link to={`/pathway/${pathway.id}`}>
            <h2 className="text-xl font-semibold text-bluespruce mb-2">
              <HighlightedText
                text={
                  (pathway.publication.publisher.short
                    ? pathway.publication.publisher.short
                    : pathway.publication.publisher.full) +
                  ": " +
                  pathway.name.full
                }
                searchTerm={searchTerm}
              />
            </h2>
          </Link>
          <p className="text-rmigray-600 text-sm line-clamp-2">
            <HighlightedText
              text={pathway.description}
              searchTerm={searchTerm}
            />
          </p>
        </div>

        {/* Geographies section with dynamic badge count */}
        <div className="mb-3">
          <p className="text-xs font-medium text-rmigray-500 mb-1 flex items-center gap-1">
            Geographies:
            <TextWithTooltip
              text={
                <Info
                  size={12}
                  className="text-rmigray-400 cursor-help"
                />
              }
              tooltip={GEOGRAPHY_AVAILABILITY_TOOLTIP}
              ariaLabel="Geography availability information"
              position="right"
            />
          </p>
          <div className="flex flex-wrap">
            <BadgeArray
              variant={sortedGeography.map((geo) => {
                const base = geographyVariant(geographyKind(geo));
                return availability.hasGeography(geo) ? base : `${base}-pub`;
              })}
              toLabel={(geo) => geographyLabel(normalizeGeography(geo))}
              renderLabel={(label) => highlightTextIfSearchMatch(label)}
              maxRows={2}
            >
              {sortedGeography}
            </BadgeArray>
          </div>
        </div>

        {/* Sectors section with dynamic badge count */}
        <div className="mb-3">
          <p className="text-xs font-medium text-rmigray-500 mb-1 flex items-center gap-1">
            Sectors:
            <TextWithTooltip
              text={
                <Info
                  size={12}
                  className="text-rmigray-400 cursor-help"
                />
              }
              tooltip={SECTOR_AVAILABILITY_TOOLTIP}
              ariaLabel="Sector availability information"
              position="right"
            />
          </p>
          <div className="flex flex-wrap">
            <BadgeArray
              variant={sortedSectors.map((s) =>
                availability.hasSector(s.name) ? "sector" : "sector-pub",
              )}
              tooltipGetter={getSectorTooltip}
              renderLabel={(label) => highlightTextIfSearchMatch(label)}
              maxRows={2}
            >
              {sortedSectors.map((sector) => sector.name)}
            </BadgeArray>
          </div>
        </div>

        {/* Metrics section with dynamic badge count */}
        <div className="mb-3">
          <p className="text-xs font-medium text-rmigray-500 mb-1 flex items-center gap-1">
            Benchmark Metrics:
            <TextWithTooltip
              text={
                <Info
                  size={12}
                  className="text-rmigray-400 cursor-help"
                />
              }
              tooltip={METRIC_AVAILABILITY_TOOLTIP}
              ariaLabel="Benchmark metric availability information"
              position="right"
            />
          </p>
          <div className="flex flex-wrap">
            <BadgeArray
              variant={sortedMetrics.map((m) =>
                availability.hasMetric(m) ? "metric" : "metric-pub",
              )}
              tooltipGetter={getMetricTooltip}
              renderLabel={(label) => highlightTextIfSearchMatch(label)}
              maxRows={2}
            >
              {sortedMetrics}
            </BadgeArray>
          </div>
        </div>
        <div className="mt-auto pt-3 border-t border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="text-xs text-rmigray-500">Publication:</p>
              <p className="text-sm font-medium text-rmigray-800">
                <HighlightedText
                  text={truncateText(
                    pathway.publication.title.short ||
                      pathway.publication.title.full,
                    40, // <-- set your desired max length here
                  )}
                  searchTerm={searchTerm}
                />
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-rmigray-500">Published:</p>
              <p className="text-sm font-medium text-rmigray-800">
                <HighlightedText
                  text={pathway.publication.year}
                  searchTerm={searchTerm}
                />
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/pathway/${pathway.id}`}
              className="bg-rmiblue-100 hover:bg-rmiblue-200 transition-colors duration-200 h-12 flex items-center justify-center flex-1"
            >
              <span className="text-bluespruce font-medium">View Details</span>
              <ChevronRight
                size={20}
                className="ml-2 text-bluespruce"
              />
            </Link>
            {ribbonExpanded && (
              <button
                type="button"
                onClick={() =>
                  inComparison
                    ? removeFromComparison(pathway.id)
                    : addToComparison(pathway.id)
                }
                disabled={comparisonFull}
                aria-label={
                  inComparison
                    ? "Remove from comparison"
                    : comparisonFull
                      ? "Comparison full (max 3)"
                      : "Add to comparison"
                }
                aria-pressed={inComparison}
                title={
                  inComparison
                    ? "Remove from comparison"
                    : comparisonFull
                      ? "Comparison full (max 3)"
                      : "Add to comparison"
                }
                className={`h-12 w-12 flex-shrink-0 flex items-center justify-center border transition-colors duration-200 ${
                  inComparison
                    ? "bg-bluespruce border-bluespruce text-white hover:bg-energy hover:border-energy"
                    : comparisonFull
                      ? "bg-neutral-100 border-neutral-200 text-neutral-300 cursor-not-allowed"
                      : "bg-white border-neutral-200 text-rmigray-500 hover:bg-rmiblue-50 hover:border-rmiblue-300 hover:text-bluespruce"
                }`}
              >
                {inComparison ? <Check size={18} /> : <Plus size={18} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PathwayCard;
