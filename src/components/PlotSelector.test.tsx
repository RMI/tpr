import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlotSelector } from "./PlotSelector";
import type { TimeSeries } from "./PlotSelector";
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

function makeTimeseries(metric: string): TimeSeries {
  return {
    data: [
      {
        sector: "power",
        metric,
        geography: "Global",
        year: "2020",
        value: 100,
        unit: "MtCO2e",
        technology: metric,
      },
      {
        sector: "power",
        metric,
        geography: "Global",
        year: "2030",
        value: 200,
        unit: "MtCO2e",
        technology: metric,
      },
    ],
  };
}

describe("PlotSelector", () => {
  beforeEach(() => {
    mockedMultiLineChart.mockClear();
  });

  it("forces the emissions intensity line chart's y-axis minimum to 0", async () => {
    render(
      <PlotSelector timeseriesdata={makeTimeseries("emissionsIntensity")} />,
    );

    const plotSelect = screen.getByLabelText("Select Plot");
    await userEvent.setup().selectOptions(plotSelect, "Emissions Intensity");

    expect(mockedMultiLineChart).toHaveBeenCalled();
    const props = mockedMultiLineChart.mock.calls.at(-1)?.[0];
    expect(props?.yMin).toBe(0);
  });

  it("leaves the absolute emissions line chart's y-axis minimum unset (natural extent)", async () => {
    render(
      <PlotSelector timeseriesdata={makeTimeseries("absoluteEmissions")} />,
    );

    const plotSelect = screen.getByLabelText("Select Plot");
    await userEvent.setup().selectOptions(plotSelect, "Absolute Emissions");

    expect(mockedMultiLineChart).toHaveBeenCalled();
    const props = mockedMultiLineChart.mock.calls.at(-1)?.[0];
    expect(props?.yMin).toBeUndefined();
  });
});
