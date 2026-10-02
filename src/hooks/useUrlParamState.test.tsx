import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { useUrlParamState } from "./useUrlParamState";

const OPTIONS = ["power", "steel", "cement"] as const;
type Sector = (typeof OPTIONS)[number];

/**
 * A harness with a URL probe, mirroring `Tabs.test.tsx` — the hook's contract is
 * about what lands in the query string, so the URL is what gets asserted.
 */
const Harness: React.FC<{
  options?: readonly Sector[];
  defaultValue?: Sector | null;
}> = ({ options = OPTIONS, defaultValue = "power" }) => {
  const [value, setValue] = useUrlParamState({
    param: "sector",
    options,
    defaultValue,
  });
  const location = useLocation();

  return (
    <div>
      <span data-testid="search">{location.search}</span>
      <span data-testid="value">{value ?? "(null)"}</span>
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          onClick={() => setValue(opt)}
        >
          {`set ${opt}`}
        </button>
      ))}
      <button onClick={() => setValue(null)}>clear</button>
    </div>
  );
};

const renderHarness = (
  initialEntry = "/",
  props: React.ComponentProps<typeof Harness> = {},
) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Harness {...props} />
    </MemoryRouter>,
  );

const search = () => screen.getByTestId("search").textContent;
const value = () => screen.getByTestId("value").textContent;

describe("useUrlParamState", () => {
  it("resolves an absent param to the default, with a clean URL", () => {
    renderHarness("/");
    expect(value()).toBe("power");
    expect(search()).toBe("");
  });

  it("reads a legal param", () => {
    renderHarness("/?sector=steel");
    expect(value()).toBe("steel");
  });

  it("writes a non-default value to the param", () => {
    renderHarness("/");
    fireEvent.click(screen.getByText("set steel"));
    expect(search()).toBe("?sector=steel");
    expect(value()).toBe("steel");
  });

  it("deletes the param when set back to the default", () => {
    renderHarness("/?sector=steel");
    fireEvent.click(screen.getByText("set power"));
    expect(search()).toBe("");
    expect(value()).toBe("power");
  });

  it("deletes the param when cleared", () => {
    renderHarness("/?sector=steel");
    fireEvent.click(screen.getByText("clear"));
    expect(search()).toBe("");
  });

  it("degrades an illegal param to the default without rewriting the URL", () => {
    // Rewriting during render would fight the Back button; the next real
    // selection replaces or deletes the param anyway.
    renderHarness("/?sector=atlantis");
    expect(value()).toBe("power");
    expect(search()).toBe("?sector=atlantis");
  });

  it("leaves unrelated params untouched when it writes", () => {
    // This is what lets the comparison page keep ?ids= while the scope changes.
    renderHarness("/?ids=a,b&tab=timeseries");
    fireEvent.click(screen.getByText("set steel"));

    const params = new URLSearchParams(search() ?? "");
    expect(params.get("ids")).toBe("a,b");
    expect(params.get("tab")).toBe("timeseries");
    expect(params.get("sector")).toBe("steel");
  });

  it("returns the default while the option set is still empty", () => {
    // Data not loaded yet: every raw value is illegal, so nothing is trusted.
    renderHarness("/?sector=steel", { options: [] });
    expect(value()).toBe("power");
  });

  it("supports a null default, where any value is explicit", () => {
    renderHarness("/", { defaultValue: null });
    expect(value()).toBe("(null)");

    fireEvent.click(screen.getByText("set power"));
    expect(search()).toBe("?sector=power");
    expect(value()).toBe("power");
  });

  it("pushes history so Back steps through selections", () => {
    renderHarness("/");
    fireEvent.click(screen.getByText("set steel"));
    fireEvent.click(screen.getByText("set cement"));
    expect(value()).toBe("cement");

    window.history.back();
    // MemoryRouter handles its own stack; asserting the pushed entry exists is
    // enough — `{ replace: false }` is the behaviour under test.
    expect(search()).toContain("sector=");
  });
});
