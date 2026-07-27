import { select } from "d3-selection";
import { scaleLinear, ScaleLinear } from "d3-scale";
import { lineRadial, curveLinearClosed } from "d3-shape";
import { range, max } from "d3-array";
import { useRef, useEffect, useState, useMemo } from "react";

interface DataPoint {
  sector: string;
  metric: string;
  year: number;
  technology: string;
  value: number;
}

interface ChartData {
  data: DataPoint[];
}

interface RadarChartProps {
  data: ChartData;
  width?: number;
  marginVertical?: number;
  marginHorizontal?: number;
  sector?: string;
  metric?: string;
}

export default function RadarChart({
  data,
  width = 400,
  marginVertical = 0,
  marginHorizontal = 30,
  sector = "power",
  metric = "capacity",
}: RadarChartProps) {
  const [d3data, setD3data] = useState<DataPoint[]>(() =>
    data.data.filter(
      (d) => d.sector === sector && d.metric === metric && d.year === 2022,
    ),
  );

  const ref = useRef<SVGSVGElement>(null);

  const height = width;
  const containerWidth = width - marginHorizontal * 2;
  const containerHeight = height - marginVertical * 2;

  // Memoize static calculations
  const chartConfig = useMemo(() => {
    const axisLabelFactor = 1.12;
    const axisCircles = 5;
    const dotRadius = 3;
    const radius = width / 2 - 2 * marginHorizontal;
    const axesDomain = Array.from(new Set(d3data.map((d) => d.technology)));
    const maxValue = max(d3data, (d) => d.value) ?? 0;
    const angleSlice = (Math.PI * 2) / axesDomain.length;
    const axisColor = "#CDCDCD";

    const rScale: ScaleLinear<number, number> = scaleLinear()
      .domain([0, maxValue])
      .range([0, radius]);

    return {
      axisLabelFactor,
      axisCircles,
      dotRadius,
      radius,
      axesDomain,
      maxValue,
      angleSlice,
      axisColor,
      rScale,
    };
  }, [d3data, width, marginHorizontal]);

  useEffect(() => {
    if (!ref.current) return;

    const {
      axisLabelFactor,
      axisCircles,
      dotRadius,
      radius,
      axesDomain,
      maxValue,
      angleSlice,
      axisColor,
      rScale,
    } = chartConfig;

    const svg = select<SVGSVGElement, unknown>(ref.current)
      .attr("width", width)
      .attr("height", height);

    const radarLine = lineRadial<number>()
      .curve(curveLinearClosed)
      .radius((d) => rScale(d))
      .angle((_, i) => i * angleSlice);

    svg.selectAll("g").remove();

    const container = svg
      .append("g")
      .attr("width", containerWidth)
      .attr("height", containerHeight)
      .attr(
        "transform",
        `translate(${width / 2 + marginHorizontal},${
          height / 2 + marginVertical
        })`,
      );

    const axisGrid = container.append("g").attr("class", "axisWrapper");

    // Draw the concentric circles
    axisGrid
      .selectAll<SVGCircleElement, number>(".levels")
      .data(range(1, axisCircles + 1).reverse())
      .enter()
      .append("circle")
      .attr("class", "gridCircle")
      .attr("r", (d) => (radius / axisCircles) * d)
      .style("fill", "none")
      .style("stroke", axisColor);

    // Draw the axes
    const axis = axisGrid
      .selectAll<SVGGElement, string>(".axis")
      .data(axesDomain)
      .enter()
      .append("g")
      .attr("class", "axis");

    // Draw the lines
    axis
      .append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr(
        "x2",
        (_, i) =>
          rScale(maxValue * 1.05) * Math.cos(angleSlice * i - Math.PI / 2),
      )
      .attr(
        "y2",
        (_, i) =>
          rScale(maxValue * 1.05) * Math.sin(angleSlice * i - Math.PI / 2),
      )
      .attr("class", "line")
      .style("stroke", axisColor)
      .style("stroke-width", "2px");

    // Add the labels
    axis
      .append("text")
      .attr("class", "legend")
      .style("font-size", "11px")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr(
        "x",
        (_, i) =>
          rScale(maxValue * axisLabelFactor) *
          Math.cos(angleSlice * i - Math.PI / 2),
      )
      .attr(
        "y",
        (_, i) =>
          rScale(maxValue * axisLabelFactor) *
          Math.sin(angleSlice * i - Math.PI / 2),
      )
      .text((d) => d);

    const plots = container.append("g").attr("class", "plot");

    // Draw the radar path
    plots
      .append("path")
      .attr("d", radarLine(d3data.map((d) => d.value)) ?? "")
      .attr("fill", "steelblue")
      .attr("fill-opacity", "0.5")
      .attr("stroke", "steelblue")
      .attr("stroke-width", "2");

    // Add the dots
    plots
      .selectAll<SVGCircleElement, DataPoint>("circle")
      .data(d3data)
      .join("circle")
      .attr("r", dotRadius)
      .attr(
        "cx",
        (d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2),
      )
      .attr(
        "cy",
        (d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2),
      )
      .attr("fill", "steelblue");
  }, [
    d3data,
    width,
    height,
    marginHorizontal,
    marginVertical,
    containerWidth,
    containerHeight,
    chartConfig,
  ]);

  const uniqueYears = (data: ChartData): number[] => {
    return Array.from(new Set(data.data.map((d) => d.year))).sort();
  };

  const filterData = (selectedYear: string): void => {
    setD3data(
      data.data.filter(
        (d) =>
          d.sector === sector &&
          d.metric === metric &&
          d.year === Number(selectedYear),
      ),
    );
  };

  return (
    <>
      <label>
        Year:
        <select onChange={(e) => filterData(e.target.value)}>
          {data &&
            uniqueYears(data).map((year) => (
              <option
                key={year}
                value={year}
              >
                {year}
              </option>
            ))}
        </select>
      </label>
      <svg ref={ref}></svg>
    </>
  );
}
