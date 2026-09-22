import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ComparisonPlots from "./ComparisonPlots";
import type { ComparisonPlotsEntry } from "./ComparisonPlots";
import MultiLineChart from "./MultiLineChart";
import NormalizedStackedAreaChart from "./NormalizedStackedAreaChart";

vi.mock("./MultiLineChart", () => ({
  default: vi.fn(() => <div data-testid="multi-line-chart" />),
}));
vi.mock("./NormalizedStackedAreaChart", () => ({
  default: vi.fn(() => <div data-testid="stacked-area-chart" />),
}));
const mockedMultiLineChart = vi.mocked(MultiLineChart);
const mockedStackedAreaChart = vi.mocked(NormalizedStackedAreaChart);

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
  geography = "Global",
): ComparisonPlotsEntry {
  return {
    pathwayId,
    timeseriesdata: {
      data: values.map((value, i) => ({
        sector: "power",
        metric,
        geography,
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
    mockedStackedAreaChart.mockClear();
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

  it("offers no geography control of its own", () => {
    // The scope header above owns that axis; two geography controls on one page
    // would contradict each other, and this one listed the raw union of every
    // column's timeseries tokens.
    const entries = [makeEntry("p1", ["Global"]), makeEntry("p2", ["EU"])];
    render(<ComparisonPlots entries={entries} />);

    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    expect(screen.queryByText("Geography")).not.toBeInTheDocument();
  });

  it("resolves each column's own request", async () => {
    // Both columns ask for EU; p1 publishes it, p2 does not, so p2 falls back
    // and says so rather than rendering empty.
    const entries = [
      makeEntry("p1", ["Global", "EU"]),
      makeEntry("p2", ["Global"]),
    ];
    render(
      <ComparisonPlots
        entries={entries}
        requestedGeographies={{ p1: "EU", p2: "EU" }}
      />,
    );

    expect(
      await screen.findByText(/showing Global instead/i),
    ).toBeInTheDocument();
    // Both columns name what they actually show.
    expect(screen.getByText("EU")).toBeInTheDocument();
    expect(screen.getByText("Global")).toBeInTheDocument();
  });

  it("lets each column show a different geography", async () => {
    // The point of per-column selection: no shared token exists between many
    // real publishers, so the columns have to be able to differ.
    const entries = [
      makeEntry("p1", ["Global", "EU"]),
      makeEntry("p2", ["Global"]),
    ];
    render(
      <ComparisonPlots
        entries={entries}
        requestedGeographies={{ p1: "EU", p2: "Global" }}
      />,
    );

    // Both columns resolved exactly what they asked for, so neither falls back.
    expect(await screen.findByText("EU")).toBeInTheDocument();
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.queryByText(/showing .* instead/i)).toBeNull();
  });

  it("shows the per-panel no-data message when a column has nothing to resolve", () => {
    const entries = [
      makeEntry("p1", ["Global"]),
      { pathwayId: "p2", timeseriesdata: null },
    ];
    render(
      <ComparisonPlots
        entries={entries}
        requestedGeographies={{ p1: "Global", p2: "Global" }}
      />,
    );

    expect(
      screen.getByText(
        /currently no data available for the selected combination/i,
      ),
    ).toBeInTheDocument();
  });

  it("scales the shared y-axis to the rows each column actually shows", async () => {
    // p1 resolves EU; p2 falls back to Global. Filtering every column on the
    // requested token would compute the axis from rows no chart shows and drop
    // p2's range entirely.
    const entries = [
      makeMetricEntry("p1", "absoluteEmissions", [100, 200], "EU"),
      makeMetricEntry("p2", "absoluteEmissions", [10, 500], "Global"),
    ];
    render(
      <ComparisonPlots
        entries={entries}
        requestedGeographies={{ p1: "EU", p2: "Global" }}
      />,
    );
    await userEvent
      .setup()
      .selectOptions(screen.getAllByRole("combobox")[0], "Absolute Emissions");

    expect(mockedMultiLineChart.mock.calls.length).toBeGreaterThan(0);
    mockedMultiLineChart.mock.calls.forEach(([props]) => {
      expect(props.yMin).toBe(10);
      expect(props.yMax).toBe(500);
    });
  });

  describe("sector segment badge", () => {
    it("captions each column with the part of the sector the metric covers", async () => {
      // Matches the detail page's small multiples, which caption each panel
      // with its geography and its sector segment.
      const entries = [
        makeEntry("p1", ["Global"]),
        makeEntry("p2", ["Global"]),
      ];
      render(
        <ComparisonPlots
          entries={entries}
          requestedGeographies={{ p1: "Global", p2: "Global" }}
        />,
      );

      // One per column: the segment follows the shared plot type, but it
      // belongs in each column's caption next to that column's geography.
      expect(await screen.findAllByText("Power generation")).toHaveLength(2);
    });

    it("carries the segment's definition as a tooltip", async () => {
      const entries = [
        makeEntry("p1", ["Global"]),
        makeEntry("p2", ["Global"]),
      ];
      render(
        <ComparisonPlots
          entries={entries}
          requestedGeographies={{ p1: "Global", p2: "Global" }}
        />,
      );

      // Badge renders its tooltip through TextWithTooltip, whose trigger is the
      // outer tabIndex span — the text node itself carries no listeners.
      const trigger = (
        await screen.findAllByText("Power generation")
      )[0].closest("[tabindex]") as HTMLElement;
      fireEvent.focus(trigger);
      expect(await screen.findByRole("tooltip")).toHaveTextContent(
        /generation/i,
      );
    });

    it("omits the badge for a column with nothing to plot", () => {
      // No chart, no caption — the same rule the geography badge follows.
      const entries = [
        makeEntry("p1", ["Global"]),
        { pathwayId: "p2", timeseriesdata: null },
      ];
      render(
        <ComparisonPlots
          entries={entries}
          requestedGeographies={{ p1: "Global" }}
        />,
      );

      expect(screen.getAllByText("Power generation")).toHaveLength(1);
    });
  });

  it("explains itself rather than relabelling Power series for another sector", () => {
    const entries = [makeEntry("p1", ["Global"]), makeEntry("p2", ["Global"])];
    render(
      <ComparisonPlots
        entries={entries}
        requestedSector="Steel"
      />,
    );

    expect(
      screen.getByText(
        /cover the Power sector only.*nothing to show for Steel/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("stacked-area-chart")).not.toBeInTheDocument();
  });

  it("renders the plots for the Power sector", () => {
    const entries = [makeEntry("p1", ["Global"]), makeEntry("p2", ["Global"])];
    render(
      <ComparisonPlots
        entries={entries}
        requestedSector="Power"
      />,
    );

    expect(screen.getAllByTestId("stacked-area-chart")).toHaveLength(2);
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

  it("broadcasts a hovered point from one MultiLineChart panel to its siblings, and clears it on hover-out", async () => {
    const entries = [
      makeMetricEntry("p1", "absoluteEmissions", [50, 150]),
      makeMetricEntry("p2", "absoluteEmissions", [80, 200]),
    ];
    render(<ComparisonPlots entries={entries} />);
    const plotSelect = screen.getAllByRole("combobox")[0];
    await userEvent.setup().selectOptions(plotSelect, "Absolute Emissions");

    expect(mockedMultiLineChart.mock.calls.length).toBe(2);
    mockedMultiLineChart.mock.calls.forEach(([props]) => {
      expect(props.externalHoveredPoint).toBeNull();
    });

    // Simulate panel 1 reporting a hovered point, the way its own
    // pointermove handler would via the onHoverPoint callback it was given.
    const point = { year: "2020", technology: "absoluteEmissions" };
    const sourceProps = mockedMultiLineChart.mock.calls[0][0];
    act(() => {
      sourceProps.onHoverPoint?.(point);
    });

    const hoveredCalls = mockedMultiLineChart.mock.calls.slice(-2);
    expect(hoveredCalls).toHaveLength(2);
    hoveredCalls.forEach(([props]) => {
      expect(props.externalHoveredPoint).toEqual(point);
    });

    // Simulate the pointer leaving that panel.
    act(() => {
      sourceProps.onHoverPoint?.(null);
    });

    mockedMultiLineChart.mock.calls.slice(-2).forEach(([props]) => {
      expect(props.externalHoveredPoint).toBeNull();
    });
  });

  it("wires NormalizedStackedAreaChart panels into the same shared hover state", () => {
    const entries = [makeEntry("p1", ["Global"]), makeEntry("p2", ["Global"])];
    render(<ComparisonPlots entries={entries} />);

    // Default selected plot type is technologyMix, rendered as
    // NormalizedStackedAreaChart panels.
    expect(mockedStackedAreaChart.mock.calls.length).toBe(2);
    mockedStackedAreaChart.mock.calls.forEach(([props]) => {
      expect(props.externalHoveredPoint).toBeNull();
    });

    const point = { year: "2020", technology: null };
    const sourceProps = mockedStackedAreaChart.mock.calls[0][0];
    act(() => {
      sourceProps.onHoverPoint?.(point);
    });

    mockedStackedAreaChart.mock.calls.slice(-2).forEach(([props]) => {
      expect(props.externalHoveredPoint).toEqual(point);
    });
  });

  it("clears the hovered point when the plot type changes, instead of carrying it over to the newly-mounted panels", async () => {
    const entries = [
      makeEntry("p1", ["Global"], ["absoluteEmissions", "emissionsIntensity"]),
      makeEntry("p2", ["Global"], ["absoluteEmissions", "emissionsIntensity"]),
    ];
    render(<ComparisonPlots entries={entries} />);
    const plotSelect = screen.getAllByRole("combobox")[0];
    const user = userEvent.setup();

    await user.selectOptions(plotSelect, "Absolute Emissions");
    expect(mockedMultiLineChart.mock.calls.length).toBe(2);

    const point = { year: "2020", technology: "absoluteEmissions" };
    const sourceProps = mockedMultiLineChart.mock.calls[0][0];
    act(() => {
      sourceProps.onHoverPoint?.(point);
    });
    mockedMultiLineChart.mock.calls.slice(-2).forEach(([props]) => {
      expect(props.externalHoveredPoint).toEqual(point);
    });

    await user.selectOptions(plotSelect, "Emissions Intensity");
    mockedMultiLineChart.mock.calls.slice(-2).forEach(([props]) => {
      expect(props.externalHoveredPoint).toBeNull();
    });
  });
});
