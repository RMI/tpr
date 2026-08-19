/**
 * Pure geometry for positioning a point-anchored chart tooltip (e.g.
 * MultiLineChart's per-datapoint tooltip) so it never clips past the
 * plot area's edges. Kept free of d3/DOM so it can be unit tested without
 * a real SVG layout engine (jsdom's getBBox() always returns zeros).
 *
 * All coordinates are local to the anchor point, i.e. the hovered point
 * sits at (0, 0); `offsetX`/`nearY`/`farY` describe the tooltip box's
 * position relative to it.
 */

export interface TooltipAnchorPoint {
  x: number;
  y: number;
}

/** The plot area's edges, in the same pixel space as the anchor point. */
export interface TooltipPlotBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** The tooltip text's measured size, as reported by SVGTextElement.getBBox(). */
export interface TooltipTextMetrics {
  width: number;
  height: number;
  /** bbox.y — the ascent offset, needed to correct the text's baseline. */
  bboxY: number;
}

export interface TooltipLayoutOptions {
  /** Internal padding around the text, each side. */
  pad?: number;
  /** Length of the tail between the box and the anchor point. */
  tipHeight?: number;
}

export interface TooltipBoxLayout {
  boxLeft: number;
  boxRight: number;
  /** Box edge closest to the anchor point (tail attaches here). */
  nearY: number;
  /** Box edge farthest from the anchor point. */
  farY: number;
  /** Horizontal shift of the box's center away from the anchor point. */
  offsetX: number;
  /** Half-width of the tail where it meets the box. */
  tailHalf: number;
  /** Transform offset for the tooltip text. */
  textOffsetX: number;
  textOffsetY: number;
}

const DEFAULT_PAD = 10;
const DEFAULT_TIP_HEIGHT = 5;

/**
 * Computes where to draw a tooltip box anchored to a single point, so it
 * stays within the given plot bounds.
 *
 * Horizontally, the box is centered on the point by default, sliding back
 * on-chart just far enough to fit within `bounds.left`/`bounds.right`.
 *
 * Vertically, the box grows downward from the point by default; it flips
 * to grow upward if there's no room below but there is above. If neither
 * direction fully fits, it uses whichever side has more room and slides
 * back on-chart to clip as little as possible.
 *
 * In every case the tail (drawn separately by the caller, from
 * `(offsetX - tailHalf, nearY)` through `(0, 0)` to
 * `(offsetX + tailHalf, nearY)`) keeps pointing at the exact anchor point.
 */
export function computeTooltipBoxLayout(
  point: TooltipAnchorPoint,
  text: TooltipTextMetrics,
  bounds: TooltipPlotBounds,
  options: TooltipLayoutOptions = {},
): TooltipBoxLayout {
  const pad = options.pad ?? DEFAULT_PAD;
  const tipHeight = options.tipHeight ?? DEFAULT_TIP_HEIGHT;
  const tailHalf = pad / 2;
  const boxWidth = text.width + pad * 2;
  const boxHeight = text.height + pad * 2;
  const halfWidth = boxWidth / 2;

  // Horizontal: slide the centered box back on-chart just far enough to
  // fit within the plot's left/right edges. If the box is wider than the
  // plot area, fall back to the average so it clips as evenly as possible.
  const minCenter = bounds.left + halfWidth;
  const maxCenter = bounds.right - halfWidth;
  const centerX =
    minCenter <= maxCenter
      ? Math.min(Math.max(point.x, minCenter), maxCenter)
      : (minCenter + maxCenter) / 2;
  const offsetX = centerX - point.x;
  const boxLeft = offsetX - halfWidth;
  const boxRight = offsetX + halfWidth;

  // Vertical: prefer below the point; flip above if there's no room below
  // but there is above. If neither fully fits, use whichever side has
  // more room and slide the box back on-chart to fit.
  const belowSpace = bounds.bottom - point.y;
  const aboveSpace = point.y - bounds.top;
  const needed = tipHeight + boxHeight;
  const sign =
    needed <= belowSpace
      ? 1
      : needed <= aboveSpace
        ? -1
        : belowSpace >= aboveSpace
          ? 1
          : -1;
  const overflowY = Math.max(0, needed - (sign > 0 ? belowSpace : aboveSpace));
  const nearY = sign * (tipHeight - overflowY);
  const farY = sign * (tipHeight + boxHeight - overflowY);

  return {
    boxLeft,
    boxRight,
    nearY,
    farY,
    offsetX,
    tailHalf,
    textOffsetX: offsetX - text.width / 2,
    textOffsetY: Math.min(nearY, farY) + pad - text.bboxY,
  };
}
