import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ComparisonScopeHeader from "./ComparisonScopeHeader";
import { MockIntersectionObserver } from "../test/mockIntersectionObserver";
import {
  columnGeographyOptions,
  columnsGeographyDivergence,
  sharedSectors,
  type ColumnGeographyOption,
} from "../utils/comparisonScope";
import type { PathwayMetadataType } from "../types";

/*
  The two real shapes this header has to reconcile: IEA, which declares Global
  plus named regions with its own "Southeast Asia" spelling, and ACE, which
  declares one region spelled with a space and omitting TL.
*/
const iea = {
  id: "IEA-APS-2024",
  name: { full: "Announced Pledges Scenario", short: "APS" },
  publication: { publisher: { short: "IEA", full: "IEA Long" } },
  sectors: [{ name: "Power" }, { name: "Steel" }, { name: "Buildings" }],
  geography: {
    global: true,
    regions: { "Southeast Asia": ["ID", "TH", "VN", "TL"] },
    country: ["US"],
  },
} as unknown as PathwayMetadataType;

const ace = {
  id: "ACE-ATS-2024",
  name: { full: "ASEAN Target Scenario", short: "ATS" },
  publication: { publisher: { short: "ACE", full: "ACE Long" } },
  sectors: [{ name: "Power" }, { name: "Buildings" }],
  geography: {
    regions: { "South East Asia": ["ID", "TH", "VN"] },
    country: [],
  },
} as unknown as PathwayMetadataType;

/** Availability stub: these tokens are plottable, nothing else is. */
const holding = (...tokens: string[]) => ({
  hasSector: () => true,
  hasMetric: () => true,
  hasGeography: (raw: string) => tokens.includes(raw),
});

const optionsFor = (
  pathways: PathwayMetadataType[],
  available: string[] = [],
): Record<string, ColumnGeographyOption[]> =>
  Object.fromEntries(
    pathways.map((p) => [
      p.id,
      columnGeographyOptions(p, holding(...available)),
    ]),
  );

interface Options {
  pathways?: PathwayMetadataType[];
  selectedSector?: string | null;
  selectedGeographies?: Record<string, string | null>;
  available?: string[];
}

const renderHeader = ({
  pathways = [iea, ace],
  selectedSector = "Power",
  selectedGeographies = {
    [iea.id]: "Southeast Asia",
    [ace.id]: "South East Asia",
  },
  available = [],
}: Options = {}) => {
  const onSectorChange = vi.fn();
  const onGeographyChange = vi.fn();

  render(
    <ComparisonScopeHeader
      pathways={pathways}
      sectorOptions={sharedSectors(pathways)}
      selectedSector={selectedSector}
      onSectorChange={onSectorChange}
      geographyOptions={optionsFor(pathways, available)}
      selectedGeographies={selectedGeographies}
      onGeographyChange={onGeographyChange}
      divergence={columnsGeographyDivergence(selectedGeographies, pathways)}
    />,
  );

  return { onSectorChange, onGeographyChange, user: userEvent.setup() };
};

/** Drive the sentinel past the top of the viewport. */
const scrollPast = () =>
  act(() => {
    const observer = MockIntersectionObserver.instances.at(-1);
    const sentinel = document.querySelector("[aria-hidden='true']");
    observer?.trigger(sentinel as Element, false, { top: -10 });
  });

const columnTrigger = (name: string) =>
  screen.getByRole("button", { name: `Geography for ${name}` });

describe("ComparisonScopeHeader", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances.length = 0;
  });

  describe("sector axis", () => {
    it("offers only the sectors every compared pathway declares", () => {
      renderHeader();

      expect(screen.getByRole("button", { name: "Power" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Buildings" }),
      ).toBeInTheDocument();
      // IEA declares Steel; ACE does not, so it is not a shared axis value.
      expect(screen.queryByRole("button", { name: "Steel" })).toBeNull();
    });

    it("marks the selected sector pressed", () => {
      renderHeader();

      const pressed = screen
        .getAllByRole("button")
        .filter((b) => b.getAttribute("aria-pressed") === "true");
      expect(pressed.map((b) => b.textContent)).toEqual(["Power"]);
    });

    it("reports a new sector", async () => {
      const { onSectorChange, user } = renderHeader();
      await user.click(screen.getByRole("button", { name: "Buildings" }));

      expect(onSectorChange).toHaveBeenCalledWith("Buildings");
    });

    it("ignores a click on the already-selected sector", async () => {
      // The axis always carries a value, so deselection is not reachable.
      const { onSectorChange, user } = renderHeader();
      await user.click(screen.getByRole("button", { name: "Power" }));

      expect(onSectorChange).not.toHaveBeenCalled();
    });

    it("stays one shared row rather than one per column", () => {
      // Sector is a closed vocabulary with a shared intersection, unlike
      // geography — the asymmetry in this header is deliberate.
      renderHeader();
      expect(screen.getAllByRole("button", { name: "Power" })).toHaveLength(1);
    });
  });

  describe("geography, per column", () => {
    it("gives every column its own control, named for its pathway", () => {
      renderHeader();

      expect(columnTrigger("APS")).toBeInTheDocument();
      expect(columnTrigger("ATS")).toBeInTheDocument();
    });

    it("shows each column's own current geography", () => {
      renderHeader();

      expect(columnTrigger("APS")).toHaveTextContent("Southeast Asia");
      expect(columnTrigger("ATS")).toHaveTextContent("South East Asia");
    });

    it("offers only the geographies that column's publisher declares", async () => {
      const { user } = renderHeader();
      await user.click(columnTrigger("ATS"));

      const names = screen
        .getAllByRole("option")
        .map((o) => o.textContent?.trim());
      expect(names).toEqual(["South East Asia"]);
      // IEA's spelling belongs to IEA's column.
      expect(names).not.toContain("Southeast Asia");
    });

    it("labels options plainly, with no publisher suffix", async () => {
      // The column carries the provenance, so "(IEA)" would be pure noise —
      // and across the loadable pathways it disambiguates nothing anyway.
      const { user } = renderHeader();
      await user.click(columnTrigger("APS"));

      const names = screen
        .getAllByRole("option")
        .map((o) => o.textContent?.trim());
      expect(names).toContain("Southeast Asia");
      expect(names.join(" ")).not.toContain("(");
    });

    it("changes only the column that was used", async () => {
      const { onGeographyChange, user } = renderHeader();
      await user.click(columnTrigger("APS"));
      await user.click(screen.getByRole("option", { name: "Global" }));

      expect(onGeographyChange).toHaveBeenCalledTimes(1);
      expect(onGeographyChange).toHaveBeenCalledWith(iea.id, "Global");
    });

    it("groups the controls under one axis label", () => {
      renderHeader();

      const group = screen.getByRole("group", { name: "Geography" });
      expect(
        within(group).getAllByRole("button", { name: /^Geography for/ }),
      ).toHaveLength(2);
    });

    it("degrades to a disabled control for a pathway with no geography", () => {
      const bare = {
        ...ace,
        id: "bare",
        name: { full: "Bare", short: "BARE" },
        geography: { regions: {}, country: [] },
      } as unknown as PathwayMetadataType;

      renderHeader({
        pathways: [iea, bare],
        selectedGeographies: { [iea.id]: "Global", bare: null },
      });

      expect(columnTrigger("BARE")).toBeDisabled();
    });
  });

  describe("availability", () => {
    it("shades the geographies this tool cannot plot", async () => {
      // 13 of IEA's 15 declared geographies carry no timeseries rows.
      const { user } = renderHeader({ available: ["Southeast Asia"] });
      await user.click(columnTrigger("APS"));

      const region = screen.getByRole("option", { name: "Southeast Asia" });
      expect(region.querySelector(".bg-transparent")).toBeNull();

      const global = screen.getByRole("option", { name: "Global" });
      expect(global.querySelector(".bg-transparent")).not.toBeNull();
    });

    it("leads with what can be plotted", async () => {
      const { user } = renderHeader({ available: ["Southeast Asia"] });
      await user.click(columnTrigger("APS"));

      expect(screen.getAllByRole("option")[0]).toHaveAccessibleName(
        "Southeast Asia",
      );
    });
  });

  describe("divergence", () => {
    it("says nothing when the columns cover the same countries", () => {
      const matching = {
        ...iea,
        geography: { regions: { "Southeast Asia": ["ID", "TH", "VN"] } },
      } as unknown as PathwayMetadataType;

      renderHeader({
        pathways: [matching, ace],
        selectedGeographies: {
          [iea.id]: "Southeast Asia",
          [ace.id]: "South East Asia",
        },
      });

      expect(screen.queryByText(/not like-for-like/)).toBeNull();
    });

    it("names the countries only one column includes", () => {
      // IEA's South East Asia carries Timor-Leste; ACE's does not.
      renderHeader({
        selectedGeographies: {
          [iea.id]: "Southeast Asia",
          [ace.id]: "South East Asia",
        },
      });

      expect(
        screen.getByText(/only APS includes Timor-Leste/),
      ).toBeInTheDocument();
    });

    it("says so when the columns are scoped to different geographies", () => {
      renderHeader({
        selectedGeographies: {
          [iea.id]: "Global",
          [ace.id]: "South East Asia",
        },
      });

      expect(
        screen.getByText(
          /These columns are not showing the same geography: APS shows Global/,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("condensed bar", () => {
    it("stays collapsed until the cards scroll away", () => {
      renderHeader();

      const bar = screen.getByText("APS").closest("div[aria-hidden='true']");
      expect(bar).toHaveClass("h-0");
    });

    it("names each column once the cards scroll away", () => {
      renderHeader();
      scrollPast();

      const bar = screen.getByText("APS").closest("div[aria-hidden='true']");
      expect(bar).toHaveClass("h-8");
      expect(screen.getByText("ATS")).toBeInTheDocument();
    });

    it("holds no focusables, so nothing hides in a collapsed bar", () => {
      renderHeader();

      const bar = screen.getByText("APS").closest("div[aria-hidden='true']");
      expect(bar?.querySelectorAll("button, a, input")).toHaveLength(0);
    });
  });
});
