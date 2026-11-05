import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import NewsletterSignupDialog from "./NewsletterSignupDialog";

// The dialog's box on screen. jsdom does no layout, so pin it here.
const BOX = { left: 100, right: 500, top: 100, bottom: 600 };
const OUTSIDE = { clientX: 20, clientY: 20 };
const INSIDE = { clientX: 300, clientY: 300 };
// On the dialog element but inside its box: where its scrollbar would be.
const SCROLLBAR = { clientX: 495, clientY: 300 };

const renderOpenDialog = () => {
  const onClose = vi.fn();
  render(
    <NewsletterSignupDialog
      open
      onClose={onClose}
    />,
  );
  const dialog = screen.getByRole<HTMLDialogElement>("dialog", {
    name: "Sign up for TPR updates",
  });
  vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({
      x: BOX.left,
      y: BOX.top,
      width: BOX.right - BOX.left,
      height: BOX.bottom - BOX.top,
    }),
  );
  return { dialog, onClose };
};

const press = (
  target: Element,
  down: { clientX: number; clientY: number },
  up = down,
) => {
  fireEvent.pointerDown(target, down);
  fireEvent.click(target, up);
};

describe("NewsletterSignupDialog backdrop", () => {
  it("closes on a click on the backdrop", () => {
    const { dialog, onClose } = renderOpenDialog();

    press(dialog, OUTSIDE);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays open for a click on its own scrollbar", () => {
    const { dialog, onClose } = renderOpenDialog();

    press(dialog, SCROLLBAR);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("stays open when a press starts inside and ends on the backdrop", () => {
    const { dialog, onClose } = renderOpenDialog();

    // A text selection dragged out of the dialog: the click targets the
    // dialog, at a point outside its box.
    press(dialog, INSIDE, OUTSIDE);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("stays open for clicks on its contents", () => {
    const { onClose } = renderOpenDialog();

    press(screen.getByRole("heading", { name: "Sign up for TPR updates" }), {
      clientX: 20,
      clientY: 20,
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("NewsletterSignupDialog after submit", () => {
  it("scrolls back to its own top when the form reports it was submitted", () => {
    const { dialog } = renderOpenDialog();
    const scrollTo = vi.fn();
    dialog.scrollTo = scrollTo;
    const src = new URL(
      screen.getByTitle(/newsletter signup form/i).getAttribute("src") ?? "",
    );
    const id = src.searchParams.get("faIframeUniqueId");

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: `submitted,${id},//rmi.tfaforms.net/312`,
          origin: "https://rmi.tfaforms.net",
        }),
      );
    });

    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
  });
});
