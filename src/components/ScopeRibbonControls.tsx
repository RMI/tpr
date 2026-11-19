import React, { useCallback, useRef, useState } from "react";
import { Factory, Flag, Globe, Map as MapIcon } from "lucide-react";
import TextWithTooltip from "./TextWithTooltip";
import RegionMembersTooltip from "./RegionMembersTooltip";
import { getSectorTooltip } from "../utils/tooltipUtils";
import { hasMemberList } from "../utils/geographyUtils";
import {
  onlySectorText,
  type GeographyLevel,
  type RibbonOption,
} from "../utils/scopeRibbon";
import type { Geography, Sector } from "../types";

/*
 * The small controls of the detail page's scope ribbon, and the styling every
 * ribbon control shares. The dropdown itself is in `ScopeDropdown`.
 *
 * Class strings follow the design handoff, which
 * built them from classes already used in the app.
 */

export type RibbonLevel = GeographyLevel | "sector";

/** Every ribbon control: one height, one shape. */
export const CONTROL_CLASS =
  "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-sm";

/**
 * The comparison page's header carries up to three geography groups side by
 * side, so its controls are one step smaller.
 * `max-w-full min-w-0` let a control shrink inside a narrow column, so its
 * label truncates rather than overflowing.
 */
export const COMPACT_CONTROL_CLASS =
  "inline-flex items-center gap-1 h-7 px-2 rounded-md border text-xs max-w-full min-w-0";

/**
 * The size and look of a ribbon control:
 *
 * - "default": the detail page's ribbon.
 * - "compact": one step smaller, for a header with several columns.
 * - "segment": the comparison header's Sector control, styled as the level
 *   switch's selected segment, so the header reads as one family: h-6, a thin
 *   bluespruce border and no ring.
 * - "value": the comparison header's value line under the level switch. h-6,
 *   the column's full width, a neutral border and no ring even while it holds
 *   the selection, and no level icon, which the switch already shows (§2.3,
 *   B3).
 */
export type ControlSize = "default" | "compact" | "segment" | "value";

const SEGMENT_CONTROL_CLASS =
  "inline-flex items-center gap-1 h-6 px-1.5 rounded border text-xs max-w-full min-w-0";
// `flex!`: TextWithTooltip's trigger carries `inline-block`, which otherwise
// wins (Tailwind orders the two by its stylesheet, not by the class string)
// and centres the label with the chevron pushed out of line. Measured.
const VALUE_CONTROL_CLASS =
  "flex! w-full items-center gap-1 h-6 px-2 rounded-md border text-xs min-w-0";

export const controlClass = (size: ControlSize): string =>
  ({
    default: CONTROL_CLASS,
    compact: COMPACT_CONTROL_CLASS,
    segment: SEGMENT_CONTROL_CLASS,
    value: VALUE_CONTROL_CLASS,
  })[size];

/** Level icon and chevron size, in px. */
export const iconPx = (size: ControlSize): number =>
  size === "default" ? 14 : 12;

/** Whether the control shows its level icon. */
export const showsLevelIcon = (size: ControlSize): boolean => size !== "value";

/**
 * The visible label's cap. A longer name truncates; the full name is in the
 * control's tooltip. `min-w-0` lets it give way further in a narrow column.
 * The value line has no cap: it fills the column and truncates at its edge.
 */
export const labelClass = (size: ControlSize): string =>
  ({
    default: "truncate max-w-[11rem]",
    compact: "truncate min-w-0 max-w-[7.5rem]",
    segment: "truncate min-w-0 max-w-[7.5rem]",
    value: "truncate min-w-0 flex-1 text-left",
  })[size];

/**
 * Whether an element's text is cut off, measured when the reader points at or
 * focuses the control. A compact control's label truncates in a narrow column,
 * and an option with nothing else to say then needs its full name in a
 * tooltip; one that fits needs no tooltip repeating it. jsdom has no layout, so
 * this reads false there.
 */
export function useTruncated<T extends HTMLElement>(): {
  ref: React.RefObject<T | null>;
  truncated: boolean;
  measure: () => void;
} {
  const ref = useRef<T | null>(null);
  const [truncated, setTruncated] = useState(false);
  const measure = useCallback(() => {
    const el = ref.current;
    setTruncated(el !== null && el.scrollWidth > el.clientWidth);
  }, []);
  return { ref, truncated, measure };
}

/** The control holding the selection: ring and weight, like a pressed badge. */
export const ACTIVE_CLASS =
  "border-bluespruce ring-1 ring-bluespruce text-bluespruce font-semibold bg-white";

/** A usable control that does not hold the selection. */
export const IDLE_CLASS =
  "border-neutral-300 text-rmigray-600 bg-white hover:border-neutral-400";

/**
 * The border, text and background for a control, by whether it holds the
 * selection. The two comparison looks drop the ring: a segment-look control is
 * always the selection, and the value line shows its selection by its text.
 */
export const stateClass = (size: ControlSize, selected: boolean): string => {
  if (size === "segment")
    return "border-bluespruce text-bluespruce font-semibold bg-white";
  if (size === "value")
    return "border-neutral-300 hover:border-neutral-400 text-bluespruce font-semibold bg-white";
  return selected ? ACTIVE_CLASS : IDLE_CLASS;
};

/** As IDLE, without the hover change: an inactive slot should not invite a click. */
const IDLE_STATIC_CLASS = "border-neutral-300 text-rmigray-600 bg-white";

/**
 * A control a reader can click. Set explicitly because a plain <button> shows
 * the default arrow, while TextWithTooltip's button adds a pointer itself, and
 * the ribbon would otherwise mix the two.
 */
export const CLICKABLE_CLASS = "cursor-pointer";

/** The tabs' focus ring, so the whole sticky bar focuses the same way. */
export const FOCUS_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy focus-visible:ring-offset-1";

const LEVEL_ICON: Record<RibbonLevel, React.FC<{ size?: number }>> = {
  sector: Factory,
  global: Globe,
  region: MapIcon,
  country: Flag,
};

export const LevelIcon: React.FC<{
  level: RibbonLevel;
  size?: ControlSize;
}> = ({ level, size = "default" }) => {
  const Icon = LEVEL_ICON[level];
  return (
    <span
      aria-hidden="true"
      className="inline-flex flex-shrink-0"
    >
      <Icon size={iconPx(size)} />
    </span>
  );
};

/**
 * Whether a level can carry information at all: sectors, regions and
 * countries can; Global never does.
 */
export function levelHasInfo(level: RibbonLevel): boolean {
  return level !== "global";
}

/**
 * Whether one option has information to show.
 *
 * Every sector has a description and every region a member list. A country
 * has one only when the publication counts other codes with it -- China with
 * Hong Kong, the USA with Puerto Rico and the US Virgin Islands -- since #1080
 * keyed countries by code and #1082 gave them member lists. Design
 * decision, 2026-11-12: such countries get the same treatment as regions.
 */
export function optionHasInfo(
  level: RibbonLevel,
  token: string,
  geography: Geography | null | undefined,
): boolean {
  if (level === "country") return hasMemberList(geography, token);
  return levelHasInfo(level);
}

/**
 * What the pills used to show on hover, from the same sources: a sector's
 * description, or a region's member countries. `capped` keeps the region list
 * to the tooltip's length; the preview pane passes false and scrolls instead.
 */
export const OptionInfo: React.FC<{
  level: RibbonLevel;
  token: string;
  geography: Geography | null | undefined;
  capped: boolean;
}> = ({ level, token, geography, capped }) => {
  if (level === "sector") {
    return <span className="block">{getSectorTooltip(token as Sector)}</span>;
  }
  // A country's list reads "Also includes …"; RegionMembersTooltip handles
  // both, so the wording stays Jacob's (#1082).
  if (level === "region" || level === "country") {
    return (
      <RegionMembersTooltip
        geography={geography}
        label={token}
        maxMembers={capped ? undefined : Infinity}
      />
    );
  }
  return null;
};

/** Name, then information: the body of every ribbon tooltip that has both. */
export const InfoTooltipBody: React.FC<{
  name: string;
  children: React.ReactNode;
}> = ({ name, children }) => (
  <>
    <span className="block font-semibold text-rmigray-800 mb-0.5">{name}</span>
    {children}
  </>
);

/**
 * A slot that cannot be used, shown rather than hidden (spec §4.4).
 *
 * `aria-disabled` rather than `disabled`, so a keyboard reader can still reach
 * it and hear why. Clicking does nothing.
 */
export const InactiveSlot: React.FC<{
  level: RibbonLevel;
  label: string;
  tooltip: string;
  size?: ControlSize;
}> = ({ level, label, tooltip, size = "default" }) => (
  <TextWithTooltip
    as="button"
    position="bottom"
    tooltip={tooltip}
    // `!` because TextWithTooltip's button carries its own cursor-pointer, and
    // Tailwind settles two classes for one property by its own stylesheet
    // order, not by the order they are written in. Measured in the browser:
    // without it the inactive slot showed a pointer.
    className={`${controlClass(size)} ${IDLE_STATIC_CLASS} ${FOCUS_CLASS} opacity-50 cursor-not-allowed!`}
    buttonProps={{
      "aria-disabled": true,
      "onClick": (event) => event.preventDefault(),
    }}
    text={
      <>
        <LevelIcon
          level={level}
          size={size}
        />
        <span className={labelClass(size)}>{label}</span>
      </>
    }
  />
);

/**
 * A geography level with exactly one option, which has data (spec §4.2).
 *
 * A button rather than a one-item dropdown, and it stays clickable when it is
 * the only option, so a reader who picked a country can return to the region.
 * A region, or a country with member codes, carries them in a tooltip, having
 * no list to show them in.
 */
export const ChoiceButton: React.FC<{
  level: GeographyLevel;
  option: RibbonOption;
  selected: boolean;
  onSelect: (token: string) => void;
  geography: Geography | null | undefined;
  size?: ControlSize;
}> = ({ level, option, selected, onSelect, geography, size = "default" }) => {
  const className = `${controlClass(size)} ${CLICKABLE_CLASS} ${stateClass(size, selected)} ${FOCUS_CLASS}`;
  const label = useTruncated<HTMLSpanElement>();
  const content = (
    <>
      <LevelIcon
        level={level}
        size={size}
      />
      <span
        ref={label.ref}
        className={labelClass(size)}
      >
        {option.label}
      </span>
    </>
  );
  const hasInfo = optionHasInfo(level, option.token, geography);

  // Compact, with nothing else to say: a tooltip with the full name, shown
  // only while the label is cut off. Always the same component, so focus is
  // never lost to a swap when the measurement changes.
  if (!hasInfo && size === "compact") {
    return (
      <TextWithTooltip
        as="button"
        position="bottom"
        className={className}
        text={content}
        tooltip={option.label}
        suppressed={!label.truncated}
        buttonProps={{
          "aria-pressed": selected,
          "onClick": () => onSelect(option.token),
          "onMouseEnter": label.measure,
          "onFocus": label.measure,
        }}
      />
    );
  }

  if (!hasInfo) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(option.token)}
        className={className}
      >
        {content}
      </button>
    );
  }

  return (
    <TextWithTooltip
      as="button"
      position="bottom"
      className={className}
      text={content}
      tooltip={
        <InfoTooltipBody name={option.label}>
          <OptionInfo
            level={level}
            token={option.token}
            geography={geography}
            capped
          />
        </InfoTooltipBody>
      }
      buttonProps={{
        "aria-pressed": selected,
        "onClick": () => onSelect(option.token),
      }}
    />
  );
};

/**
 * The pathway's only sector, which has data (spec §4.3).
 *
 * A fact about the pathway rather than a choice, so it is not interactive. It
 * is still focusable, so its tooltip can be reached from the keyboard.
 */
export const ReadOnlySector: React.FC<{
  option: RibbonOption;
  size?: ControlSize;
}> = ({ option, size = "default" }) => (
  <TextWithTooltip
    position="bottom"
    className={`${controlClass(size)} ${stateClass(size, true)} ${FOCUS_CLASS}`}
    text={
      <>
        <LevelIcon
          level="sector"
          size={size}
        />
        <span className={labelClass(size)}>{option.label}</span>
      </>
    }
    tooltip={
      <>
        <OptionInfo
          level="sector"
          token={option.token}
          geography={undefined}
          capped
        />
        <span className="block mt-1 text-rmigray-300">
          {onlySectorText(option.label)}
        </span>
      </>
    }
  />
);

/**
 * A level's only option, on the comparison header's value line (Option B
 * spec §2.3). Choosing the level already selected it, so this is a fact rather
 * than a control: not a button, which would be a pressed toggle that does
 * nothing. It is still focusable, so its tooltip can be reached from the
 * keyboard: a region's members or a country's member codes, or the full name
 * while the name is cut off.
 */
export const ReadOnlyValue: React.FC<{
  level: GeographyLevel;
  option: RibbonOption;
  geography: Geography | null | undefined;
}> = ({ level, option, geography }) => {
  const label = useTruncated<HTMLSpanElement>();
  const hasInfo = optionHasInfo(level, option.token, geography);
  const tooltip = hasInfo ? (
    <InfoTooltipBody name={option.label}>
      <OptionInfo
        level={level}
        token={option.token}
        geography={geography}
        capped
      />
    </InfoTooltipBody>
  ) : (
    option.label
  );
  return (
    <span
      className="block w-full min-w-0"
      onMouseEnter={label.measure}
      onFocus={label.measure}
    >
      <TextWithTooltip
        position="bottom"
        className={`${controlClass("value")} ${stateClass("value", true)} ${FOCUS_CLASS}`}
        tooltip={tooltip}
        suppressed={!hasInfo && !label.truncated}
        text={
          <span
            ref={label.ref}
            className={labelClass("value")}
          >
            {option.label}
          </span>
        }
      />
    </span>
  );
};

/** The word between geography slots: the three are one choice (spec §4.6). */
export const OrSeparator: React.FC = () => (
  <span className="text-[11px] italic text-rmigray-300 px-0.5 select-none">
    or
  </span>
);
