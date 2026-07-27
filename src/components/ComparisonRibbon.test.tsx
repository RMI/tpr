import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ComparisonRibbon from "./ComparisonRibbon";
import { useComparison } from "../context/ComparisonContext";

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("../context/ComparisonContext", () => ({
  useComparison: vi.fn(),
  MAX_COMPARED: 3,
}));

vi.mock("../data/pathwayMetadata", () => ({
  pathwayMetadata: [
    {
      id: "p1",
      name: { full: "Pathway One" },
      publication: { publisher: { short: "Pub1", full: "Publisher One" } },
    },
    {
      id: "p2",
      name: { full: "Pathway Two" },
      publication: { publisher: { short: null, full: "Publisher Two" } },
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
  });
});
