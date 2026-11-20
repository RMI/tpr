import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router";
import HelpButton from "./HelpButton";

const LocationProbe = () => {
  const { pathname, hash } = useLocation();
  return <div data-testid="location">{pathname + hash}</div>;
};

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <button type="button">Outside</button>
              <Link to="/compare">Go to compare</Link>
              <HelpButton />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

const helpButton = () => screen.getByRole("button", { name: "Help" });
const panel = () => screen.queryByRole("dialog", { name: "Help" });

const pulse = () => screen.queryByTestId("help-pulse");

describe("HelpButton", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("pulses until help is first opened, and remembers that across pages", async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt("/pathway");
    expect(pulse()).toBeInTheDocument();

    await user.click(helpButton());
    expect(pulse()).toBeNull();
    expect(localStorage.getItem("help-seen")).toBe("true");
    unmount();

    renderAt("/compare");
    expect(pulse()).toBeNull();
  });

  it("stops pulsing for the visit when storage can't save that help was opened", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const user = userEvent.setup();
    renderAt("/pathway");
    expect(pulse()).toBeInTheDocument();

    await user.click(helpButton());
    expect(pulse()).toBeNull();

    // Moving to another page remounts the panel; the pulse must not return.
    await user.click(screen.getByRole("link", { name: "Go to compare" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/compare");
    expect(pulse()).toBeNull();
  });

  it("does not pulse when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    renderAt("/pathway");
    expect(helpButton()).toBeInTheDocument();
    expect(pulse()).toBeNull();
  });

  it("renders only on the Card, Detail and Comparison views", () => {
    for (const url of ["/pathway", "/pathway/abc", "/compare?ids=a,b"]) {
      const { unmount } = renderAt(url);
      expect(helpButton()).toBeInTheDocument();
      unmount();
    }
    for (const url of ["/", "/resources/methodology", "/contact"]) {
      const { unmount } = renderAt(url);
      expect(screen.queryByRole("button", { name: "Help" })).toBeNull();
      unmount();
    }
  });

  it("opens with the button and closes with the button, X, Escape and an outside click", async () => {
    const user = userEvent.setup();
    renderAt("/pathway");

    expect(helpButton()).toHaveAttribute("aria-expanded", "false");
    await user.click(helpButton());
    expect(panel()).toBeInTheDocument();
    expect(helpButton()).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("heading", { name: "How can we help?" }),
    ).toHaveFocus();

    await user.click(helpButton());
    expect(panel()).toBeNull();

    await user.click(helpButton());
    await user.click(screen.getByRole("button", { name: "Close help" }));
    expect(panel()).toBeNull();
    expect(helpButton()).toHaveFocus();

    await user.click(helpButton());
    await user.keyboard("{Escape}");
    expect(panel()).toBeNull();
    expect(helpButton()).toHaveFocus();

    await user.click(helpButton());
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(panel()).toBeNull();
  });

  it("shows an answer with Back and Close, and returns to the list", async () => {
    const user = userEvent.setup();
    renderAt("/pathway");
    await user.click(helpButton());

    await user.click(
      screen.getByRole("button", { name: "How do I compare pathways?" }),
    );
    expect(
      screen.getByRole("heading", { name: "How do I compare pathways?" }),
    ).toHaveFocus();
    expect(screen.getByText(/comparison tray/)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Read more: How to compare pathways" }),
    ).toHaveAttribute(
      "href",
      "/resources/how-to-choose-a-pathway#how-to-compare-pathways",
    );
    expect(
      screen.getByRole("button", { name: "Close help" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to questions" }));
    expect(
      screen.getByRole("heading", { name: "How can we help?" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Back to questions" }),
    ).toBeNull();
  });

  it("reopens on the list of questions", async () => {
    const user = userEvent.setup();
    renderAt("/pathway");
    await user.click(helpButton());
    await user.click(
      screen.getByRole("button", { name: "How do I compare pathways?" }),
    );
    await user.keyboard("{Escape}");
    await user.click(helpButton());
    expect(
      screen.getByRole("heading", { name: "How can we help?" }),
    ).toBeInTheDocument();
  });

  it("shows no Read more link for coming-soon answers", async () => {
    const user = userEvent.setup();
    renderAt("/pathway/abc?tab=timeseries");
    await user.click(helpButton());
    await user.click(
      screen.getByRole("button", {
        name: "How do I read the benchmark plots?",
      }),
    );
    expect(screen.getByText(/coming soon/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Read more/ })).toBeNull();
  });

  it("puts the active Detail tab's questions last", async () => {
    const user = userEvent.setup();
    renderAt("/pathway/abc?tab=scope");
    await user.click(helpButton());
    const groupHeadings = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(groupHeadings).toEqual(["Pathway detail", "Scope & Granularity"]);
  });

  it("links to the general docs and closes when a link is followed", async () => {
    const user = userEvent.setup();
    renderAt("/compare");
    await user.click(helpButton());

    const docs = screen.getByRole("navigation", { name: "Documentation" });
    expect(docs).toHaveTextContent("Methodology");
    expect(docs).toHaveTextContent("How to choose a pathway");
    expect(docs).toHaveTextContent("FAQ");

    await user.click(
      screen.getByRole("button", {
        name: "What does the Comparison Page show me?",
      }),
    );
    await user.click(
      screen.getByRole("link", { name: "Read more: How to compare pathways" }),
    );
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/resources/how-to-choose-a-pathway#how-to-compare-pathways",
    );
    expect(panel()).toBeNull();
  });
});
