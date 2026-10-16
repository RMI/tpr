import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { Tabs, TabPanel, useActiveTab, TabDef } from "./Tabs";

const TABS: TabDef[] = [
  { id: "one", label: "One" },
  { id: "two", label: "Two" },
  { id: "three", label: "Three" },
];

/** A full tabs harness wired through useActiveTab, plus a URL probe. */
const Harness: React.FC = () => {
  const [activeId, setActiveId] = useActiveTab(TABS);
  const location = useLocation();
  return (
    <div>
      <span data-testid="search">{location.search}</span>
      <Tabs
        tabs={TABS}
        activeId={activeId}
        onChange={setActiveId}
        label="Sections"
      />
      {TABS.map((t) => (
        <TabPanel
          key={t.id}
          id={t.id}
          activeId={activeId}
        >
          <p>Panel {t.label}</p>
        </TabPanel>
      ))}
    </div>
  );
};

const renderHarness = (initialEntry = "/") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Harness />
    </MemoryRouter>,
  );

describe("Tabs", () => {
  it("renders a labeled tablist with one tab per definition", () => {
    renderHarness();
    const tablist = screen.getByRole("tablist", { name: "Sections" });
    expect(tablist).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("defaults to the first tab and shows only its panel", () => {
    renderHarness();
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Panel One")).toBeVisible();
    // Inactive panels unmount their children entirely.
    expect(screen.queryByText("Panel Two")).not.toBeInTheDocument();
  });

  it("switches the visible panel on click", () => {
    renderHarness();
    fireEvent.click(screen.getByRole("tab", { name: "Two" }));
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Panel Two")).toBeVisible();
    expect(screen.queryByText("Panel One")).not.toBeInTheDocument();
  });

  it("wires aria-controls / aria-labelledby between tab and panel", () => {
    renderHarness();
    const tab = screen.getByRole("tab", { name: "One" });
    expect(tab).toHaveAttribute("id", "tab-one");
    expect(tab).toHaveAttribute("aria-controls", "tab-panel-one");
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("id", "tab-panel-one");
    expect(panel).toHaveAttribute("aria-labelledby", "tab-one");
  });

  it("uses a roving tabindex — only the active tab is tabbable", () => {
    renderHarness();
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("moves between tabs with Arrow, Home and End keys", () => {
    renderHarness();
    const tablist = screen.getByRole("tablist");

    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(tablist, { key: "End" });
    expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // Wraps around from the last tab to the first.
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(tablist, { key: "Home" });
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("useActiveTab", () => {
  it("restores the active tab from the ?tab= query param (deep link)", () => {
    renderHarness("/?tab=three");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Panel Three")).toBeVisible();
  });

  it("falls back to the default tab for an unknown ?tab= value", () => {
    renderHarness("/?tab=bogus");
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("writes the selected tab to the URL, and clears it for the default", () => {
    renderHarness();
    fireEvent.click(screen.getByRole("tab", { name: "Two" }));
    expect(screen.getByTestId("search")).toHaveTextContent("tab=two");

    // Returning to the default tab drops the param to keep the URL canonical.
    fireEvent.click(screen.getByRole("tab", { name: "One" }));
    expect(screen.getByTestId("search").textContent).toBe("");
  });
});
