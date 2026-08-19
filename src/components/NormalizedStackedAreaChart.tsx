import { pointer, select } from "d3-selection";
import { scaleUtc, scaleLinear } from "d3-scale";
import { area, stack, Series, SeriesPoint } from "d3-shape";
import { utcParse } from "d3-time-format";
import { group, leastIndex } from "d3-array";
import { extent } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis";
import { stackOffsetExpand } from "d3-shape";
import "d3-transition";
import { useRef, useEffect, useState, useMemo } from "react";
import { capitalizeWords } from "../utils/capitalizeWords";

interface DataPoint {
  sector: string;
  metric: string;
  year: string;
  technology: keyof typeof technologyColors;
  value: number;
  unit: string;
}

interface ChartData {
  data: DataPoint[];
}

interface NormalizedStackedAreaChartProps {
  data: ChartData;
  width?: number;
  height?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  sector?: string;
  metric?: string;
}

const technologyColors = {
  coal: "#AB3C2C", // red-brown
  oil: "#DF4E39", // deep red (hot)
  gas: "#F7988B", // orange-pink
  other: "#B3BCC5", // gray
  biomass: "#91CBF2", // light blue
  biofuels: "#77B8E4", // argentinian blue
  hydro: "#2888C9", // blue
  nuclear: "#2274AA", // ucla blue
  wind: "#005A96", // dark blue
  solar: "#003B63", // navy blue
  renewables: "#003152", // prussian blue
} as const;

export default function NormalizedStackedAreaChart({
  data,
  width = 600,
  height = 400,
  marginTop = 20,
  marginRight = 80,
  marginBottom = 55,
  marginLeft = 40,
  sector = "power",
  metric = "technologyMix",
}: NormalizedStackedAreaChartProps) {
  const [d3data] = useState<DataPoint[]>(() =>
    data.data.filter((d) => d.sector === sector && d.metric === metric),
  );

  const chartTitle = useMemo(() => {
    const unit = d3data[0]?.unit ?? "";
    return `${capitalizeWords(sector)} ${capitalizeWords(metric)} [${unit}]`;
  }, [d3data, sector, metric]);

  const ref = useRef<SVGSVGElement>(null);
  const gx = useRef<SVGGElement>(null);
  const gy = useRef<SVGGElement>(null);
  const areas = useRef<SVGGElement>(null);
  const legend = useRef<SVGGElement>(null);
  const guideline = useRef<SVGLineElement>(null);
  const tooltip_grp = useRef<SVGGElement>(null);

  // Memoize scales and data transformations
  const chartSetup = useMemo(() => {
    const parse = utcParse("%Y");
    const years = extent(d3data, (d) => parse(d.year) ?? new Date());
    const xticks = Array.from(new Set(d3data.map((d) => d.year)))
      .map(parse)
      .filter(
        (d, i): d is Date =>
          d !== null && (i === 0 || d.getUTCFullYear() % 10 === 0),
      );
    if (!years[0] || !years[1]) {
      return null;
    }

    const x = scaleUtc()
      .domain(years)
      .range([marginLeft, width - marginRight]);

    const y = scaleLinear()
      .domain([0, 1])
      .range([height - marginBottom, marginTop]);

    const technologies = Array.from(
      new Set(d3data.map((d) => d.technology)),
    ).sort(
      (a, b) =>
        Object.keys(technologyColors).indexOf(a) -
        Object.keys(technologyColors).indexOf(b),
    );

    // Group data by year
    const groupedData = Array.from(
      group(d3data, (d) => d.year),
      ([year, values]) => {
        const yearData: Record<string, number> = { year };
        technologies.forEach((tech) => {
          const techValue =
            values.find((v) => v.technology === tech)?.value ?? 0;
          yearData[tech] = techValue;
        });
        return yearData;
      },
    );

    const stackGenerator = stack<Record<string, number | string>>()
      .offset(stackOffsetExpand)
      .keys(technologies);

    const series = stackGenerator(groupedData);

    const areaGenerator = area<
      SeriesPoint<Series<Record<string, number | string>, string>>
    >()
      .x((d) => x(parse(d.data.year as string) ?? new Date()))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]));

    return { x, y, series, area: areaGenerator, xticks, parse, technologies };
  }, [d3data, width, height, marginLeft, marginRight, marginTop, marginBottom]);

  useEffect(() => {
    if (
      !ref.current ||
      !gx.current ||
      !gy.current ||
      !areas.current ||
      !legend.current ||
      !guideline.current ||
      !tooltip_grp.current ||
      !chartSetup
    )
      return;

    const {
      x,
      y,
      series,
      area: areaGenerator,
      xticks,
      parse,
      technologies,
    } = chartSetup;

    // Add legend
    const legendItems = select(legend.current)
      .selectAll("g")
      .data(technologies)
      .join("g")
      .attr(
        "transform",
        (d, i) =>
          `translate(${width - marginRight + 10}, ${marginTop + i * 20})`,
      );

    legendItems
      .selectAll("rect")
      .data((d) => [d])
      .join("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", (d) => technologyColors[d]);

    legendItems
      .selectAll("text")
      .data((d) => [d])
      .join("text")
      .attr("x", 16)
      .attr("y", 10)
      .attr("font-size", "12px")
      .text((d) => capitalizeWords(d));

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
      .call(axisLeft(y).ticks(5, "%"))
      .style("font-size", "12px");

    // Update areas
    select(areas.current)
      .selectAll<
        SVGPathElement,
        Series<Record<string, number | string>, string>
      >("path")
      .data(series)
      .join("path")
      .attr(
        "fill",
        (d) => technologyColors[d.key as keyof typeof technologyColors],
      )
      .attr("d", areaGenerator);

    // Tooltip: hovering anywhere over the chart shows the percentage of
    // every technology for the nearest year, driven by x-position only.
    const svg = select(ref.current);
    const guidelineElem = select(guideline.current)
      .attr("y1", marginTop)
      .attr("y2", height - marginBottom);
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

    // One entry per year, in series order, so nearest-year lookup and the
    // per-technology percentages (series[tech][i]) share the same index.
    const yearPositions = series[0].map((d) => ({
      year: d.data.year as string,
      x: x(parse(d.data.year as string) ?? new Date()),
    }));

    svg
      .on("pointerenter", pointerentered)
      .on("pointermove", pointermoved)
      .on("pointerleave", pointerleft)
      .on("touchstart", (event: TouchEvent) => event.preventDefault());

    function pointermoved(event: PointerEvent) {
      const [xm] = pointer(event);
      const i = leastIndex(yearPositions, (d) => Math.abs(d.x - xm));
      if (i === undefined || i < 0) return;
      const { x: xPixel, year } = yearPositions[i];

      guidelineElem.attr("x1", xPixel).attr("x2", xPixel);
      dot.attr("transform", `translate(${xPixel},${height - marginBottom})`);

      const tooltipLines = [
        `${capitalizeWords(metric)}: ${year}`,
        ...technologies.map((tech, techIndex) => {
          const [y0, y1] = series[techIndex][i];
          return `${capitalizeWords(tech)}: ${((y1 - y0) * 100).toFixed(1)}%`;
        }),
      ];

      tooltipTextElem.call((text) =>
        text
          .selectAll("tspan")
          .data(tooltipLines)
          .join("tspan")
          .attr("x", 0)
          .attr("y", (_, i) => `${i * 1.1}em`)
          .attr("font-size", "12px")
          .attr("font-weight", (_, i) => (i ? null : "bold"))
          .text((d) => d),
      );

      size(tooltipTextElem, tooltipBoxElem, xPixel);
    }

    function pointerentered() {
      guidelineElem.attr("display", null);
      dot.attr("display", null);
    }

    function pointerleft() {
      guidelineElem.attr("display", "none");
      dot.attr("display", "none");
    }

    // Positions the tooltip box beside the vertical guideline (not on top of
    // it, so the hovered year's stack is still visible) with its pointer
    // tail anchored where the guideline meets the x-axis. Prefers whichever
    // side of the guideline has room; if neither side, or the space above
    // the axis, is big enough, the box slides back onto the chart and the
    // tail stretches to keep pointing at the exact hovered year — it never
    // lets the box clip past the plot's edges.
    function size(
      text: typeof tooltipTextElem,
      path: typeof tooltipBoxElem,
      xPixel: number,
    ) {
      const bbox = text.node()?.getBBox();
      if (!bbox) return;
      const { y, width: w, height: h } = bbox;

      const pad = 10; // internal padding around the text, each side
      const tipHeight = 5; // length of the tail between the box and its anchor
      const gap = 8; // horizontal space between the guideline and the box
      const boxWidth = w + pad * 2;
      const boxHeight = h + pad * 2;

      // Horizontal: pick the side with room; if neither fully fits, use
      // whichever has more and slide the box back onto the chart.
      const rightSpace = width - marginRight - xPixel;
      const leftSpace = xPixel - marginLeft;
      const needed = gap + boxWidth;
      const sign =
        needed <= rightSpace
          ? 1
          : needed <= leftSpace
            ? -1
            : rightSpace >= leftSpace
              ? 1
              : -1;
      const overflowX = Math.max(
        0,
        needed - (sign > 0 ? rightSpace : leftSpace),
      );
      const nearX = sign * (gap - overflowX);
      const farX = sign * (gap + boxWidth - overflowX);
      const tailX = nearX + sign * pad;

      // Vertical: the box grows upward from the x-axis; if it's taller than
      // the room above it, slide it down so it never clips past the top.
      const overflowY = Math.max(
        0,
        tipHeight + boxHeight - (height - marginBottom),
      );
      const nearY = -tipHeight + overflowY;
      const farY = -(tipHeight + boxHeight) + overflowY;

      text.attr(
        "transform",
        `translate(${Math.min(nearX, farX) + pad},${nearY - pad - h - y})`,
      );
      path.attr(
        "d",
        `M${nearX},${farY}L${farX},${farY}L${farX},${nearY}L${tailX},${nearY}L0,0L${nearX},${nearY}Z`,
      );
    }
  }, [
    d3data,
    chartSetup,
    sector,
    metric,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    height,
    width,
  ]);

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
        <g ref={legend} />
        <g
          ref={gx}
          transform={`translate(0, ${height - marginBottom})`}
        />
        <g
          ref={gy}
          transform={`translate(${marginLeft}, 0)`}
        />
        <g ref={areas} />
        <line
          ref={guideline}
          stroke="#888"
          strokeDasharray="3,3"
          pointerEvents="none"
          display="none"
        />
        <g
          ref={tooltip_grp}
          className="tooltip"
          pointerEvents="none"
          display="none"
        />
      </svg>
    </div>
  );
}
