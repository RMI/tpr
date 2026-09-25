import { describe, it, expect, vi } from "vitest";
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
    // set the column width for every other row. Codes render as country names,
    // the same treatment a geography badge gives a token.
    expect(
      screen.getByText("Global, Indonesia, Thailand, …"),
    ).toBeInTheDocument();
  });

  it("shows a short geography list in full, with no ellipsis", () => {
    render(
      <DataAvailabilityTable
        dataAvailability={availability([
          { ...capacityRow, geography: ["Global", "TH"] },
        ])}
      />,
    );
    expect(screen.getByText("Global, Thailand")).toBeInTheDocument();
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

// A pathway spanning two sectors and three geography scopes, so a selection has
// something to exclude on either axis.
const seaRow: ByMetricRow = {
  ...capacityRow,
  metricName: "Generation",
  geography: ["South East Asia"],
};

const sgRow: ByMetricRow = {
  ...capacityRow,
  metricName: "Emissions Intensity",
  geography: ["SG"],
};

const steelRow: ByMetricRow = {
  ...unspecifiedRow,
  metricName: "Absolute Emissions",
  sector: "Steel",
};

const scopedRows = [capacityRow, seaRow, sgRow, steelRow];

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
    expect(rowHeaders()).toEqual(["Absolute Emissions"]);
  });

  it("keeps Global rows when a region is selected", () => {
    // A Global-scoped row answers any selection; the country row does not,
    // because SG is not one of the region's members in this fixture.
    renderScoped({ sector: null, geography: "South East Asia" });
    expect(rowHeaders()).toEqual([
      "Capacity",
      "Generation",
      "Absolute Emissions",
    ]);
  });

  it("keeps Global rows when a country is selected", () => {
    renderScoped({ sector: null, geography: "SG" });
    expect(rowHeaders()).toEqual([
      "Capacity",
      "Emissions Intensity",
      "Absolute Emissions",
    ]);
  });

  it("shows only globally-scoped rows when Global is selected", () => {
    // Selecting Global narrows, matching the search matcher: it does not
    // quietly match every narrower scope.
    renderScoped({ sector: null, geography: "Global" });
    expect(rowHeaders()).toEqual(["Capacity", "Absolute Emissions"]);
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
    renderScoped({ sector: "Cement", geography: null }, [capacityRow]);
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

describe("DataAvailabilityTable — conditional scope columns", () => {
  const headers = () =>
    screen.getAllByRole("columnheader").map((th) => th.textContent);

  it("hides the Sector column when the visible rows agree", () => {
    // The pre-existing fixtures are all Power, which is why the older tests'
    // column expectations are unaffected by this change.
    render(
      <DataAvailabilityTable
        dataAvailability={availability([capacityRow, unspecifiedRow])}
      />,
    );

    expect(headers()).not.toContain("Sector");
  });

  it("shows it when the visible rows disagree", () => {
    render(
      <DataAvailabilityTable dataAvailability={availability(scopedRows)} />,
    );

    expect(headers()).toEqual([
      "Metric",
      "Sector",
      "Sector segment",
      "Granularity",
      "Scope limitations",
      "Geography coverage",
      "Time resolution",
      "Data format",
    ]);
  });

  it("renders the geography coverage by label", () => {
    render(
      <DataAvailabilityTable dataAvailability={availability(scopedRows)} />,
    );
    expect(screen.getByText("Singapore")).toBeInTheDocument();
  });

  it("collapses a column the selection has made constant", () => {
    // Filtering to one sector makes the Sector column repeat the ribbon's own
    // selection on every row, so it goes away. Geography does not: a row lists
    // several geographies and matches on overlap, so its cell says more than
    // the selection does.
    renderScoped({ sector: "Power", geography: null });

    expect(headers()).not.toContain("Sector");
    expect(headers()).toContain("Geography coverage");
  });

  it("keeps the Geography coverage column for a lone row", () => {
    // It is unconditional precisely so a one-row table still says where its
    // data applies.
    render(
      <DataAvailabilityTable dataAvailability={availability([capacityRow])} />,
    );
    expect(headers()).toContain("Geography coverage");
  });

  it("keys rows by the full scope tuple, including sector", () => {
    // Two rows differing only in sector: with sector missing from the key these
    // collided, and React silently rendered one of them twice.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <DataAvailabilityTable
        dataAvailability={availability([
          capacityRow,
          { ...capacityRow, sector: "Steel" },
        ])}
      />,
    );

    expect(errorSpy.mock.calls.flat().join(" ")).not.toMatch(
      /same key|duplicate key/i,
    );
    expect(screen.getAllByRole("rowheader")).toHaveLength(2);
    errorSpy.mockRestore();
  });
});
