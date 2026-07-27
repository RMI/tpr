import { select } from "d3-selection";
import { scaleBand, scaleLinear, ScaleBand, ScaleLinear } from "d3-scale";
import { max } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis";
import "d3-transition";
import { MouseEvent, useRef, useEffect, useMemo } from "react";
import { capitalizeWords } from "../utils/capitalizeWords";

interface DataPoint {
  sector: string;
  metric: string;
  year: string;
  value: number;
  unit: string;
}

interface ChartData {
  data: DataPoint[];
}

interface VerticalBarChartProps {
  data: ChartData;
  width?: number;
  height?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  sector?: string;
  metric?: string;
  barColor?: string;
  yMax?: number;
}

interface ChartScales {
  x: ScaleBand<string>;
  y: ScaleLinear<number, number>;
  unit: string;
}

export default function VerticalBarChart({
  data,
  width = 640,
  height = 400,
  marginTop = 15,
  marginRight = 20,
  marginBottom = 30,
  marginLeft = 40,
  sector = "power",
  metric = "emissionsIntensity",
  barColor = "midnightblue",
  yMax,
}: VerticalBarChartProps) {
  const d3data = useMemo(
    () => data.data.filter((d) => d.sector === sector && d.metric === metric),
    [data.data, sector, metric],
  );

  const ref = useRef<SVGSVGElement>(null);
  const gx = useRef<SVGGElement>(null);
  const gy = useRef<SVGGElement>(null);
  const bars = useRef<SVGGElement>(null);
  const tooltips = useRef<SVGGElement>(null);

  const chartTitle = useMemo(() => {
    const unit = d3data[0]?.unit ?? "";
    return `${capitalizeWords(sector)} ${capitalizeWords(metric)} [${unit}]`;
  }, [d3data, sector, metric]);

  const chartSetup = useMemo<ChartScales>(() => {
    const unit = d3data[0]?.unit ?? "";

    const x = scaleBand()
      .domain(d3data.map((d) => d.year).sort())
      .range([marginLeft, width - marginRight])
      .padding(0.6);

    const y = scaleLinear()
      .domain([0, yMax ?? max(d3data, (d) => d.value) ?? 0])
      .range([height - marginBottom, marginTop]);

    return { x, y, unit };
  }, [
    d3data,
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
      !bars.current ||
      !tooltips.current
    )
      return;

    const { x, y } = chartSetup;

    // Update X axis
    select(gx.current)
      .transition()
      .duration(750)
      .call(axisBottom(x).tickSize(0))
      .style("font-size", "14px")
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
      .attr("dx", "0")
      .attr("dy", "0.71em");

    // Update Y axis
    select(gy.current)
      .transition()
      .duration(750)
      .call(axisLeft(y).tickSize(0))
      .style("font-size", "12px");

    select(gy.current).select(".domain").remove();

    select(gy.current)
      .selectAll(".tick line")
      .clone()
      .attr("x2", width)
      .attr("stroke-opacity", "0.1");

    // Update bars
    select(bars.current)
      .attr("fill", barColor)
      .selectAll<SVGRectElement, DataPoint>("rect")
      .data(d3data)
      .join("rect")
      .attr("x", (d) => x(d.year) ?? 0)
      .attr("y", (d) => y(d.value))
      .attr("height", (d) => y(0) - y(d.value))
      .attr("width", x.bandwidth())
      .on("mouseover", onMouseOver)
      .on("mouseout", onMouseOut);

    // Update tooltips
    const ttwidth = 110;

    select(tooltips.current)
      .selectAll<SVGPathElement, unknown>("path")
      .data(d3data)
      .join("path")
      .attr("display", "none")
      .attr("fill", "white")
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("stroke-linejoin", "round")
      .attr(
        "transform",
        (d) =>
          "translate(" +
          (x(d.year) + x.bandwidth() / 2) +
          " " +
          y(d.value) +
          ")",
      )
      .attr(
        "d",
        "M0,0 l 5,-5 h " +
          (ttwidth / 2 - 5) +
          " v -20 h -" +
          ttwidth +
          " v 20 h " +
          (ttwidth / 2 - 5) +
          " Z",
      );

    select(tooltips.current)
      .selectAll<SVGTextElement, string>("text")
      .data(d3data)
      .join("text")
      .attr("display", "none")
      .attr("x", (d) => x(d.year) + x.bandwidth() / 2)
      .attr("y", (d) => y(d.value) - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .text((d) => d.value + " " + d.unit);

    function setTooltipDisplay(year: string | null) {
      select(tooltips.current)
        .selectAll<SVGTextElement, string>("text")
        .join()
        .attr("display", (d) =>
          year !== null && d.year === year ? "display" : "none",
        );

      select(tooltips.current)
        .selectAll<SVGPathElement, unknown>("path")
        .join()
        .attr("display", (d) =>
          year !== null && d.year === year ? "display" : "none",
        );
    }

    function onMouseOver(event: MouseEvent) {
      const selectedYear = select(event.currentTarget).datum().year as string;
      setTooltipDisplay(selectedYear);
    }

    function onMouseOut() {
      setTooltipDisplay(null);
    }
  }, [
    d3data,
    width,
    height,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    metric,
    barColor,
    chartSetup,
    sector,
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
        viewBox={`0 0 ${width} ${height}`}
      >
        <g
          ref={gx}
          className="xaxis"
          transform={`translate(0, ${height - marginBottom})`}
        />
        <g
          ref={gy}
          className="yaxis"
          transform={`translate(${marginLeft}, 0)`}
        />
        <g
          ref={bars}
          className="bars"
        />
        <g
          ref={tooltips}
          className="tooltips"
        />
      </svg>
    </div>
  );
}
