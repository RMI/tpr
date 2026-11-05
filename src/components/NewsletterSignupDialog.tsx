import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import FormAssemblyEmbed from "./FormAssemblyEmbed";

/** The TPR newsletter signup form, hosted on RMI's FormAssembly account. */
export const NEWSLETTER_FORM_URL = "https://rmi.tfaforms.net/312";

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
 */
const NewsletterSignupDialog: React.FC<NewsletterSignupDialogProps> = ({
  open,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

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
      // A click on the dialog element itself, rather than its contents, is a
      // click on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[min(42rem,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto rounded-lg bg-white p-0 shadow-xl backdrop:bg-black/50"
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
          onClick={onClose}
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
          />
        </div>
      )}
    </dialog>
  );
};

export default NewsletterSignupDialog;
