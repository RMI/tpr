import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import ComparisonRibbon from "./ComparisonRibbon";
import { useComparison } from "../context/ComparisonContext";
import { useFilters } from "../context/FilterContext";
import { EMPTY_FILTERS } from "../context/FilterContext";
import type { SearchFilters } from "../types";

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("../context/ComparisonContext", () => ({
  useComparison: vi.fn(),
  MAX_COMPARED: 3,
}));

vi.mock("../context/FilterContext", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useFilters: vi.fn(),
}));

vi.mock("../data/pathwayMetadata", () => ({
  pathwayMetadata: [
    {
      id: "p1",
      name: { full: "Pathway One" },
      publication: { publisher: { short: "Pub1", full: "Publisher One" } },
      sectors: [{ name: "Power" }, { name: "Steel" }],
      geography: { regions: { "South East Asia": ["VN"] }, country: [] },
    },
    {
      id: "p2",
      name: { full: "Pathway Two" },
      publication: { publisher: { short: null, full: "Publisher Two" } },
      sectors: [{ name: "Steel" }, { name: "Power" }],
      geography: { regions: { "South East Asia": ["VN"] }, country: [] },
    },
  ],
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const defaultContext = {
  comparedPathwayIds: [] as string[],
  addToComparison: vi.fn(),
  removeFromComparison: vi.fn(),
  clearComparison: vi.fn(),
  isInComparison: vi.fn(),
  setComparedPathwayIds: vi.fn(),
  ribbonExpanded: false,
  setRibbonExpanded: vi.fn(),
};

const setFilters = (filters: Partial<SearchFilters> = {}) => {
  vi.mocked(useFilters).mockReturnValue({
    filters: { ...EMPTY_FILTERS, ...filters },
    setFilters: vi.fn(),
    resetFilters: vi.fn(),
  });
};

/** Prints the query string the ribbon navigated to. */
const Probe: React.FC = () => (
  <span data-testid="search">{useLocation().search}</span>
);

const renderRibbon = (ids: string[] = [], expanded = false) => {
  vi.mocked(useComparison).mockReturnValue({
    ...defaultContext,
    comparedPathwayIds: ids,
    ribbonExpanded: expanded,
  });
  return render(
    <MemoryRouter>
      <ComparisonRibbon />
    </MemoryRouter>,
  );
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("ComparisonRibbon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setFilters();
  });

  describe("collapsed state (default)", () => {
    it("shows the Compare Pathways button", () => {
      renderRibbon();
      expect(
        screen.getByRole("button", { name: /compare pathways/i }),
      ).toBeInTheDocument();
    });

    it("does not show pathway slots or action buttons while collapsed", () => {
      renderRibbon();
      expect(screen.queryByText("Compare (min. 2)")).not.toBeInTheDocument();
      expect(screen.queryByText("Clear All")).not.toBeInTheDocument();
    });

    it("shows selected count badge when at least one pathway is selected", () => {
      renderRibbon(["p1"]);
      expect(screen.getByText("1 selected")).toBeInTheDocument();
    });

    it("hides selected count badge when nothing is selected", () => {
      renderRibbon([]);
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });
  });

  describe("expanded state", () => {
    it("calls setRibbonExpanded(true) when Compare Pathways is clicked", async () => {
      const setRibbonExpanded = vi.fn();
      vi.mocked(useComparison).mockReturnValue({
        ...defaultContext,
        ribbonExpanded: false,
        setRibbonExpanded,
      });
      render(
        <MemoryRouter>
          <ComparisonRibbon />
        </MemoryRouter>,
      );
      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: /compare pathways/i }));
      expect(setRibbonExpanded).toHaveBeenCalledWith(true);
    });

    it("calls setRibbonExpanded(false) when Hide is clicked", async () => {
      const setRibbonExpanded = vi.fn();
      vi.mocked(useComparison).mockReturnValue({
        ...defaultContext,
        ribbonExpanded: true,
        setRibbonExpanded,
      });
      render(
        <MemoryRouter>
          <ComparisonRibbon />
        </MemoryRouter>,
      );
      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: /hide/i }));
      expect(setRibbonExpanded).toHaveBeenCalledWith(false);
    });

    it("shows action buttons when expanded", () => {
      renderRibbon([], true);
      expect(screen.getByText("Clear All")).toBeInTheDocument();
      expect(screen.getByText("Hide")).toBeInTheDocument();
    });

    describe("Compare button gate", () => {
      it("is disabled and labelled 'Compare (min. 2)' with 0 pathways selected", () => {
        renderRibbon([], true);
        expect(
          screen.getByRole("button", { name: "Compare (min. 2)" }),
        ).toBeDisabled();
      });

      it("is disabled and labelled 'Compare (min. 2)' with 1 pathway selected", () => {
        renderRibbon(["p1"], true);
        expect(
          screen.getByRole("button", { name: "Compare (min. 2)" }),
        ).toBeDisabled();
      });

      it("is enabled and labelled 'Compare' with 2 pathways selected", () => {
        renderRibbon(["p1", "p2"], true);
        expect(
          screen.getByRole("button", { name: "Compare" }),
        ).not.toBeDisabled();
      });

      it("is enabled and labelled 'Compare' with 3 pathways selected", () => {
        renderRibbon(["p1", "p2", "p3"], true);
        expect(
          screen.getByRole("button", { name: "Compare" }),
        ).not.toBeDisabled();
      });
    });

    describe("pathway slots", () => {
      it("shows the selected pathway name in its slot", () => {
        renderRibbon(["p1"], true);
        expect(screen.getByText(/Pathway One/)).toBeInTheDocument();
      });

      it("uses publisher short name when available", () => {
        renderRibbon(["p1"], true);
        expect(screen.getByText(/Pub1/)).toBeInTheDocument();
      });

      it("falls back to full publisher name when short is absent", () => {
        renderRibbon(["p2"], true);
        expect(screen.getByText(/Publisher Two/)).toBeInTheDocument();
      });

      it("calls removeFromComparison when the X button is clicked", async () => {
        const remove = vi.fn();
        vi.mocked(useComparison).mockReturnValue({
          ...defaultContext,
          comparedPathwayIds: ["p1"],
          removeFromComparison: remove,
          ribbonExpanded: true,
        });
        render(
          <MemoryRouter>
            <ComparisonRibbon />
          </MemoryRouter>,
        );
        await userEvent
          .setup()
          .click(
            screen.getByRole("button", { name: /remove from comparison/i }),
          );
        expect(remove).toHaveBeenCalledWith("p1");
      });

      it("calls clearComparison when Clear All is clicked", async () => {
        const clear = vi.fn();
        vi.mocked(useComparison).mockReturnValue({
          ...defaultContext,
          comparedPathwayIds: ["p1", "p2"],
          clearComparison: clear,
          ribbonExpanded: true,
        });
        render(
          <MemoryRouter>
            <ComparisonRibbon />
          </MemoryRouter>,
        );
        await userEvent
          .setup()
          .click(screen.getByRole("button", { name: /clear all/i }));
        expect(clear).toHaveBeenCalledOnce();
      });
    });

    describe("compare URL", () => {
      const clickCompare = async (filters: Partial<SearchFilters> = {}) => {
        setFilters(filters);
        vi.mocked(useComparison).mockReturnValue({
          ...defaultContext,
          comparedPathwayIds: ["p1", "p2"],
          ribbonExpanded: true,
        });
        render(
          <MemoryRouter>
            <ComparisonRibbon />
            <Probe />
          </MemoryRouter>,
        );
        await userEvent
          .setup()
          .click(screen.getByRole("button", { name: "Compare" }));
        const search = screen.getByTestId("search").textContent ?? "";
        return { search, params: new URLSearchParams(search) };
      };

      it("carries the compared ids", async () => {
        const { params } = await clickCompare();
        expect(params.get("ids")).toBe("p1,p2");
      });

      it("seeds the scope so a shared link reproduces what the sender saw", async () => {
        // Seeding at navigation time is what keeps the comparison page a pure
        // function of its URL.
        const { params } = await clickCompare();
        expect(params.get("sector")).toBe("Power");
        // Geography is per column, keyed by pathway id.
        expect(params.get("geography")).toBe(
          "p1:South East Asia,p2:South East Asia",
        );
      });

      it("seeds each column in its own publisher's spelling", async () => {
        // The whole reason geography is per column: one reader selection maps
        // onto a different token for each publication.
        const { params } = await clickCompare({ geography: "Southeast Asia" });
        expect(params.get("geography")).toBe(
          "p1:South East Asia,p2:South East Asia",
        );
      });

      it("prefers a search sector the pathways share", async () => {
        const { params } = await clickCompare({ sector: "Steel" });
        expect(params.get("sector")).toBe("Steel");
      });

      it("ignores a search sector the pathways do not share", async () => {
        const { params } = await clickCompare({ sector: "Cement" });
        expect(params.get("sector")).toBe("Power");
      });

      it("percent-encodes a token containing spaces", async () => {
        // Geography tokens are publisher prose, not slugs.
        const { search } = await clickCompare();
        expect(search).toContain("p1:South%20East%20Asia");
      });
    });
  });
});
