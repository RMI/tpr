import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PlotGrid from "./PlotGrid";
import type { TimeSeries } from "./PlotSelector";
import type { Geography } from "../types";

vi.mock("./MultiLineChart", () => ({
  default: () => <div data-testid="multi-line-chart" />,
}));
vi.mock("./NormalizedStackedAreaChart", () => ({
  default: () => <div data-testid="stacked-area-chart" />,
}));

const SEA: Geography = {
  global: false,
  regions: { "South East Asia": ["VN", "TH", "ID"] },
  country: [],
};

/** Two years of one metric at one geography — the minimum that plots. */
function rows(metric: string, geography: string) {
  return ["2020", "2030"].map((year, i) => ({
    sector: "power",
    metric,
    geography,
    year,
    value: 100 * (i + 1),
    unit: "MtCO2e",
    technology: metric,
  }));
}

function timeseries(...groups: { metric: string; geography: string }[]) {
  return {
    data: groups.flatMap((g) => rows(g.metric, g.geography)),
  } as TimeSeries;
}

describe("PlotGrid", () => {
  it("renders one panel per plot type that has data", () => {
    render(
      <PlotGrid
        timeseriesdata={timeseries(
          { metric: "capacity", geography: "Global" },
          { metric: "generation", geography: "Global" },
        )}
        pathwayGeography={SEA}
      />,
    );

    expect(screen.getByText("Capacity")).toBeInTheDocument();
    expect(screen.getByText("Generation")).toBeInTheDocument();
    expect(screen.getAllByTestId("multi-line-chart")).toHaveLength(2);
  });

  it("skips a plot type that has no data at any geography", () => {
    render(
      <PlotGrid
        timeseriesdata={timeseries({ metric: "capacity", geography: "Global" })}
        pathwayGeography={SEA}
      />,
    );

    expect(screen.getByText("Capacity")).toBeInTheDocument();
    // JETP-CIPP-2023 shaped: absent metrics get no panel at all.
    expect(screen.queryByText("Generation")).not.toBeInTheDocument();
    expect(screen.queryByText("Technology Mix")).not.toBeInTheDocument();
  });

  it("honours the plotTypes subset and its order", () => {
    render(
      <PlotGrid
        timeseriesdata={timeseries(
          { metric: "technologyMix", geography: "Global" },
          { metric: "capacity", geography: "Global" },
          { metric: "generation", geography: "Global" },
        )}
        pathwayGeography={SEA}
        plotTypes={["technologyMix", "capacity"]}
      />,
    );

    expect(screen.getByText("Technology Mix")).toBeInTheDocument();
    expect(screen.getByText("Capacity")).toBeInTheDocument();
    expect(screen.queryByText("Generation")).not.toBeInTheDocument();
  });

  it("keeps the panel and shows the empty state when the metric misses the resolved geography", () => {
    // capacity exists only at VN, generation only at the region. The broadest
    // geography wins, so the capacity panel renders but has nothing to draw.
    render(
      <PlotGrid
        timeseriesdata={timeseries(
          { metric: "capacity", geography: "VN" },
          { metric: "generation", geography: "South East Asia" },
        )}
        pathwayGeography={SEA}
      />,
    );

    expect(screen.getByText("Capacity")).toBeInTheDocument();
    expect(
      screen.getByText(/no data available for the selected combination/i),
    ).toBeInTheDocument();
  });

  it("labels each panel with the resolved geography and the sector segment", () => {
    render(
      <PlotGrid
        timeseriesdata={timeseries({
          metric: "capacity",
          geography: "South East Asia",
        })}
        pathwayGeography={SEA}
      />,
    );

    expect(screen.getByText("South East Asia")).toBeInTheDocument();
    expect(screen.getByText("Power generation")).toBeInTheDocument();
  });

  it("explains the fallback when the requested geography is unavailable", () => {
    render(
      <PlotGrid
        timeseriesdata={timeseries({
          metric: "capacity",
          geography: "South East Asia",
        })}
        pathwayGeography={SEA}
        requestedGeography="MY"
      />,
    );

    expect(
      screen.getByText(
        /Malaysia is not available for this pathway; showing South East Asia\./,
      ),
    ).toBeInTheDocument();
  });

  it("says nothing fell back when the requested geography is present", () => {
    render(
      <PlotGrid
        timeseriesdata={timeseries({ metric: "capacity", geography: "VN" })}
        pathwayGeography={SEA}
        requestedGeography="VN"
      />,
    );

    expect(screen.queryByText(/is not available for this pathway/)).toBeNull();
    expect(screen.getByText("Vietnam")).toBeInTheDocument();
  });

  it("reports no data when the pathway has no timeseries at all", () => {
    render(
      <PlotGrid
        timeseriesdata={null}
        pathwayGeography={SEA}
      />,
    );

    expect(
      screen.getByText("No timeseries data available for this pathway."),
    ).toBeInTheDocument();
  });
});
