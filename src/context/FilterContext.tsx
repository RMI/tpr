import React, { createContext, use, useState, useCallback } from "react";
import { SearchFilters } from "../types";

export const EMPTY_FILTERS: SearchFilters = {
  pathwayType: null,
  modelYearNetzero: null,
  modelTempIncrease: null,
  geography: null,
  sector: null,
  metric: null,
  emissionsTrajectory: null,
  policyAmbition: null,
  dataAvailability: null,
  searchTerm: "",
};

export const SESSION_KEY = "pathway-filters";

function loadFromSession(): SearchFilters {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<SearchFilters>) : {};
    return {
      ...EMPTY_FILTERS,
      ...parsed,
      searchTerm:
        typeof parsed.searchTerm === "string" ? parsed.searchTerm : "",
    };
  } catch {
    return { ...EMPTY_FILTERS };
  }
}

interface FilterContextValue {
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);
FilterContext.displayName = "FilterContext";

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [filters, setFilters] = useState<SearchFilters>(loadFromSession);

  const setFiltersAndPersist: React.Dispatch<
    React.SetStateAction<SearchFilters>
  > = useCallback((action) => {
    setFilters((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      } catch {
        // sessionStorage unavailable (e.g. private browsing with storage blocked)
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    setFilters({ ...EMPTY_FILTERS });
  }, []);

  return (
    <FilterContext
      value={{ filters, setFilters: setFiltersAndPersist, resetFilters }}
    >
      {children}
    </FilterContext>
  );
};

export function useFilters(): FilterContextValue {
  const ctx = use(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within a FilterProvider");
  return ctx;
}
