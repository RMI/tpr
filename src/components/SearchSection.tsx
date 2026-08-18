import React from "react";
import SearchBox from "./SearchBox";
import MultiSelectDropdown from "./MultiSelectDropdown";
import { pathwayMetadata } from "../data/pathwayMetadata";
import { SearchFilters } from "../types";
import type { FacetMode } from "../utils/searchUtils";
import { getGlobalFacetOptions } from "../utils/searchUtils";
import { REGION_MAPPING_DISCLAIMER } from "../utils/geographyUtils";
import { getStep } from "./NumericRange";
import NumericRangeDropdown from "./NumericRangeDropdown";
import {
  limitMinTempIncrease,
  limitMaxTempIncrease,
} from "../utils/NumericRangeLimits";

interface SearchSectionProps {
  filters: SearchFilters;
  pathwaysNumber: number;
  onFilterChange: <T extends string | number | (string | number)[] | null>(
    key: keyof SearchFilters,
    value: T | null,
  ) => void;
  onSearch: () => void;
  onClear: () => void;
}

const SearchSection: React.FC<SearchSectionProps> = ({
  filters,
  pathwaysNumber,
  onFilterChange,
  onSearch,
  onClear,
}) => {
  const setMode = React.useCallback(
    (
      facet:
        | "geography"
        | "sector"
        | "policyAmbition"
        | "dataAvailability"
        | "pathwayType"
        | "modelTempIncrease",
      m: FacetMode,
    ) => {
      onFilterChange("modes", { ...(filters.modes ?? {}), [facet]: m });
    },
    [filters.modes, onFilterChange],
  );

  // Single source of truth for option lists (global, data-driven)
  const {
    pathwayTypeOptions,
    geographyOptions,
    sectorOptions,
    policyAmbitionOptions,
    dataAvailabilityOptions,
  } = React.useMemo(() => getGlobalFacetOptions(pathwayMetadata), []);

  const areFiltersApplied =
    Boolean(filters.searchTerm) ||
    Boolean(filters.pathwayType) ||
    // array-backed facets: true only when non-empty; scalar: true when not null/undefined
    (Array.isArray(filters.geography)
      ? filters.geography.length > 0
      : filters.geography != null) ||
    (Array.isArray(filters.sector)
      ? filters.sector.length > 0
      : filters.sector != null) ||
    (Array.isArray(filters.modelTempIncrease)
      ? filters.modelTempIncrease.length > 0
      : filters.modelTempIncrease != null) ||
    (Array.isArray(filters.policyAmbition)
      ? filters.policyAmbition.length > 0
      : filters.policyAmbition != null) ||
    (Array.isArray(filters.dataAvailability)
      ? filters.dataAvailability.length > 0
      : filters.dataAvailability != null);

  return (
    <div className="bg-gray-50 pb-4">
      <div className="flex items-center pt-8 mb-4">
        <div className="flex-1">
          <SearchBox
            value={filters.searchTerm}
            onChange={(value) => onFilterChange("searchTerm", value)}
            onSearch={onSearch}
            onClear={onClear}
          />
        </div>

        {/* Reserve fixed space so layout doesn't shift as filters / counts change */}
        <div className="relative">
          {/* Invisible placeholder: defines the max width + height of this area */}
          <div
            className="invisible flex items-center"
            aria-hidden="true"
          >
            {/* Use a "wide" example so width doesn't change when the number shrinks */}
            <span className="text-sm">Found 888 pathways</span>
            <button
              type="button"
              className="ml-2 text-xs px-2 py-1 rounded border border-gray-200 bg-white text-energy-700"
            >
              Reset filters
            </button>
          </div>

          {/* Actual visible content, absolutely positioned over the placeholder */}
          {areFiltersApplied && (
            <div
              className="
                absolute inset-0 
                grid 
                grid-cols-[1fr_auto_auto] 
                items-center 
                w-full
              "
            >
              {/* Left spacer (takes up remaining space to allow centering) */}
              <div></div>

              <span className="text-sm text-rmigray-500 text-center">
                Found {pathwaysNumber} pathways
              </span>
              <button
                type="button"
                aria-label="Clear all filters"
                className="
                  ml-2 text-xs px-2 py-1 rounded border border-gray-200 
                  bg-white text-energy-700 hover:bg-gray-50 hover:underline 
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 
                  transition
                "
                onClick={onClear}
                data-testid="clear-all-filters"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
        <div>
          <MultiSelectDropdown<string>
            label="Geography"
            options={geographyOptions}
            value={filters.geography}
            onChange={(arr) => onFilterChange("geography", arr)}
            showModeToggle
            mode={filters.modes?.geography ?? "ANY"}
            onModeChange={(m) => setMode("geography", m)}
            menuWidthClassName="w-60"
            footer={REGION_MAPPING_DISCLAIMER}
          />
        </div>

        <div>
          <MultiSelectDropdown<string>
            label="Pathway Type"
            options={pathwayTypeOptions}
            value={filters.pathwayType}
            onChange={(arr) => onFilterChange("pathwayType", arr)}
            showModeToggle={false}
            mode={filters.modes?.pathwayType ?? "ANY"}
            onModeChange={(m) => setMode("pathwayType", m)}
          />
        </div>

        <div>
          <NumericRangeDropdown
            label="Temperature (°C)"
            minBound={limitMinTempIncrease}
            maxBound={limitMaxTempIncrease}
            step={getStep("temp")}
            value={
              !Array.isArray(filters.modelTempIncrease)
                ? filters.modelTempIncrease
                : null
            }
            onChange={(r) => onFilterChange("modelTempIncrease", r)}
          />
        </div>

        <div>
          <MultiSelectDropdown<string>
            label="Policy Ambition"
            options={policyAmbitionOptions}
            value={filters.policyAmbition}
            onChange={(arr) => onFilterChange("policyAmbition", arr)}
            showModeToggle={false}
            mode={filters.modes?.policyAmbition ?? "ANY"}
            onModeChange={(m) => setMode("policyAmbition", m)}
            menuWidthClassName="w-60"
          />
        </div>

        <div>
          <MultiSelectDropdown<string>
            label="Sector"
            options={sectorOptions}
            value={filters.sector}
            onChange={(arr) => onFilterChange("sector", arr)}
            showModeToggle
            mode={filters.modes?.sector ?? "ANY"}
            onModeChange={(m) => setMode("sector", m)}
            menuWidthClassName="w-60"
          />
        </div>

        <div>
          <MultiSelectDropdown<string>
            label="Data Availability"
            options={dataAvailabilityOptions}
            value={filters.dataAvailability}
            onChange={(arr) => onFilterChange("dataAvailability", arr)}
            showModeToggle={false}
            mode={filters.modes?.dataAvailability ?? "ANY"}
            onModeChange={(m) => setMode("dataAvailability", m)}
            menuWidthClassName="w-60"
          />
        </div>
      </div>
    </div>
  );
};

export default SearchSection;
