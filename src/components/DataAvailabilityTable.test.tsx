import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import DataAvailabilityTable from "./DataAvailabilityTable";
import { PathwayMetadataType } from "../types";

type DataAvailability = NonNullable<PathwayMetadataType["dataAvailability"]>;
type ByMetricRow = DataAvailability["byMetric"][number];

// One fully-authored row and one the pathway says nothing about, so the
// fixtures exercise both real values and the Unspecified sentinel that replaced
// the old nulls.
const capacityRow: ByMetricRow = {
  metricName: "Capacity",
  sector: "Power",
  sectorSegment: "Power Generation",
  geography: ["Global"],
  timeResolution: "5-year steps",
  dataFormat: "Tabular",
  granularity: ["Solar", "Wind"],
  scopeLimitations: "Utility-scale only",
};

const unspecifiedRow: ByMetricRow = {
  metricName: "Investment requirement",
  sector: "Power",
  sectorSegment: "No information",
  geography: ["Global"],
  timeResolution: "Unspecified",
  dataFormat: "Figure",
  granularity: ["Unspecified"],
  scopeLimitations: "Unspecified",
};

const availability = (rows: ByMetricRow[], overall: string | null = null) =>
  ({ overall, byMetric: rows }) satisfies DataAvailability;

describe("DataAvailabilityTable", () => {
  it("shows an empty state when no dataAvailability is present", () => {
    render(<DataAvailabilityTable dataAvailability={undefined} />);
    expect(
      screen.getByText(/no data availability information/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows an empty state (with the overall note) when byMetric is empty", () => {
    render(
      <DataAvailabilityTable
        dataAvailability={availability(
          [],
          "Hosted as a single timeseries file.",
        )}
      />,
    );
    expect(
      screen.getByText(/no data availability information/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Hosted as a single timeseries file."),
    ).toBeInTheDocument();
  });

  it("renders the column headers and one row per byMetric entry", () => {
    render(
      <DataAvailabilityTable
        dataAvailability={availability([capacityRow, unspecifiedRow])}
      />,
    );
    for (const header of [
      "Metric",
      "Sector segment",
      "Granularity",
      "Scope limitations",
      "Geography coverage",
      "Time resolution",
      "Data format",
    ]) {
      expect(
        screen.getByRole("columnheader", { name: header }),
      ).toBeInTheDocument();
    }
    // Two data rows, each keyed by its metric via a row header cell.
    expect(
      screen.getByRole("rowheader", { name: "Capacity" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: "Investment requirement" }),
    ).toBeInTheDocument();
  });

  it("joins granularity technologies and renders authored cell values", () => {
    render(
      <DataAvailabilityTable dataAvailability={availability([capacityRow])} />,
    );
    const row = screen
      .getByRole("rowheader", { name: "Capacity" })
      .closest("tr")!;
    const cells = within(row);
    expect(cells.getByText("Solar, Wind")).toBeInTheDocument();
    expect(cells.getByText("Utility-scale only")).toBeInTheDocument();
    expect(cells.getByText("5-year steps")).toBeInTheDocument();
    expect(cells.getByText("Tabular")).toBeInTheDocument();
  });

  it("never links the Data format cell — it describes the publication only", () => {
    // The hosted-download affordance lives in DownloadDataset on the detail
    // page. Decision 0021 took the 'In tool' value out of dataFormat precisely
    // so the two signals stop being conflated.
    render(
      <DataAvailabilityTable dataAvailability={availability([capacityRow])} />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders the sentinels as written, with no em-dash placeholders", () => {
    // Every cell has a value now: the cookbook replaced blank cells with
    // Unspecified / Not covered, so an em-dash would be a third, unauthored
    // way of saying the same thing.
    render(
      <DataAvailabilityTable
        dataAvailability={availability([unspecifiedRow])}
      />,
    );
    const row = screen
      .getByRole("rowheader", { name: "Investment requirement" })
      .closest("tr")!;
    const cells = within(row);
    // Granularity, time resolution and scope limitations are all Unspecified.
    expect(cells.getAllByText("Unspecified")).toHaveLength(3);
    expect(cells.queryByText("—")).not.toBeInTheDocument();
  });

  it("truncates a long geography list behind a tooltip", () => {
    render(
      <DataAvailabilityTable
        dataAvailability={availability([
          { ...capacityRow, geography: ["Global", "ID", "TH", "VN", "SG"] },
        ])}
      />,
    );
    // The first three, then an ellipsis — a per-country pathway would otherwise
    // set the column width for every other row.
    expect(screen.getByText("Global, ID, TH, …")).toBeInTheDocument();
  });

  it("shows a short geography list in full, with no ellipsis", () => {
    render(
      <DataAvailabilityTable
        dataAvailability={availability([
          { ...capacityRow, geography: ["Global", "TH"] },
        ])}
      />,
    );
    expect(screen.getByText("Global, TH")).toBeInTheDocument();
  });

  it("renders the overall note above the table", () => {
    render(
      <DataAvailabilityTable
        dataAvailability={availability(
          [capacityRow],
          "Covers the power sector only.",
        )}
      />,
    );
    expect(
      screen.getByText("Covers the power sector only."),
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
