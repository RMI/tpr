import { describe, it, expect, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import PlotGrid from "./PlotGrid";
import MultiLineChart from "./MultiLineChart";
import type { Geography } from "../types";

vi.mock("./MultiLineChart", () => ({
  default: vi.fn(() => <div data-testid="multi-line-chart" />),
}));
vi.mock("./NormalizedStackedAreaChart", () => ({
  default: vi.fn(() => <div data-testid="stacked-area-chart" />),
}));
const mockedMultiLineChart = vi.mocked(MultiLineChart);

/** Every chart's scope tab, half by half. */
const tabHalves = () =>
  screen.getAllByRole("list", { name: "Scope shown" }).map((tab) =>
    within(tab)
      .getAllByRole("listitem")
      .map((half) => half.textContent),
  );

/** Open the tooltip on the first tab half showing `text`, and read it. */
async function halfTooltip(text: string): Promise<string | null> {
  const trigger = screen
    .getAllByText(text, { selector: "[data-scope-label]" })[0]
    .closest("[tabindex]") as HTMLElement;
  await waitFor(() => {
    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });
  const content = screen.getByRole("tooltip").textContent;
  fireEvent.blur(trigger);
  return content;
}

const SEA: Geography = {
  global: false,
  regions: { "South East Asia": ["VN", "TH", "ID"] },
  country: {},
};

/** Two years of one metric at one geography — the minimum that plots. */
function rows(
  metric: string,
  geography: string,
  sectorSegment: string[] = ["Power generation"],
) {
  return ["2020", "2030"].map((year, i) => ({
    sector: "power",
    sectorSegment,
    metric,
    geography,
    year,
    value: 100 * (i + 1),
    unit: "MtCO2e",
    technology: metric,
  }));
}

function timeseries(
  ...groups: { metric: string; geography: string; segments?: string[] }[]
) {
  return {
    data: groups.flatMap((g) => rows(g.metric, g.geography, g.segments)),
  };
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

  describe("years after 2050", () => {
    const row = (metric: string, year: number) => ({
      ...rows(metric, "Global")[0],
      year: String(year),
    });

    it("hands the charts no year after 2050", () => {
      mockedMultiLineChart.mockClear();
      render(
        <PlotGrid
          timeseriesdata={{
            data: [2030, 2050, 2070, 2100].map((y) => row("capacity", y)),
          }}
          pathwayGeography={SEA}
        />,
      );

      expect(mockedMultiLineChart).toHaveBeenCalled();
      mockedMultiLineChart.mock.calls.forEach(([props]) => {
        expect(props.data.data.map((d) => d.year)).toEqual(["2030", "2050"]);
      });
    });

    it("keeps the slot of a panel left with a single year once later years are cut", () => {
      render(
        <PlotGrid
          timeseriesdata={{
            data: [
              ...[2050, 2060, 2070].map((y) => row("capacity", y)),
              ...[2030, 2040].map((y) => row("generation", y)),
            ],
          }}
          pathwayGeography={SEA}
        />,
      );

      // One year draws no line, so Capacity says so in its slot (#1028).
      expect(screen.getByText("Capacity").closest("figure")).toHaveTextContent(
        "This pathway has no data for this metric.",
      );
      expect(screen.getAllByTestId("multi-line-chart")).toHaveLength(1);
    });
  });

  it("renders the panels in the sector's set order (#1028)", () => {
    const { container } = render(
      <PlotGrid
        timeseriesdata={timeseries(
          { metric: "technologyMix", geography: "Global" },
          { metric: "capacity", geography: "Global" },
          { metric: "generation", geography: "Global" },
          { metric: "absoluteEmissions", geography: "Global" },
          { metric: "emissionsIntensity", geography: "Global" },
        )}
        pathwayGeography={SEA}
      />,
    );

    // Two to a row: emissions beside intensity, capacity beside generation.
    expect(
      [...container.querySelectorAll("figcaption")].map((c) => c.textContent),
    ).toEqual([
      "Absolute Emissions",
      "Emissions Intensity",
      "Capacity",
      "Generation",
      "Technology Mix",
    ]);
  });

  it("keeps the slot of a plot type with no data at any geography, with a note (#1028)", () => {
    const { container } = render(
      <PlotGrid
        timeseriesdata={timeseries({ metric: "capacity", geography: "Global" })}
        pathwayGeography={SEA}
      />,
    );

    // JETP-CIPP-2023 shaped: the absent metrics keep their place, so the
    // plots that do render stay where the order puts them.
    const figures = [...container.querySelectorAll("figure")];
    expect(
      figures.map((f) => f.querySelector("figcaption")?.textContent),
    ).toEqual([
      "Absolute Emissions",
      "Emissions Intensity",
      "Capacity",
      "Generation",
      "Technology Mix",
    ]);
    expect(
      screen.getAllByText("This pathway has no data for this metric."),
    ).toHaveLength(4);
    expect(figures[2]).not.toHaveTextContent("no data for this metric");
    expect(screen.getAllByTestId("multi-line-chart")).toHaveLength(1);
  });

  it("says a metric has no data when its years are split across geographies", () => {
    // Generation has 2020 at Global and 2030 at VN: no geography can plot it.
    const generation = rows("generation", "Global");
    render(
      <PlotGrid
        timeseriesdata={{
          data: [
            ...rows("capacity", "Global"),
            generation[0],
            { ...generation[1], geography: "VN" },
          ],
        }}
        pathwayGeography={SEA}
      />,
    );

    expect(screen.getByText("Generation").closest("figure")).toHaveTextContent(
      "This pathway has no data for this metric.",
    );
  });

  it("replaces the grid with one note when none of the requested plots has data", () => {
    render(
      <PlotGrid
        timeseriesdata={timeseries({ metric: "capacity", geography: "Global" })}
        pathwayGeography={SEA}
        plotTypes={["absoluteEmissions", "emissionsIntensity"]}
      />,
    );

    expect(
      screen.getByText("No benchmark data can be displayed for this pathway."),
    ).toBeInTheDocument();
    expect(document.querySelector("figure")).toBeNull();
  });

  it("honours the plotTypes subset, in the set order", () => {
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

    expect(
      [...document.querySelectorAll("figcaption")].map((c) => c.textContent),
    ).toEqual(["Capacity", "Technology Mix"]);
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

  it("shows every segment the panel's rows cover, in the sector's order", () => {
    // Segments come from the data (#915), so one series can span several.
    render(
      <PlotGrid
        timeseriesdata={timeseries({
          metric: "capacity",
          geography: "South East Asia",
          segments: ["Energy storage", "Power generation"],
        })}
        pathwayGeography={SEA}
      />,
    );

    const segments = screen
      .getAllByText(/^(Power generation|Energy storage)$/)
      .map((el) => el.textContent);
    // Power defines generation before storage, whatever order the row lists.
    expect(segments).toEqual(["Power generation", "Energy storage"]);
  });

  it("omits the segment badge when the resolved series has one year", () => {
    // The metric plots elsewhere (two years at Global), so its panel stays,
    // but PlotPanel draws nothing for a single year at the requested region —
    // and a segment badge under that empty state would describe nothing.
    const data = timeseries({ metric: "capacity", geography: "Global" });
    data.data.push({ ...rows("capacity", "South East Asia")[0] });
    render(
      <PlotGrid
        timeseriesdata={data}
        pathwayGeography={SEA}
        requestedGeography="South East Asia"
      />,
    );

    expect(screen.getByText("South East Asia")).toBeInTheDocument();
    expect(screen.queryByText("Power generation")).not.toBeInTheDocument();
  });

  it("keeps the segment badge, and moves the geography into the scope tab", async () => {
    render(
      <PlotGrid
        timeseriesdata={timeseries({
          metric: "capacity",
          geography: "South East Asia",
        })}
        pathwayGeography={SEA}
      />,
    );

    const segment = screen.getByText("Power generation");
    expect(segment).toHaveClass("bg-rmipink-100");
    expect(segment).toHaveClass("rounded-full");

    // The geography badge is gone: the tab names it, with the region's
    // members in its tooltip, as the badge's tooltip listed them.
    expect(document.querySelector(".bg-pinishgreen-200")).toBeNull();
    expect(tabHalves()).toEqual([["Power", "South East Asia"]]);
    const tooltip = await halfTooltip("South East Asia");
    expect(tooltip).toContain("3 countries");
  });

  it("makes the sector segment badge hoverable", () => {
    render(
      <PlotGrid
        timeseriesdata={timeseries({
          metric: "capacity",
          geography: "South East Asia",
        })}
        pathwayGeography={SEA}
      />,
    );

    // The tooltip copy is still a placeholder, but the trigger has to be wired
    // now so filling the record in is a one-file change.
    expect(
      screen.getByText("Power generation").closest("[tabindex]"),
    ).not.toBeNull();
  });

  it("explains the fallback when the requested geography is unavailable", async () => {
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

    // In the geography half's tooltip, which turns yellow.
    expect(screen.queryByText(/No timeseries data for/)).toBeNull();
    expect(
      screen.getByText("South East Asia", { selector: "[data-scope-label]" }),
    ).toHaveClass("bg-solar-100");
    expect(await halfTooltip("South East Asia")).toContain(
      "No timeseries data for Malaysia; showing South East Asia instead.",
    );
  });

  it("says nothing fell back when the requested geography is present", () => {
    render(
      <PlotGrid
        timeseriesdata={timeseries({ metric: "capacity", geography: "VN" })}
        pathwayGeography={SEA}
        requestedGeography="VN"
      />,
    );

    expect(screen.queryByText(/No timeseries data for/)).toBeNull();
    expect(
      screen.getByText("Vietnam", { selector: "[data-scope-label]" }),
    ).toHaveClass("bg-neutral-100");
  });

  it("renders each plot in its own scope container", () => {
    render(
      <PlotGrid
        timeseriesdata={timeseries(
          { metric: "capacity", geography: "Global" },
          { metric: "generation", geography: "Global" },
        )}
        pathwayGeography={SEA}
      />,
    );

    const cards = screen
      .getAllByText(/^(Capacity|Generation)$/)
      .map((caption) => caption.closest("figure") as HTMLElement);

    expect(cards).toHaveLength(2);
    cards.forEach((card) => {
      const container = card.firstElementChild as HTMLElement;
      expect(container).toHaveClass("bg-white", "rounded-lg", "border");
      // The tab sits in the container, after the chart.
      expect(container.lastElementChild).toHaveAttribute("role", "list");
    });
  });

  it("wraps the grid in a titled panel only when given a title", () => {
    const data = timeseries({ metric: "capacity", geography: "Global" });

    const { unmount } = render(
      <PlotGrid
        timeseriesdata={data}
        pathwayGeography={SEA}
        title="Benchmark Plots"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Benchmark Plots" }),
    ).toBeInTheDocument();
    unmount();

    render(
      <PlotGrid
        timeseriesdata={data}
        pathwayGeography={SEA}
      />,
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("shows a description directly under the heading, with or without data (#1029)", () => {
    const data = timeseries({ metric: "capacity", geography: "Global" });

    for (const timeseriesdata of [data, null]) {
      const { unmount } = render(
        <PlotGrid
          timeseriesdata={timeseriesdata}
          pathwayGeography={SEA}
          title="Benchmark Plots"
          description="What these plots are for."
        />,
      );
      expect(
        screen.getByRole("heading", { name: "Benchmark Plots" })
          .nextElementSibling,
      ).toHaveTextContent("What these plots are for.");
      unmount();
    }
  });

  it("keeps the titled panel when there is nothing to plot", () => {
    render(
      <PlotGrid
        timeseriesdata={null}
        pathwayGeography={SEA}
        title="Benchmark Plots"
      />,
    );

    // The heading should not vanish just because the data did.
    expect(
      screen.getByRole("heading", { name: "Benchmark Plots" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No benchmark data can be displayed for this pathway."),
    ).toBeInTheDocument();
  });

  it("reports no data when the pathway has no timeseries at all", () => {
    render(
      <PlotGrid
        timeseriesdata={null}
        pathwayGeography={SEA}
      />,
    );

    expect(
      screen.getByText("No benchmark data can be displayed for this pathway."),
    ).toBeInTheDocument();
  });
});

describe("PlotGrid — scope selection (#872)", () => {
  const twoPanels = () =>
    timeseries(
      { metric: "capacity", geography: "South East Asia" },
      { metric: "generation", geography: "South East Asia" },
    );

  it("moves the fallback sentence from above the grid into each chart's tab", () => {
    render(
      <PlotGrid
        timeseriesdata={twoPanels()}
        pathwayGeography={SEA}
        requestedGeography="MY"
      />,
    );

    // No sentence above the grid any more: each chart's tab says it, in
    // its geography half's tooltip.
    expect(screen.getAllByText("Capacity")).toHaveLength(1);
    expect(screen.queryByText(/No timeseries data for/)).toBeNull();
    expect(tabHalves()).toEqual([
      ["Power", "South East Asia"],
      ["Power", "South East Asia"],
    ]);
  });

  it("says nothing when the requested geography resolves exactly", () => {
    render(
      <PlotGrid
        timeseriesdata={twoPanels()}
        pathwayGeography={SEA}
        requestedGeography="South East Asia"
      />,
    );

    expect(screen.queryByText(/No timeseries data for/)).toBeNull();
  });

  it("renders normally when the selected sector is the one it covers", () => {
    render(
      <PlotGrid
        timeseriesdata={twoPanels()}
        pathwayGeography={SEA}
        requestedSector="Power"
      />,
    );

    expect(screen.getByText("Capacity")).toBeInTheDocument();
  });

  it("explains itself rather than showing Power data under another sector", () => {
    render(
      <PlotGrid
        timeseriesdata={twoPanels()}
        pathwayGeography={SEA}
        requestedSector="Steel"
        title="Benchmark Plots"
      />,
    );

    expect(
      screen.getByText(
        /The benchmark plots cover the Power sector only, so there is nothing to show for Steel/,
      ),
    ).toBeInTheDocument();
    // No charts, but the section keeps its heading.
    expect(screen.queryByText("Capacity")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Benchmark Plots" }),
    ).toBeInTheDocument();
  });

  it("prefers the no-data message over the sector mismatch", () => {
    // "This pathway has no timeseries at all" is the more fundamental fact.
    render(
      <PlotGrid
        timeseriesdata={null}
        pathwayGeography={SEA}
        requestedSector="Steel"
      />,
    );

    expect(
      screen.getByText("No benchmark data can be displayed for this pathway."),
    ).toBeInTheDocument();
  });
});
