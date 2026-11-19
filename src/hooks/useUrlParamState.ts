import { useSearchParams } from "react-router";

export interface UrlParamStateOptions<T extends string> {
  /** Query-param name, e.g. "tab", "sector", "geography". */
  param: string;
  /**
   * The legal values at this render. An empty list means "not known yet", and
   * every raw value then resolves to `defaultValue`.
   */
  options: readonly T[];
  /**
   * The value an ABSENT param represents. Setting this value deletes the param
   * rather than writing it, which keeps the canonical URL clean.
   */
  defaultValue: T | null;
}

/**
 * Query-param-backed selection state.
 *
 * Extracted from `useActiveTab`, which described itself as "the single seam that
 * isolates the URL mechanism" and already carried a `paramName` argument for
 * exactly this generalisation. The comparison page needs the same four
 * behaviours on two params at once.
 *
 * Those behaviours, all load-bearing:
 *  - a raw value is validated against `options`, so a stale or hand-edited
 *    param degrades to the default instead of producing a broken filter;
 *  - setting the default deletes the param;
 *  - the functional `setSearchParams` updater copies the previous params, so
 *    unrelated state (`?ids=`, `?tab=`) survives a write;
 *  - `{ replace: false }` pushes a history entry, so Back steps through
 *    selections.
 *
 * An illegal param is NOT rewritten. Correcting the URL during render would
 * fight the Back button, and the next real selection replaces or deletes it
 * anyway.
 */
export function useUrlParamState<T extends string>({
  param,
  options,
  defaultValue,
}: UrlParamStateOptions<T>): [T | null, (next: T | null) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(param);
  const value =
    raw !== null && options.includes(raw as T) ? (raw as T) : defaultValue;

  const setValue = (next: T | null): void => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === null || next === defaultValue) {
          params.delete(param);
        } else {
          params.set(param, next);
        }
        return params;
      },
      { replace: false },
    );
  };

  return [value, setValue];
}
