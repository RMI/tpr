import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useSessionFlag } from "./useSessionFlag";

const KEY = "test-flag";

const Harness: React.FC = () => {
  const [on, setOn] = useSessionFlag(KEY);
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
    >
      {on ? "on" : "off"}
    </button>
  );
};

describe("useSessionFlag", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts off when nothing is stored", () => {
    render(<Harness />);
    expect(screen.getByRole("button")).toHaveTextContent("off");
  });

  it("stores each change", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent("on");
    expect(sessionStorage.getItem(KEY)).toBe("true");

    fireEvent.click(screen.getByRole("button"));
    expect(sessionStorage.getItem(KEY)).toBe("false");
  });

  it("restores the stored value on a fresh mount", () => {
    // Leaving the page unmounts it; coming back mounts it again.
    const { unmount } = render(<Harness />);
    fireEvent.click(screen.getByRole("button"));
    unmount();

    render(<Harness />);
    expect(screen.getByRole("button")).toHaveTextContent("on");
  });

  it("falls back to off and keeps working when sessionStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    render(<Harness />);
    expect(screen.getByRole("button")).toHaveTextContent("off");

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent("on");
  });
});
