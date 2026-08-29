import React from "react";
import { PathwayMetadataType } from "../types";

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
}

// Shown wherever a cell has nothing authored (null granularity / scope, etc.).
const EMPTY = "—";

const COLUMNS = [
  "Metric",
  "Sector segment",
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
}) => {
  const rows = dataAvailability?.byMetric ?? [];
  const overall = dataAvailability?.overall ?? null;

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-rmigray-600">
        <p className="text-sm">
          No data availability information has been recorded for this pathway yet.
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
                key={`${row.metricName}|${row.sectorSegment}|${row.geography}`}
                className={
                  i % 2 === 0
                    ? "align-top bg-white"
                    : "align-top bg-neutral-50"
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
