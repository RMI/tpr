import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRef } from "react";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import OnPageIndex from "./OnPageIndex";
import { MockIntersectionObserver } from "../test/mockIntersectionObserver";

/** Harness: a container with three real headings, plus the index itself.
 * The second section has sub-headings, so the nesting behavior can be
 * exercised alongside the flat cases. */
const Harness: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <OnPageIndex containerRef={containerRef} />
      <div ref={containerRef}>
        <h2 id="first">First section</h2>
        <h2 id="second">Second section</h2>
        <h3 id="second-a">Second A</h3>
        <h3 id="second-b">Second B</h3>
        <h2 id="third">Third section</h2>
      </div>
    </>
  );
};

const getActiveLink = () =>
  screen.getAllByRole("link").find((link) => link.getAttribute("aria-current"));

const linkTexts = () =>
  screen.getAllByRole("link").map((link) => link.textContent);

describe("OnPageIndex", () => {
  // `location`/`history` persist across tests within this file (jsdom is
  // shared per test file, not per test), so start each test from a clean,
  // hash-free URL.
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

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

  it("keeps the URL shareable: clicking a heading updates the hash via replaceState", () => {
    render(<Harness />);
    const replaceState = vi.spyOn(window.history, "replaceState");

    fireEvent.click(screen.getByRole("link", { name: "Second section" }));

    expect(replaceState).toHaveBeenCalledWith(null, "", "#second");
  });

  it("clears the hash from the URL when 'Back to top' is clicked", () => {
    window.history.replaceState(null, "", "#second");
    render(<Harness />);
    const replaceState = vi.spyOn(window.history, "replaceState");
    const pathAndSearch = window.location.pathname + window.location.search;

    fireEvent.click(screen.getByRole("link", { name: /Back to top/ }));

    expect(replaceState).toHaveBeenCalledWith(null, "", pathAndSearch);
  });

  it("deep link: lands on and activates the section matching the URL hash on mount, instead of the first entry", () => {
    window.history.replaceState(null, "", "#second");
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");

    render(<Harness />);

    expect(getActiveLink()?.textContent).toBe("Second section");
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
  });

  it("falls back to the first entry when the URL hash doesn't match any section on this page", () => {
    window.history.replaceState(null, "", "#not-a-real-section");
    render(<Harness />);
    expect(getActiveLink()?.textContent).toBe("First section");
  });
});

describe("OnPageIndex — nested sub-headings (#955)", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("hides a section's sub-entries while another section is in view", () => {
    render(<Harness />);
    // "First section" is active on load and has no sub-headings of its own.
    expect(linkTexts()).not.toContain("Second A");
    expect(linkTexts()).not.toContain("Second B");
  });

  it("reveals a section's sub-entries when it becomes the active one", () => {
    render(<Harness />);
    const observer = MockIntersectionObserver.instances[0];

    act(() => {
      observer.trigger(document.getElementById("second")!, true);
    });

    expect(linkTexts()).toContain("Second A");
    expect(linkTexts()).toContain("Second B");
  });

  it("hides them again once a different section takes over", () => {
    render(<Harness />);
    const observer = MockIntersectionObserver.instances[0];

    act(() => {
      observer.trigger(document.getElementById("second")!, true);
    });
    expect(linkTexts()).toContain("Second A");

    act(() => {
      observer.trigger(document.getElementById("second")!, false);
      observer.trigger(document.getElementById("third")!, true);
    });

    expect(getActiveLink()?.textContent).toBe("Third section");
    expect(linkTexts()).not.toContain("Second A");
  });

  it("keeps the parent section expanded when a sub-heading is the one in view", () => {
    render(<Harness />);
    const observer = MockIntersectionObserver.instances[0];

    act(() => {
      observer.trigger(document.getElementById("second-b")!, true);
    });

    expect(getActiveLink()?.textContent).toBe("Second B");
    // Its sibling stays listed — the whole section's sub-entries are shown.
    expect(linkTexts()).toContain("Second A");
  });

  it("activates the topmost heading when several are inside the trigger band at once", () => {
    render(<Harness />);
    const observer = MockIntersectionObserver.instances[0];

    // Reported out of document order, as a real IntersectionObserver may.
    act(() => {
      observer.trigger(document.getElementById("second-b")!, true);
      observer.trigger(document.getElementById("second")!, true);
      observer.trigger(document.getElementById("second-a")!, true);
    });

    expect(getActiveLink()?.textContent).toBe("Second section");

    // As the section scrolls past, the next heading down takes over.
    act(() => {
      observer.trigger(document.getElementById("second")!, false);
    });
    expect(getActiveLink()?.textContent).toBe("Second A");
  });

  it("keeps the last active entry when no heading is inside the band", () => {
    render(<Harness />);
    const observer = MockIntersectionObserver.instances[0];

    act(() => {
      observer.trigger(document.getElementById("third")!, true);
    });
    act(() => {
      observer.trigger(document.getElementById("third")!, false);
    });

    expect(getActiveLink()?.textContent).toBe("Third section");
  });

  it("scrolls to a sub-heading and updates the hash when its entry is clicked", () => {
    render(<Harness />);
    const observer = MockIntersectionObserver.instances[0];
    act(() => {
      observer.trigger(document.getElementById("second")!, true);
    });

    const scrollIntoView = vi.fn();
    document.getElementById("second-b")!.scrollIntoView = scrollIntoView;
    const replaceState = vi.spyOn(window.history, "replaceState");

    fireEvent.click(screen.getByRole("link", { name: "Second B" }));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(replaceState).toHaveBeenCalledWith(null, "", "#second-b");
    expect(getActiveLink()?.textContent).toBe("Second B");
  });

  it("deep link: a URL pointing at a sub-heading lands on it and expands its parent", () => {
    window.history.replaceState(null, "", "#second-a");
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");

    render(<Harness />);

    expect(getActiveLink()?.textContent).toBe("Second A");
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    expect(linkTexts()).toContain("Second B");
  });
});
