import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import DataAvailabilityTable from "./DataAvailabilityTable";
import { PathwayMetadataType } from "../types";

type DataAvailability = NonNullable<PathwayMetadataType["dataAvailability"]>;
type ByMetricRow = DataAvailability["byMetric"][number];

// A fully-authored "In tool" row and a paywalled publication row with nulls, so
// the fixtures exercise both the download path and the empty-cell fallbacks.
const inToolRow: ByMetricRow = {
  metricName: "Capacity",
  sector: "Power",
  sectorSegment: "Power Generation",
  geography: "Global",
  geographyCoverage: "Global",
  timeResolution: "5-year",
  dataFormat: "In tool",
  access: null,
  granularity: ["Solar", "Wind"],
  scopeLimitations: "Utility-scale only",
};

const publicationRow: ByMetricRow = {
  metricName: "Investment requirement",
  sector: "Power",
  sectorSegment: "No information",
  geography: "Global",
  geographyCoverage: "Regional",
  timeResolution: "No information",
  dataFormat: "Tabular in publication",
  access: "Paywalled",
  granularity: null,
  scopeLimitations: null,
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
        dataAvailability={availability([], "Hosted as a single timeseries file.")}
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
        dataAvailability={availability([inToolRow, publicationRow])}
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
    expect(screen.getByRole("rowheader", { name: "Capacity" })).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: "Investment requirement" }),
    ).toBeInTheDocument();
  });

  it("joins granularity technologies and renders authored cell values", () => {
    render(<DataAvailabilityTable dataAvailability={availability([inToolRow])} />);
    const row = screen.getByRole("rowheader", { name: "Capacity" }).closest("tr")!;
    const cells = within(row);
    expect(cells.getByText("Solar, Wind")).toBeInTheDocument();
    expect(cells.getByText("Utility-scale only")).toBeInTheDocument();
    expect(cells.getByText("5-year")).toBeInTheDocument();
  });

  it("links an In-tool row's Data format to the download when a href is given", () => {
    render(
      <DataAvailabilityTable
        dataAvailability={availability([inToolRow])}
        downloadHref="/data/ACE-ATS-2024.csv"
      />,
    );
    const link = screen.getByRole("link", { name: "Download" });
    expect(link).toHaveAttribute("href", "/data/ACE-ATS-2024.csv");
  });

  it("falls back to plain 'In tool' text when no download href is available", () => {
    render(<DataAvailabilityTable dataAvailability={availability([inToolRow])} />);
    expect(screen.queryByRole("link", { name: "Download" })).not.toBeInTheDocument();
    expect(screen.getByText("In tool")).toBeInTheDocument();
  });

  it("shows publication format with its access, and em-dashes for null cells", () => {
    render(
      <DataAvailabilityTable dataAvailability={availability([publicationRow])} />,
    );
    const row = screen
      .getByRole("rowheader", { name: "Investment requirement" })
      .closest("tr")!;
    const cells = within(row);
    expect(cells.getByText(/Tabular in publication/)).toBeInTheDocument();
    expect(cells.getByText(/Paywalled/)).toBeInTheDocument();
    // null granularity and null scopeLimitations both render as an em-dash.
    expect(cells.getAllByText("—")).toHaveLength(2);
  });

  it("renders the overall note above the table", () => {
    render(
      <DataAvailabilityTable
        dataAvailability={availability([inToolRow], "Covers the power sector only.")}
      />,
    );
    expect(
      screen.getByText("Covers the power sector only."),
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
