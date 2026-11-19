import React, { useEffect, useId, useRef } from "react";
import { Layers, X } from "lucide-react";
import PathwayCard from "./PathwayCard";
import ComparisonRibbon from "./ComparisonRibbon";
import type { PathwayMetadataType } from "../types";

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

interface EditionsModalProps {
  /** Every edition in the series, oldest first. Rendered newest first. */
  editions: readonly PathwayMetadataType[];
  /** Ids the current filters exclude. Those cards show for reference only. */
  excludedIds?: readonly string[];
  open: boolean;
  onClose: () => void;
  searchTerm?: string;
}

/*
  Every edition of one pathway, as the cards the reader already knows.

  Built on the native <dialog> opened with showModal(), which gives the dimmed
  backdrop, Esc, focus moved into the dialog and held there, focus returned to
  the opener, and inertness for the page behind -- none of which this project
  has a library for, and none of which it needs one for.

  That inertness is also why the comparison ribbon is rendered INSIDE the
  dialog rather than relied on from the page: everything outside the top layer
  stops responding while a modal dialog is open. It shares ComparisonContext,
  so it is the same selection the page shows, not a second one.

  Whichever way the dialog closes (Close button, backdrop, Esc, or `open` turning
  false), it is through the native close(), so its `close` event is the one
  place that calls `onClose`: once per close. Calling `onClose` directly as
  well would report a close twice, once from the click and again from the
  event when the parent's `open={false}` makes the effect call close().
*/
const EditionsModal: React.FC<EditionsModalProps> = ({
  editions,
  excludedIds = [],
  open,
  onClose,
  searchTerm = "",
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const noteId = useId();
  // Whether the current press started on the backdrop; see onClick below.
  const pressStartedOnBackdrop = useRef(false);

  const newestFirst = [...editions].reverse();
  const excluded = new Set(excludedIds);
  const hasExcluded = newestFirst.some((edition) => excluded.has(edition.id));
  const first = newestFirst[0];

  /*
    Page scroll is locked while the dialog is open and restored on close AND on
    unmount. The unmount case is not defensive: "View Details" and the ribbon's
    "Compare" both navigate away with the dialog still open, which unmounts it
    without ever firing `close`. Without this the next page would load unable
    to scroll.
  */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  if (!first) return null;

  const publisher =
    first.publication.publisher.short ?? first.publication.publisher.full;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
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
      // overflow-hidden: the inner column does the scrolling. A modal dialog
      // is `overflow: auto` by default, so any overshoot would give it a
      // scroll of its own beside the column's.
      className="editions-modal p-0 rounded-lg border border-neutral-200 bg-gray-50 shadow-xl w-[calc(100%-32px)] max-w-5xl max-h-[calc(100%-48px)] overflow-hidden text-left"
    >
      {open && (
        // 50px, not 48px: the dialog is at most the viewport less 48px, and
        // its 1px top and bottom borders take 2px more of that. So this is
        // the height of the dialog's content box, which the column must fit.
        //
        // The cards' area is the one that scrolls. But when the header and
        // ribbon leave it too little room (a short viewport, or high zoom),
        // its min-height makes the column overflow, and the column scrolls
        // too, so the cards are never cut off with no way to reach them.
        <div className="flex flex-col max-h-[calc(100vh-50px)] overflow-y-auto">
          <div className="flex items-start justify-between gap-4 px-5 md:px-6 pt-5 pb-3 bg-white border-b border-neutral-200">
            <div className="min-w-0">
              <p className="text-xs font-medium text-rmigray-500 flex items-center gap-1.5">
                <Layers
                  size={13}
                  aria-hidden="true"
                />
                {editions.length} editions of this pathway
              </p>
              <h2
                id={titleId}
                className="text-xl font-semibold text-bluespruce mt-1"
              >
                {publisher}: {first.name.full}
              </h2>
            </div>
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

          <div className="px-5 md:px-6 bg-white">
            <ComparisonRibbon />
          </div>

          <div className="px-5 md:px-6 py-5 overflow-y-auto min-h-32">
            {hasExcluded && (
              <p
                id={noteId}
                className="text-sm text-rmigray-600 mb-4"
              >
                Editions that do not match your current filters are shown for
                reference and cannot be opened or compared.
              </p>
            )}
            <div
              className={`grid gap-6 grid-cols-1 md:grid-cols-2 ${
                newestFirst.length > 2 ? "lg:grid-cols-3" : ""
              }`}
            >
              {newestFirst.map((edition) => (
                <PathwayCard
                  key={edition.id}
                  pathway={edition}
                  searchTerm={searchTerm}
                  inactive={excluded.has(edition.id)}
                  inactiveDescribedBy={noteId}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
};

export default EditionsModal;
