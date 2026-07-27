import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ComparisonProvider,
  useComparison,
  MAX_COMPARED,
} from "./ComparisonContext";

const SESSION_KEY = "pathway-comparison";

// ── Minimal consumer that exercises all context operations ──────────────────

const ComparisonConsumer = () => {
  const {
    comparedPathwayIds,
    addToComparison,
    removeFromComparison,
    clearComparison,
    isInComparison,
  } = useComparison();
  return (
    <div>
      <span data-testid="ids">{JSON.stringify(comparedPathwayIds)}</span>
      <span data-testid="in-a">{String(isInComparison("a"))}</span>
      <button
        data-testid="add-a"
        onClick={() => addToComparison("a")}
      >
        Add A
      </button>
      <button
        data-testid="add-b"
        onClick={() => addToComparison("b")}
      >
        Add B
      </button>
      <button
        data-testid="add-c"
        onClick={() => addToComparison("c")}
      >
        Add C
      </button>
      <button
        data-testid="add-d"
        onClick={() => addToComparison("d")}
      >
        Add D
      </button>
      <button
        data-testid="remove-a"
        onClick={() => removeFromComparison("a")}
      >
        Remove A
      </button>
      <button
        data-testid="clear"
        onClick={clearComparison}
      >
        Clear
      </button>
    </div>
  );
};

const renderConsumer = () =>
  render(
    <ComparisonProvider>
      <ComparisonConsumer />
    </ComparisonProvider>,
  );

const getIds = (): string[] => {
  const raw: unknown = JSON.parse(
    screen.getByTestId("ids").textContent ?? "[]",
  );
  return raw as string[];
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("ComparisonContext", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("starts empty when sessionStorage has no entry", () => {
    renderConsumer();
    expect(getIds()).toEqual([]);
  });

  it("loads saved selections from sessionStorage on mount", () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(["a", "b"]));
    renderConsumer();
    expect(getIds()).toEqual(["a", "b"]);
  });

  it("addToComparison persists the new id to sessionStorage", async () => {
    const u = userEvent.setup();
    renderConsumer();
    await u.click(screen.getByTestId("add-a"));
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY)!)).toEqual(["a"]);
  });

  it("removeFromComparison updates sessionStorage", async () => {
    const u = userEvent.setup();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(["a", "b"]));
    renderConsumer();
    await u.click(screen.getByTestId("remove-a"));
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY)!)).toEqual(["b"]);
  });

  it("clearComparison removes the sessionStorage key and resets state", async () => {
    const u = userEvent.setup();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(["a", "b"]));
    renderConsumer();
    await u.click(screen.getByTestId("clear"));
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(getIds()).toEqual([]);
  });

  it("does not add a duplicate id", async () => {
    const u = userEvent.setup();
    renderConsumer();
    await u.click(screen.getByTestId("add-a"));
    await u.click(screen.getByTestId("add-a"));
    expect(getIds()).toEqual(["a"]);
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY)!)).toEqual(["a"]);
  });

  it(`enforces MAX_COMPARED (${MAX_COMPARED}) limit — 4th add is ignored`, async () => {
    const u = userEvent.setup();
    renderConsumer();
    await u.click(screen.getByTestId("add-a"));
    await u.click(screen.getByTestId("add-b"));
    await u.click(screen.getByTestId("add-c"));
    await u.click(screen.getByTestId("add-d"));
    expect(getIds()).toHaveLength(MAX_COMPARED);
    expect(getIds()).not.toContain("d");
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY)!)).toHaveLength(
      MAX_COMPARED,
    );
  });

  it("falls back to empty state when sessionStorage contains invalid JSON", () => {
    sessionStorage.setItem(SESSION_KEY, "not-valid-json{{{");
    renderConsumer();
    expect(getIds()).toEqual([]);
  });

  it("falls back to empty state when sessionStorage contains a non-array value", () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: "a" }));
    renderConsumer();
    expect(getIds()).toEqual([]);
  });

  it("isInComparison reflects the current selection", async () => {
    const u = userEvent.setup();
    renderConsumer();
    expect(screen.getByTestId("in-a").textContent).toBe("false");
    await u.click(screen.getByTestId("add-a"));
    expect(screen.getByTestId("in-a").textContent).toBe("true");
    await u.click(screen.getByTestId("remove-a"));
    expect(screen.getByTestId("in-a").textContent).toBe("false");
  });
});
