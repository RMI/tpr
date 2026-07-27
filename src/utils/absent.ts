/**
 * Shared sentinel for representing an intentionally missing optional value.
 * Use in UI for "None" (UX label) and in filters via ABSENT_FILTER_TOKEN.
 * No runtime side-effects; safe to import anywhere.
 */

export const ABSENT: unique symbol = Symbol("absent");
export type Absent = typeof ABSENT;

/** Stable token for UI/query state (e.g., FilterDropdown value, URL params). */
export const ABSENT_FILTER_TOKEN = "__ABSENT__" as const;

/** Type guard for the sentinel. */
export function isAbsent(value: unknown): value is Absent {
  return value === ABSENT;
}

/**
 * Coalesce undefined/null to ABSENT without touching valid falsy values (0, "", false).
 * Helpful when normalizing optional schema fields before rendering.
 */
export function coalesceOptional<T>(value: T | null | undefined): T | Absent {
  return value === undefined || value === null ? ABSENT : value;
}

/**
 * Convert a value to a stable filter token for UI state.
 * - ABSENT -> "__ABSENT__"
 * - strings/numbers -> returned unchanged
 */
export function toFilterToken<T extends string | number>(
  value: T | Absent,
): T | typeof ABSENT_FILTER_TOKEN {
  return isAbsent(value) ? ABSENT_FILTER_TOKEN : value;
}

/**
 * Parse a filter token back to a runtime value.
 * - "__ABSENT__" -> ABSENT
 * - strings/numbers -> returned unchanged
 */
export function fromFilterToken<T extends string | number>(
  token: T | typeof ABSENT_FILTER_TOKEN,
): T | Absent {
  return token === ABSENT_FILTER_TOKEN ? ABSENT : token;
}

/**
 * Display helper for badges, tables, etc.
 * - ABSENT -> "None" (customizable via opts.noneLabel)
 * - other -> String(value)
 */
export function toDisplay<T>(
  value: T | Absent,
  opts?: { noneLabel?: string },
): string {
  if (isAbsent(value)) return opts?.noneLabel ?? "None";
  return String(value);
}
