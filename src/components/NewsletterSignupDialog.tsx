import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import FormAssemblyEmbed from "./FormAssemblyEmbed";

/** The TPR newsletter signup form, hosted on RMI's FormAssembly account. */
export const NEWSLETTER_FORM_URL = "https://rmi.tfaforms.net/312";

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
      // its own: clicks on it, but also on the dialog's scrollbar, or at the
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
      className="m-auto w-[min(42rem,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto overscroll-contain rounded-lg bg-white p-0 shadow-xl backdrop:bg-black/50"
    >
      <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-4">
        <h2
          id={headingId}
          className="text-xl font-semibold text-rmigray-800"
        >
          Sign up for TPR updates
        </h2>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close"
          className="rounded-md p-1 text-rmigray-400 transition-colors hover:bg-neutral-100 hover:text-rmigray-800"
        >
          <X
            size={20}
            aria-hidden="true"
          />
        </button>
      </div>

      {open && (
        <div className="px-2 pt-3 pb-4">
          {/* Above the form, not below it: when the form is blocked (ad
              blockers, an http page) the iframe is an empty box at its
              initial height, and a link under it would be out of sight. */}
          <p className="px-4 pb-2 text-sm text-rmigray-400">
            Form not loading?{" "}
            <a
              href={NEWSLETTER_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-energy-800 underline underline-offset-2 hover:text-rmigray-800"
            >
              Open it in a new tab
            </a>
            .
          </p>
          <FormAssemblyEmbed
            formUrl={NEWSLETTER_FORM_URL}
            title="Transition Pathways Repository newsletter signup form"
            // After submit, show the dialog's top (heading, Close) along with
            // the confirmation, rather than scrolling them out of view.
            onFormNavigate={() => dialogRef.current?.scrollTo({ top: 0 })}
          />
        </div>
      )}
    </dialog>
  );
};

export default NewsletterSignupDialog;
