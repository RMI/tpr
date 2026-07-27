import React from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, GitCompareArrows, Trash2 } from "lucide-react";
import { useComparison, MAX_COMPARED } from "../context/ComparisonContext";
import { pathwayMetadata } from "../data/pathwayMetadata";

const SLOTS = [0, 1, 2] as const;

const ComparisonRibbon: React.FC = () => {
  const {
    comparedPathwayIds,
    removeFromComparison,
    clearComparison,
    ribbonExpanded: expanded,
    setRibbonExpanded: setExpanded,
  } = useComparison();
  const navigate = useNavigate();

  const canCompare = comparedPathwayIds.length >= 2;

  const handleCompare = () => {
    if (!canCompare) return;
    void navigate(`/compare?ids=${comparedPathwayIds.join(",")}`);
  };

  if (!expanded) {
    return (
      <div className="flex items-center justify-between py-2 border-t border-neutral-200">
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 text-sm font-medium text-bluespruce hover:text-energy transition-colors"
        >
          <GitCompareArrows size={16} />
          Compare Pathways
          <Plus size={14} />
        </button>
        {comparedPathwayIds.length > 0 && (
          <span className="text-xs text-rmigray-500">
            {comparedPathwayIds.length} selected
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-neutral-300 py-4 px-3 bg-neutral-100">
      <div className="flex items-start gap-3">
        {/* Pathway slots */}
        <div className="flex gap-3 flex-1 min-w-0">
          {SLOTS.map((slotIdx) => {
            const pathwayId = comparedPathwayIds[slotIdx];
            const pathway = pathwayId
              ? pathwayMetadata.find((p) => p.id === pathwayId)
              : undefined;

            if (pathway) {
              const label =
                (pathway.publication.publisher.short ??
                  pathway.publication.publisher.full) +
                ": " +
                pathway.name.full;
              return (
                <div
                  key={slotIdx}
                  className="flex items-center gap-1.5 bg-rmiblue-50 border border-rmiblue-200 rounded-md px-2.5 py-1.5 min-w-0 flex-1"
                >
                  <span className="text-xs font-medium text-bluespruce truncate flex-1">
                    {label}
                  </span>
                  <button
                    onClick={() => removeFromComparison(pathwayId)}
                    className="flex-shrink-0 text-rmigray-400 hover:text-rmired-500 transition-colors"
                    aria-label="Remove from comparison"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={slotIdx}
                className="flex items-center justify-center border border-dashed border-neutral-300 rounded-md px-2.5 py-1.5 flex-1 min-h-[34px]"
              >
                <span className="text-xs text-rmigray-400">
                  {slotIdx < MAX_COMPARED - 1 ? "Select a pathway" : "Optional"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleCompare}
            disabled={!canCompare}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              canCompare
                ? "bg-bluespruce text-white hover:bg-energy"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
            }`}
          >
            {canCompare ? "Compare" : "Compare (min. 2)"}
          </button>
          <button
            onClick={clearComparison}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rmigray-500 hover:text-rmired-500 border border-neutral-200 rounded-md transition-colors"
            aria-label="Clear all"
          >
            <Trash2 size={13} />
            Clear All
          </button>
          <button
            onClick={() => setExpanded(false)}
            className="px-2.5 py-1.5 text-xs text-rmigray-500 hover:text-rmigray-700 border border-neutral-200 rounded-md transition-colors"
          >
            Hide
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComparisonRibbon;
