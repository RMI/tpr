import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ComparisonScopeHeader from "./ComparisonScopeHeader";
import { MockIntersectionObserver } from "../test/mockIntersectionObserver";
import {
  sharedGeographyOptions,
  sharedSectors,
  geographyDivergence,
} from "../utils/comparisonScope";
import type { PathwayMetadataType, PathwayScopeSelection } from "../types";

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

const ace2 = {
  ...ace,
  id: "ACE-BAS-2024",
  name: { full: "Baseline Scenario", short: "BAS" },
} as unknown as PathwayMetadataType;

const renderHeader = (
  pathways: PathwayMetadataType[],
  scope: PathwayScopeSelection,
  onScopeChange: (next: PathwayScopeSelection) => void = () => {},
) =>
  render(
    <ComparisonScopeHeader
      pathways={pathways}
      sectorOptions={sharedSectors(pathways)}
      geographyOptions={sharedGeographyOptions(pathways)}
      scope={scope}
      onScopeChange={onScopeChange}
      divergence={geographyDivergence(scope.geography, pathways)}
    />,
  );

/** Drive the sentinel past the top of the viewport. */
const scrollPast = () =>
  act(() => {
    const observer = MockIntersectionObserver.instances.at(-1);
    const sentinel = document.querySelector("[aria-hidden='true']");
    observer?.trigger(sentinel as Element, false, { top: -10 });
  });

describe("ComparisonScopeHeader", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances.length = 0;
  });

  describe("axes", () => {
    it("offers only the sectors every compared pathway declares", () => {
      renderHeader([iea, ace], { sector: "Power", geography: null });

      expect(screen.getByRole("button", { name: "Power" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Buildings" }),
      ).toBeInTheDocument();
      // IEA declares Steel; ACE does not, so it is not a shared axis value.
      expect(screen.queryByRole("button", { name: "Steel" })).toBeNull();
    });

    it("offers every declared geography, labelled by publisher", () => {
      // Cross-publisher comparisons share no geography by name, so an
      // intersection here would leave the axis empty.
      renderHeader([iea, ace], { sector: "Power", geography: "Global" });

      expect(
        screen.getByRole("button", { name: "Global (IEA)" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Southeast Asia (IEA)" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "South East Asia (ACE)" }),
      ).toBeInTheDocument();
    });

    it("drops the publisher suffix when the pathways share one", () => {
      renderHeader([ace, ace2], {
        sector: "Power",
        geography: "South East Asia",
      });

      expect(
        screen.getByRole("button", { name: "South East Asia" }),
      ).toBeInTheDocument();
    });

    it("names a country option rather than echoing its ISO code", () => {
      renderHeader([iea], { sector: "Power", geography: "Global" });

      expect(
        screen.getByRole("button", { name: /United States of America/ }),
      ).toBeInTheDocument();
    });

    it("groups each axis under its label", () => {
      renderHeader([iea, ace], { sector: "Power", geography: "Global" });

      const groups = screen.getAllByRole("group");
      expect(groups.map((g) => g.getAttribute("aria-labelledby"))).toHaveLength(
        2,
      );
      expect(screen.getByText("Sector")).toBeInTheDocument();
      expect(screen.getByText("Geography")).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("marks exactly one badge pressed per axis", () => {
      renderHeader([ace, ace2], {
        sector: "Power",
        geography: "South East Asia",
      });

      const pressed = screen
        .getAllByRole("button")
        .filter((b) => b.getAttribute("aria-pressed") === "true");
      expect(pressed.map((b) => b.textContent)).toEqual([
        "Power",
        "South East Asia",
      ]);
    });

    it("reports a new selection without disturbing the other axis", async () => {
      const onScopeChange = vi.fn();
      renderHeader(
        [ace, ace2],
        { sector: "Power", geography: "South East Asia" },
        onScopeChange,
      );

      await userEvent.click(screen.getByRole("button", { name: "Buildings" }));

      expect(onScopeChange).toHaveBeenCalledWith({
        sector: "Buildings",
        geography: "South East Asia",
      });
    });

    it("reports the token, not the publisher-suffixed label", async () => {
      // The token is what lands in the URL and what each column resolves.
      const onScopeChange = vi.fn();
      renderHeader(
        [iea, ace],
        { sector: "Power", geography: "Global" },
        onScopeChange,
      );

      await userEvent.click(
        screen.getByRole("button", { name: "South East Asia (ACE)" }),
      );

      expect(onScopeChange).toHaveBeenCalledWith({
        sector: "Power",
        geography: "South East Asia",
      });
    });

    it("ignores a click on the already-selected badge", async () => {
      // An axis always carries a value, so deselection is not a state to reach.
      const onScopeChange = vi.fn();
      renderHeader(
        [ace, ace2],
        { sector: "Power", geography: "South East Asia" },
        onScopeChange,
      );

      await userEvent.click(screen.getByRole("button", { name: "Power" }));
      expect(onScopeChange).not.toHaveBeenCalled();
    });

    it("keeps the selected geography out of the overflow", () => {
      // jsdom has no layout, so this asserts the pinning rather than the
      // collapse: the selection leads the list it is measured from.
      renderHeader([iea, ace], {
        sector: "Power",
        geography: "South East Asia",
      });

      const group = screen.getAllByRole("group")[1];
      const first = group.querySelectorAll("button")[0];
      expect(first).toHaveAccessibleName("South East Asia (ACE)");
    });
  });

  describe("region tooltips", () => {
    it("lists the members of the publisher whose spelling the badge shows", async () => {
      renderHeader([iea, ace], { sector: "Power", geography: "Global" });

      // ACE's spelling, so ACE's membership: no Timor-Leste.
      fireEvent.focus(
        screen.getByRole("button", { name: "South East Asia (ACE)" }),
      );
      expect(await screen.findByText(/Indonesia/)).toBeInTheDocument();
      expect(screen.queryByText(/Timor-Leste/)).toBeNull();
    });
  });

  describe("geography divergence", () => {
    it("says nothing when the publishers agree", () => {
      renderHeader([ace, ace2], {
        sector: "Power",
        geography: "South East Asia",
      });

      expect(screen.queryByText(/do not agree/)).toBeNull();
      expect(screen.queryByText(/does not publish/)).toBeNull();
    });

    it("says which publisher does not publish the selection", () => {
      renderHeader([iea, ace], { sector: "Power", geography: "Global" });

      expect(
        screen.getByText(
          /ACE does not publish Global\. Its column falls back to the closest geography it does cover/,
        ),
      ).toBeInTheDocument();
    });

    it("names the countries only one publisher includes", () => {
      // Both spell it the same way here, but IEA's list carries TL.
      const ieaSameSpelling = {
        ...iea,
        geography: {
          regions: { "South East Asia": ["ID", "TH", "VN", "TL"] },
          country: [],
        },
      } as unknown as PathwayMetadataType;

      renderHeader([ieaSameSpelling, ace], {
        sector: "Power",
        geography: "South East Asia",
      });

      expect(
        screen.getByText(
          /Publishers do not agree on what South East Asia covers: only IEA includes Timor-Leste\./,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("condensed bar", () => {
    it("stays collapsed until the cards scroll away", () => {
      renderHeader([iea, ace], { sector: "Power", geography: "Global" });

      const bar = screen.getByText("APS").closest("div[aria-hidden='true']");
      expect(bar).toHaveClass("h-0");
    });

    it("names each column once the cards scroll away", () => {
      renderHeader([iea, ace], { sector: "Power", geography: "Global" });
      scrollPast();

      const bar = screen.getByText("APS").closest("div[aria-hidden='true']");
      expect(bar).toHaveClass("h-8");
      expect(screen.getByText("ATS")).toBeInTheDocument();
    });

    it("holds no focusables, so nothing hides in a collapsed bar", () => {
      renderHeader([iea, ace], { sector: "Power", geography: "Global" });

      const bar = screen.getByText("APS").closest("div[aria-hidden='true']");
      expect(bar?.querySelectorAll("button, a, input")).toHaveLength(0);
    });
  });
});
