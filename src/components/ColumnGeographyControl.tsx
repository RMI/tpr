import React, { useEffect, useRef } from "react";
import ScopeDropdown from "./ScopeDropdown";
import TextWithTooltip from "./TextWithTooltip";
import { FOCUS_CLASS, LevelIcon, ReadOnlyValue } from "./ScopeRibbonControls";
import type { ColumnGeographyOption } from "../utils/comparisonScope";
import { normalizeGeography } from "../utils/geographyUtils";
import type { ScopeAvailability } from "../utils/scopeAvailability";
import {
  GEOGRAPHY_LEVELS,
  LEVEL_NAME,
  geographyLevels,
  geographyOptions,
  levelOf,
  slotState,
  type GeographyLevel,
} from "../utils/scopeRibbon";
import type { Geography } from "../types";

/*
 * One comparison column's geography: a level switch (Global | Region |
 * Country), then a value line with ONE list for the chosen level
 * (comparison-option-b-spec, Sebastian 2026-11-18). Every detail-ribbon rule
 * applies: an unusable level is greyed with a tooltip, never hidden; a level
 * with one option needs no list; the list is the ribbon's own dropdown.
 */

/** The switch's track. */
export const SWITCH_TRACK_CLASS =
  "inline-flex h-7 shrink-0 items-center rounded-md border border-neutral-300 bg-neutral-50 p-0.5";

/** One segment, before its state. */
export const SEGMENT_CLASS =
  "inline-flex h-6 items-center gap-1 rounded px-1.5 text-xs whitespace-nowrap transition-colors";

/** The selected segment. */
export const SEGMENT_SELECTED_CLASS =
  "bg-white text-bluespruce font-semibold shadow-sm ring-1 ring-bluespruce";

const SEGMENT_IDLE_CLASS =
  "text-rmigray-600 hover:text-bluespruce cursor-pointer";

const SEGMENT_INACTIVE_CLASS =
  "text-rmigray-600 opacity-50 cursor-not-allowed!";

/**
 * A segment's face: its icon, and its name when the switch fits the column.
 * Shared with the header's hidden measuring copies, so they measure exactly
 * what the switch shows.
 */
export const SegmentFace: React.FC<{
  level: GeographyLevel;
  showName: boolean;
}> = ({ level, showName }) => (
  <>
    <LevelIcon
      level={level}
      size="compact"
    />
    {showName && <span>{LEVEL_NAME[level]}</span>}
  </>
);

interface ColumnGeographyControlProps {
  /** "Publisher: Pathway (year)", naming the column's groups. */
  name: string;
  geography: Geography | null | undefined;
  /** The column's own options; `available` decides what can be selected. */
  options: readonly ColumnGeographyOption[];
  selected: string | null;
  onSelect: (token: string) => void;
  /**
   * Whether the switch shows its level names. The header measures whether the
   * switch with names fits the column; icons only when it does not. The name
   * stays the accessible name either way.
   */
  showNames: boolean;
}

export const ColumnGeographyControl: React.FC<ColumnGeographyControlProps> = ({
  name,
  geography,
  options,
  selected,
  onSelect,
  showNames,
}) => {
  /*
    What a level can select comes from the column's own options, the same
    flags that validate the URL, so the controls and the URL cannot disagree.
    Looked up by the normalised token, since `columnGeographyOptions`
    normalises its tokens and `geographyLevels` reads the raw keys; no pathway
    differs today.
  */
  const available = new Set(
    options.filter((o) => o.available).map((o) => o.token),
  );
  const availability: ScopeAvailability = {
    hasSector: () => true,
    hasGeography: (token) => available.has(normalizeGeography(token)),
  };
  const levels = geographyLevels(geography);
  const slots = GEOGRAPHY_LEVELS.map((level) => ({
    level,
    state: slotState(level, geographyOptions(levels[level], availability)),
  }));
  // Derived from the selection, never stored (spec §1.3). Null only for a
  // column with no geography, where every level is greyed.
  const current = levelOf(selected, geography);

  /*
    The last value picked at each level, so switching back returns to it
    (§2.4). Component state only, not in the URL. Learnt from the selection
    itself, so a change from the URL (Back) counts too. It survives the
    condensed strip, which never unmounts the controls, and is lost on reload.
  */
  const remembered = useRef<Partial<Record<GeographyLevel, string>>>({});
  useEffect(() => {
    if (current && selected) remembered.current[current] = selected;
  }, [current, selected]);

  const pick = (token: string) => {
    if (token !== selected) onSelect(token);
  };

  /** Choose a level. Greyed or current: nothing happens. */
  const switchTo = (level: GeographyLevel) => {
    if (level === current) return;
    const state = slots.find((s) => s.level === level)!.state;
    if (state.kind === "inactive") return;
    if (state.kind === "single") {
      pick(state.option.token);
      return;
    }
    // The last value picked here, else the first with data (alphabetical).
    const back = remembered.current[level];
    const next =
      state.withData.find((o) => o.token === back) ?? state.withData[0];
    if (next) pick(next.token);
  };

  /*
    Keyboard: a radiogroup with a roving tabindex, as in Tabs: one tab stop,
    the arrows (wrapping) and Home/End move between levels. A usable level is
    chosen as focus lands on it. A greyed one is still reached, so it can
    explain itself in its tooltip, but is never chosen.
  */
  const segmentRefs = useRef<Partial<Record<GeographyLevel, HTMLElement>>>({});
  const tabStop: GeographyLevel = current ?? GEOGRAPHY_LEVELS[0];
  const onSwitchKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const focused = GEOGRAPHY_LEVELS.findIndex(
      (level) => segmentRefs.current[level] === document.activeElement,
    );
    const at = focused === -1 ? GEOGRAPHY_LEVELS.indexOf(tabStop) : focused;
    const count = GEOGRAPHY_LEVELS.length;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (at + 1) % count;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (at - 1 + count) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
    }
    if (next === null) return;
    event.preventDefault();
    const level = GEOGRAPHY_LEVELS[next];
    segmentRefs.current[level]?.focus();
    switchTo(level);
  };

  const currentState = slots.find((s) => s.level === current)?.state;

  return (
    <div
      role="group"
      aria-label={`Geography for ${name}`}
      className="flex min-w-0 flex-col items-start gap-1"
    >
      <div
        role="radiogroup"
        aria-label={`Geography level for ${name}`}
        onKeyDown={onSwitchKeyDown}
        className={SWITCH_TRACK_CLASS}
      >
        {slots.map(({ level, state }) => {
          const checked = level === current;
          const inactive = state.kind === "inactive";
          const className = `${SEGMENT_CLASS} ${FOCUS_CLASS} ${
            checked
              ? SEGMENT_SELECTED_CLASS
              : inactive
                ? SEGMENT_INACTIVE_CLASS
                : SEGMENT_IDLE_CLASS
          }`;
          const common = {
            "role": "radio",
            "aria-checked": checked,
            "aria-label": LEVEL_NAME[level],
            "tabIndex": level === tabStop ? 0 : -1,
          } as const;
          const setRef = (el: HTMLElement | null) => {
            if (el) segmentRefs.current[level] = el;
            else delete segmentRefs.current[level];
          };
          const face = (
            <SegmentFace
              level={level}
              showName={showNames}
            />
          );
          return inactive ? (
            <TextWithTooltip
              key={level}
              as="button"
              position="bottom"
              triggerRef={setRef}
              className={className}
              text={face}
              tooltip={state.tooltip}
              buttonProps={{
                ...common,
                "aria-disabled": true,
                "onClick": (event) => event.preventDefault(),
              }}
            />
          ) : (
            <button
              key={level}
              ref={setRef}
              type="button"
              {...common}
              onClick={() => switchTo(level)}
              className={className}
            >
              {face}
            </button>
          );
        })}
      </div>

      {/*
        The value line, always there, empty for Global, so switching level
        never changes the header's height (B2).
      */}
      <div className="flex h-6 w-full min-w-0 items-center">
        {current &&
          current !== "global" &&
          (currentState?.kind === "dropdown" ? (
            <ScopeDropdown
              level={current}
              withData={currentState.withData}
              withoutData={currentState.withoutData}
              selectedToken={selected}
              onSelect={pick}
              geography={geography}
              size="value"
            />
          ) : currentState?.kind === "single" ? (
            <ReadOnlyValue
              level={current}
              option={currentState.option}
              geography={geography}
            />
          ) : null)}
      </div>
    </div>
  );
};

export default ColumnGeographyControl;
