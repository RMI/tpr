import React from "react";

export type RangeValue = {
  min?: number;
  max?: number;
  includeAbsent?: boolean;
} | null;

type Props = {
  label: string;
  /** Domain low/high (true bounds used for “default” and emitting null) */
  minBound: number;
  maxBound: number;
  /** Snap increment (e.g., getStep("temp") = 0.1) */
  step: number;
  /** Parent-controlled value; null = no filter */
  value: RangeValue;
  onChange: (next: RangeValue) => void;
  dataTestId?: string;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
function snap(n: number, step: number) {
  return Math.round(n / step) * step;
}

function stepDecimals(step: number): number {
  // Count decimals needed to represent the step (e.g., 0.1 -> 1, 0.25 -> 2)
  if (!Number.isFinite(step) || step <= 0) return 0;
  let d = 0;
  // Cap at 10 to avoid infinite loops on pathological inputs
  while (d < 10 && Math.round(step * 10 ** d) / 10 ** d !== step) d++;
  return d;
}
function roundToStepDisplay(n: number, step: number): number {
  const d = stepDecimals(step);
  // Snap first, then trim floating error like 2.8000000000000003
  const snapped = snap(n, step);
  return Number(snapped.toFixed(d));
}

function toPct(n: number, lo: number, hi: number) {
  return ((n - lo) / (hi - lo)) * 100;
}
function isNum(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

const HANDLE_R = 8;

/**
 * Temperature -> hex mapping (based on warming bands).
 */
function tempToHex(t: number) {
  // Use deeper theme tokens (CSS variables) for a richer gradient.
  if (t <= 1.5) return "#2888C9";
  if (t <= 1.75) return "#77B8E4";
  if (t <= 2.0) return "#91CBF2";
  if (t <= 3.0) return "#DF4E39";
  if (t <= 3.5) return "#DF4E39";
  return "#AB3C2C";
}

const NumericRangeSlider: React.FC<Props> = ({
  label,
  minBound,
  maxBound,
  step,
  value,
  onChange,
  dataTestId,
}) => {
  type Internal = { min?: number; max?: number; includeAbsent: boolean };
  const [internal, setInternal] = React.useState<Internal>({
    min: value?.min,
    max: value?.max,
    includeAbsent: Boolean(value?.includeAbsent),
  });

  const [isDragging, setIsDragging] = React.useState(false);
  const [draggingWhich, setDraggingWhich] = React.useState<
    "min" | "max" | null
  >(null);

  // Track whether a change originated from the user (vs prop sync)
  const fromUserRef = React.useRef(false);

  // Sync down from parent
  React.useEffect(() => {
    const v = value ?? null;
    const next: Internal = v
      ? { min: v.min, max: v.max, includeAbsent: Boolean(v.includeAbsent) }
      : { min: undefined, max: undefined, includeAbsent: false };

    setInternal((prev) => {
      if (
        prev.min === next.min &&
        prev.max === next.max &&
        prev.includeAbsent === next.includeAbsent
      ) {
        return prev;
      }
      fromUserRef.current = false;
      return next;
    });
  }, [value, minBound, maxBound]);

  // Notify parent when user commits changes
  React.useEffect(() => {
    if (!fromUserRef.current) return;
    const isDefault =
      internal.min === undefined &&
      internal.max === undefined &&
      internal.includeAbsent === false;
    onChange(isDefault ? null : internal);
    fromUserRef.current = false;
  }, [internal, minBound, maxBound, onChange]);

  const commit = (patch: Partial<Internal>) => {
    fromUserRef.current = true;
    setInternal((prev) => ({ ...prev, ...patch }));
  };

  const handleClear = () => {
    fromUserRef.current = true;
    setInternal({ min: undefined, max: undefined, includeAbsent: false });
  };

  const { min, max, includeAbsent } = internal;

  // --- slider interactions (confined to visible bar) ---
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const activeHandle = React.useRef<"min" | "max" | null>(null);

  const pxToValue = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return undefined;
    const rect = el.getBoundingClientRect();
    const t = clamp((clientX - rect.left) / rect.width, 0, 1);
    const raw = minBound + t * (maxBound - minBound);
    // Clicks/dragging should NOT clamp to [minBound,maxBound];
    // we only snap+round to step precision and return the raw value.
    return roundToStepDisplay(raw, step);
  };

  const chooseHandle = (v: number): "min" | "max" => {
    const hasMin = isNum(min);
    const hasMax = isNum(max);

    if (!hasMin && !hasMax) return "max"; // still prefer max first
    if (!hasMin && hasMax) return v <= max ? "min" : "max";
    if (hasMin && !hasMax) return v >= min ? "max" : "min";

    // both handles exist → nearest
    return Math.abs(v - (min as number)) <= Math.abs(v - (max as number))
      ? "min"
      : "max";
  };

  const onTrackMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const v = pxToValue(e.clientX);
    if (!isNum(v)) return;
    const which = chooseHandle(v);
    activeHandle.current = which;
    setDraggingWhich(which);
    setIsDragging(true);
    // commit the initial click position (rounded to step)
    commit({ [which]: roundToStepDisplay(v, step) });

    const move = (ev: MouseEvent) => {
      const nv = pxToValue(ev.clientX);
      if (!isNum(nv)) return;
      if (activeHandle.current) {
        commit({
          [activeHandle.current]: roundToStepDisplay(nv, step),
        });
      }
    };

    const up = () => {
      activeHandle.current = null;
      setIsDragging(false);
      setDraggingWhich(null);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const dragHandle =
    (which: "min" | "max"): React.MouseEventHandler<HTMLDivElement> =>
    (e) => {
      e.stopPropagation();
      activeHandle.current = which;
      setDraggingWhich(which);
      setIsDragging(true);

      const move = (ev: MouseEvent) => {
        const nv = pxToValue(ev.clientX);
        if (!isNum(nv)) return;
        commit({ [which]: roundToStepDisplay(nv, step) });
      };

      const up = () => {
        activeHandle.current = null;
        setIsDragging(false);
        setDraggingWhich(null);
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    };

  // --- visuals ---
  // For visuals, show handles at bounds when undefined; hide if off the visible window.
  const effMin = isNum(min) ? min : minBound;
  const effMax = isNum(max) ? max : maxBound;
  const minPctOnBar = toPct(
    clamp(effMin, minBound, maxBound),
    minBound,
    maxBound,
  );
  const maxPctOnBar = toPct(
    clamp(effMax, minBound, maxBound),
    minBound,
    maxBound,
  );

  // Show a handle only if that bound is explicitly set AND it lies in the visible window
  const minVisible = isNum(min) && effMin >= minBound && effMin <= maxBound;
  const maxVisible = isNum(max) && effMax >= minBound && effMax <= maxBound;

  // Compute the highlighted segment to indicate bounded vs unbounded within [barMin, barMax]
  const hasMin = isNum(min);
  const hasMax = isNum(max);
  let segStartPct = 0;
  let segEndPct = 0;
  if (hasMin && hasMax) {
    segStartPct = Math.min(minPctOnBar, maxPctOnBar);
    segEndPct = Math.max(minPctOnBar, maxPctOnBar);
  } else if (hasMin && !hasMax) {
    segStartPct = minPctOnBar;
    segEndPct = 100; // unbounded to the right up to maxBound
  } else if (!hasMin && hasMax) {
    segStartPct = 0; // unbounded to the left from maxBound
    segEndPct = maxPctOnBar;
  } else {
    segStartPct = 0;
    segEndPct = 0; // no selection
  }

  // Active if any non-default or includeAbsent
  // Active if any non-default (min/max set) or includeAbsent checked
  const isActive = includeAbsent || isNum(min) || isNum(max);

  // prepare gradient stops across the visible domain. We'll use a set of logical temperature marks.
  const marks = [minBound, 1.5, 2.0, 2.5, 3.0, 3.5, maxBound]
    .filter((m) => m >= minBound && m <= maxBound)
    .sort((a, b) => a - b);

  // Build gradient string with percentage stops relative to the visible bar
  const gradientStops = marks
    .map((m) => {
      const pct = toPct(m, minBound, maxBound);
      return `${tempToHex(m)} ${pct}%`;
    })
    .join(", ");

  // Simple tick labels at 0.5 degree steps within the visible bar
  const ticks: number[] = [];
  const startI = Math.ceil(minBound * 2);
  const endI = Math.floor(maxBound * 2);
  for (let ti = startI; ti <= endI; ti++) ticks.push(ti / 2);

  // format tooltip value (1 decimal)
  const fmt = (v: number) => v.toFixed(1);
  const minTooltipValue = fmt(isNum(min) ? min : minBound);
  const maxTooltipValue = fmt(isNum(max) ? max : maxBound);

  return (
    <fieldset
      data-testid={dataTestId}
      aria-label={label}
      className="space-y-3"
    >
      {/* Slider track */}
      <div className="flex flex-col gap-4 md:p-5 md:gap-4 my-6">
        <div className="relative">
          <div
            ref={trackRef}
            onMouseDown={onTrackMouseDown}
            className="relative h-2 w-full rounded bg-rmigray-200 cursor-pointer select-none"
            aria-label={`${label} slider`}
          >
            {/* Full-track gradient (always present behind overlays) */}
            <div
              className="absolute inset-0 h-2 rounded"
              style={{
                background: `linear-gradient(to right, ${gradientStops})`,
                // keep it behind overlays but above base
                zIndex: 10,
              }}
            />

            {/* overlays to hide gradient outside active range */}
            {/* left cover */}
            <div
              className="absolute top-0 h-2 rounded-l"
              style={{
                left: 0,
                width: `${segStartPct}%`,
                background: "rgb(230 236 239)", // rmigray-200 fallback (matches bg-rmigray-200)
                zIndex: 20,
                transition: "width 200ms ease",
              }}
            />
            {/* right cover */}
            <div
              className="absolute top-0 h-2 rounded-r"
              style={{
                left: `${segEndPct}%`,
                width: `${Math.max(0, 100 - segEndPct)}%`,
                background: "rgb(230 236 239)",
                zIndex: 20,
                transition: "left 200ms ease, width 200ms ease",
              }}
            />

            {/* when not active we want a neutral fill visible (so gradient is masked by overlays that cover whole track) */}
            {!isActive && (
              <div
                className="absolute inset-0 h-2 rounded"
                style={{ background: "rgb(209 216 221)", zIndex: 25 }}
              />
            )}

            {/* floating tooltips above handles while dragging (1 decimal + °C) */}
            {isDragging && draggingWhich === "min" && minVisible && (
              <div
                className="absolute -top-8 -translate-x-1/2 px-2 py-1 bg-white border border-rmigray-200 rounded text-xs shadow-sm z-40"
                style={{ left: `calc(${minPctOnBar}% )` }}
              >
                {minTooltipValue}°C
              </div>
            )}
            {isDragging && draggingWhich === "max" && maxVisible && (
              <div
                className="absolute -top-8 -translate-x-1/2 px-2 py-1 bg-white border border-rmigray-200 rounded text-xs shadow-sm z-40"
                style={{ left: `calc(${maxPctOnBar}% )` }}
              >
                {maxTooltipValue}°C
              </div>
            )}

            {/* min handle */}
            {minVisible && (
              <div
                role="slider"
                aria-label={`${label} min handle`}
                aria-valuemin={minBound}
                aria-valuemax={maxBound}
                aria-valuenow={min}
                onMouseDown={dragHandle("min")}
                className={`absolute -top-1 h-4 w-4 rounded-full border bg-white transition-shadow duration-150 ${
                  isActive
                    ? "border-rmiblue-800 shadow-md ring-2 ring-rmiblue-100"
                    : "border-rmigray-400 shadow-sm"
                } z-50`}
                style={{ left: `calc(${minPctOnBar}% - ${HANDLE_R}px)` }}
              />
            )}

            {/* max handle (hidden if outside visible window) */}
            {maxVisible && (
              <div
                role="slider"
                aria-label={`${label} max handle`}
                aria-valuemin={minBound}
                aria-valuemax={maxBound}
                aria-valuenow={max}
                onMouseDown={dragHandle("max")}
                className={`absolute -top-1 h-4 w-4 rounded-full border bg-white transition-shadow duration-150 ${
                  isActive
                    ? "border-rmiblue-800 shadow-md ring-2 ring-rmiblue-100"
                    : "border-rmigray-400 shadow-sm"
                } z-50`}
                style={{ left: `calc(${maxPctOnBar}% - ${HANDLE_R}px)` }}
              />
            )}

            {/* tick labels every 0.5° with °C appended */}
            {ticks.map((t) => {
              const pct = toPct(t, minBound, maxBound);
              return (
                <div
                  key={String(t)}
                  className="absolute -bottom-5 -translate-x-1/2 text-[12px] text-rmigray-500 z-50"
                  style={{ left: `${pct}%` }}
                >
                  {t.toFixed(1)}°C
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-4">
          <button
            type="button"
            className="underline text-sm disabled:opacity-50"
            onClick={handleClear}
            disabled={!isActive}
          >
            Clear
          </button>

          <label className="ml-auto flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={internal.includeAbsent}
              onChange={(e) => commit({ includeAbsent: e.target.checked })}
            />
            <span>Include pathways without temperature value</span>
          </label>
        </div>
      </div>
    </fieldset>
  );
};

export default NumericRangeSlider;
