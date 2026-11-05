import { describe, it, expect } from "vitest";
import { act, render, screen } from "@testing-library/react";
import FormAssemblyEmbed from "./FormAssemblyEmbed";

const FORM_URL = "https://rmi.tfaforms.net/312";

const renderEmbed = () => {
  render(
    <FormAssemblyEmbed
      formUrl={FORM_URL}
      title="Signup form"
      initialHeight={700}
    />,
  );
  const iframe = screen.getByTitle("Signup form");
  const src = new URL(iframe.getAttribute("src") ?? "");
  const id = src.searchParams.get("faIframeUniqueId") ?? "";
  return { iframe, src, id };
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

  it("resizes to the height the form posts", () => {
    const { iframe, id } = renderEmbed();

    post(`640,${id},//rmi.tfaforms.net/312`);

    expect(iframe).toHaveAttribute("height", "640");
  });

  it("ignores messages from other origins, other iframes, or not strings", () => {
    const { iframe, id } = renderEmbed();

    post(`640,${id},//rmi.tfaforms.net/312`, "https://evil.example");
    post(`640,someOtherId,//rmi.tfaforms.net/312`);
    post({ height: 640 });

    expect(iframe).toHaveAttribute("height", "700");
  });
});
