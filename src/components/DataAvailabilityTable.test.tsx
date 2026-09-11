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
    expect(
      screen.getByRole("rowheader", { name: "Capacity" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: "Investment requirement" }),
    ).toBeInTheDocument();
  });

  it("joins granularity technologies and renders authored cell values", () => {
    render(
      <DataAvailabilityTable dataAvailability={availability([inToolRow])} />,
    );
    const row = screen
      .getByRole("rowheader", { name: "Capacity" })
      .closest("tr")!;
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
    render(
      <DataAvailabilityTable dataAvailability={availability([inToolRow])} />,
    );
    expect(
      screen.queryByRole("link", { name: "Download" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("In tool")).toBeInTheDocument();
  });

  it("shows publication format with its access, and em-dashes for null cells", () => {
    render(
      <DataAvailabilityTable
        dataAvailability={availability([publicationRow])}
      />,
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
        dataAvailability={availability(
          [inToolRow],
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

// A pathway spanning two sectors and three geography scopes, so a selection has
// something to exclude on either axis.
const seaRow: ByMetricRow = {
  ...inToolRow,
  metricName: "Generation",
  geography: "South East Asia",
  geographyCoverage: "Regional",
};

const sgRow: ByMetricRow = {
  ...inToolRow,
  metricName: "Emissions intensity",
  geography: "SG",
  geographyCoverage: "Country",
};

const steelRow: ByMetricRow = {
  ...publicationRow,
  metricName: "Absolute emissions",
  sector: "Steel",
};

const scopedRows = [inToolRow, seaRow, sgRow, steelRow];

const pathwayGeography = {
  global: true,
  regions: { "South East Asia": ["ID", "TH", "VN"] },
  country: ["SG"],
} as unknown as NonNullable<PathwayMetadataType["geography"]>;

const renderScoped = (
  scope: { sector: string | null; geography: string | null },
  rows: ByMetricRow[] = scopedRows,
) =>
  render(
    <DataAvailabilityTable
      dataAvailability={availability(rows)}
      scope={scope}
      pathwayGeography={pathwayGeography}
    />,
  );

const rowHeaders = () =>
  screen.getAllByRole("rowheader").map((th) => th.textContent);

describe("DataAvailabilityTable — scope filtering (#872)", () => {
  it("shows every row when no scope prop is passed", () => {
    render(
      <DataAvailabilityTable dataAvailability={availability(scopedRows)} />,
    );
    expect(rowHeaders()).toHaveLength(4);
  });

  it("shows every row when both axes are null", () => {
    renderScoped({ sector: null, geography: null });
    expect(rowHeaders()).toHaveLength(4);
  });

  it("filters by sector with plain equality", () => {
    // There is no cross-sector availability, so no widening applies here.
    renderScoped({ sector: "Steel", geography: null });
    expect(rowHeaders()).toEqual(["Absolute emissions"]);
  });

  it("keeps Global rows when a region is selected", () => {
    // A Global-scoped row answers any selection; the country row does not,
    // because SG is not one of the region's members in this fixture.
    renderScoped({ sector: null, geography: "South East Asia" });
    expect(rowHeaders()).toEqual([
      "Capacity",
      "Generation",
      "Absolute emissions",
    ]);
  });

  it("keeps Global rows when a country is selected", () => {
    renderScoped({ sector: null, geography: "SG" });
    expect(rowHeaders()).toEqual([
      "Capacity",
      "Emissions intensity",
      "Absolute emissions",
    ]);
  });

  it("shows only globally-scoped rows when Global is selected", () => {
    // Selecting Global narrows, matching the search matcher: it does not
    // quietly match every narrower scope.
    renderScoped({ sector: null, geography: "Global" });
    expect(rowHeaders()).toEqual(["Capacity", "Absolute emissions"]);
  });

  it("intersects the two axes", () => {
    renderScoped({ sector: "Power", geography: "South East Asia" });
    expect(rowHeaders()).toEqual(["Capacity", "Generation"]);
  });

  it("reports how much the selection is hiding", () => {
    renderScoped({ sector: "Steel", geography: null });
    expect(
      screen.getByText("Showing 1 of 4 rows for Steel."),
    ).toBeInTheDocument();
  });

  it("says nothing when the selection hides nothing", () => {
    renderScoped({ sector: null, geography: null });
    expect(screen.queryByText(/^Showing /)).not.toBeInTheDocument();
  });

  it("names the geography by label, not by code", () => {
    renderScoped({ sector: null, geography: "SG" });
    expect(
      screen.getByText("Showing 3 of 4 rows for Singapore."),
    ).toBeInTheDocument();
  });

  it("distinguishes filtered-empty from nothing-recorded", () => {
    renderScoped({ sector: "Cement", geography: null });

    expect(
      screen.getByText("No data availability is recorded for Cement."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The 4 recorded rows are at other scopes/),
    ).toBeInTheDocument();
    // The unfiltered copy would be a lie here: rows do exist.
    expect(
      screen.queryByText(/has been recorded for this pathway yet/),
    ).not.toBeInTheDocument();
  });

  it("keeps the unfiltered empty state when nothing is authored", () => {
    render(
      <DataAvailabilityTable
        dataAvailability={availability([])}
        scope={{ sector: "Steel", geography: null }}
        pathwayGeography={pathwayGeography}
      />,
    );

    expect(
      screen.getByText(/has been recorded for this pathway yet/),
    ).toBeInTheDocument();
  });

  it("uses the singular when exactly one row is hidden", () => {
    renderScoped({ sector: "Cement", geography: null }, [inToolRow]);
    expect(
      screen.getByText(/The one recorded row is at another scope/),
    ).toBeInTheDocument();
  });

  it("keeps the overall note in the filtered-empty state", () => {
    render(
      <DataAvailabilityTable
        dataAvailability={availability(scopedRows, "Hosted as one file.")}
        scope={{ sector: "Cement", geography: null }}
        pathwayGeography={pathwayGeography}
      />,
    );

    expect(screen.getByText("Hosted as one file.")).toBeInTheDocument();
  });
});
