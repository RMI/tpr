import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { ArrowLeft, ChevronRight, CircleHelp, X } from "lucide-react";
import { useDropdown } from "../hooks/useDropdown";
import {
  GENERAL_HELP_LINKS,
  getHelpGroups,
  type HelpGroup,
} from "../content/helpContent";

const ICON_BUTTON_CLASS =
  "p-1.5 rounded-md text-rmigray-500 hover:bg-neutral-100 hover:text-rmigray-800 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bluespruce";

const LINK_CLASS =
  "text-energy-700 underline underline-offset-2 hover:text-energy-800";

const HelpPanel: React.FC<{ groups: HelpGroup[] }> = ({ groups }) => {
  const { open, triggerRef, menuRef, toggle, close } =
    useDropdown<HTMLButtonElement>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const selected = selectedId
    ? groups.flatMap((g) => g.topics).find((t) => t.id === selectedId)
    : undefined;

  // Move focus to the heading whenever the panel opens or switches screens,
  // so a keyboard or screen reader user lands on the new content rather than
  // on a button that no longer exists (the question they picked, or Back).
  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open, selectedId]);

  const onTriggerClick = () => {
    // Every open starts on the list of questions.
    setSelectedId(null);
    toggle();
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div
          ref={menuRef}
          role="dialog"
          aria-label="Help"
          className="flex max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] flex-col rounded-md border border-gray-200 bg-white shadow-lg"
        >
          <div className="flex items-start gap-1 border-b border-gray-200 px-3 py-2">
            {selected && (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Back to questions"
                className={ICON_BUTTON_CLASS}
              >
                <ArrowLeft
                  size={18}
                  aria-hidden="true"
                />
              </button>
            )}
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="flex-1 self-center py-1 text-base font-semibold text-rmigray-800 focus:outline-none"
            >
              {selected ? selected.question : "How can we help?"}
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close help"
              className={ICON_BUTTON_CLASS}
            >
              <X
                size={18}
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {selected ? (
              <>
                <p className="text-sm leading-6 text-rmigray-700">
                  {selected.answer}
                </p>
                {selected.readMore && (
                  <p className="mt-3 text-sm font-semibold">
                    <Link
                      to={selected.readMore.to}
                      onClick={close}
                      className={LINK_CLASS}
                    >
                      Read more: {selected.readMore.label}
                    </Link>
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {groups.map((group) => (
                  <section key={group.label}>
                    <h3 className="px-2 text-xs font-semibold uppercase tracking-wide text-rmigray-500">
                      {group.label}
                    </h3>
                    <ul className="mt-1">
                      {group.topics.map((topic) => (
                        <li key={topic.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(topic.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm text-rmigray-800 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bluespruce"
                          >
                            <span>{topic.question}</span>
                            <ChevronRight
                              size={16}
                              aria-hidden="true"
                              className="flex-shrink-0 text-rmigray-500"
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>

          <nav
            aria-label="Documentation"
            className="border-t border-gray-200 px-3 py-2 text-xs text-rmigray-600"
          >
            <span className="mr-2">More help:</span>
            <ul className="inline">
              {GENERAL_HELP_LINKS.map((link, i) => (
                <li
                  key={link.to}
                  className="inline"
                >
                  {i > 0 && <span aria-hidden="true"> · </span>}
                  <Link
                    to={link.to}
                    onClick={close}
                    className={LINK_CLASS}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={onTriggerClick}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full bg-bluespruce px-4 py-2 text-sm font-semibold text-white shadow-lg ring-2 ring-white hover:bg-energy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy-400 focus-visible:ring-offset-2"
      >
        <CircleHelp
          size={18}
          aria-hidden="true"
        />
        Help
      </button>
    </div>
  );
};

/**
 * A floating Help button on the Card, Detail and Comparison views (#906). It
 * opens a small panel of questions that fit the current view (and, on the
 * Detail view, the active tab), each with a short answer and a link to the
 * docs. Renders nothing on other pages.
 */
const HelpButton: React.FC = () => {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");
  const groups = getHelpGroups(pathname, tab);

  if (!groups) return null;

  // Keyed on the view and tab so moving to another page or tab starts fresh:
  // closed, and on the list of questions for the new context.
  return (
    <HelpPanel
      key={`${pathname}?tab=${tab ?? ""}`}
      groups={groups}
    />
  );
};

export default HelpButton;
