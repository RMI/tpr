import React, { createContext, use, useState, useCallback } from "react";
import { pathwayMetadata } from "../data/pathwayMetadata";
import { comparisonBlock } from "../utils/comparisonScope";
import type { PathwayMetadataType } from "../types";

const SESSION_KEY = "pathway-comparison";
export const MAX_COMPARED = 3;

/**
 * Restore the tray, dropping a selection that can no longer be compared.
 *
 * A comparison needs one sector in common. `PathwayCard` stops the reader
 * assembling an illegal set, but a set stored before the rule existed — or
 * before a pathway's sectors were re-published — would otherwise sit in the
 * tray with Compare enabled, leading straight to the page's block message.
 * Clearing the whole selection is the honest outcome: there is no way to tell
 * which of the stored pathways the reader would rather keep.
 *
 * Unknown ids are tolerated rather than dropped. They resolve to no pathway, so
 * they cannot prove an incompatibility, and both consumers already filter them
 * out on their own — `ComparisonPage` against the metadata and the ribbon when
 * it renders a slot.
 */
function loadFromSession(): string[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];

    const ids = (parsed as string[])
      .filter((x) => typeof x === "string")
      .slice(0, MAX_COMPARED);

    const pathways = ids
      .map((id) => pathwayMetadata.find((p) => p.id === id))
      .filter((p): p is PathwayMetadataType => p !== undefined);

    return comparisonBlock(pathways) === null ? ids : [];
  } catch {
    return [];
  }
}

interface ComparisonContextValue {
  comparedPathwayIds: string[];
  addToComparison: (id: string) => void;
  removeFromComparison: (id: string) => void;
  clearComparison: () => void;
  isInComparison: (id: string) => boolean;
  setComparedPathwayIds: (ids: string[]) => void;
  ribbonExpanded: boolean;
  setRibbonExpanded: (expanded: boolean) => void;
}

const ComparisonContext = createContext<ComparisonContextValue | null>(null);
ComparisonContext.displayName = "ComparisonContext";

export const ComparisonProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [ids, setIds] = useState<string[]>(loadFromSession);
  const [ribbonExpanded, setRibbonExpanded] = useState(false);

  const addToComparison = useCallback((id: string) => {
    setIds((prev) => {
      if (prev.includes(id) || prev.length >= MAX_COMPARED) return prev;
      const next = [...prev, id];
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      } catch {
        /* non-critical: sessionStorage unavailable */
      }
      return next;
    });
  }, []);

  const removeFromComparison = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.filter((x) => x !== id);
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      } catch {
        /* non-critical: sessionStorage unavailable */
      }
      return next;
    });
  }, []);

  const clearComparison = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* non-critical: sessionStorage unavailable */
    }
    setIds([]);
  }, []);

  const isInComparison = useCallback((id: string) => ids.includes(id), [ids]);

  const setComparedPathwayIds = useCallback((ids: string[]) => {
    const next = ids.slice(0, MAX_COMPARED);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } catch {
      /* non-critical: sessionStorage unavailable */
    }
    setIds(next);
  }, []);

  return (
    <ComparisonContext
      value={{
        comparedPathwayIds: ids,
        addToComparison,
        removeFromComparison,
        clearComparison,
        isInComparison,
        setComparedPathwayIds,
        ribbonExpanded,
        setRibbonExpanded,
      }}
    >
      {children}
    </ComparisonContext>
  );
};

export function useComparison(): ComparisonContextValue {
  const ctx = use(ComparisonContext);
  if (!ctx)
    throw new Error("useComparison must be used within a ComparisonProvider");
  return ctx;
}
