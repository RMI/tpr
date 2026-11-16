/**
 * The last year the benchmark plots show (#1010). Pathways end anywhere from
 * 2030 to 2100, and plots with wildly different x-axes are hard to compare,
 * so every plot stops here. Downloads still carry the full data.
 */
export const MAX_PLOT_YEAR = 2050;

interface YearRow {
  year: string | number;
}

/**
 * The timeseries without its rows after {@link MAX_PLOT_YEAR}. Apply it where
 * rows enter the plots, before anything is derived from them, so the shared
 * y-axis, which panels show and the segment badges all agree with what is
 * drawn.
 *
 * `Number()` because the type says string but the JSON carries numbers.
 */
export function capToPlotYears<T extends { data: readonly YearRow[] }>(
  timeseries: T | null,
): T | null {
  if (!timeseries?.data) return timeseries;
  return {
    ...timeseries,
    data: timeseries.data.filter((d) => Number(d.year) <= MAX_PLOT_YEAR),
  };
}

/** Whether a timeseries has rows the plots leave out. */
export function extendsPastPlotYears(
  timeseries: { data: readonly YearRow[] } | null,
): boolean {
  return timeseries?.data?.some((d) => Number(d.year) > MAX_PLOT_YEAR) ?? false;
}

/**
 * How many years apart two x-axis labels must be. Closer than this, the
 * rotated labels overlap on the narrowest panels.
 */
const MIN_TICK_GAP_YEARS = 3;

/**
 * The years labelled on a plot's x-axis (#1065). Every plot's x-axis runs to
 * {@link MAX_PLOT_YEAR}, so a pathway ending in 2035 shares its right edge with
 * one ending in 2050, and its lines simply stop early. The left edge is each
 * pathway's own first year, which varies by a few years.
 *
 * Labels the first year, {@link MAX_PLOT_YEAR}, the last year unless it is too
 * close to {@link MAX_PLOT_YEAR} to fit its label, and each decade in between
 * that is not too close to the first or last year to fit its label.
 */
export function plotYearTicks(firstYear: number, lastYear: number): number[] {
  const last = Math.min(lastYear, MAX_PLOT_YEAR);
  const kept = [firstYear, MAX_PLOT_YEAR];
  if (MAX_PLOT_YEAR - last >= MIN_TICK_GAP_YEARS) kept.push(last);
  const decades: number[] = [];
  for (
    let decade = Math.ceil(firstYear / 10) * 10;
    decade < MAX_PLOT_YEAR;
    decade += 10
  ) {
    if (kept.every((year) => Math.abs(decade - year) >= MIN_TICK_GAP_YEARS)) {
      decades.push(decade);
    }
  }
  return Array.from(new Set([...kept, ...decades])).sort((a, b) => a - b);
}

function plotDate(year: number): Date {
  return new Date(Date.UTC(year, 0, 1));
}

/**
 * The x-axis of a plot whose data runs from `first` to `last`: a domain from
 * `first` to {@link MAX_PLOT_YEAR}, however early the data ends, and the dates
 * {@link plotYearTicks} labels.
 */
export function plotXAxis(
  first: Date,
  last: Date,
): { domain: [Date, Date]; ticks: Date[] } {
  return {
    domain: [first, plotDate(MAX_PLOT_YEAR)],
    ticks: plotYearTicks(first.getUTCFullYear(), last.getUTCFullYear()).map(
      plotDate,
    ),
  };
}

/**
 * Whether the pointer is over the empty stretch the x-axis runs on past the
 * data, more than half a step beyond the last year. A tooltip there would
 * snap back to the last year and read as that year's values carrying on.
 *
 * `yearXs` are the pixel positions of the plotted years, in any order.
 */
export function isPastPlottedYears(
  pointerX: number,
  yearXs: readonly number[],
): boolean {
  const sorted = Array.from(new Set(yearXs)).sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return false;
  const halfStep = n > 1 ? (sorted[n - 1] - sorted[n - 2]) / 2 : 0;
  return pointerX > sorted[n - 1] + halfStep;
}
