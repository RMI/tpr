import { pointer, select, Selection } from "d3-selection";
import { scaleUtc, scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { utcParse } from "d3-time-format";
import { ascending, extent, groups, leastIndex, range } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis";
import { useRef, useEffect, useMemo, useState } from "react";
import { capitalizeWords } from "../utils/capitalizeWords";
import {
  MAX_PLOT_YEAR,
  isPastPlottedYears,
  plotXAxis,
} from "../utils/plotYears";
import { computeTooltipBoxLayout } from "../utils/chartTooltipLayout";
import type { HoveredPoint } from "./PlotSelector";

interface DataPoint {
  sector: string;
  metric: string;
  year: string;
  technology: string;
  value: number;
  geography: string;
  unit: string;
}

interface ChartData {
  data: DataPoint[];
}

interface MultiLineChartProps {
  data: ChartData;
  width?: number;
  height?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  sector?: string;
  metric?: string;
  yMin?: number;
  yMax?: number;
  externalHoveredPoint?: HoveredPoint | null;
  onHoverPoint?: (point: HoveredPoint | null) => void;
}

type GroupedData = [string, DataPoint[]];

type LabelData = { technology: string; label: string; y: number };

/**
 * Colours the label of `technology`'s line like the highlighted line, and
 * resets every other label.
 */
function highlightLabel(linesGroup: SVGGElement, technology: string | null) {
  select(linesGroup)
    .selectAll<SVGTextElement, LabelData>(".label")
    .attr("fill", (d) =>
      d.technology === technology ? "var(--color-donate)" : null,
    );
}

// [xPixel, yPixel, technology, year, value, unit] for a single data point.
type LinePoint = [number, number, string, string, number, string];

export default function MultiLineChart({
  data,
  width = 600,
  height = 400,
  marginTop = 20,
  marginRight = 80,
  marginBottom = 55,
  marginLeft = 50,
  sector = "power",
  metric = "capacity",
  yMin,
  yMax,
  externalHoveredPoint,
  onHoverPoint,
}: MultiLineChartProps) {
  const d3data = useMemo(() => {
    // Rows past MAX_PLOT_YEAR are dropped here too, so the chart is right even
    // for a caller that skipped capToPlotYears.
    let filtered = data.data.filter(
      (d) =>
        d.sector === sector &&
        d.metric === metric &&
        Number(d.year) <= MAX_PLOT_YEAR,
    );
    if (metric === "emissionsIntensity" || metric === "absoluteEmissions") {
      filtered = filtered.map((d) => ({ ...d, technology: d.metric }));
    }
    return filtered;
  }, [data.data, sector, metric]);

  const ref = useRef<SVGSVGElement>(null);
  const gx = useRef<SVGGElement>(null);
  const gy = useRef<SVGGElement>(null);
  const lines = useRef<SVGGElement>(null);
  const dots = useRef<SVGGElement>(null);
  const tooltip_grp = useRef<SVGGElement>(null);

  const chartTitle = useMemo(() => {
    const unit = d3data[0]?.unit ?? "";
    return `${capitalizeWords(sector)} ${capitalizeWords(metric)} [${unit}]`;
  }, [d3data, sector, metric]);
  const [selectRef, setSelectRef] = useState<string>(
    d3data.map((d) => d.technology)[0],
  );

  const isPointerOver = useRef(false);
  const lastHoveredPoint = useRef<HoveredPoint | null>(null);
  const onHoverPointRef = useRef(onHoverPoint);
  useEffect(() => {
    onHoverPointRef.current = onHoverPoint;
  }, [onHoverPoint]);

  // Pixel positions of every data point in the current dataset, kept fresh
  // by the main effect below, so the cross-chart hover-sync effect can look
  // up a matching point without re-running the (expensive, transitioning)
  // main effect on every sibling-chart pointer move.
  const pointsRef = useRef<LinePoint[]>([]);
  const tooltipApiRef = useRef<{
    renderTooltip: (point: LinePoint, muted: boolean) => void;
    hideTooltip: () => void;
  } | null>(null);

  // Memoize scales and data transformations
  const chartSetup = useMemo(() => {
    const parse = utcParse("%Y");
    const years = extent(d3data, (d) => parse(d.year));
    const values = extent(d3data, (d) => d.value);

    if (!years[0] || !years[1]) return null;

    const domainMin = yMin !== undefined ? yMin : values[0];
    const domainMax = yMax !== undefined ? yMax : values[1];

    if (
      domainMin === undefined ||
      domainMin === null ||
      domainMax === undefined ||
      domainMax === null
    ) {
      return null;
    }

    const { domain, ticks: xticks } = plotXAxis(years[0], years[1]);

    const x = scaleUtc()
      .domain(domain)
      .range([marginLeft, width - marginRight]);

    const y = scaleLinear()
      .domain([domainMin, domainMax])
      .range([height - marginBottom, marginTop]);

    const lineGenerator = line<DataPoint>()
      .x((d) => x(parse(d.year) as Date))
      .y((d) => y(d.value));

    function dodge(
      positions: number[],
      separation: number = 12,
      maxiter: number = 10,
      maxerror: number = 1e-1,
    ): number[] {
      positions = Array.from(positions);
      const n = positions.length;
      if (!positions.every(isFinite)) throw new Error("invalid position");
      if (!(n > 1)) return positions;
      const index = range(positions.length);
      for (let iter = 0; iter < maxiter; ++iter) {
        index.sort((i, j) => ascending(positions[i], positions[j]));
        let error = 0;
        for (let i = 1; i < n; ++i) {
          let delta = positions[index[i]] - positions[index[i - 1]];
          if (delta < separation) {
            delta = (separation - delta) / 2;
            error = Math.max(error, delta);
            positions[index[i - 1]] -= delta;
            positions[index[i]] += delta;
          }
        }
        if (error < maxerror) break;
      }
      return positions;
    }

    return { x, y, line: lineGenerator, xticks, parse, dodge };
  }, [
    d3data,
    yMin,
    yMax,
    width,
    height,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
  ]);

  useEffect(() => {
    if (
      !ref.current ||
      !gx.current ||
      !gy.current ||
      !lines.current ||
      !tooltip_grp.current ||
      !chartSetup
    )
      return;

    const { x, y, line: lineGenerator, xticks, parse, dodge } = chartSetup;

    type UpdateSelection = Selection<
      SVGPathElement | SVGTextElement,
      GroupedData,
      SVGGElement,
      unknown
    >;

    // Update X axis
    select(gx.current)
      .transition()
      .duration(750)
      .call(axisBottom(x).tickValues(xticks))
      .style("font-size", "14px")
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
      .attr("dx", "-0.5em")
      .attr("dy", "0.15em");

    // Update Y axis
    select(gy.current)
      .transition()
      .duration(750)
      .call(axisLeft(y))
      .style("font-size", "12px");

    const groupedData = groups(d3data, (d) => d.technology);
    const selectedTech = selectRef;

    // Update lines
    (
      select(lines.current)
        .selectAll<SVGPathElement, GroupedData>(".line")
        .data(groupedData)
        .join("path") as UpdateSelection
    )
      .attr("class", "line")
      .attr("fill", "none")
      .attr("stroke", (d) =>
        d[0] === selectedTech ? "var(--color-donate)" : "var(--color-coal)",
      )
      .attr("stroke-width", (d) => (d[0] === selectedTech ? 3 : 1))
      .attr("d", (d) => lineGenerator(d[1]) || "")
      .attr("data-year", (d) => d[1][0].year)
      .attr("data-value", (d) => d[1][0].value)
      .attr("data-geography", (d) => d[1][0].geography)
      .attr("data-metric", (d) => d[1][0].metric)
      .attr("data-sector", (d) => d[1][0].sector)
      .attr("data-technology", (d) => d[1][0].technology)
      .attr("data-unit", (d) => d[1][0].unit);

    // Update labels with capitalized technology names. Sector-level metrics
    // (absolute emissions, emissions intensity) only ever have a single series,
    // so a label is redundant and can overflow the chart's right margin,
    // especially in the space-constrained Comparison View.
    const showSeriesLabels =
      metric !== "absoluteEmissions" && metric !== "emissionsIntensity";

    let labelData: LabelData[] = [];
    if (showSeriesLabels) {
      const dodged = dodge(
        groupedData.map((d) => y(d[1][d[1].length - 1].value)),
      );
      labelData = groupedData.map((d, i) => ({
        technology: d[0],
        label: capitalizeWords(d[0]),
        y: dodged[i],
      }));
    }

    // Labels sit right of the plot area even when a line ends before
    // MAX_PLOT_YEAR (#1065), so highlightLabel colours a label like its line
    // to tie the two together across the gap.
    (
      select(lines.current)
        .selectAll<SVGTextElement, LabelData>(".label")
        .data(labelData)
        .join("text") as UpdateSelection
    )
      .text((d) => d.label as string)
      .attr("class", "label")
      .attr("x", width - marginRight)
      .attr("y", (d) => d.y as number)
      .attr("dx", "18")
      .attr("dy", "5")
      .attr("font-size", "12px");
    const linesGroup = lines.current;
    highlightLabel(linesGroup, selectedTech);

    // Add an invisible layer for the interactive tip.
    const svg = select(ref.current);
    const path = select(lines.current).selectAll("path");

    const points: LinePoint[] = d3data.map((d) => [
      x(parse(d.year) as Date),
      y(d.value),
      d.technology,
      d.year,
      d.value,
      d.unit,
    ]);
    pointsRef.current = points;
    const yearXs = points.map(([x]) => x);

    const dot = select(tooltip_grp.current);

    const tooltipBoxElem = dot
      .selectAll<SVGPathElement, unknown>("path")
      .data([null])
      .join("path")
      .attr("fill", "white")
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("stroke-linejoin", "round");

    const tooltipTextElem = dot
      .selectAll<SVGTextElement, unknown>("text")
      .data([null])
      .join("text");

    svg
      .on("pointerenter", pointerentered)
      .on("pointermove", pointermoved)
      .on("pointerleave", pointerleft)
      .on("touchstart", (event: TouchEvent) => event.preventDefault())
      .on("click", pointerclicked);

    // Shows the tooltip for a single data point. Used both for this chart's
    // own local hover (muted: false) and, from the effect below, to sync a
    // matching tooltip in when a sibling comparison-view panel is hovered
    // (muted: true) — see the doc comment on chartTooltipLayout.ts's caller
    // for why the geometry itself lives in a separate pure function.
    function renderTooltip(
      [x, y, k, year, value, unit]: LinePoint,
      muted: boolean,
    ) {
      dot
        .attr("transform", `translate(${x},${y})`)
        .attr("display", null)
        .attr("opacity", muted ? 0.6 : 1);

      const tooltipText = [
        capitalizeWords(k) + ": " + year,
        value + " " + unit,
      ];

      tooltipTextElem.call((text) =>
        text
          .selectAll("tspan")
          .data(tooltipText)
          .join("tspan")
          .attr("x", 0)
          .attr("y", (_, i) => `${i * 1.1}em`)
          .attr("font-size", "12px")
          .attr("font-weight", (_, i) => (i ? null : "bold"))
          .text((d) => d),
      );

      size(tooltipTextElem, tooltipBoxElem, x, y);
    }

    function hideTooltip() {
      dot.attr("display", "none").attr("opacity", 1);
    }

    tooltipApiRef.current = { renderTooltip, hideTooltip };

    function pointermoved(event: PointerEvent) {
      // A line label stands for its whole series, not one year, so hovering
      // it highlights the line without a tooltip.
      const labelled = labelTechnology(event);
      if (labelled !== null) {
        reportHover({ technology: labelled, year: null });
        highlightLine(labelled);
        hideTooltip();
        return;
      }

      const [xm, ym] = pointer(event);
      if (isPastPlottedYears(xm, yearXs)) {
        reportHover(null);
        showSelected();
        return;
      }
      const i = leastIndex(points, ([x, y]) => Math.hypot(x - xm, y - ym));
      if (i === undefined || i < 0) return;
      const point = points[i];
      const [, , k, year] = point;

      reportHover({ technology: k, year });
      highlightLine(k);
      renderTooltip(point, false);
    }

    // Tells sibling charts what is hovered, once per change.
    function reportHover(hovered: HoveredPoint | null) {
      const last = lastHoveredPoint.current;
      if (
        last?.technology === hovered?.technology &&
        last?.year === hovered?.year
      ) {
        return;
      }
      lastHoveredPoint.current = hovered;
      onHoverPointRef.current?.(hovered);
    }

    function highlightLine(k: string) {
      path
        .attr("stroke", (d) => (d[0] === k ? "var(--color-donate)" : "#ddd"))
        .attr("stroke-width", (d) => (d[0] === k ? 3 : 1))
        .filter((d) => d[0] === k)
        .raise();
      highlightLabel(linesGroup, k);
    }

    function pointerentered() {
      isPointerOver.current = true;
      path.style("mix-blend-mode", null).attr("stroke", "#ddd");
      highlightLabel(linesGroup, null);
      dot.attr("display", null).attr("opacity", 1);
    }

    function pointerleft() {
      isPointerOver.current = false;
      reportHover(null);
      showSelected();
    }

    // Back to the resting look: the selected line and its label highlighted,
    // no tooltip.
    function showSelected() {
      const selectedTech = selectRef;
      path
        .style("mix-blend-mode", "multiply")
        .attr("stroke", (d: GroupedData) =>
          d[0] === selectedTech ? "var(--color-donate)" : "var(--color-coal)",
        )
        .attr("stroke-width", (d: GroupedData) =>
          d[0] === selectedTech ? 3 : 1,
        );
      highlightLabel(linesGroup, selectedTech);
      hideTooltip();
    }

    // The technology of the line label under the pointer, if any.
    function labelTechnology(event: Event): string | null {
      const label = (event.target as Element).closest(".label");
      return label
        ? select<Element, LabelData>(label).datum().technology
        : null;
    }

    function pointerclicked(event: PointerEvent) {
      // A click on a label selects nothing: only hovering it does anything.
      if (labelTechnology(event) !== null) return;
      const [xm, ym] = pointer(event);
      const i = leastIndex(points, ([x, y]) => Math.hypot(x - xm, y - ym));
      if (i === undefined || i < 0) return;
      const clicked_tech = points[i][2];
      setSelectRef(clicked_tech);
    }

    // Positions the tooltip box around the hovered point, avoiding clipping
    // past the plot's edges. Horizontally the box is centered on the point
    // by default, sliding back on-chart if that would clip; vertically it
    // grows downward from the point by default (today's look), flipping
    // to grow upward if there's no room below but there is above. Either
    // way the tail stretches to keep pointing at the exact hovered point.
    // The actual geometry lives in chartTooltipLayout.ts as a pure
    // function, so it can be unit tested without a real SVG layout engine.
    function size(
      text: Selection<SVGTextElement, unknown, null, undefined>,
      path: Selection<SVGPathElement, unknown, null, undefined>,
      xPixel: number,
      yPixel: number,
    ) {
      const bbox = text.node()?.getBBox();
      if (!bbox) return;

      const {
        boxLeft,
        boxRight,
        nearY,
        farY,
        offsetX,
        tailHalf,
        textOffsetX,
        textOffsetY,
      } = computeTooltipBoxLayout(
        { x: xPixel, y: yPixel },
        { width: bbox.width, height: bbox.height, bboxY: bbox.y },
        {
          left: marginLeft,
          right: width - marginRight,
          top: marginTop,
          bottom: height - marginBottom,
        },
      );

      text.attr("transform", `translate(${textOffsetX},${textOffsetY})`);
      path.attr(
        "d",
        `M${boxLeft},${nearY}L${offsetX - tailHalf},${nearY}L0,0L${offsetX + tailHalf},${nearY}L${boxRight},${nearY}L${boxRight},${farY}L${boxLeft},${farY}Z`,
      );
    }
  }, [
    d3data,
    selectRef,
    chartSetup,
    sector,
    metric,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    width,
    height,
  ]);

  // Apply cross-chart highlighting, and show a synced tooltip if this
  // chart has a data point at the same (year, technology), when another
  // pathway's chart is hovered. Skipped while the pointer is over this
  // chart itself, since its own pointermoved/pointerleft handlers already
  // own the highlighting/tooltip in that case.
  useEffect(() => {
    if (!lines.current || isPointerOver.current) return;
    const path = select(lines.current).selectAll<SVGPathElement, GroupedData>(
      ".line",
    );
    const api = tooltipApiRef.current;

    if (externalHoveredPoint == null) {
      path
        .style("mix-blend-mode", "multiply")
        .attr("stroke", (d) =>
          d[0] === selectRef ? "var(--color-donate)" : "var(--color-coal)",
        )
        .attr("stroke-width", (d) => (d[0] === selectRef ? 3 : 1));
      highlightLabel(lines.current, selectRef);
      api?.hideTooltip();
      return;
    }

    const { year, technology } = externalHoveredPoint;
    path
      .style("mix-blend-mode", null)
      .attr("stroke", (d) =>
        d[0] === technology ? "var(--color-donate)" : "#ddd",
      )
      .attr("stroke-width", (d) => (d[0] === technology ? 3 : 1));
    highlightLabel(lines.current, technology);

    const match =
      technology == null
        ? undefined
        : pointsRef.current.find(
            ([, , k, y]) => k === technology && y === year,
          );

    if (match) {
      api?.renderTooltip(match, true);
    } else {
      api?.hideTooltip();
    }
  }, [externalHoveredPoint, selectRef]);

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm font-bold text-center w-full px-2 break-words mb-1">
        {chartTitle}
      </p>
      <svg
        ref={ref}
        width={width}
        height={height}
      >
        <g
          ref={gx}
          transform={`translate(0, ${height - marginBottom})`}
        />
        <g
          ref={gy}
          transform={`translate(${marginLeft}, 0)`}
        />
        <g ref={lines} />
        <g ref={dots} />
        <g
          ref={tooltip_grp}
          className="tooltip"
          display="none"
        >
          <circle r="2.5" />
        </g>
      </svg>
    </div>
  );
}
