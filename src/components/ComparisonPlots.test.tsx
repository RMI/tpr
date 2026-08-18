import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ComparisonPlots from "./ComparisonPlots";
import type { ComparisonPlotsEntry } from "./ComparisonPlots";
import MultiLineChart from "./MultiLineChart";

vi.mock("./MultiLineChart", () => ({
  default: vi.fn(() => <div data-testid="multi-line-chart" />),
}));
vi.mock("./NormalizedStackedAreaChart", () => ({
  default: () => <div data-testid="stacked-area-chart" />,
}));
vi.mock("../utils/geographyUtils", () => ({
  geographyLabel: (geo: string) => geo,
}));

const mockedMultiLineChart = vi.mocked(MultiLineChart);

function makeEntry(
  pathwayId: string,
  geos: string[],
  metrics: string[] = ["technologyMix"],
): ComparisonPlotsEntry {
  return {
    pathwayId,
    timeseriesdata: {
      data: geos.flatMap((geo) =>
        metrics.flatMap((metric) => [
          {
            sector: "power",
            metric,
            geography: geo,
            year: "2020",
            value: 100,
            unit: "GW",
            technology: "Solar",
          },
          {
            sector: "power",
            metric,
            geography: geo,
            year: "2030",
            value: 200,
            unit: "GW",
            technology: "Solar",
          },
        ]),
      ),
    },
  };
}

// Builds an entry with explicit values for a single metric, so tests can control
// the min/max that feed into the shared y-axis bounds computation.
function makeMetricEntry(
  pathwayId: string,
  metric: string,
  values: number[],
): ComparisonPlotsEntry {
  return {
    pathwayId,
    timeseriesdata: {
      data: values.map((value, i) => ({
        sector: "power",
        metric,
        geography: "Global",
        year: String(2020 + i * 10),
        value,
        unit: "MtCO2e",
        technology: metric,
      })),
    },
  };
}

describe("ComparisonPlots", () => {
  beforeEach(() => {
    mockedMultiLineChart.mockClear();
  });

  it("shows a 'no timeseries data' message when all entries have null data", () => {
    const entries: ComparisonPlotsEntry[] = [
      { pathwayId: "p1", timeseriesdata: null },
      { pathwayId: "p2", timeseriesdata: null },
    ];
    render(<ComparisonPlots entries={entries} />);
    expect(
      screen.getByText(/No timeseries data available/i),
    ).toBeInTheDocument();
  });

  it("hides the geography selector when all entries share one geography", () => {
    const entries = [makeEntry("p1", ["Global"]), makeEntry("p2", ["Global"])];
    render(<ComparisonPlots entries={entries} />);
    expect(screen.queryByText("Geography")).not.toBeInTheDocument();
  });

  it("shows the geography selector when entries cover multiple geographies", () => {
    const entries = [makeEntry("p1", ["Global"]), makeEntry("p2", ["EU"])];
    render(<ComparisonPlots entries={entries} />);
    expect(screen.getByText("Geography")).toBeInTheDocument();
  });

  it("populates geography selector with the union of geographies across all entries", () => {
    const entries = [makeEntry("p1", ["Global"]), makeEntry("p2", ["EU"])];
    render(<ComparisonPlots entries={entries} />);
    // Plot type is the first combobox; Geography is the second
    const geoSelect = screen.getAllByRole("combobox")[1];
    const options = Array.from(geoSelect.querySelectorAll("option")).map(
      (o) => o.textContent,
    );
    expect(options).toContain("Global");
    expect(options).toContain("EU");
  });

  it("shows the per-panel no-data message when a pathway lacks data for the selected geography", async () => {
    // p1 has both Global and EU; p2 only has Global
    const entries = [
      makeEntry("p1", ["Global", "EU"]),
      makeEntry("p2", ["Global"]),
    ];
    render(<ComparisonPlots entries={entries} />);

    // Switch to EU — p2 has no EU data
    const geoSelect = screen.getAllByRole("combobox")[1];
    await userEvent.setup().selectOptions(geoSelect, "EU");

    expect(
      screen.getByText(
        /currently no data available for the selected combination/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders absolute emissions and emissions intensity as line charts", async () => {
    const entries = [
      makeEntry("p1", ["Global"], ["absoluteEmissions", "emissionsIntensity"]),
      makeEntry("p2", ["Global"], ["absoluteEmissions", "emissionsIntensity"]),
    ];
    render(<ComparisonPlots entries={entries} />);
    const plotSelect = screen.getAllByRole("combobox")[0];
    const user = userEvent.setup();

    await user.selectOptions(plotSelect, "Absolute Emissions");
    expect(screen.getAllByTestId("multi-line-chart")).toHaveLength(2);
    expect(screen.queryByTestId("vertical-bar-chart")).not.toBeInTheDocument();

    await user.selectOptions(plotSelect, "Emissions Intensity");
    expect(screen.getAllByTestId("multi-line-chart")).toHaveLength(2);
    expect(screen.queryByTestId("vertical-bar-chart")).not.toBeInTheDocument();
  });

  it("forces emissions intensity y-axis minimum to 0, synced across pathways", async () => {
    const entries = [
      makeMetricEntry("p1", "emissionsIntensity", [0.6, 0.15]),
      makeMetricEntry("p2", "emissionsIntensity", [0.9, 0.3]),
    ];
    render(<ComparisonPlots entries={entries} />);
    const plotSelect = screen.getAllByRole("combobox")[0];
    await userEvent.setup().selectOptions(plotSelect, "Emissions Intensity");

    expect(mockedMultiLineChart.mock.calls.length).toBeGreaterThan(0);
    mockedMultiLineChart.mock.calls.forEach(([props]) => {
      expect(props.yMin).toBe(0);
      expect(props.yMax).toBe(0.9);
    });
  });

  it("syncs absolute emissions y-axis to the natural min across pathways (not forced to 0)", async () => {
    const entries = [
      makeMetricEntry("p1", "absoluteEmissions", [50, 150]),
      makeMetricEntry("p2", "absoluteEmissions", [-20, 300]),
    ];
    render(<ComparisonPlots entries={entries} />);
    const plotSelect = screen.getAllByRole("combobox")[0];
    await userEvent.setup().selectOptions(plotSelect, "Absolute Emissions");

    expect(mockedMultiLineChart.mock.calls.length).toBeGreaterThan(0);
    mockedMultiLineChart.mock.calls.forEach(([props]) => {
      expect(props.yMin).toBe(-20);
      expect(props.yMax).toBe(300);
    });
  });
});
