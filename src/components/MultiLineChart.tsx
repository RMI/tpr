import { pointer, select, Selection } from "d3-selection";
import { scaleUtc, scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { utcParse } from "d3-time-format";
import { ascending, extent, groups, leastIndex, range } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis";
import { useRef, useEffect, useMemo, useState } from "react";
import { capitalizeWords } from "../utils/capitalizeWords";

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
  externalHoveredSeries?: string | null;
  onHoverSeries?: (series: string | null) => void;
}

type GroupedData = [string, DataPoint[]];

type LabelData = { label: string; x: number; y: number };

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
  externalHoveredSeries,
  onHoverSeries,
}: MultiLineChartProps) {
  const d3data = useMemo(
    () => data.data.filter((d) => d.sector === sector && d.metric === metric),
    [data.data, sector, metric],
  );

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
    data.data
      .filter((d) => d.sector === sector && d.metric === metric)
      .map((d) => d.technology)[0],
  );

  const isPointerOver = useRef(false);
  const lastHoveredSeries = useRef<string | null>(null);
  const onHoverSeriesRef = useRef(onHoverSeries);
  useEffect(() => {
    onHoverSeriesRef.current = onHoverSeries;
  }, [onHoverSeries]);

  // Memoize scales and data transformations
  const chartSetup = useMemo(() => {
    const parse = utcParse("%Y");
    const years = extent(d3data, (d) => parse(d.year));
    const values = extent(d3data, (d) => d.value);
    const xticks = Array.from(new Set(d3data.map((d) => d.year)))
      .map(parse)
      .filter(
        (d, i): d is Date =>
          d !== null && (i === 0 || d.getUTCFullYear() % 10 === 0),
      );

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

    const x = scaleUtc()
      .domain(years)
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

    // Update labels with capitalized technology names
    const dodged = dodge(
      groupedData.map((d) => y(d[1][d[1].length - 1].value)),
    );

    const labelData = groupedData.map((d, i) => ({
      label: capitalizeWords(d[0]),
      x: x(parse(d[1][d[1].length - 1].year) as Date),
      y: dodged[i],
    }));

    (
      select(lines.current)
        .selectAll<SVGTextElement, LabelData>(".label")
        .data(labelData)
        .join("text") as UpdateSelection
    )
      .text((d) => d.label as string)
      .attr("class", "label")
      .attr("x", (d) => d.x as number)
      .attr("y", (d) => d.y as number)
      .attr("dx", "18")
      .attr("dy", "5")
      .attr("font-size", "12px");

    // Add an invisible layer for the interactive tip.
    const svg = select(ref.current);
    const path = select(lines.current).selectAll("path");

    const points = d3data.map((d) => [
      x(parse(d.year)),
      y(d.value),
      d.technology,
      d.year,
      d.value,
      d.unit,
    ]);

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

    function pointermoved(event: PointerEvent) {
      const [xm, ym] = pointer(event);
      const i = leastIndex(points, ([x, y]) => Math.hypot(x - xm, y - ym));
      if (i === undefined || i < 0) return;
      const [x, y, k, year, value, unit] = points[i];

      if (lastHoveredSeries.current !== k) {
        lastHoveredSeries.current = k as string;
        onHoverSeriesRef.current?.(k as string);
      }

      path
        .attr("stroke", (d) => (d[0] === k ? "var(--color-donate)" : "#ddd"))
        .attr("stroke-width", (d) => (d[0] === k ? 3 : 1))
        .filter((d) => d[0] === k)
        .raise();

      dot.attr("transform", `translate(${x},${y})`);

      const tooltipText = [
        capitalizeWords(k as string) + ": " + year,
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

      size(tooltipTextElem, tooltipBoxElem);
    }

    function pointerentered() {
      isPointerOver.current = true;
      path.style("mix-blend-mode", null).attr("stroke", "#ddd");
      dot.attr("display", null);
    }

    function pointerleft() {
      isPointerOver.current = false;
      lastHoveredSeries.current = null;
      onHoverSeriesRef.current?.(null);
      const selectedTech = selectRef;
      path
        .style("mix-blend-mode", "multiply")
        .attr("stroke", (d: GroupedData) =>
          d[0] === selectedTech ? "var(--color-donate)" : "var(--color-coal)",
        )
        .attr("stroke-width", (d: GroupedData) =>
          d[0] === selectedTech ? 3 : 1,
        );
      dot.attr("display", "none");
    }

    function pointerclicked(event: PointerEvent) {
      const [xm, ym] = pointer(event);
      const i = leastIndex(points, ([x, y]) => Math.hypot(x - xm, y - ym));
      if (i === undefined || i < 0) return;
      const clicked_tech = points[i][2];
      setSelectRef(clicked_tech as string);
    }

    function size(
      text: Selection<SVGTextElement, unknown, null, undefined>,
      path: Selection<SVGPathElement, unknown, null, undefined>,
    ) {
      const bbox = text.node()?.getBBox();
      if (!bbox) return;
      const { y, width: w, height: h } = bbox;
      text.attr("transform", `translate(${-w / 2},${15 - y})`);
      path.attr(
        "d",
        `M${-w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${w + 20}z`,
      );
    }
  }, [d3data, selectRef, chartSetup, sector, metric, marginTop, width]);

  // Apply cross-chart highlighting when another pathway's chart is hovered
  useEffect(() => {
    if (!lines.current || isPointerOver.current) return;
    const path = select(lines.current).selectAll<SVGPathElement, GroupedData>(
      ".line",
    );
    if (externalHoveredSeries == null) {
      path
        .style("mix-blend-mode", "multiply")
        .attr("stroke", (d) =>
          d[0] === selectRef ? "var(--color-donate)" : "var(--color-coal)",
        )
        .attr("stroke-width", (d) => (d[0] === selectRef ? 3 : 1));
    } else {
      path
        .style("mix-blend-mode", null)
        .attr("stroke", (d) =>
          d[0] === externalHoveredSeries ? "var(--color-donate)" : "#ddd",
        )
        .attr("stroke-width", (d) => (d[0] === externalHoveredSeries ? 3 : 1));
    }
  }, [externalHoveredSeries, selectRef]);

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
