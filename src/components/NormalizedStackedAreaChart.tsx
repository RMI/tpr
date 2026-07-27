import { select } from "d3-selection";
import { scaleUtc, scaleLinear } from "d3-scale";
import { area, stack, Series, SeriesPoint } from "d3-shape";
import { utcParse } from "d3-time-format";
import { group } from "d3-array";
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
      !chartSetup
    )
      return;

    const {
      x,
      y,
      series,
      area: areaGenerator,
      xticks,
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
  }, [d3data, chartSetup, sector, metric, marginRight, marginTop, width]);

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
      </svg>
    </div>
  );
}
