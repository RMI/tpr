import React from "react";
import { PathwayMetadataType } from "../types";

// One conditions-of-outcome row. Derived from the schema type so it tracks the
// metadata contract. Dependencies are descriptive and deliberately not part of
// the #869 inheritance chain, so they are not scoped by geography.
type DependencyRow = PathwayMetadataType["dependencies"][number];

interface DependenciesTableProps {
  dependencies: PathwayMetadataType["dependencies"];
}

// Evidence strength → pill colors, strongest to weakest, reusing theme tokens.
const EVIDENCE_STYLES: Record<DependencyRow["evidence_type"], string> = {
  Quantitative: "bg-pinishgreen-200 text-pinishgreen-800 border-pinishgreen-800",
  Qualitative: "bg-rmiblue-100 text-rmiblue-800 border-rmiblue-200",
  Anecdotal: "bg-solar-100 text-solar-800 border-solar-200",
  "No evidence": "bg-neutral-100 text-rmigray-600 border-neutral-300",
};

const EvidenceBadge: React.FC<{ value: DependencyRow["evidence_type"] }> = ({
  value,
}) => (
  <span
    className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${EVIDENCE_STYLES[value]}`}
  >
    {value}
  </span>
);

/**
 * The "Dependencies" table for the Overview tab: the conditions a pathway's
 * outcomes depend on, each with the strength of evidence behind it. `sector` is
 * shown only when the rows span more than one sector, so single-sector pathways
 * match the three-column wireframe (Dependency / Evidence / Constraint) and
 * multi-sector ones do not lose the scoping. An empty list is a normal state
 * (authoring is incremental) and renders an explanatory empty state.
 */
const DependenciesTable: React.FC<DependenciesTableProps> = ({
  dependencies,
}) => {
  if (dependencies.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-rmigray-600">
        <p className="text-sm">
          No dependencies have been recorded for this pathway yet.
        </p>
      </div>
    );
  }

  const showSector =
    new Set(dependencies.map((d) => d.sector)).size > 1;

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-bluespruce text-left text-white">
            <th
              scope="col"
              className="whitespace-nowrap px-3 py-2 font-semibold"
            >
              Dependency
            </th>
            {showSector ? (
              <th
                scope="col"
                className="whitespace-nowrap px-3 py-2 font-semibold"
              >
                Sector
              </th>
            ) : null}
            <th
              scope="col"
              className="whitespace-nowrap px-3 py-2 font-semibold"
            >
              Evidence type
            </th>
            <th
              scope="col"
              className="px-3 py-2 font-semibold"
            >
              Constraint
            </th>
          </tr>
        </thead>
        <tbody>
          {dependencies.map((row, i) => (
            <tr
              // A pathway can list a dependency name once per sector, so the
              // (name, sector) pair keys the row; index guards any duplicate.
              key={`${row.dependency_name}|${row.sector}|${i}`}
              className={
                i % 2 === 0 ? "align-top bg-white" : "align-top bg-neutral-50"
              }
            >
              <th
                scope="row"
                className="whitespace-nowrap px-3 py-2 text-left font-medium text-rmigray-800"
              >
                {row.dependency_name}
              </th>
              {showSector ? (
                <td className="whitespace-nowrap px-3 py-2 text-rmigray-700">
                  {row.sector}
                </td>
              ) : null}
              <td className="px-3 py-2">
                <EvidenceBadge value={row.evidence_type} />
              </td>
              <td className="px-3 py-2 text-rmigray-700">
                {row.dependency_description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DependenciesTable;
