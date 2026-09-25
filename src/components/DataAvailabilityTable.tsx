import React from "react";
import type {
  Geography,
  PathwayMetadataType,
  PathwayScopeSelection,
} from "../types";
import { pathwayScopeOverlaps } from "../utils/keyFeatureScope";
import { geographyLabel } from "../utils/geographyUtils";
import { scopeSelectionLabel } from "../utils/scopeLabel";
import ScopeFilterNotice from "./ScopeFilterNotice";
import TextWithTooltip from "./TextWithTooltip";

// The per-metric data-availability rows (#870). Derived from the schema type so
// this stays in lockstep with the metadata contract.
type DataAvailability = NonNullable<PathwayMetadataType["dataAvailability"]>;
type ByMetricRow = DataAvailability["byMetric"][number];

interface DataAvailabilityTableProps {
  dataAvailability: PathwayMetadataType["dataAvailability"];
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

/*
  Sector is a conditional column, using the same data-driven rule
  DependenciesTable applies: show it only when the visible rows disagree about
  it. Filtering to one sector therefore collapses it away, since repeating the
  ribbon's selection on every row is noise — and the notice above the table
  already names the scope.

  Geography does NOT get that treatment, though a separate "Geography scope"
  column once did. Decision 0021 retired the Global/Regional/Country class that
  used to fill "Geography coverage", because the cookbook's Geography coverage
  IS the token list the scope column held -- so the two merged. The surviving
  column stays unconditional, for two reasons: a row carries several
  geographies and is matched by overlap, so the cell is not the selection
  echoed back; and with the column conditional, a pathway with a single
  availability row would show its geography nowhere at all.
*/
const BASE_COLUMNS = [
  "Granularity",
  "Scope limitations",
  "Geography coverage",
  "Time resolution",
  "Data format",
] as const;

/*
  How many geographies a cell shows before collapsing the rest behind an
  ellipsis. Coverage lists run long -- a pathway projecting one metric per
  country puts a dozen or more tokens in one cell -- and the first few are
  enough to tell the row apart at a glance.
*/
const GEOGRAPHIES_SHOWN = 3;

/**
 * A row's geography list as one comparable string.
 *
 * `geography` is an array now, so a bare `row.geography` compares by reference:
 * a Set of them is always the size of the row count, and it interpolates into a
 * React key by joining anyway. Both call sites want the same value, so it is
 * named once.
 */
const geographyKey = (row: ByMetricRow): string => row.geography.join(",");

/**
 * The Geography coverage cell: the geographies this metric covers, truncated.
 *
 * The full list is in the tooltip rather than the cell because it is the
 * exception that needs it — most rows carry one or two tokens, and letting the
 * long ones set the column width would squeeze every other column.
 */
const GeographyCell: React.FC<{ geography: ByMetricRow["geography"] }> = ({
  geography,
}) => {
  // Country codes become country names; region labels and the sentinels pass
  // through. Same treatment the geography badges give a token elsewhere.
  const labels = geography.map(geographyLabel);
  const all = labels.join(", ");
  const shown = labels.slice(0, GEOGRAPHIES_SHOWN).join(", ");
  if (labels.length <= GEOGRAPHIES_SHOWN) return <span>{shown}</span>;
  return (
    <TextWithTooltip
      text={`${shown}, …`}
      tooltip={all}
      ariaLabel={`Geography coverage: ${all}`}
    />
  );
};

/**
 * The "Data Availability" table for the Scope & Granularity tab: one row per
 * authored (metric, sector segment, geography set) combination describing where
 * and how that metric's data can be obtained (#870). `dataAvailability` is
 * optional and authored incrementally, so an absent or empty set is a normal
 * state, not an error — it renders an explanatory empty state rather than a bare
 * table.
 *
 * Every cell has a value: the cookbook replaces a blank with `Unspecified` (the
 * pathway does not say) or `Not covered` (the pair is not covered), so there is
 * no em-dash placeholder here. Nor is there a download link — `dataFormat`
 * describes the source publication only, and what this tool hosts is shown by
 * `DownloadDataset` further down the page.
 */
const DataAvailabilityTable: React.FC<DataAvailabilityTableProps> = ({
  dataAvailability,
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
      // A row covering several geographies is in scope when *any* of them
      // overlaps the selection -- the row describes one dataset spanning the
      // whole list, so matching part of it matches the row.
      (geography === null ||
        row.geography.some((token) =>
          pathwayScopeOverlaps(token, geography, pathwayGeography),
        )),
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
  const columns = [
    "Metric",
    ...(showSector ? ["Sector"] : []),
    "Sector segment",
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
                key={`${row.metricName}|${row.sector}|${row.sectorSegment}|${geographyKey(row)}`}
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
                <td className="px-3 py-2 text-rmigray-700">
                  {row.granularity.join(", ")}
                </td>
                <td className="px-3 py-2 text-rmigray-700">
                  {row.scopeLimitations}
                </td>
                <td className="px-3 py-2 text-rmigray-700">
                  <GeographyCell geography={row.geography} />
                </td>
                <td className="px-3 py-2 text-rmigray-700">
                  {row.timeResolution}
                </td>
                <td className="px-3 py-2 text-rmigray-700">{row.dataFormat}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default DataAvailabilityTable;
