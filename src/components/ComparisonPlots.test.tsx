import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ComparisonPlots from "./ComparisonPlots";
import type { ComparisonPlotsEntry } from "./ComparisonPlots";

vi.mock("./MultiLineChart", () => ({
  default: () => <div data-testid="multi-line-chart" />,
}));
vi.mock("./VerticalBarChart", () => ({
  default: () => <div data-testid="vertical-bar-chart" />,
}));
vi.mock("./NormalizedStackedAreaChart", () => ({
  default: () => <div data-testid="stacked-area-chart" />,
}));
vi.mock("../utils/geographyUtils", () => ({
  geographyLabel: (geo: string) => geo,
}));

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

describe("ComparisonPlots", () => {
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
});
