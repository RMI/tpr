import "@testing-library/jest-dom/vitest";
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
  // Installed unconditionally (unlike the ResizeObserver mock above): the
  // OnPageIndex tests reach into `MockIntersectionObserver.instances` and
  // call `.trigger()` on them directly, so if a real IntersectionObserver
  // ever became available here (a jsdom upgrade, a switch to happy-dom,
  // etc.), an `existing || mock` guard would silently skip installing the
  // controllable mock and those tests would fail confusingly instead of
  // cleanly.
  window.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;

  // jsdom does not implement scrollIntoView at all.
  if (typeof window.HTMLElement.prototype.scrollIntoView !== "function") {
    window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
  }

  /*
    jsdom (30.1.1 at the time of writing) parses <dialog> but implements
    neither showModal() nor close(): both are `undefined`, so any component
    built on a native dialog throws the moment it opens.

    This shim is deliberately thin. It tracks the `open` attribute and fires
    the `close` event, which is what the editions modal and its tests rely on.
    It does NOT reproduce the top layer, the ::backdrop box, focus trapping or
    inertness, so none of those can be asserted here -- they are real browser
    behaviour and are verified in the browser instead.

    Guarded so a future jsdom that implements dialog properly wins over the
    shim rather than being silently replaced by it.
  */
  const dialogProto = window.HTMLDialogElement?.prototype;
  if (dialogProto && typeof dialogProto.showModal !== "function") {
    dialogProto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    dialogProto.show = function show(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    dialogProto.close = function close(
      this: HTMLDialogElement,
      returnValue?: string,
    ) {
      if (!this.hasAttribute("open")) return;
      this.removeAttribute("open");
      if (returnValue !== undefined) this.returnValue = returnValue;
      this.dispatchEvent(new window.Event("close"));
    };
  }
}
