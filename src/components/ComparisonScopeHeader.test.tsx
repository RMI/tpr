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
   * The detail ribbon's controls at their compact size (comparison-ribbon-spec,
   * Sebastian 2026-11-18): one shared Sector control, and Global or Region or
   * Country for each column.
   */
  describe("sector", () => {
    it("is one shared control, at the compact size", () => {
      renderHeader();

      // Sector is a closed vocabulary with a shared intersection, unlike
      // geography: the asymmetry in this header is deliberate.
      expect(screen.getAllByRole("button", { name: /^Sector:/ })).toHaveLength(
        1,
      );
      expect(sectorTrigger()).toHaveAccessibleName("Sector: Power");
      expect(sectorTrigger().className).toContain("h-7");
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

    it("offers Global or Region or Country in each column, at the compact size", () => {
      renderHeader();

      const ieaColumn = column("IEA: APS (2024)");
      expect(within(ieaColumn).getAllByText("or")).toHaveLength(2);
      const global = within(ieaColumn).getByRole("button", { name: /Global/ });
      expect(global.className).toContain("h-7");
      expect(
        within(ieaColumn).getByRole("button", { name: /Southeast Asia/ }),
      ).toBeInTheDocument();
      expect(
        within(ieaColumn).getByRole("button", {
          name: /United States of America/,
        }),
      ).toBeInTheDocument();
    });

    it("shows each column's own current geography", () => {
      renderHeader();

      expect(
        within(column("IEA: APS (2024)")).getByRole("button", {
          name: /Southeast Asia/,
        }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        within(column("ACE: ATS (2024)")).getByRole("button", {
          name: /South East Asia/,
        }),
      ).toHaveAttribute("aria-pressed", "true");
    });

    it("offers only the geographies that column's publisher declares", () => {
      renderHeader();

      const aceColumn = column("ACE: ATS (2024)");
      // IEA's spelling belongs to IEA's column.
      expect(aceColumn).not.toHaveTextContent("Southeast Asia");
      // ACE declares no Global: greyed, never hidden (D5).
      expect(
        within(aceColumn).getByRole("button", { name: /Global/ }),
      ).toHaveAttribute("aria-disabled", "true");
    });

    it("changes only the column that was used", async () => {
      const { onGeographyChange, user } = renderHeader();
      await user.click(
        within(column("IEA: APS (2024)")).getByRole("button", {
          name: /Global/,
        }),
      );

      expect(onGeographyChange).toHaveBeenCalledTimes(1);
      expect(onGeographyChange).toHaveBeenCalledWith(iea.id, "Global");
    });

    it("ignores re-picking a column's current geography", async () => {
      const { onGeographyChange, user } = renderHeader();
      await user.click(
        within(column("IEA: APS (2024)")).getByRole("button", {
          name: /Southeast Asia/,
        }),
      );

      expect(onGeographyChange).not.toHaveBeenCalled();
    });

    it("lists a column's several regions in a dropdown, labelled plainly", async () => {
      // The column carries the provenance, so "(IEA)" would be pure noise.
      const { onGeographyChange, user } = renderHeader({
        pathways: [wide, ace],
        selectedGeographies: {
          [wide.id]: "Southeast Asia",
          [ace.id]: "South East Asia",
        },
        available: ["Global", "Africa", "Southeast Asia", "South East Asia"],
      });
      await user.click(
        within(column("IEA: STEPS (2024)")).getByRole("button", {
          name: "Region: Southeast Asia",
        }),
      );

      const names = screen
        .getAllByRole("option")
        .map((o) => o.textContent?.trim());
      expect(names).toEqual(["Africa", "Southeast Asia"]);
      expect(names.join(" ")).not.toContain("(");

      await user.click(screen.getByRole("option", { name: "Africa" }));
      expect(onGeographyChange).toHaveBeenCalledWith(wide.id, "Africa");
    });

    it("greys every slot for a pathway with no geography", () => {
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

      const slots = within(column("ACE: BARE (2024)")).getAllByRole("button");
      expect(slots).toHaveLength(3);
      for (const slot of slots) {
        expect(slot).toHaveAttribute("aria-disabled", "true");
      }
    });
  });

  describe("availability", () => {
    it("greys the geographies this tool can't show, rather than hiding them (D2)", async () => {
      const { onGeographyChange, user } = renderHeader({
        available: ["Southeast Asia", "South East Asia"],
      });

      const ieaColumn = column("IEA: APS (2024)");
      const global = within(ieaColumn).getByRole("button", { name: /Global/ });
      expect(global).toHaveAttribute("aria-disabled", "true");
      expect(
        within(ieaColumn).getByRole("button", {
          name: /United States of America/,
        }),
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
  describe("height reporting", () => {
    /** Drives the bar's observed height; jsdom has no layout of its own. */
    let observed: ResizeObserverCallback | null = null;
    class StubResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        observed = callback;
      }
      observe() {}
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
