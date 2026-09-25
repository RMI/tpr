import React from "react";
import { PathwayMetadataType } from "../types";
import TextWithTooltip from "./TextWithTooltip";

// The per-metric data-availability rows (#870). Derived from the schema type so
// this stays in lockstep with the metadata contract.
type DataAvailability = NonNullable<PathwayMetadataType["dataAvailability"]>;
type ByMetricRow = DataAvailability["byMetric"][number];

interface DataAvailabilityTableProps {
  dataAvailability: PathwayMetadataType["dataAvailability"];
}

const COLUMNS = [
  "Metric",
  "Sector segment",
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
 * The Geography coverage cell: the geographies this metric covers, truncated.
 *
 * The full list is in the tooltip rather than the cell because it is the
 * exception that needs it — most rows carry one or two tokens, and letting the
 * long ones set the column width would squeeze every other column.
 */
const GeographyCell: React.FC<{ geography: ByMetricRow["geography"] }> = ({
  geography,
}) => {
  const shown = geography.slice(0, GEOGRAPHIES_SHOWN).join(", ");
  if (geography.length <= GEOGRAPHIES_SHOWN) return <span>{shown}</span>;
  return (
    <TextWithTooltip
      text={`${shown}, …`}
      tooltip={geography.join(", ")}
      ariaLabel={`Geography coverage: ${geography.join(", ")}`}
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
}) => {
  const rows = dataAvailability?.byMetric ?? [];
  const overall = dataAvailability?.overall ?? null;

  if (rows.length === 0) {
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

  return (
    <section>
      {overall ? (
        <p className="mb-4 text-sm text-rmigray-700">{overall}</p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-bluespruce text-left text-white">
              {COLUMNS.map((col) => (
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
                // Rows have no natural id; the (metric, segment, geography) tuple
                // is unique per pathway (enforced by schema-check-files.ts), so it
                // makes a stable key.
                key={`${row.metricName}|${row.sectorSegment}|${row.geography.join(",")}`}
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
