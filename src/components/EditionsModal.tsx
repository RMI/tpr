import React, { useCallback, useEffect, useId, useRef } from "react";
import { Layers, X } from "lucide-react";
import PathwayCard from "./PathwayCard";
import ComparisonRibbon from "./ComparisonRibbon";
import type { PathwayMetadataType } from "../types";

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

  // A backdrop click lands on the dialog itself, never on its contents.
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (event.target === dialogRef.current) onClose();
    },
    [onClose],
  );

  if (!first) return null;

  const publisher =
    first.publication.publisher.short ?? first.publication.publisher.full;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={handleClick}
      className="editions-modal p-0 rounded-lg border border-neutral-200 bg-gray-50 shadow-xl w-[calc(100%-32px)] max-w-5xl max-h-[calc(100%-48px)] text-left"
    >
      {open && (
        <div className="flex flex-col max-h-[calc(100vh-48px)]">
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
              onClick={onClose}
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

          <div className="px-5 md:px-6 py-5 overflow-y-auto">
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
