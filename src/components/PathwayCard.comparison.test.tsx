import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import PathwayCard from "./PathwayCard";
import { useComparison } from "../context/ComparisonContext";
import type { PathwayMetadataType } from "../types";

/*
  The add-to-comparison button, in its own file.

  It needs both a populated tray and a pathway set with no sector in common,
  and no real pathway can produce the latter — all seven loadable pathways
  declare Power, so the sector restriction is unreachable against shipped data
  and provable only by fixture. Mocking those here keeps the 40-odd tests in
  PathwayCard.test.tsx free of module mocks.
*/

vi.mock("../context/ComparisonContext", () => ({
  useComparison: vi.fn(),
  MAX_COMPARED: 3,
}));

vi.mock("../data/pathwayMetadata", () => ({
  pathwayMetadata: [
    { id: "power-a", sectors: [{ name: "Power" }] },
    { id: "steel-a", sectors: [{ name: "Steel" }] },
  ],
}));

const card = (id: string, sectors: string[]): PathwayMetadataType =>
  ({
    id,
    name: { full: `Pathway ${id}`, short: id },
    description: "A pathway",
    publication: {
      publisher: { full: "Publisher", short: "Pub" },
      title: { full: "Publication" },
      year: 2024,
    },
    pathwayType: "Normative",
    sectors: sectors.map((name) => ({ name, technologies: [] })),
    geography: { global: true, regions: {}, country: [] },
    metric: [],
    keyFeatures: {},
  }) as unknown as PathwayMetadataType;

const mockedUseComparison = vi.mocked(useComparison);

const setTray = (comparedPathwayIds: string[]) => {
  const addToComparison = vi.fn();
  mockedUseComparison.mockReturnValue({
    comparedPathwayIds,
    addToComparison,
    removeFromComparison: vi.fn(),
    clearComparison: vi.fn(),
    isInComparison: (id: string) => comparedPathwayIds.includes(id),
    setComparedPathwayIds: vi.fn(),
    // The button only renders while the selection tray is open.
    ribbonExpanded: true,
    setRibbonExpanded: vi.fn(),
  });
  return { addToComparison };
};

const renderCard = (pathway: PathwayMetadataType) =>
  render(
    <MemoryRouter>
      <PathwayCard
        pathway={pathway}
        searchTerm=""
      />
    </MemoryRouter>,
  );

describe("PathwayCard — add to comparison", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers the button when the tray is empty", () => {
    setTray([]);
    renderCard(card("steel-a", ["Steel"]));

    const button = screen.getByRole("button", { name: "Add to comparison" });
    expect(button).toBeEnabled();
  });

  it("offers the button for a pathway sharing a sector with the tray", () => {
    setTray(["power-a"]);
    renderCard(card("power-b", ["Power", "Steel"]));

    expect(
      screen.getByRole("button", { name: "Add to comparison" }),
    ).toBeEnabled();
  });

  it("blocks a pathway with no sector in common, and says why", () => {
    setTray(["power-a"]);
    renderCard(card("steel-a", ["Steel"]));

    const button = screen.getByRole("button", {
      name: "Cannot add: no sector in common with your selection",
    });
    expect(button).toBeDisabled();
    // The reason is on the accessible name, not only the tooltip.
    expect(button).toHaveAttribute("title", expect.stringContaining("sector"));
  });

  it("does not call addToComparison when blocked", async () => {
    const { addToComparison } = setTray(["power-a"]);
    renderCard(card("steel-a", ["Steel"]));

    await userEvent.click(
      screen.getByRole("button", {
        name: "Cannot add: no sector in common with your selection",
      }),
    );
    expect(addToComparison).not.toHaveBeenCalled();
  });

  it("still reports a full tray rather than the sector reason", () => {
    // Fullness is the more immediate obstacle and comes first.
    setTray(["power-a", "steel-a", "power-a"]);
    renderCard(card("steel-b", ["Steel"]));

    expect(
      screen.getByRole("button", { name: "Comparison full (max 3)" }),
    ).toBeDisabled();
  });

  it("always offers removal for a pathway already compared", () => {
    setTray(["steel-a"]);
    renderCard(card("steel-a", ["Steel"]));

    const button = screen.getByRole("button", {
      name: "Remove from comparison",
    });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("does not block on missing sector data", () => {
    // `sectors` is schema-required but has no minItems, so an empty list is
    // valid. Unknown must not read as incompatible.
    setTray(["power-a"]);
    renderCard(card("no-sectors", []));

    expect(
      screen.getByRole("button", { name: "Add to comparison" }),
    ).toBeEnabled();
  });

  it("ignores tray ids that resolve to no pathway", () => {
    // A stale id must not look like a rule either.
    setTray(["does-not-exist"]);
    renderCard(card("steel-a", ["Steel"]));

    expect(
      screen.getByRole("button", { name: "Add to comparison" }),
    ).toBeEnabled();
  });
});
