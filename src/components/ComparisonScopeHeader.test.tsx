import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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
import { NO_DATA_GROUP_LABEL } from "../utils/scopeRibbon";
import type { PathwayMetadataType } from "../types";

/*
  The two real shapes this header has to reconcile: IEA, which declares Global
  plus named regions with its own "Southeast Asia" spelling, and ACE, which
  declares one region spelled with a space and omitting TL.
*/
const iea = {
  id: "IEA-APS-2024",
  name: { full: "Announced Pledges Scenario", short: "APS" },
  publication: { publisher: { short: "IEA", full: "IEA Long" }, year: 2024 },
  sectors: [{ name: "Power" }, { name: "Steel" }, { name: "Buildings" }],
  geography: {
    global: true,
    regions: { "Southeast Asia": ["ID", "TH", "VN", "TL"] },
    country: { US: ["US"] },
  },
} as unknown as PathwayMetadataType;

const ace = {
  id: "ACE-ATS-2024",
  name: { full: "ASEAN Target Scenario", short: "ATS" },
  publication: { publisher: { short: "ACE", full: "ACE Long" }, year: 2024 },
  sectors: [{ name: "Power" }, { name: "Buildings" }],
  geography: {
    regions: { "South East Asia": ["ID", "TH", "VN"] },
    country: {},
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
  /** Geography tokens with data; every one in the fixtures by default. */
  available?: string[];
  /** Sectors with something to show; every sector by default. */
  availableSectors?: string[] | null;
  onHeightChange?: (height: number) => void;
}

const renderHeader = ({
  pathways = [iea, ace],
  selectedSector = "Power",
  selectedGeographies = {
    [iea.id]: "Southeast Asia",
    [ace.id]: "South East Asia",
  },
  available = ["Global", "Southeast Asia", "US", "South East Asia"],
  availableSectors = null,
  onHeightChange,
}: Options = {}) => {
  const onSectorChange = vi.fn();
  const onGeographyChange = vi.fn();

  render(
    <ComparisonScopeHeader
      pathways={pathways}
      sectorOptions={sharedSectors(pathways)}
      isSectorAvailable={(sector) =>
        availableSectors === null || availableSectors.includes(sector)
      }
      selectedSector={selectedSector}
      onSectorChange={onSectorChange}
      geographyOptions={optionsFor(pathways, available)}
      selectedGeographies={selectedGeographies}
      onGeographyChange={onGeographyChange}
      divergence={columnsGeographyDivergence(selectedGeographies, pathways)}
      onHeightChange={onHeightChange}
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

/** One column's slots, by the group named for its pathway. */
const column = (name: string) =>
  screen.getByRole("group", { name: `Geography for ${name}` });

/** The shared Sector control's trigger, whatever it currently shows. */
const sectorTrigger = () => screen.getByRole("button", { name: /^Sector:/ });

/** A third pathway with several regions, so its Region slot is a dropdown. */
const wide = {
  id: "IEA-STEPS-2024",
  name: { full: "Stated Policies Scenario", short: "STEPS" },
  publication: { publisher: { short: "IEA", full: "IEA Long" }, year: 2024 },
  sectors: [{ name: "Power" }, { name: "Buildings" }],
  geography: {
    global: true,
    regions: { "Africa": ["NG", "ZA"], "Southeast Asia": ["ID", "TH"] },
    country: {},
  },
} as unknown as PathwayMetadataType;

describe("ComparisonScopeHeader", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances.length = 0;
  });

  /*
   * Option B (design decision, 2026-11-18): one shared
   * Sector control styled as the switch's selected segment, and for each
   * column a level switch, then one value line.
   */
  describe("sector", () => {
    it("is one shared control, styled as the switch's selected segment (B4)", () => {
      renderHeader();

      // Sector is a closed vocabulary with a shared intersection, unlike
      // geography: the asymmetry in this header is deliberate.
      expect(screen.getAllByRole("button", { name: /^Sector:/ })).toHaveLength(
        1,
      );
      expect(sectorTrigger()).toHaveAccessibleName("Sector: Power");
      expect(sectorTrigger().className).toContain("h-6");
      expect(sectorTrigger().className).toContain("border-bluespruce");
      expect(sectorTrigger().className).not.toContain("ring-1");
      expect(
        within(screen.getByRole("group", { name: "Sector" })).getByRole(
          "button",
        ),
      ).toBe(sectorTrigger());
    });

    it("offers only the sectors every compared pathway declares", async () => {
      const { user } = renderHeader();
      await user.click(sectorTrigger());

      const names = screen
        .getAllByRole("option")
        .map((o) => o.textContent?.trim());
      expect(names).toEqual(["Buildings", "Power"]);
      // IEA declares Steel; ACE does not, so it is not a shared axis value.
      expect(names).not.toContain("Steel");
    });

    it("reports a new sector", async () => {
      const { onSectorChange, user } = renderHeader();
      await user.click(sectorTrigger());
      await user.click(screen.getByRole("option", { name: "Buildings" }));

      expect(onSectorChange).toHaveBeenCalledWith("Buildings");
    });

    it("ignores re-picking the selected sector", async () => {
      // The axis always carries a value, so re-picking changes nothing.
      const { onSectorChange, user } = renderHeader();
      await user.click(sectorTrigger());
      await user.click(screen.getByRole("option", { name: "Power" }));

      expect(onSectorChange).not.toHaveBeenCalled();
    });

    it("lists a sector no column can show, greyed and last (D2)", async () => {
      const { user } = renderHeader({ availableSectors: ["Power"] });
      await user.click(sectorTrigger());

      const greyed = screen.getByRole("group", { name: NO_DATA_GROUP_LABEL });
      expect(
        within(greyed).getByRole("option", { name: "Buildings" }),
      ).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByRole("option", { name: "Power" })).not.toHaveAttribute(
        "aria-disabled",
      );
    });

    it("shows the only shared sector as a fact, not a choice", () => {
      const powerOnly = {
        ...ace,
        sectors: [{ name: "Power" }],
      } as unknown as PathwayMetadataType;
      renderHeader({ pathways: [iea, powerOnly] });

      const group = screen.getByRole("group", { name: "Sector" });
      expect(group).toHaveTextContent("Power");
      expect(within(group).queryByRole("button")).toBeNull();
    });

    it("keeps today's sentence when no shared sector can be selected (C4)", () => {
      renderHeader({ availableSectors: [], selectedSector: null });

      expect(
        screen.getByText(
          "These pathways share no sector with information to compare.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Sector:/ })).toBeNull();
    });
  });

  describe("geography, per column", () => {
    it("gives every column its own group, named for its pathway", () => {
      renderHeader();

      expect(column("IEA: APS (2024)")).toBeInTheDocument();
      expect(column("ACE: ATS (2024)")).toBeInTheDocument();
    });

    it("groups the columns under one axis label", () => {
      renderHeader();

      const axis = screen.getByRole("group", { name: "Geography" });
      expect(
        within(axis).getAllByRole("group", { name: /^Geography for/ }),
      ).toHaveLength(2);
    });

    it("gives each column a level switch, then one value line", () => {
      renderHeader();

      const ieaColumn = column("IEA: APS (2024)");
      const levels = within(ieaColumn).getByRole("radiogroup", {
        name: "Geography level for IEA: APS (2024)",
      });
      expect(
        within(levels)
          .getAllByRole("radio")
          .map((r) => r.getAttribute("aria-label")),
      ).toEqual(["Global", "Region", "Country"]);
      expect(
        within(levels).getByRole("radio", { name: "Region" }),
      ).toHaveAttribute("aria-checked", "true");
      // One option at Region: shown as a value, not a control (§2.3).
      expect(ieaColumn).toHaveTextContent("Southeast Asia");
      expect(
        within(ieaColumn).queryByRole("button", { name: /Southeast Asia/ }),
      ).toBeNull();
    });

    it("shows each column's own current geography", () => {
      renderHeader();

      for (const [name, value] of [
        ["IEA: APS (2024)", "Southeast Asia"],
        ["ACE: ATS (2024)", "South East Asia"],
      ]) {
        const col = column(name);
        expect(
          within(col).getByRole("radio", { name: "Region" }),
        ).toHaveAttribute("aria-checked", "true");
        expect(col).toHaveTextContent(value);
      }
    });

    it("greys a level the column lacks, never hiding it (D5)", () => {
      renderHeader();

      const aceColumn = column("ACE: ATS (2024)");
      for (const level of ["Global", "Country"]) {
        expect(
          within(aceColumn).getByRole("radio", { name: level }),
        ).toHaveAttribute("aria-disabled", "true");
      }
      // IEA's spelling belongs to IEA's column.
      expect(aceColumn).not.toHaveTextContent("Southeast Asia");
    });

    it("changes only the column that was used", async () => {
      const { onGeographyChange, user } = renderHeader();
      await user.click(
        within(column("IEA: APS (2024)")).getByRole("radio", {
          name: "Global",
        }),
      );

      expect(onGeographyChange).toHaveBeenCalledTimes(1);
      expect(onGeographyChange).toHaveBeenCalledWith(iea.id, "Global");
    });

    it("selects a level's only option by choosing the level (§2.4)", async () => {
      const { onGeographyChange, user } = renderHeader();
      await user.click(
        within(column("IEA: APS (2024)")).getByRole("radio", {
          name: "Country",
        }),
      );

      expect(onGeographyChange).toHaveBeenCalledWith(iea.id, "US");
    });

    it("ignores choosing the current level", async () => {
      const { onGeographyChange, user } = renderHeader();
      await user.click(
        within(column("IEA: APS (2024)")).getByRole("radio", {
          name: "Region",
        }),
      );

      expect(onGeographyChange).not.toHaveBeenCalled();
    });

    it("leaves the value line empty under Global", () => {
      renderHeader({
        selectedGeographies: {
          [iea.id]: "Global",
          [ace.id]: "South East Asia",
        },
      });

      const ieaColumn = column("IEA: APS (2024)");
      expect(
        within(ieaColumn).getByRole("radio", { name: "Global" }),
      ).toHaveAttribute("aria-checked", "true");
      expect(ieaColumn).not.toHaveTextContent("Southeast Asia");
    });

    it("lists a level's several options in one full-width dropdown, labelled plainly", async () => {
      // The column carries the provenance, so "(IEA)" would be pure noise.
      const { onGeographyChange, user } = renderHeader({
        pathways: [wide, ace],
        selectedGeographies: {
          [wide.id]: "Southeast Asia",
          [ace.id]: "South East Asia",
        },
        available: ["Global", "Africa", "Southeast Asia", "South East Asia"],
      });
      const trigger = within(column("IEA: STEPS (2024)")).getByRole("button", {
        name: "Region: Southeast Asia",
      });
      // The value-line look: full width, no ring, no level icon (B3).
      expect(trigger.className).toContain("w-full");
      expect(trigger.className).toContain("h-6");
      expect(trigger.className).not.toContain("ring-1");
      expect(trigger.querySelectorAll("svg")).toHaveLength(1); // chevron only
      await user.click(trigger);

      const names = screen
        .getAllByRole("option")
        .map((o) => o.textContent?.trim());
      expect(names).toEqual(["Africa", "Southeast Asia"]);
      expect(names.join(" ")).not.toContain("(");

      await user.click(screen.getByRole("option", { name: "Africa" }));
      expect(onGeographyChange).toHaveBeenCalledWith(wide.id, "Africa");
    });

    it("greys every level for a pathway with no geography", () => {
      const bare = {
        ...ace,
        id: "bare",
        name: { full: "Bare", short: "BARE" },
        geography: { regions: {}, country: {} },
      } as unknown as PathwayMetadataType;

      renderHeader({
        pathways: [iea, bare],
        selectedGeographies: { [iea.id]: "Global", bare: null },
      });

      const levels = within(column("ACE: BARE (2024)")).getAllByRole("radio");
      expect(levels).toHaveLength(3);
      for (const level of levels) {
        expect(level).toHaveAttribute("aria-disabled", "true");
        expect(level).toHaveAttribute("aria-checked", "false");
      }
    });
  });

  describe("availability", () => {
    it("greys the levels this tool can't show, rather than hiding them (D2)", async () => {
      const { onGeographyChange, user } = renderHeader({
        available: ["Southeast Asia", "South East Asia"],
      });

      const ieaColumn = column("IEA: APS (2024)");
      const global = within(ieaColumn).getByRole("radio", { name: "Global" });
      expect(global).toHaveAttribute("aria-disabled", "true");
      expect(
        within(ieaColumn).getByRole("radio", { name: "Country" }),
      ).toHaveAttribute("aria-disabled", "true");

      await user.click(global);
      expect(onGeographyChange).not.toHaveBeenCalled();
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

      const bar = screen
        .getByText("IEA: APS")
        .closest("div[aria-hidden='true']");
      expect(bar).toHaveClass("h-0");
    });

    it("names each column once the cards scroll away", () => {
      renderHeader();
      scrollPast();

      const bar = screen
        .getByText("IEA: APS")
        .closest("div[aria-hidden='true']");
      expect(bar).toHaveClass("h-8");
      expect(screen.getByText("ACE: ATS")).toBeInTheDocument();
    });

    it("holds no focusables, so nothing hides in a collapsed bar", () => {
      renderHeader();

      const bar = screen
        .getByText("IEA: APS")
        .closest("div[aria-hidden='true']");
      expect(bar?.querySelectorAll("button, a, input")).toHaveLength(0);
    });

    it("tells apart columns that share a short pathway name", () => {
      // Two editions of one pathway, and another publisher's same short name.
      const nze2024 = {
        ...iea,
        id: "IEA-NZE-2024",
        name: { full: "Net Zero Emissions by 2050", short: "NZE" },
      } as unknown as PathwayMetadataType;
      const nze2025: PathwayMetadataType = {
        ...nze2024,
        id: "IEA-NZE-2025",
        publication: { ...nze2024.publication, year: 2025 },
      };
      const otherNze = {
        ...ace,
        id: "ACE-NZE-2024",
        name: { full: "Net Zero", short: "NZE" },
      } as unknown as PathwayMetadataType;

      renderHeader({
        pathways: [nze2024, nze2025, otherNze],
        selectedGeographies: {},
      });
      scrollPast();

      const bar = screen
        .getByText("ACE: NZE")
        .closest("div[aria-hidden='true']") as HTMLElement;
      expect(within(bar).getAllByText("IEA: NZE")).toHaveLength(2);
      expect(within(bar).getByText("2025")).toBeInTheDocument();
      expect(within(bar).getAllByText("2024")).toHaveLength(2);

      // The columns' geography groups are named apart too, year included.
      expect(column("IEA: NZE (2024)")).toBeInTheDocument();
      expect(column("IEA: NZE (2025)")).toBeInTheDocument();
      expect(column("ACE: NZE (2024)")).toBeInTheDocument();
    });
  });
  describe("level names (V13)", () => {
    /*
     * The switch shows names when the widest switch that can appear fits the
     * column. jsdom has no layout, so widths are simulated: each measuring
     * copy 212px, a column `columnWidth`. ResizeObserver is stubbed so the
     * measure runs at all; it reads the widths once on mount.
     */
    class NoopResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    const withWidths = (columnWidth: number, copyWidths = [212, 212, 213]) => {
      vi.stubGlobal("ResizeObserver", NoopResizeObserver);
      let copy = 0;
      return vi
        .spyOn(Element.prototype, "getBoundingClientRect")
        .mockImplementation(function (this: Element) {
          if (this.hasAttribute("data-switch-copy")) {
            return new DOMRect(0, 0, copyWidths[copy++ % 3], 28);
          }
          if (this.getAttribute("aria-label")?.startsWith("Geography for")) {
            return new DOMRect(0, 0, columnWidth, 56);
          }
          return new DOMRect();
        });
    };

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    const levelText = () =>
      screen.getAllByRole("radiogroup").map((g) => g.textContent);

    it("shows names when the widest switch fits the column", () => {
      withWidths(213);
      renderHeader();
      expect(levelText()).toEqual([
        "GlobalRegionCountry",
        "GlobalRegionCountry",
      ]);
    });

    it("shows icons only when it doesn't, measuring the widest real switch", () => {
      // 212px fits Global or Region selected, but Country selected is 213px.
      withWidths(212);
      renderHeader();
      expect(levelText()).toEqual(["", ""]);
    });
  });

  describe("height reporting", () => {
    /**
     * Drives the bar's observed height; jsdom has no layout of its own. The
     * header has two observers, the bar's height and the level switch's fit,
     * so this drives the one watching the sticky bar.
     */
    let observed: ResizeObserverCallback | null = null;
    class StubResizeObserver {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        if (target.classList.contains("sticky")) observed = this.callback;
      }
      unobserve() {}
      disconnect() {}
    }

    beforeEach(() => {
      observed = null;
      vi.stubGlobal("ResizeObserver", StubResizeObserver);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    const resizeTo = (height: number) =>
      act(() =>
        observed?.(
          [{ contentRect: { height } } as unknown as ResizeObserverEntry],
          {} as ResizeObserver,
        ),
      );

    it("reports the sticky bar's height as it changes", () => {
      // Frozen plots (#1033) sit flush under the bar, so they need its height
      // — including while the condensed names slide in.
      const onHeightChange = vi.fn();
      renderHeader({ onHeightChange });

      resizeTo(120);
      resizeTo(152);

      expect(onHeightChange.mock.calls).toEqual([[120], [152]]);
    });
  });
});
