import { useEffect, useRef, useState } from "react";

/**
 * Track an element's content-box width.
 *
 * Returns `[width, ref]`, where `width` is `null` until the element has been
 * measured — so a caller can fall back to a fixed size for the first render
 * rather than drawing at zero. In jsdom there is no layout and the mocked
 * ResizeObserver never fires, so `width` stays null and callers keep their
 * fallback: existing dimension assertions go on meaning what they meant.
 *
 * `step` quantises the reported width. Charts re-run d3 on every width change,
 * so reporting each pixel of a window drag would re-render them dozens of
 * times for a change nobody can see; a 20px step keeps a drag to a handful of
 * redraws while staying well inside a chart's own margins.
 *
 * Guarded for a missing ResizeObserver the same way `useCondensedOnScroll`
 * guards IntersectionObserver.
 */
export function useElementWidth(
  step = 1,
): [number | null, React.RefObject<HTMLDivElement | null>] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // contentRect rather than offsetWidth: the chart draws inside the
        // padding box, and reading offsetWidth here would force a reflow.
        const next = entry.contentRect?.width ?? 0;
        if (next <= 0) continue;
        setWidth(Math.max(step, Math.round(next / step) * step));
      }
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [step]);

  return [width, ref];
}

export default useElementWidth;
