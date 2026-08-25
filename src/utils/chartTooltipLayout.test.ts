import { describe, it, expect } from "vitest";
import { computeTooltipBoxLayout } from "./chartTooltipLayout";

// Bounds/text metrics chosen to match MultiLineChart's defaults: pad=10,
// tipHeight=5, so boxWidth = text.width + 20 and boxHeight = text.height + 20.
const bounds = { left: 50, right: 520, top: 20, bottom: 345 };
const text = { width: 80, height: 20, bboxY: -14 };

describe("computeTooltipBoxLayout", () => {
  it("centers on the point and grows downward when there's room on every side", () => {
    const layout = computeTooltipBoxLayout({ x: 300, y: 150 }, text, bounds);

    expect(layout.offsetX).toBe(0);
    expect(layout.nearY).toBe(5); // tipHeight
    expect(layout.farY).toBe(45); // tipHeight + boxHeight (20 + 20)
    expect(layout.textOffsetX).toBe(-40); // -width / 2
    expect(layout.textOffsetY).toBe(29); // min(near,far) + pad - bboxY
  });

  it("slides the box right when the point is near the left edge", () => {
    const layout = computeTooltipBoxLayout({ x: 60, y: 150 }, text, bounds);

    // Box's absolute left edge should sit exactly on the plot's left bound.
    expect(60 + layout.boxLeft).toBeCloseTo(bounds.left);
    // Vertical placement is unaffected.
    expect(layout.nearY).toBe(5);
  });

  it("slides the box left when the point is near the right edge", () => {
    const layout = computeTooltipBoxLayout({ x: 510, y: 150 }, text, bounds);

    expect(510 + layout.boxRight).toBeCloseTo(bounds.right);
    expect(layout.nearY).toBe(5);
  });

  it("flips the box above the point when there's no room below", () => {
    const layout = computeTooltipBoxLayout({ x: 300, y: 330 }, text, bounds);

    // Both edges end up above the point (negative local y).
    expect(layout.nearY).toBeLessThan(0);
    expect(layout.farY).toBeLessThan(0);
    expect(Math.abs(layout.nearY)).toBeLessThan(Math.abs(layout.farY));
    // Horizontal placement is unaffected.
    expect(layout.offsetX).toBe(0);
  });

  it("applies horizontal and vertical repositioning independently near a corner", () => {
    const layout = computeTooltipBoxLayout({ x: 55, y: 330 }, text, bounds);

    expect(55 + layout.boxLeft).toBeCloseTo(bounds.left); // shifted right
    expect(layout.nearY).toBeLessThan(0); // flipped above
  });

  it("clamps the far edge to the available space when neither side fully fits", () => {
    const tightBounds = { left: 50, right: 520, top: 100, bottom: 110 };
    const layout = computeTooltipBoxLayout(
      { x: 300, y: 105 },
      text,
      tightBounds,
    );

    const belowSpace = tightBounds.bottom - 105;
    const aboveSpace = 105 - tightBounds.top;
    const chosenSpace = layout.farY > 0 ? belowSpace : aboveSpace;
    expect(Math.abs(layout.farY)).toBeLessThanOrEqual(chosenSpace + 1e-9);
  });

  it("falls back to the averaged center when the box is wider than the plot area", () => {
    const narrowBounds = { left: 50, right: 120, top: 20, bottom: 345 };
    const layout = computeTooltipBoxLayout(
      { x: 300, y: 150 },
      text,
      narrowBounds,
    );

    const halfWidth = (text.width + 20) / 2; // pad default = 10
    const minCenter = narrowBounds.left + halfWidth;
    const maxCenter = narrowBounds.right - halfWidth;
    expect(300 + layout.offsetX).toBeCloseTo((minCenter + maxCenter) / 2);
  });
});
