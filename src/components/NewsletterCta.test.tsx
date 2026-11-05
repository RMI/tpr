import { describe, it, expect } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewsletterCta from "./NewsletterCta";

const FORM_TITLE = /newsletter signup form/i;

describe("NewsletterCta", () => {
  it.each(["ribbon", "landing"] as const)(
    "renders the %s variant as a labelled section",
    (variant) => {
      render(<NewsletterCta variant={variant} />);

      expect(
        screen.getByRole("region", { name: "Stay up to date with the TPR" }),
      ).toBeInTheDocument();
    },
  );

  it("loads the form only once the dialog is opened, and drops it on close", async () => {
    const user = userEvent.setup();
    render(<NewsletterCta variant="ribbon" />);

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
    expect(screen.queryByTitle(FORM_TITLE)).not.toBeInTheDocument();
  });

  it("closes when the dialog fires close (Escape in a browser)", async () => {
    const user = userEvent.setup();
    render(<NewsletterCta variant="landing" />);

    await user.click(
      screen.getByRole("button", { name: "Sign up for updates" }),
    );
    const dialog = screen.getByRole<HTMLDialogElement>("dialog", {
      name: "Sign up for TPR updates",
    });

    // What the browser does on Escape: close the dialog, firing `close`.
    act(() => dialog.close());

    expect(dialog).not.toHaveAttribute("open");
    expect(screen.queryByTitle(FORM_TITLE)).not.toBeInTheDocument();
  });
});
