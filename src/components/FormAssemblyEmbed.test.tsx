import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import FormAssemblyEmbed, { MIN_FORM_HEIGHT } from "./FormAssemblyEmbed";

const FORM_URL = "https://rmi.tfaforms.net/312";

const renderEmbed = (onFormNavigate?: () => void) => {
  const element = (
    <FormAssemblyEmbed
      formUrl={FORM_URL}
      title="Signup form"
      initialHeight={700}
      onFormNavigate={onFormNavigate}
    />
  );
  const { rerender } = render(element);
  const iframe = screen.getByTitle("Signup form");
  const src = new URL(iframe.getAttribute("src") ?? "");
  const id = src.searchParams.get("faIframeUniqueId") ?? "";
  return { iframe, src, id, rerender: () => rerender(element) };
};

const post = (data: unknown, origin = "https://rmi.tfaforms.net") =>
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data, origin }));
  });

describe("FormAssemblyEmbed", () => {
  it("passes the id and host URL the form needs to report its height", () => {
    const { iframe, src, id } = renderEmbed();

    expect(src.origin + src.pathname).toBe(FORM_URL);
    expect(id).toMatch(/^[A-Za-z0-9]+$/);
    expect(src.searchParams.get("hostURL")).toBe(
      window.location.origin + window.location.pathname,
    );
    expect(iframe).toHaveAttribute("height", "700");
  });

  it("keeps its src when the page URL changes, so the form doesn't reload", () => {
    const startPath = window.location.pathname;
    const { iframe, rerender } = renderEmbed();
    const srcBefore = iframe.getAttribute("src");

    try {
      window.history.pushState({}, "", "/somewhere-else");
      rerender();
      expect(iframe.getAttribute("src")).toBe(srcBefore);
    } finally {
      window.history.pushState({}, "", startPath);
    }
  });

  it("resizes to the height the form posts", () => {
    const { iframe, id } = renderEmbed();

    post(`640,${id},//rmi.tfaforms.net/312`);

    expect(iframe).toHaveAttribute("height", "640");
  });

  it("never shrinks below the minimum height, even if the form posts 0", () => {
    const { iframe, id } = renderEmbed();

    post(`0,${id},//rmi.tfaforms.net/312`);

    expect(iframe).toHaveAttribute("height", String(MIN_FORM_HEIGHT));
  });

  it("ignores messages from other origins, other iframes, or not strings", () => {
    const { iframe, id } = renderEmbed();

    post(`640,${id},//rmi.tfaforms.net/312`, "https://evil.example");
    post(`640,someOtherId,//rmi.tfaforms.net/312`);
    post({ height: 640 });

    expect(iframe).toHaveAttribute("height", "700");
  });

  it.each(["submitted", "pagechange"])(
    "calls onFormNavigate when the form reports %s",
    (command) => {
      const onFormNavigate = vi.fn();
      const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
      const { id } = renderEmbed(onFormNavigate);

      post(`${command},${id},//rmi.tfaforms.net/312`);

      expect(onFormNavigate).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).not.toHaveBeenCalled();
    },
  );

  it("calls onFormNavigate on every iframe load after the first", () => {
    // The form's `submitted` post comes from an unload handler, which Chrome
    // may not run; the iframe's own load event always fires.
    const onFormNavigate = vi.fn();
    const { iframe } = renderEmbed(onFormNavigate);

    fireEvent.load(iframe); // the form itself
    expect(onFormNavigate).not.toHaveBeenCalled();

    fireEvent.load(iframe); // its confirmation page
    expect(onFormNavigate).toHaveBeenCalledTimes(1);
  });

  it("scrolls the iframe into view on submit when no handler is given", () => {
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
    const { iframe, id } = renderEmbed();

    post(`submitted,${id},//rmi.tfaforms.net/312`);

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    expect(scrollIntoView.mock.contexts[0]).toBe(iframe);
  });
});
