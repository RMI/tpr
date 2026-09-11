import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Badge, { BadgeMaybeAbsent } from "./Badge";
import TextWithTooltip from "./TextWithTooltip";

type Variant = React.ComponentProps<typeof Badge>["variant"];
type Scalar = string | number;

export type BadgeArrayProps<T extends string | number> = Omit<
  React.ComponentProps<typeof BadgeMaybeAbsent>,
  "tooltip" | "children" | "variant" | "toLabel" | "renderLabel"
> & {
  /** Provide an array of scalar-ish values as children: {['A', 'B', null, 42]} */
  children: Array<T | null | undefined>;
  /** Single variant for all badges or an array with the same length as children */
  variant?: Variant | Variant[];
  /** Legacy override: if provided, skips auto-fit and shows exactly this many items. */
  visibleCount?: number;
  /** Provide original item for tooltip content; still receives the raw item. */
  tooltipGetter?: (item: T) => React.ReactNode;
  /**
   * Optionally map each raw item to a display label. Returns a string because
   * the label is handed to BadgeMaybeAbsent, which renders it into a Badge
   * (whose children are scalar) and may pass it through `renderLabel`.
   */
  toLabel?: (item: T | null | undefined) => string;
  /** Optionally post-process a mapped label (e.g., highlight). */
  renderLabel?: (label: React.ReactNode) => React.ReactNode;
  /** Max rows to display before collapsing into “+N more”. Use Infinity for unlimited rows. Default: 1. */
  maxRows?: number;
};

export default function BadgeArray<T extends Scalar = Scalar>({
  children,
  variant,
  visibleCount,
  tooltipGetter,
  toLabel,
  renderLabel,
  maxRows = 1,
  ...rest
}: BadgeArrayProps<T>) {
  // Memoize to keep stable reference across renders and satisfy hooks deps.
  const arr: ReadonlyArray<T | null | undefined> = useMemo(
    () => (Array.isArray(children) ? children : [children]),
    [children],
  );

  // Runtime guard: only scalars/nullish are allowed
  const badIdx = arr.findIndex(
    (v) => v != null && typeof v !== "string" && typeof v !== "number",
  );
  if (badIdx !== -1 && !toLabel) {
    throw new Error(
      "BadgeArray: children must be string | number | null | undefined",
    );
  }

  let variants: Variant[];
  if (Array.isArray(variant)) {
    if (variant.length !== arr.length) {
      throw new Error(
        "BadgeArray: when 'variant' is an array, its length must match children length",
      );
    }
    variants = variant;
  } else {
    variants = arr.map(() => variant);
  }

  // --- Measurement refs/state
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const moreMeasureRef = useRef<HTMLSpanElement | null>(null);
  const [autoVisible, setAutoVisible] = useState<number | null>(null);
  // When true, render all badges for one frame to measure expansion capacity
  const [renderAllOnce, setRenderAllOnce] = useState(false);
  // bump this to force recomputation on resize/font load
  const [measureSeq, setMeasureSeq] = useState(0);

  // keep refs array in sync with children length
  itemRefs.current = useMemo(
    () => new Array<HTMLSpanElement | null>(arr.length).fill(null),
    [arr.length],
  );

  // Helper: group elements into rows using their offsetTop
  function groupIntoRows(els: HTMLElement[]): HTMLElement[][] {
    const rows: HTMLElement[][] = [];
    const tops: number[] = [];
    for (const el of els) {
      const top = el.offsetTop;
      let rowIdx = tops.findIndex((t) => t === top);
      if (rowIdx === -1) {
        tops.push(top);
        tops.sort((a, b) => a - b);
        rowIdx = tops.findIndex((t) => t === top);
      }
      (rows[rowIdx] ||= []).push(el);
    }
    return rows;
  }

  // Compute how many badges to keep using natural wrapping, and make the token fit on the last allowed row
  useLayoutEffect(() => {
    // Legacy path: visibleCount explicitly provided
    if (typeof visibleCount === "number") {
      setAutoVisible(null);
      return;
    }
    const container = containerRef.current;
    if (!container || arr.length === 0) {
      setAutoVisible(0);
      return;
    }
    // Unlimited rows → show all, no token
    if (!Number.isFinite(maxRows)) {
      setAutoVisible(arr.length);
      return;
    }

    const wrappers = itemRefs.current.filter(Boolean) as HTMLElement[];
    if (wrappers.length === 0) return;

    // Let the browser lay everything out; then read rows.
    const rows = groupIntoRows(wrappers);
    const allowed = Math.max(1, Math.floor(maxRows));
    const cRect = container.getBoundingClientRect();
    const containerWidth = cRect.width || container.clientWidth || 0;

    // If everything is within allowed rows:
    if (rows.length <= allowed) {
      // Expand to all only if we measured the full list OR we explicitly rendered all for this pass.
      if (wrappers.length === arr.length || renderAllOnce) {
        setAutoVisible(arr.length);
      }
      // Clear the one-shot flag if it was set.
      if (renderAllOnce) setRenderAllOnce(false);
      return;
    }

    // Keep all items in rows before the last allowed row
    const keptBeforeLast = rows.slice(0, allowed - 1).flat().length;

    // Work within the last allowed row: trim from the end until "+N more" fits.
    let keep = keptBeforeLast + rows[allowed - 1].length;
    let overflow = arr.length - keep;

    const measureMore = (n: number) => {
      if (!moreMeasureRef.current) return 0;
      moreMeasureRef.current.textContent = `+${n} more`;
      return moreMeasureRef.current.offsetWidth || 0;
    };

    while (keep > keptBeforeLast) {
      const lastEl = wrappers[keep - 1];
      if (!lastEl) break; // type-safe guard instead of non-null assertion
      const r = lastEl.getBoundingClientRect();
      // measure against container's left to stay in same coord space
      const rightEdge = r.right - cRect.left;
      const tokenWidth = measureMore(overflow);
      // keep token on same row; no extra margins; prevent wrapping
      if (rightEdge + tokenWidth <= containerWidth) break;
      keep -= 1;
      overflow += 1;
    }

    setAutoVisible(Math.max(1, keep));
    if (renderAllOnce) setRenderAllOnce(false);
  }, [arr, visibleCount, maxRows, measureSeq, renderAllOnce]);

  // Recompute on container resize and when fonts finish loading (labels can change width)
  useEffect(() => {
    if (typeof visibleCount === "number") return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      // On any size change, render all items for one frame so we can expand if needed.
      requestAnimationFrame(() => {
        setRenderAllOnce(true);
        setMeasureSeq((n) => n + 1);
      });
    });
    ro.observe(el);
    let cancelled = false;
    const fontsReady: Promise<void> | undefined = document.fonts?.ready;
    if (fontsReady) {
      void fontsReady.then(() => {
        if (!cancelled) {
          requestAnimationFrame(() => {
            setRenderAllOnce(true);
            setMeasureSeq((n) => n + 1);
          });
        }
      });
    }
    // Also handle window resizes affecting ancestor width (optional but helpful)
    const onWin = () => {
      setRenderAllOnce(true);
      setMeasureSeq((n) => n + 1);
    };
    window.addEventListener("resize", onWin);
    return () => {
      cancelled = true;
      ro.disconnect();
      window.removeEventListener("resize", onWin);
    };
  }, [visibleCount]);

  const finalVisible =
    typeof visibleCount === "number"
      ? visibleCount
      : renderAllOnce
        ? arr.length // temporarily render all to measure expansion capacity
        : (autoVisible ?? arr.length);
  const showMore =
    finalVisible < arr.length && Number.isFinite(maxRows) && finalVisible >= 0;

  return (
    <div
      ref={containerRef}
      className="flex flex-wrap"
    >
      {/* Hidden, dynamic measurer for the "+N more" token */}
      <span
        ref={moreMeasureRef}
        aria-hidden="true"
        className="invisible absolute whitespace-nowrap text-xs"
      >
        +0 more
      </span>
      {arr.slice(0, finalVisible).map((value, idx) => (
        <span
          key={idx}
          ref={(el) => (itemRefs.current[idx] = el)}
          className="inline-block"
        >
          <BadgeMaybeAbsent
            variant={variants[idx]}
            tooltip={tooltipGetter?.(value as T)}
            toLabel={toLabel}
            renderLabel={renderLabel}
            {...rest}
          >
            {value}
          </BadgeMaybeAbsent>
        </span>
      ))}
      {showMore && (
        <TextWithTooltip
          text={
            <span className="text-xs text-rmigray-500 self-center whitespace-nowrap">
              +{arr.length - finalVisible} more
            </span>
          }
          tooltip={
            <span>
              {arr.slice(finalVisible).map((value, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && ", "}
                  <span className="whitespace-nowrap">{value}</span>
                </React.Fragment>
              ))}
            </span>
          }
        />
      )}
    </div>
  );
}
