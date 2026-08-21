import { describe, it, expect, vi } from "vitest";
import { useRef } from "react";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import OnPageIndex from "./OnPageIndex";
import { MockIntersectionObserver } from "../test/mockIntersectionObserver";

/** Harness: a container with three real headings, plus the index itself. */
const Harness: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <OnPageIndex containerRef={containerRef} />
      <div ref={containerRef}>
        <h2 id="first">First section</h2>
        <h2 id="second">Second section</h2>
        <h2 id="third">Third section</h2>
      </div>
    </>
  );
};

const getActiveLink = () =>
  screen.getAllByRole("link").find((link) => link.getAttribute("aria-current"));

describe("OnPageIndex", () => {
  it("renders one link per indexed heading, in DOM order, using the heading text", () => {
    render(<Harness />);
    const nav = screen.getByRole("navigation", { name: "On this page" });
    const links = within(nav).getAllByRole("link");
    // First entry is the "Back to top" link, which isn't one of the
    // indexed headings — see the dedicated tests for it below.
    expect(links.slice(1).map((link) => link.textContent)).toEqual([
      "First section",
      "Second section",
      "Third section",
    ]);
  });

  it("renders a 'Back to top' entry before the indexed headings", () => {
    render(<Harness />);
    const nav = screen.getByRole("navigation", { name: "On this page" });
    const links = within(nav).getAllByRole("link");
    expect(links[0].textContent).toContain("Back to top");
  });

  it("scrolls to the top of the page and re-activates the first entry when 'Back to top' is clicked", () => {
    render(<Harness />);
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;

    // First, move away from the first entry so the reset is observable.
    const observer = MockIntersectionObserver.instances[0];
    act(() => {
      observer.trigger(document.getElementById("third")!, true);
    });
    expect(getActiveLink()?.textContent).toBe("Third section");

    fireEvent.click(screen.getByRole("link", { name: /Back to top/ }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    expect(getActiveLink()?.textContent).toBe("First section");
  });

  it("marks the first entry active on load, before any scroll/intersection events", () => {
    render(<Harness />);
    expect(getActiveLink()?.textContent).toBe("First section");
  });

  it("moves the active entry when a later heading intersects, and un-marks the previous one", () => {
    render(<Harness />);
    const observer = MockIntersectionObserver.instances[0];
    const secondHeading = document.getElementById("second")!;

    act(() => {
      observer.trigger(secondHeading, true);
    });

    const activeLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current"));
    expect(activeLinks).toHaveLength(1);
    expect(activeLinks[0].textContent).toBe("Second section");
  });

  it("activates the last entry once the reader reaches the bottom of the page", () => {
    render(<Harness />);

    Object.defineProperty(window, "innerHeight", {
      value: 800,
      configurable: true,
    });
    Object.defineProperty(window, "scrollY", {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 1800,
      configurable: true,
    });

    fireEvent.scroll(window);

    expect(getActiveLink()?.textContent).toBe("Third section");
  });

  it("scrolls the target heading into view and activates it when its link is clicked", () => {
    render(<Harness />);
    const scrollIntoView = vi.fn();
    const thirdHeading = document.getElementById("third")!;
    thirdHeading.scrollIntoView = scrollIntoView;

    fireEvent.click(screen.getByRole("link", { name: "Third section" }));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(getActiveLink()?.textContent).toBe("Third section");
  });
});
