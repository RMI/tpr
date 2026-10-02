import React, { useRef } from "react";
import { useSearchParams } from "react-router";
import clsx from "clsx";

export interface TabDef {
  /** Stable id used in the URL (`?tab=<id>`) and for aria wiring. */
  id: string;
  /** Human-readable label shown in the tab. */
  label: string;
}

/**
 * Active-tab state, backed by the `?tab=` query param so a tab is deep-linkable
 * and shareable and survives reload/back — matching the repo's existing
 * shareable-state convention (ComparisonPage uses `?ids=`).
 *
 * This hook is the single seam that isolates the URL mechanism: swapping to path
 * segments (`/pathway/:id/overview`) later would change only this hook, the route
 * table, and the test mount helpers — no call site.
 *
 * The first tab is the default: an absent or unrecognized `?tab=` resolves to it,
 * and selecting it clears the param to keep the canonical URL clean.
 */
export function useActiveTab(
  tabs: TabDef[],
  paramName = "tab",
): [string, (id: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultId = tabs[0]?.id ?? "";
  const raw = searchParams.get(paramName);
  const activeId = tabs.some((t) => t.id === raw) ? (raw as string) : defaultId;

  const setActiveId = (id: string): void => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id === defaultId) {
          next.delete(paramName);
        } else {
          next.set(paramName, id);
        }
        return next;
      },
      // Push a history entry so the browser Back button steps through tab changes.
      { replace: false },
    );
  };

  return [activeId, setActiveId];
}

interface TabsProps {
  tabs: TabDef[];
  activeId: string;
  onChange: (id: string) => void;
  /** Accessible name for the tablist. */
  label: string;
  /** Namespace for the generated tab/panel ids; must match the TabPanel's. */
  idBase?: string;
  className?: string;
}

/**
 * An accessible tablist following the WAI-ARIA tabs pattern: roving tabindex
 * (only the active tab is in the tab order) and Left/Right/Home/End move between
 * tabs. Pair with {@link TabPanel} using the same `idBase`.
 */
export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeId,
  onChange,
  label,
  idBase = "tab",
  className,
}) => {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusTab = (id: string): void => {
    onChange(id);
    // Move focus so keyboard arrow-nav follows the selection (roving tabindex).
    tabRefs.current[id]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const idx = tabs.findIndex((t) => t.id === activeId);
    if (idx === -1) return;
    let nextIdx: number | null = null;
    switch (e.key) {
      case "ArrowRight":
        nextIdx = (idx + 1) % tabs.length;
        break;
      case "ArrowLeft":
        nextIdx = (idx - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIdx = 0;
        break;
      case "End":
        nextIdx = tabs.length - 1;
        break;
    }
    if (nextIdx !== null) {
      e.preventDefault();
      focusTab(tabs[nextIdx].id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={clsx("flex flex-wrap gap-x-1 -mb-px", className)}
    >
      {tabs.map((t) => {
        const selected = t.id === activeId;
        return (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            type="button"
            role="tab"
            id={`${idBase}-${t.id}`}
            aria-selected={selected}
            aria-controls={`${idBase}-panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={clsx(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-energy focus-visible:ring-offset-1",
              selected
                ? "border-bluespruce text-bluespruce"
                : "border-transparent text-rmigray-600 hover:text-bluespruce hover:border-neutral-300",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
};

interface TabPanelProps {
  /** Which tab this panel belongs to. */
  id: string;
  /** The currently active tab id. */
  activeId: string;
  /** Must match the Tabs `idBase`. */
  idBase?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * The panel for one tab. Hidden (and its children unmounted) unless active, so
 * inactive tabs cost nothing and only the active tab's content is in the DOM.
 */
export const TabPanel: React.FC<TabPanelProps> = ({
  id,
  activeId,
  idBase = "tab",
  className,
  children,
}) => {
  const selected = id === activeId;
  // No tabindex on the panel: the WAI-ARIA tabs pattern only makes the panel
  // focusable when it has no focusable children, and these panels always contain
  // focusable content (links, tooltips, selects). A tabindex here would also make
  // the panel the nearest `[tabindex]` ancestor of every badge, which the page
  // tests use to detect a badge's own tooltip trigger.
  return (
    <div
      role="tabpanel"
      id={`${idBase}-panel-${id}`}
      aria-labelledby={`${idBase}-${id}`}
      hidden={!selected}
      className={className}
    >
      {selected ? children : null}
    </div>
  );
};

export default Tabs;
