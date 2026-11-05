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
