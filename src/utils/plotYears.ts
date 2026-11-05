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
 * How many years a decade label must keep from the first and last year's
 * labels. Closer than this, the rotated labels overlap on the narrowest panels.
 */
const MIN_TICK_GAP_YEARS = 3;

/**
 * The years labelled on a plot's x-axis (#1065). Every plot's x-axis runs to
 * {@link MAX_PLOT_YEAR}, so a pathway ending in 2035 is drawn at the same scale
 * as one ending in 2050, and its lines simply stop early.
 *
 * Labels the first year, the last year when it is before
 * {@link MAX_PLOT_YEAR}, {@link MAX_PLOT_YEAR} itself, and each decade in
 * between that is not too close to the first or last year to fit its label.
 */
export function plotYearTicks(firstYear: number, lastYear: number): number[] {
  const kept = [firstYear, Math.min(lastYear, MAX_PLOT_YEAR), MAX_PLOT_YEAR];
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
