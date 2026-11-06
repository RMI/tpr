import { describe, it, expect } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewsletterCta from "./NewsletterCta";
import { NewsletterSignupProvider } from "../context/NewsletterSignupContext";

const FORM_TITLE = /newsletter signup form/i;

const renderCta = () =>
  render(
    <NewsletterSignupProvider>
      <NewsletterCta />
    </NewsletterSignupProvider>,
  );

describe("NewsletterCta", () => {
  it("renders as a labelled section", () => {
    renderCta();

    expect(
      screen.getByRole("region", { name: "Stay up to date with the TPR" }),
    ).toBeInTheDocument();
  });

  it("loads the form only once the dialog is opened, and drops it on close", async () => {
    const user = userEvent.setup();
    renderCta();

    expect(screen.queryByTitle(FORM_TITLE)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Sign up for updates" }),
    );

    const dialog = screen.getByRole("dialog", {
      name: "Sign up for TPR updates",
    });
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByTitle(FORM_TITLE).getAttribute("src")).toMatch(
      /^https:\/\/rmi\.tfaforms\.net\/312\?/,
    );

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(dialog).not.toHaveAttribute("open");
    await waitFor(() =>
      expect(screen.queryByTitle(FORM_TITLE)).not.toBeInTheDocument(),
    );
  });

  it("puts the open-in-new-tab fallback above the form, where it stays visible", async () => {
    const user = userEvent.setup();
    renderCta();

    await user.click(
      screen.getByRole("button", { name: "Sign up for updates" }),
    );

    const fallback = screen.getByRole("link", { name: "Open it in a new tab" });
    expect(fallback).toHaveAttribute("href", "https://rmi.tfaforms.net/312");
    expect(fallback).toHaveAttribute("target", "_blank");
    expect(
      fallback.compareDocumentPosition(screen.getByTitle(FORM_TITLE)) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("closes when the dialog fires close (Escape in a browser)", async () => {
    const user = userEvent.setup();
    renderCta();

    await user.click(
      screen.getByRole("button", { name: "Sign up for updates" }),
    );
    const dialog = screen.getByRole<HTMLDialogElement>("dialog", {
      name: "Sign up for TPR updates",
    });

    // What the browser does on Escape: close the dialog, firing `close`
    // afterwards.
    act(() => dialog.close());

    expect(dialog).not.toHaveAttribute("open");
    await waitFor(() =>
      expect(screen.queryByTitle(FORM_TITLE)).not.toBeInTheDocument(),
    );
  });
});
