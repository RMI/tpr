import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import NewsletterSignupForm from "./NewsletterSignupForm";

/** Whether a pointer event on the dialog landed outside its box. */
const isOnBackdrop = (event: React.MouseEvent<HTMLDialogElement>): boolean => {
  if (event.target !== event.currentTarget) return false;
  const box = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  );
};

type NewsletterSignupDialogProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * A modal holding the newsletter signup form.
 *
 * It is a native `<dialog>` opened with `showModal()`, which gives focus
 * containment, Escape to close and a backdrop without extra code. The form
 * iframe only mounts while the dialog is open, so the form (and the scripts it
 * loads) is fetched only when someone asks for it, and starts fresh each time.
 *
 * However the dialog closes (Close button, backdrop, Escape, or `open` turning
 * false), it is through the native `close()`, so its `close` event is the one
 * place that calls `onClose`: once per close. Calling `onClose` directly as
 * well would report a close twice, once from the click and again from the
 * event when the parent's `open={false}` makes the effect call `close()`.
 */
const NewsletterSignupDialog: React.FC<NewsletterSignupDialogProps> = ({
  open,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The scrolling part: everything under the header.
  const bodyRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  // Whether the current press started on the backdrop; see onClick below.
  const pressStartedOnBackdrop = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onClose={onClose}
      // Close on a click on the backdrop. The backdrop is not an element of
      // its own: clicks on it, but also on the dialog's own edge, or at the
      // end of a text selection dragged out of the dialog, all target the
      // dialog. So the press has to both start and end outside the dialog's
      // box.
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = isOnBackdrop(event);
      }}
      onClick={(event) => {
        if (pressStartedOnBackdrop.current && isOnBackdrop(event)) {
          event.currentTarget.close();
        }
        pressStartedOnBackdrop.current = false;
      }}
      // Box, sizes and header match the editions modal on `epic/v2`; the
      // backdrop and animations come from `.signup-modal` in index.css.
      // Only the body scrolls, never the dialog: the column inside is sized
      // to the dialog's max height less its two 1px borders (hence 50px, not
      // 48px), and overflow-hidden guards against sub-pixel rounding.
      className="signup-modal p-0 rounded-lg border border-neutral-200 bg-gray-50 shadow-xl w-[calc(100%-32px)] max-w-2xl max-h-[calc(100%-48px)] overflow-hidden text-left"
    >
      {/* The header stays put and only the body scrolls, so the title and
          Close are always in reach however tall the form gets. */}
      <div className="flex flex-col max-h-[calc(100vh-50px)]">
        <div className="flex items-start justify-between gap-4 px-5 md:px-6 pt-5 pb-3 bg-white border-b border-neutral-200">
          <h2
            id={headingId}
            className="text-xl font-semibold text-bluespruce"
          >
            Sign up for TPR updates
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="p-1.5 rounded-md text-rmigray-500 hover:bg-neutral-100 hover:text-rmigray-800 flex-shrink-0"
          >
            <X
              size={20}
              aria-hidden="true"
            />
          </button>
        </div>

        {open && (
          <div
            ref={bodyRef}
            className="px-5 md:px-6 py-5 overflow-y-auto overscroll-contain"
          >
            <NewsletterSignupForm
              // After submit, scroll the body back to its top so the
              // confirmation shows, rather than the empty space where the
              // submit button was.
              onFormNavigate={() => bodyRef.current?.scrollTo({ top: 0 })}
            />
          </div>
        )}
      </div>
    </dialog>
  );
};

export default NewsletterSignupDialog;
