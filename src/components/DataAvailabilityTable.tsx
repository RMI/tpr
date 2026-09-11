import React from "react";
import type {
  Geography,
  PathwayMetadataType,
  PathwayScopeSelection,
} from "../types";
import { pathwayScopeOverlaps } from "../utils/keyFeatureScope";
import { geographyLabel, normalizeGeography } from "../utils/geographyUtils";
import { scopeSelectionLabel } from "../utils/scopeLabel";
import ScopeFilterNotice from "./ScopeFilterNotice";

// The per-metric data-availability rows (#870). Derived from the schema type so
// this stays in lockstep with the metadata contract.
type DataAvailability = NonNullable<PathwayMetadataType["dataAvailability"]>;
type ByMetricRow = DataAvailability["byMetric"][number];

interface DataAvailabilityTableProps {
  dataAvailability: PathwayMetadataType["dataAvailability"];
  /**
   * Link to the hosted timeseries download. Used to turn an "In tool" row's Data
   * format cell into a download link; omitted when nothing is hosted.
   */
  downloadHref?: string;
  /**
   * The detail page's scope selection (#872). A null axis does not filter, and
   * omitting the prop entirely leaves every row visible.
   */
  scope?: PathwayScopeSelection;
  /**
   * The pathway's own geography, needed to resolve a region token to its member
   * countries. Same prop shape PlotGrid takes, for the same reason.
   */
  pathwayGeography?: Geography | null;
}

// Shown wherever a cell has nothing authored (null granularity / scope, etc.).
const EMPTY = "—";

/*
  The scope columns are conditional, using the same data-driven rule
  DependenciesTable applies: show a column only when the visible rows disagree
  about it. Filtering to one sector or one geography therefore collapses that
  column away, since repeating the ribbon's selection on every row is noise —
  and the notice above the table already names the scope.

  "Geography scope" is deliberately not called "Geography": the existing
  "Geography coverage" column is a coverage class (Global / Regional /
  Country), not a scope, and the two must stay tellable apart.
*/
const BASE_COLUMNS = [
  "Granularity",
  "Scope limitations",
  "Geography coverage",
  "Time resolution",
  "Data format",
] as const;

const formatGranularity = (granularity: ByMetricRow["granularity"]): string =>
  granularity && granularity.length > 0 ? granularity.join(", ") : EMPTY;

/**
 * The Data format cell. "In tool" rows point at the hosted download (the data is
 * the timeseries we serve); publication rows show where the data lives and, when
 * relevant, whether it is paywalled.
 */
const DataFormatCell: React.FC<{ row: ByMetricRow; downloadHref?: string }> = ({
  row,
  downloadHref,
}) => {
  if (row.dataFormat === "In tool") {
    return downloadHref ? (
      <a
        href={downloadHref}
        className="text-energy-800 underline hover:text-energy-700"
      >
        Download
      </a>
    ) : (
      <span>In tool</span>
    );
  }
  return (
    <span>
      {row.dataFormat}
      {row.access ? (
        <span className="text-rmigray-500"> · {row.access}</span>
      ) : null}
    </span>
  );
};

/**
 * The "Data Availability" table for the Scope & Granularity tab: one row per
 * authored (metric, sector segment, geography) combination describing where and
 * how that metric's data can be obtained (#870). `dataAvailability` is optional
 * and authored incrementally, so an absent or empty set is a normal state, not an
 * error — it renders an explanatory empty state rather than a bare table.
 */
const DataAvailabilityTable: React.FC<DataAvailabilityTableProps> = ({
  dataAvailability,
  downloadHref,
  scope,
  pathwayGeography,
}) => {
  const allRows = dataAvailability?.byMetric ?? [];
  const overall = dataAvailability?.overall ?? null;

  const sector = scope?.sector ?? null;
  const geography = scope?.geography ?? null;
  const scopeActive = sector !== null || geography !== null;
  const scopeLabel = scopeSelectionLabel({ sector, geography });

  /*
    Sector is a plain equality: the schema states there is no cross-sector
    availability, because availability is a property of a concrete dataset.
    Geography is an overlap against the pathway's own vocabulary — these tokens
    are the same scope tokens keyFeatures use, which is what the schema comment
    on `byMetric[].geography` anticipates.
  */
  const rows = allRows.filter(
    (row) =>
      (sector === null || row.sector === sector) &&
      (geography === null ||
        pathwayScopeOverlaps(row.geography, geography, pathwayGeography)),
  );

  if (allRows.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-rmigray-600">
        <p className="text-sm">
          No data availability information has been recorded for this pathway
          yet.
        </p>
        {overall ? (
          <p className="mt-2 text-sm text-rmigray-700">{overall}</p>
        ) : null}
      </div>
    );
  }

  // Distinct from the case above: rows exist, the selection just excludes them.
  // Saying "none recorded for this pathway" here would be untrue.
  const showSector = new Set(rows.map((row) => row.sector)).size > 1;
  const showScope = new Set(rows.map((row) => row.geography)).size > 1;
  const columns = [
    "Metric",
    ...(showSector ? ["Sector"] : []),
    "Sector segment",
    ...(showScope ? ["Geography scope"] : []),
    ...BASE_COLUMNS,
  ];

  if (rows.length === 0 && scopeLabel !== null) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-rmigray-600">
        <p className="text-sm">
          {`No data availability is recorded for ${scopeLabel}.`}
        </p>
        <p className="mt-2 text-sm">
          {allRows.length === 1
            ? "The one recorded row is at another scope — clear the sector or geography selection above to see it."
            : `The ${allRows.length} recorded rows are at other scopes — clear the sector or geography selection above to see them.`}
        </p>
        {overall ? (
          <p className="mt-2 text-sm text-rmigray-700">{overall}</p>
        ) : null}
      </div>
    );
  }

  return (
    <section>
      {overall ? (
        <p className="mb-4 text-sm text-rmigray-700">{overall}</p>
      ) : null}
      {scopeActive && scopeLabel !== null && rows.length < allRows.length ? (
        <ScopeFilterNotice
          shown={rows.length}
          total={allRows.length}
          label={scopeLabel}
          noun="rows"
        />
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-bluespruce text-left text-white">
              {columns.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="whitespace-nowrap px-3 py-2 font-semibold"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                // Rows have no natural id. The uniqueness tuple the schema
                // enforces is (metricName, sector, sectorSegment, geography) —
                // sector was missing here, so a multi-sector pathway reporting
                // the same metric in two sectors produced duplicate keys.
                key={`${row.metricName}|${row.sector}|${row.sectorSegment}|${row.geography}`}
                className={
                  i % 2 === 0 ? "align-top bg-white" : "align-top bg-neutral-50"
                }
              >
                <th
                  scope="row"
                  className="px-3 py-2 text-left font-medium text-rmigray-800"
                >
                  {row.metricName}
                </th>
                {showSector ? (
                  <td className="px-3 py-2 text-rmigray-700">{row.sector}</td>
                ) : null}
                <td className="px-3 py-2 text-rmigray-700">
                  {row.sectorSegment}
                </td>
                {showScope ? (
                  <td className="px-3 py-2 text-rmigray-700">
                    {geographyLabel(normalizeGeography(row.geography))}
                  </td>
                ) : null}
                <td className="px-3 py-2 text-rmigray-700">
                  {formatGranularity(row.granularity)}
                </td>
                <td className="px-3 py-2 text-rmigray-700">
                  {row.scopeLimitations ?? EMPTY}
                </td>
                <td className="px-3 py-2 text-rmigray-700">
                  {row.geographyCoverage}
                </td>
                <td className="px-3 py-2 text-rmigray-700">
                  {row.timeResolution}
                </td>
                <td className="px-3 py-2 text-rmigray-700">
                  <DataFormatCell
                    row={row}
                    downloadHref={downloadHref}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default DataAvailabilityTable;
