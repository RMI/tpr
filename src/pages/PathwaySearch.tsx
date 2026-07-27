import React, { useState, useEffect, useRef } from "react";
import PathwayCard from "../components/PathwayCard";
import SearchSection from "../components/SearchSection";
import StepByStepGuide from "../components/StepByStepGuide";
import ComparisonRibbon from "../components/ComparisonRibbon";
import { pathwayMetadata } from "../data/pathwayMetadata";
import { filterPathways } from "../utils/searchUtils";
import { SearchFilters, PathwayMetadataType } from "../types";
import { useFilters } from "../context/FilterContext";

const PathwaySearch: React.FC = () => {
  // Ref for the top section to handle scrolling
  const topSectionRef = useRef<HTMLDivElement>(null);
  // Ref for the search section to detect sticky state
  const searchSectionRef = useRef<HTMLDivElement>(null);

  // State to track if search section is sticky
  const [isSticky, setIsSticky] = useState(false);

  const { filters, setFilters, resetFilters } = useFilters();

  const [filteredPathways, setFilteredPathways] =
    useState<PathwayMetadataType[]>(pathwayMetadata);
  const [isFiltering, setIsFiltering] = useState(false);

  // Track previous filter state to detect changes
  const prevFiltersRef = useRef<SearchFilters>(filters);

  useEffect(() => {
    const applyFilters = () => {
      setIsFiltering(true);
      const result = filterPathways(pathwayMetadata, filters);
      setFilteredPathways(result);

      // Check if filters have changed meaningfully
      const hasFilterChanged =
        filters.searchTerm !== prevFiltersRef.current.searchTerm ||
        filters.pathwayType !== prevFiltersRef.current.pathwayType ||
        filters.modelYearNetzero !== prevFiltersRef.current.modelYearNetzero ||
        filters.modelTempIncrease !==
          prevFiltersRef.current.modelTempIncrease ||
        filters.geography !== prevFiltersRef.current.geography ||
        filters.sector !== prevFiltersRef.current.sector ||
        filters.metric !== prevFiltersRef.current.metric;

      // Scroll to top when filters change
      if (hasFilterChanged && topSectionRef.current) {
        window.scrollTo({
          top: topSectionRef.current.offsetTop - 20, // Slight offset for better UX
          behavior: "smooth",
        });
      }

      // Update the previous filters reference
      prevFiltersRef.current = { ...filters };

      setTimeout(() => setIsFiltering(false), 300);
    };

    applyFilters();
  }, [filters]);

  // Detect sticky state
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const threshold = topSectionRef.current?.offsetTop || 0;

      // Only update if state actually changes (performance optimization)
      if (scrollPosition > threshold !== isSticky) {
        setIsSticky(scrollPosition > threshold);
      }
    };

    window.addEventListener("scroll", handleScroll);
    // Initialize on mount
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isSticky]);

  const handleFilterChange = <T extends string | number>(
    key: keyof SearchFilters,
    value: T | null,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    // Search is already applied through the useEffect
  };

  const handleClear = resetFilters;

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50">
      <StepByStepGuide
        filters={filters}
        onFilterChange={handleFilterChange}
      />
      <div className="border-t border-slate-200"></div>
      <div
        ref={searchSectionRef}
        className={`sticky rounded-lg top-0 z-10 bg-gray-50 inset-x-0 transition-shadow duration-200 ${isSticky ? "shadow-md" : ""}`}
        style={{ margin: "0 calc(-50vw + 50%)" }}
      >
        <div className="container mx-auto px-4">
          <SearchSection
            filters={filters}
            pathwaysNumber={filteredPathways.length}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            onClear={handleClear}
          />
          <ComparisonRibbon />
        </div>
      </div>

      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-300 bg-gray-50 ${
          isFiltering ? "opacity-50" : "opacity-100"
        }`}
      >
        {filteredPathways.map((pathway) => (
          <PathwayCard
            key={pathway.id}
            pathway={pathway}
            searchTerm={filters.searchTerm}
          />
        ))}
      </div>

      {filteredPathways.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-rmigray-700 mb-2">
            No pathways found for your filter selection
          </h3>
          <p className="text-rmigray-500 mb-4">
            You can try other combinations of filters in the pathway guide or
            add more options in the drop down filters to find more pathways.
          </p>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-energy text-white rounded-md hover:bg-energy-700 transition-colors duration-200"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};

export default PathwaySearch;
