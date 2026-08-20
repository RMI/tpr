import React, { useEffect, useState } from "react";

type IndexHeading = {
  id: string;
  label: string;
};

type OnPageIndexProps = {
  /** Ref on the wrapper that contains this page's indexable content
   * (everything except the hero). The index is built by scanning this
   * subtree for `h2` elements that have an `id`, in DOM order — so the
   * only thing a page needs to do to add/remove/reorder an entry is add
   * or move an `id` on its own heading. */
  containerRef: React.RefObject<HTMLElement | null>;
};

/**
 * A sticky, left-side "on this page" index for long documentation pages.
 * Highlights the section currently in view as the reader scrolls, and
 * jumps to a section when its entry is clicked.
 */
const OnPageIndex: React.FC<OnPageIndexProps> = ({ containerRef }) => {
  const [headings, setHeadings] = useState<IndexHeading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Scan for indexable headings once, after the page's content has mounted.
  // None of the pages using this component conditionally render their
  // top-level sections, so a single scan is enough. This must be a passive
  // effect (not useLayoutEffect): OnPageIndex is rendered as an earlier
  // sibling of the container it reads, and React only attaches a later
  // sibling's ref once the earlier sibling's own layout effects have run —
  // so containerRef.current would still be null at that point. Passive
  // effects run only after the whole tree has committed, so the ref is
  // guaranteed to be attached by the time this runs, regardless of DOM order.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = Array.from(
      container.querySelectorAll<HTMLHeadingElement>("h2[id]"),
    );
    const found = elements.map((el) => ({
      id: el.id,
      label: el.textContent?.trim() ?? "",
    }));

    setHeadings(found);
    setActiveId(found[0]?.id ?? null);
  }, [containerRef]);

  // Highlight the heading currently in view as the reader scrolls.
  useEffect(() => {
    if (headings.length === 0) return;

    const headingElements = headings
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
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
        setActiveId(headings[headings.length - 1].id);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

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
  };

  const handleBackToTop = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Matches the "first entry is bold on load" behavior: landing back at
    // the very top of the page should look the same as a fresh page load.
    setActiveId(headings[0]?.id ?? null);
  };

  return (
    <nav
      aria-label="On this page"
      className="hidden xl:block xl:sticky xl:top-8 self-start z-10"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rmiblue-700">
        On this page
      </p>
      <ul className="mt-3 space-y-2 border-l border-neutral-200 pl-5">
        <li className="list-none border-b border-neutral-200 pb-2">
          <a
            href="#top"
            onClick={handleBackToTop}
            className="block text-base leading-6 font-normal text-rmigray-500 transition-colors hover:text-rmiblue-700"
          >
            <span aria-hidden="true">↑</span> Back to top
          </a>
        </li>
        {headings.map(({ id, label }) => {
          const isActive = id === activeId;
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
                    : "font-normal text-rmigray-600 hover:text-rmiblue-700")
                }
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default OnPageIndex;
