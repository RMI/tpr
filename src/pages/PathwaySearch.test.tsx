import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PathwaySearch from "./PathwaySearch";
import { pathwayMetadata } from "../data/pathwayMetadata";
import { PathwayMetadataType } from "../types";
import userEvent from "@testing-library/user-event";
import { FilterProvider } from "../context/FilterContext";
import { ComparisonProvider } from "../context/ComparisonContext";

// Mock the PathwayCard component to simplify testing
vi.mock("../components/PathwayCard", () => ({
  default: ({ pathway }: { pathway: PathwayMetadataType }) => (
    <div
      data-testid="pathway-card"
      data-pathway-id={pathway.id}
    >
      {pathway.name.short || pathway.name.full}
    </div>
  ),
}));

describe("PathwaySearch component", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  const renderPathwaySearch = () => {
    return render(
      <MemoryRouter>
        <FilterProvider>
          <ComparisonProvider>
            <PathwaySearch />
          </ComparisonProvider>
        </FilterProvider>
      </MemoryRouter>,
    );
  };

  it("renders a PathwayCard for each pathway in the data", () => {
    renderPathwaySearch();
    // Check that the correct number of pathway cards are rendered.
    // queryAll (not getAll) so an empty dataset yields [] rather than throwing —
    // src/data may be fully excluded by validation until it is migrated.
    const pathwayCards = screen.queryAllByTestId("pathway-card");
    expect(pathwayCards).toHaveLength(pathwayMetadata.length);
  });
});

describe("PathwaySearch integration: dropdowns render and filter with 'None'", () => {
  // IMPORTANT: we dynamically render PathwaySearch AFTER mocking pathwayMetadata,
  // so these tests don't interfere with any existing unit tests in this file.
  let PathwaySearchUnderTest: React.ComponentType<unknown>;

  // Use a typed userEvent instance to avoid "no-unsafe-call" on user interactions
  let u: ReturnType<typeof userEvent.setup>;

  const fixtures = [
    {
      id: "A",
      name: { full: "Pathway A", short: "no sectors, no geo, no temp" },
      sectors: undefined, // -> Sector "None"
      geography: undefined, // -> Geography "None"
      modelTempIncrease: undefined, // -> Temperature "None"
      pathwayType: "Net Zero",
      modelYearNetzero: 2050,
      metric: [],
      keyFeatures: { emissionsTrajectory: "foo" },
    },
    {
      id: "B",
      name: { full: "Pathway B", short: "Power, Europe, 2°C" },
      sectors: [{ name: "Power" }],
      geography: { regions: { Europe: [] } },
      modelTempIncrease: 2,
      pathwayType: "Net Zero",
      modelYearNetzero: 2050,
      metric: ["Capacity"],
      keyFeatures: { emissionsTrajectory: "foo" },
    },
    {
      id: "C",
      name: { full: "Pathway C", short: "empty sectors[], empty geo[], 1.5°C" },
      sectors: [], // -> Sector "None"
      geography: {}, // -> Geography "None"
      modelTempIncrease: 1.5,
      pathwayType: "NZi2050",
      modelYearNetzero: 2040,
      metric: [],
      keyFeatures: { emissionsTrajectory: "foo" },
    },
    {
      id: "D",
      name: { full: "Pathway D", short: "Steel, Asia, no temp" },
      sectors: [{ name: "Steel" }],
      geography: { regions: { Asia: [] } },
      modelTempIncrease: undefined, // -> Temperature "None"
      pathwayType: "BAU",
      modelYearNetzero: 2030,
      metric: ["Capacity", "Generation"],
      keyFeatures: { emissionsTrajectory: "bar" },
    },
    {
      id: "E",
      name: { full: "Pathway E", short: "Power, Europe+Asia, 2°C" },
      sectors: [{ name: "Power" }],
      geography: { regions: { Europe: [], Asia: [] } },
      modelTempIncrease: 2,
      pathwayType: "Net Zero",
      modelYearNetzero: 2050,
      metric: ["Generation"],
      keyFeatures: { emissionsTrajectory: "bar" },
    },
  ] as const;

  async function mountWithFixtures(): Promise<void> {
    sessionStorage.clear();
    // Reset module graph so our mock applies to the next import.
    vi.resetModules();
    // Mock BEFORE importing PathwaySearch
    vi.doMock(
      "../data/pathwayMetadata",
      () => ({ pathwayMetadata: fixtures }),
      {
        virtual: true,
      },
    );
    // FilterProvider must be imported from the same fresh module graph so
    // it shares the same React context instance as the re-imported PathwaySearch.
    const [
      { default: Component },
      { FilterProvider: FP },
      { ComparisonProvider: CP },
    ] = await Promise.all([
      import("./PathwaySearch"),
      import("../context/FilterContext"),
      import("../context/ComparisonContext"),
    ]);
    PathwaySearchUnderTest = Component;
    render(
      <MemoryRouter>
        <FP>
          <CP>
            <PathwaySearchUnderTest />
          </CP>
        </FP>
      </MemoryRouter>,
    );
  }

  async function openDropdown(labelRegex: RegExp): Promise<HTMLButtonElement> {
    // Labels are now inside the trigger button’s accessible name (e.g., "Sector..." / "Sector: 2").
    const triggers = await screen.findAllByRole(
      "button",
      { name: labelRegex },
      { timeout: 2000 },
    );
    const trigger =
      triggers.find((b) => b.getAttribute("aria-haspopup") === "listbox") ??
      triggers[0];
    if (!trigger) {
      const all = (await screen.findAllByRole("button"))
        .map((n) => `"${n.textContent}"`)
        .join(", ");
      throw new Error(
        `Dropdown trigger not found for ${labelRegex}. Button candidates: ${all}`,
      );
    }
    await u.click(trigger);
    return trigger as HTMLButtonElement;
  }

  async function selectOption(optionText: string): Promise<void> {
    const opt = await screen.findByText(optionText, {}, { timeout: 2000 });
    await u.click(opt);
  }

  function expectVisible(names: string[]) {
    for (const n of names) expect(screen.getByText(n)).toBeInTheDocument();
  }
  function expectHidden(names: string[]) {
    for (const n of names)
      expect(screen.queryByText(n)).not.toBeInTheDocument();
  }

  // Vitest awaits async hooks; this is safe in tests.
  beforeEach(async () => {
    u = userEvent.setup();
    await mountWithFixtures();
  });

  it("Sector: shows 'None' when any pathway has no sectors, selecting it filters correctly", async () => {
    await openDropdown(/sector/i);
    expect(await screen.findByText("None")).toBeInTheDocument();
    await selectOption("None");

    // Only pathways with no sectors: A (undefined), C (empty array)
    expectVisible([
      "no sectors, no geo, no temp",
      "empty sectors[], empty geo[], 1.5°C",
    ]);
    expectHidden(["Power, Europe, 2°C", "Steel, Asia, no temp"]);
  });

  it("Geography: shows 'None' when any pathway has missing/empty geography, selecting it filters correctly", async () => {
    await openDropdown(/geography/i);
    expect(await screen.findByText("None")).toBeInTheDocument();
    await selectOption("None");

    // Only pathways with no geography: A (undefined), C (empty array)
    expectVisible([
      "no sectors, no geo, no temp",
      "empty sectors[], empty geo[], 1.5°C",
    ]);
    expectHidden(["Power, Europe, 2°C", "Steel, Asia, no temp"]);
  });

  // Concrete selection (requested): pick a real value and ensure only matching pathways remain
  it("Sector: selecting a concrete option (Power) filters correctly", async () => {
    await openDropdown(/sector/i);
    // Select a real sector option
    await selectOption("Power");
    // Only Pathway B has sector "Power"
    expectVisible(["Power, Europe, 2°C"]);
    expectHidden([
      "no sectors, no geo, no temp",
      "empty sectors[], empty geo[], 1.5°C",
      "Steel, Asia, no temp",
    ]);
  });

  it("Geography: ANY vs ALL toggle affects results (Europe + Asia)", async () => {
    await openDropdown(/geography/i);
    await selectOption("Europe");
    await selectOption("Asia");

    // ANY (default): shows anything with Europe OR Asia → B, D, E
    expectVisible([
      "Power, Europe, 2°C",
      "Steel, Asia, no temp",
      "Power, Europe+Asia, 2°C",
    ]);

    // Switch to ALL inside the open menu
    await u.click(screen.getByTestId("mode-toggle"));
    // Only E has both Europe and Asia
    expectVisible(["Power, Europe+Asia, 2°C"]);
    expectHidden([
      "Power, Europe, 2°C",
      "Steel, Asia, no temp",
      "no sectors, no geo, no temp",
      "empty sectors[], empty geo[], 1.5°C",
    ]);
  });
});
