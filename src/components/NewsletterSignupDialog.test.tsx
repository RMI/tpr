import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
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

// Let the dialog's `close` event, which browsers fire in a later task, run.
const settle = () => act(() => new Promise((r) => setTimeout(r, 0)));

const press = (
  target: Element,
  down: { clientX: number; clientY: number },
  up = down,
) => {
  fireEvent.pointerDown(target, down);
  fireEvent.click(target, up);
};

describe("NewsletterSignupDialog backdrop", () => {
  it("closes on a click on the backdrop", async () => {
    const { dialog, onClose } = renderOpenDialog();

    press(dialog, OUTSIDE);
    await settle();

    expect(dialog.open).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays open for a click on its own scrollbar", async () => {
    const { dialog, onClose } = renderOpenDialog();

    press(dialog, SCROLLBAR);
    await settle();

    expect(dialog.open).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("stays open when a press starts inside and ends on the backdrop", async () => {
    const { dialog, onClose } = renderOpenDialog();

    // A text selection dragged out of the dialog: the click targets the
    // dialog, at a point outside its box.
    press(dialog, INSIDE, OUTSIDE);
    await settle();

    expect(dialog.open).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("stays open for clicks on its contents", async () => {
    const { dialog, onClose } = renderOpenDialog();

    press(screen.getByRole("heading", { name: "Sign up for TPR updates" }), {
      clientX: 20,
      clientY: 20,
    });
    await settle();

    expect(dialog.open).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("NewsletterSignupDialog onClose", () => {
  // A parent that, like NewsletterCta, sets `open` false in onClose: that
  // makes the dialog call close() again, which must not report a second close.
  const StatefulParent = ({ onClose }: { onClose: () => void }) => {
    const [open, setOpen] = useState(true);
    return (
      <NewsletterSignupDialog
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      />
    );
  };

  it("reports a Close-button close exactly once", async () => {
    const onClose = vi.fn();
    render(<StatefulParent onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await settle();
    await settle();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("reports a backdrop close exactly once", async () => {
    const onClose = vi.fn();
    render(<StatefulParent onClose={onClose} />);
    const dialog = screen.getByRole<HTMLDialogElement>("dialog", {
      name: "Sign up for TPR updates",
    });
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 100, y: 100, width: 400, height: 500 }),
    );

    press(dialog, OUTSIDE);
    await settle();
    await settle();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("NewsletterSignupDialog after submit", () => {
  // Only the body under the header scrolls, so that is what returns to top.
  const spyOnBodyScroll = () => {
    const iframe = screen.getByTitle(/newsletter signup form/i);
    const body = iframe.parentElement as HTMLElement;
    const scrollTo = vi.fn();
    body.scrollTo = scrollTo;
    return { iframe, scrollTo };
  };

  it("scrolls its body back to the top when the form loads its confirmation page", () => {
    renderOpenDialog();
    const { iframe, scrollTo } = spyOnBodyScroll();

    fireEvent.load(iframe);
    fireEvent.load(iframe);

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0 });
  });

  it("scrolls its body back to the top when the form reports it was submitted", () => {
    renderOpenDialog();
    const { iframe, scrollTo } = spyOnBodyScroll();
    const src = new URL(iframe.getAttribute("src") ?? "");
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
