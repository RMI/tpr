import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { MockIntersectionObserver } from "./mockIntersectionObserver";

// Cleanup after each test
afterEach(() => {
  cleanup();
  MockIntersectionObserver.instances.length = 0;
});

// Mock ResizeObserver for PathwayCard component
// This is necessary because ResizeObserver is not available in the test environment.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Add the mock to the global object if it doesn't exist
if (typeof window !== "undefined") {
  window.ResizeObserver = window.ResizeObserver || MockResizeObserver;

  // Mock IntersectionObserver for OnPageIndex's scroll-spy behavior.
  // Not available in the test environment either.
  window.IntersectionObserver =
    window.IntersectionObserver ||
    (MockIntersectionObserver as unknown as typeof IntersectionObserver);

  // jsdom does not implement scrollIntoView at all.
  if (typeof window.HTMLElement.prototype.scrollIntoView !== "function") {
    window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
  }
}
