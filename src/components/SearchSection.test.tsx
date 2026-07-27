import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SearchSection from "./SearchSection";
import { SearchFilters } from "../types";
import { PathwayMetadataType } from "../types";
import userEvent from "@testing-library/user-event";

// Mock the pathwayMetadata import
vi.mock("../data/pathwayMetadata", async () => {
  const [s1, s2, s3, s4] = await Promise.all([
    import("../../testdata/valid/pathwayMetadata_sample_01.json", {
      assert: { type: "json" },
    }),
    import("../../testdata/valid/pathwayMetadata_sample_02.json", {
      assert: { type: "json" },
    }),
    import("../../testdata/valid/pathwayMetadata_sample_03.json", {
      assert: { type: "json" },
    }),
    import("../../testdata/valid/pathwayMetadata_sample_04.json", {
      assert: { type: "json" },
    }),
  ]);

  const mockPathways = [
    s1.default,
    s2.default,
    s3.default,
    s4.default,
  ] as PathwayMetadataType[];

  return { pathwayMetadata: mockPathways };
});

describe("SearchSection", () => {
  // Default props for the component
  const defaultProps = {
    filters: {} as SearchFilters,
    pathwaysNumber: 2,
    onFilterChange: vi.fn(),
    onSearch: vi.fn(),
    onClear: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function openByLabel(labelText: string) {
    // Labels now live inside the trigger’s accessible name (e.g., "Sector..." or "Sector: 3").
    const btn = screen.getByRole("button", {
      name: new RegExp(`^${labelText}\\b`, "i"),
    });
    fireEvent.click(btn);
    return btn;
  }

  it("renders all filter dropdowns", () => {
    render(<SearchSection {...defaultProps} />);

    // Labels are the button’s accessible name prefix (followed by "..." or ": N").
    expect(
      screen.getByRole("button", { name: /^Pathway Type\b/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Temperature\b/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Geography\b/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Sector\b/i }),
    ).toBeInTheDocument();
  });

  // This test checks that sectors are properly extracted from the complex object structure
  it("correctly extracts sector names from complex sector objects", () => {
    render(<SearchSection {...defaultProps} />);

    // Open sector dropdown
    openByLabel("Sector");

    // Verify that all unique sector names from the mock data are in the dropdown
    expect(screen.getByText("Agriculture")).toBeInTheDocument();
    expect(screen.getByText("Land Use")).toBeInTheDocument();
    expect(screen.getByText("Steel")).toBeInTheDocument();
    expect(screen.getByText("Buildings")).toBeInTheDocument();
  });

  it("calls onFilterChange with the correct sector name when selected", () => {
    render(<SearchSection {...defaultProps} />);

    // Open sector dropdown
    openByLabel("Sector");

    // Select the "Power" sector
    const powerOption = screen.getByText("Land Use");
    fireEvent.click(powerOption);

    // Verify array-emitting multi-select
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith("sector", [
      "Land Use",
    ]);
  });

  it("shows selected count in the sector trigger", () => {
    const propsWithSector = {
      ...defaultProps,
      filters: { sector: ["Power"] } as unknown as SearchFilters,
    };
    render(<SearchSection {...propsWithSector} />);
    // Trigger shows "Sector: 1"
    const trigger = screen.getByRole("button", { name: /^Sector\b/i });
    expect(trigger).toHaveTextContent(/Sector:\s*1/i);
  });

  it("can clear selected sector filter", () => {
    // Create props with a selected sector
    const propsWithSector = {
      ...defaultProps,
      filters: { sector: "Power" } as SearchFilters,
    };

    render(<SearchSection {...propsWithSector} />);

    // Open dropdown and click "Clear" control
    openByLabel("Sector");
    fireEvent.click(screen.getByText("Clear"));
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith("sector", []);
  });

  it("doesn't break when sectors are objects with name and tooltip properties", () => {
    render(<SearchSection {...defaultProps} />);

    // Try to open each dropdown to ensure they render without errors
    openByLabel("Sector");

    openByLabel("Pathway Type");
    expect(screen.getByText("Exploratory")).toBeInTheDocument();
    expect(screen.getByText("Normative")).toBeInTheDocument();
    expect(screen.getByText("Predictive")).toBeInTheDocument();
  });

  it("Geography: mode toggle to ALL dispatches modes update", () => {
    render(<SearchSection {...defaultProps} />);
    const trigger = screen.getByRole("button", { name: /^Geography\b/i });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByTestId("mode-toggle"));
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith("modes", {
      geography: "ALL",
    });
  });

  it("Sector: mode toggle to ANY dispatches modes update (from existing ALL)", () => {
    const props = {
      ...defaultProps,
      filters: { modes: { sector: "ALL" } } as unknown as SearchFilters,
    };
    render(<SearchSection {...props} />);
    const trigger = screen.getByRole("button", { name: /^Sector\b/i });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByTestId("mode-toggle"));
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith("modes", {
      sector: "ANY",
    });
  });

  describe("does NOT render ANY/ALL toggle for scalar facets", () => {
    for (const facet of ["Pathway Type", "Temperature"] as const) {
      it(`facet: ${facet}`, () => {
        render(<SearchSection {...defaultProps} />);
        const trigger = screen.getByRole("button", {
          name: new RegExp(`^${facet}\\b`, "i"),
        });
        fireEvent.click(trigger);
        expect(screen.queryByTitle("Match any (OR)")).not.toBeInTheDocument();
        expect(screen.queryByTitle("Match all (AND)")).not.toBeInTheDocument();
        // close popover to avoid overlapping menus in the loop
        fireEvent.keyDown(document, { key: "Escape" });
      });
    }
  });

  describe("Clear all filters button (inline with summary)", () => {
    it("renders the summary and clear button together when any filter is applied and calls onClear", () => {
      const props = {
        ...defaultProps,
        filters: { ...defaultProps.filters, geography: ["Europe"] },
      };
      render(<SearchSection {...props} />);

      // There are two matches: placeholder (aria-hidden) + visible summary.
      const allSummaries = screen.getAllByText(/Found \d+ pathways/i);
      const visibleSummary = allSummaries.find(
        (el) => !el.closest('[aria-hidden="true"]'),
      );

      expect(visibleSummary).toBeDefined();

      const clearBtn = screen.getByTestId("clear-all-filters");
      expect(clearBtn).toBeInTheDocument();

      // Visible summary and clear button share a container (the overlay grid div)
      const container = visibleSummary?.closest("div");
      expect(container).not.toBeNull();
      expect(container?.contains(clearBtn)).toBe(true);

      clearBtn.click();
      expect(defaultProps.onClear).toHaveBeenCalledTimes(1);
    });

    it("does not render visible summary or clear button when no filters are applied", () => {
      render(<SearchSection {...defaultProps} />);

      const visibleSummaries = screen
        .queryAllByText(/Found \d+ pathways/i)
        .filter((el) => !el.closest('[aria-hidden="true"]'));

      // Only placeholder should exist; no visible summary
      expect(visibleSummaries).toHaveLength(0);

      // Clear button should not be rendered at all
      expect(screen.queryByTestId("clear-all-filters")).not.toBeInTheDocument();
    });

    it("Temperature use range panels (no ANY/ALL), with 'include absent' checkbox", async () => {
      render(<SearchSection {...defaultProps} />);
      // Open Temperature
      const tempTrigger = screen.getByRole("button", {
        name: /^temperature\b/i,
      });
      await userEvent.click(tempTrigger);
      expect(screen.getAllByRole("spinbutton")).toHaveLength(2);
      expect(
        screen.getByRole("checkbox", {
          name: /include pathways without temperature value/i,
        }),
      ).toBeInTheDocument();
      // ANY/ALL toggle should not be present in the header for range facets
      expect(screen.queryByRole("button", { name: /any/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /all/i })).toBeNull();
    });
  });
});
