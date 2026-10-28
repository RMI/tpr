import React from "react";
import { PathwayMetadataType } from "../types";
import Badge from "./Badge";
import { DependencyRow, EvidenceBadge } from "./DependenciesTable";

/**
 * Every dependency category, in schema order. Listed here rather than derived
 * from the data so each row renders for every comparison, keeping the columns
 * aligned; the test pins the rendered rows to the schema's enum.
 */
const DEPENDENCY_NAMES: readonly DependencyRow["dependency_name"][] = [
  "Policy strategy",
  "Regulatory framework",
  "Market and economics",
  "Public acceptance",
  "Consumer and client behavior",
  "Infrastructure and logistics",
  "Technology",
  "Resource availability",
  "Environmental impacts and ecosystem services",
  "Labor availability",
];

interface ComparisonDependenciesProps {
  pathways: PathwayMetadataType[];
  /**
   * The sector from the scope header. Dependencies are recorded per sector, so
   * this is what scopes them; null means no shared sector has anything to show.
   * There is no geography prop: dependencies are not scoped by geography.
   */
  sector: string | null;
}

const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-rmigray-600">
    <p className="text-sm">{children}</p>
  </div>
);

/**
 * The comparison page's "Dependencies" section: one row per dependency
 * category, labelled once across the columns like `ComparisonKeyFeatures`, with
 * each pathway's evidence and description underneath.
 *
 * Every category renders, recorded or not, so the rows line up across columns.
 * A pathway that records nothing for the selected sector gets one note at the
 * top of its column instead of ten "No information" cells, which would read as
 * ten separate gaps rather than one.
 */
const ComparisonDependencies: React.FC<ComparisonDependenciesProps> = ({
  pathways,
  sector,
}) => {
  const n = pathways.length;
  if (n === 0) return null;

  if (sector === null) {
    return (
      <EmptyState>
        No dependencies are recorded for the sectors these pathways share.
      </EmptyState>
    );
  }

  const rowsByPathway = pathways.map((pathway) =>
    (pathway.dependencies ?? []).filter((d) => d.sector === sector),
  );

  if (rowsByPathway.every((rows) => rows.length === 0)) {
    return (
      <EmptyState>
        {`None of these pathways record dependencies for ${sector}.`}
      </EmptyState>
    );
  }

  const hasEmptyColumn = rowsByPathway.some((rows) => rows.length === 0);

  return (
    <div
      className="grid gap-x-6"
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
    >
      {hasEmptyColumn &&
        pathways.map((pathway, idx) => (
          <div
            key={pathway.id}
            className="pb-3 min-w-0"
          >
            {rowsByPathway[idx].length === 0 && (
              <p className="text-sm italic text-rmigray-600">
                {`This pathway has no dependencies recorded for ${sector}.`}
              </p>
            )}
          </div>
        ))}

      {DEPENDENCY_NAMES.map((name, rowIdx) => (
        <React.Fragment key={name}>
          {/* Single label above all pathway cells */}
          <div
            className="pt-3 pb-1"
            style={{ gridColumn: "1 / -1" }}
          >
            <p className="text-xs font-semibold text-rmigray-500 uppercase tracking-wide">
              {name}
            </p>
          </div>

          {pathways.map((pathway, idx) => {
            const rows = rowsByPathway[idx];
            const matches = rows.filter((d) => d.dependency_name === name);
            return (
              <div
                key={pathway.id}
                className="pb-3 min-w-0"
              >
                {/* Blank under the column note: the note already explains it. */}
                {rows.length === 0 ? null : matches.length === 0 ? (
                  <Badge>No information</Badge>
                ) : (
                  // The schema forbids only exact duplicates, so a pathway can
                  // record one category more than once; each one stacks.
                  matches.map((d, i) => (
                    <div
                      key={i}
                      className={i > 0 ? "mt-3" : undefined}
                    >
                      <EvidenceBadge value={d.evidence_type} />
                      <p className="mt-1.5 text-sm text-rmigray-700">
                        {d.dependency_description}
                      </p>
                    </div>
                  ))
                )}
              </div>
            );
          })}

          {/* Separator between rows, not after the last one */}
          {rowIdx < DEPENDENCY_NAMES.length - 1 && (
            <div
              className="border-b border-neutral-200"
              style={{ gridColumn: "1 / -1" }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ComparisonDependencies;
