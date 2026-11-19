import { useCallback, useState } from "react";

/**
 * An on/off preference that lasts for the browser tab: it survives leaving the
 * page and coming back, and resets when the tab closes.
 *
 * Off by default, and off whenever sessionStorage is unavailable (a private
 * window or blocked site data) — the preference is a convenience, so failing to
 * remember it is not an error worth surfacing.
 */
export function useSessionFlag(
  key: string,
): [boolean, (next: boolean) => void] {
  const [value, setValue] = useState(() => {
    try {
      return sessionStorage.getItem(key) === "true";
    } catch {
      /* non-critical: sessionStorage unavailable */
      return false;
    }
  });

  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        sessionStorage.setItem(key, String(next));
      } catch {
        /* non-critical: sessionStorage unavailable */
      }
    },
    [key],
  );

  return [value, update];
}

export default useSessionFlag;
