import React, { useEffect, useMemo, useState } from "react";

type IndexHeading = {
  id: string;
  label: string;
};

/** A top-level (`h2`) entry, together with the `h3` headings that follow it. */
type IndexSection = IndexHeading & {
  children: IndexHeading[];
};

type OnPageIndexProps = {
  /** Ref on the wrapper that contains this page's indexable content
   * (everything except the page header). The index is built by scanning
   * this subtree for `h2` and `h3` elements that have an `id`, in DOM
   * order — so the only thing a page needs to do to add/remove/reorder an
   * entry is add or move an `id` on its own heading. `h3`s are nested
   * under the `h2` that precedes them. */
  containerRef: React.RefObject<HTMLElement | null>;
};

/**
 * A sticky, left-side "on this page" index for long documentation pages.
 *
 * Two levels deep: `h2`s are always listed, and the `h3`s belonging to the
 * section currently in view are revealed underneath it. Sub-entries for
 * every other section stay collapsed, so the index shows where you are
 * without growing into a full outline of the page.
 */
const OnPageIndex: React.FC<OnPageIndexProps> = ({ containerRef }) => {
  const [sections, setSections] = useState<IndexSection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Scan for indexable headings once, after the page's content has mounted.
  // None of the pages using this component conditionally render their
  // headings, so a single scan is enough. This must be a passive effect
  // (not useLayoutEffect): OnPageIndex is rendered as an earlier sibling of
  // the container it reads, and React only attaches a later sibling's ref
  // once the earlier sibling's own layout effects have run — so
  // containerRef.current would still be null at that point. Passive effects
  // run only after the whole tree has committed, so the ref is guaranteed
  // to be attached by the time this runs, regardless of DOM order.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = Array.from(
      container.querySelectorAll<HTMLHeadingElement>("h2[id], h3[id]"),
    );

    // Walk the headings in DOM order, attaching each `h3` to the `h2` that
    // most recently preceded it. An `h3` before any `h2` has no parent to
    // nest under and is skipped rather than promoted to the top level, so a
    // stray sub-heading can't silently reorder the index.
    const found: IndexSection[] = [];
    elements.forEach((el) => {
      const heading = { id: el.id, label: el.textContent?.trim() ?? "" };
      if (el.tagName === "H2") {
        found.push({ ...heading, children: [] });
      } else {
        found[found.length - 1]?.children.push(heading);
      }
    });

    setSections(found);

    // Support deep links (e.g. shared as `.../methodology#classification-
    // group-2`): if the URL already points at one of this page's headings,
    // land there instead of the first entry. This can't rely on the
    // browser's native "scroll to #fragment on load" behavior — that races
    // against React rendering the content in a client-rendered SPA and can
    // silently miss.
    const rawHash = window.location.hash.slice(1);
    let targetId = rawHash;
    try {
      targetId = decodeURIComponent(rawHash);
    } catch {
      // A hash with malformed percent-encoding (e.g. a stray "%" from a
      // typo'd or hand-edited URL, such as "#50%off") makes
      // decodeURIComponent throw. There's no error boundary in this app,
      // so an uncaught throw here would blank the entire page, not just
      // this component — fall back to the raw hash instead, which simply
      // won't match any heading id below.
    }
    // A deep link may point at a sub-heading, not just a section, so match
    // against both levels. Marking a sub-heading active also expands its
    // parent section, since that's derived from the active id below.
    const target = found
      .flatMap((section) => [section, ...section.children])
      .find((heading) => heading.id === targetId);
    if (target) {
      document.getElementById(target.id)?.scrollIntoView({ block: "start" });
      setActiveId(target.id);
    } else {
      setActiveId(found[0]?.id ?? null);
    }
  }, [containerRef]);

  // Every indexed heading id, in DOM order, and the section each sub-heading
  // belongs to. Memoized so the observer effect below doesn't tear down and
  // rebuild on every render.
  const { orderedIds, parentOf } = useMemo(() => {
    const ids: string[] = [];
    const parents = new Map<string, string>();
    sections.forEach((section) => {
      ids.push(section.id);
      section.children.forEach((child) => {
        ids.push(child.id);
        parents.set(child.id, section.id);
      });
    });
    return { orderedIds: ids, parentOf: parents };
  }, [sections]);

  // Highlight the heading currently in view as the reader scrolls.
  useEffect(() => {
    if (orderedIds.length === 0) return;

    const headingElements = orderedIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    // Several headings can sit inside the trigger band at once — much more
    // so now that sub-headings are observed too, since an `h2` and the
    // first `h3` under it are often only a paragraph apart. So track which
    // headings are currently in the band and always pick the topmost of
    // them, rather than whichever entry happened to be reported last.
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        });
        const topmost = orderedIds.find((id) => visible.has(id));
        // When the band is empty (a long section scrolling past between two
        // headings) keep the last active entry rather than clearing it.
        if (topmost) setActiveId(topmost);
      },
      // The top inset must stay below the landing offset headings scroll to
      // (`scroll-mt-8`/the sticky nav's `top-8`, 32px) — otherwise a heading
      // that has just been scrolled to sits *above* the observed band and
      // is never marked intersecting, letting the next heading down (which
      // has already entered the band) incorrectly take over as active.
      { rootMargin: "-24px 0px -70% 0px", threshold: 0 },
    );
    headingElements.forEach((el) => observer.observe(el));

    // Safety net: IntersectionObserver's trigger band may never reach a
    // short final section before the page finishes scrolling, which would
    // leave the second-to-last entry highlighted at the true bottom of the
    // page. Force the last entry active once the reader hits the bottom.
    const handleScroll = () => {
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setActiveId(orderedIds[orderedIds.length - 1]);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [orderedIds]);

  const handleClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string,
  ) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setActiveId(id);
    // Keep the URL shareable as a direct link to this section. `replaceState`
    // (not `pushState`) so clicking around the index doesn't fill up
    // browser history — Back just leaves the page, as if the hash had
    // never changed.
    window.history.replaceState(null, "", `#${id}`);
  };

  const handleBackToTop = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Matches the "first entry is bold on load" behavior: landing back at
    // the very top of the page should look the same as a fresh page load.
    setActiveId(sections[0]?.id ?? null);
    // The URL no longer points at a specific section, so drop the hash.
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  };

  // Which section's sub-entries are on show: the active heading itself when
  // it's a section, or the section owning the active sub-heading.
  const expandedSectionId = activeId
    ? (parentOf.get(activeId) ?? activeId)
    : null;

  // Deliberately never render `null` while `sections` is still empty: this
  // component is the first (16rem) track of its parent grid, and briefly
  // rendering nothing would leave the content column as the grid's only
  // item — which places it in that same first track, squeezed to 16rem,
  // until the scan effect above populates `sections` a moment later and it
  // snaps back to full width. Always rendering the nav shell (its "Back to
  // top" link doesn't depend on the scan either) reserves the column from
  // the first paint and avoids that layout shift.
  return (
    <nav
      aria-label="On this page"
      className="hidden xl:block xl:sticky xl:top-8 self-start z-10"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rmiblue-800">
        On this page
      </p>
      <ul className="mt-3 space-y-2 border-l border-neutral-200 pl-5">
        <li className="list-none border-b border-neutral-200 pb-2">
          <a
            href="#top"
            onClick={handleBackToTop}
            className="block text-base leading-6 font-normal text-rmigray-500 transition-colors hover:text-rmiblue-800"
          >
            <span aria-hidden="true">↑</span> Back to top
          </a>
        </li>
        {sections.map(({ id, label, children }) => {
          const isActive = id === activeId;
          const isExpanded = id === expandedSectionId;
          return (
            // A bullet marker (not present on "Back to top" above) so a
            // section title that wraps onto a second line is still clearly
            // one entry, not mistaken for the start of the next one.
            <li
              key={id}
              className="list-disc marker:text-rmigray-400"
            >
              <a
                href={`#${id}`}
                aria-current={isActive || undefined}
                onClick={(event) => handleClick(event, id)}
                className={
                  "block text-base leading-6 transition-colors " +
                  (isActive
                    ? "font-semibold text-rmiblue-800"
                    : "font-normal text-rmigray-600 hover:text-rmiblue-800")
                }
              >
                {label}
              </a>

              {isExpanded && children.length > 0 ? (
                <ul className="mt-2 space-y-1 list-none border-l border-neutral-200 pl-4">
                  {children.map((child) => {
                    const isChildActive = child.id === activeId;
                    return (
                      <li key={child.id}>
                        <a
                          href={`#${child.id}`}
                          aria-current={isChildActive || undefined}
                          onClick={(event) => handleClick(event, child.id)}
                          className={
                            "block text-sm leading-6 transition-colors " +
                            (isChildActive
                              ? "font-semibold text-rmiblue-800"
                              : "font-normal text-rmigray-500 hover:text-rmiblue-800")
                          }
                        >
                          {child.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default OnPageIndex;
