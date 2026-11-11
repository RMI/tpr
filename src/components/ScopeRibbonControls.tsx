import React from "react";
import { Factory, Flag, Globe, Map as MapIcon } from "lucide-react";
import TextWithTooltip from "./TextWithTooltip";
import RegionMembersTooltip from "./RegionMembersTooltip";
import { getSectorTooltip } from "../utils/tooltipUtils";
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
 * Class strings follow the design handoff (scope-ribbon-spec.md §4), which
 * built them from classes already used in the app.
 */

export type RibbonLevel = GeographyLevel | "sector";

/** Every ribbon control: one height, one shape. */
export const CONTROL_CLASS =
  "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-sm";

/** The control holding the selection: ring and weight, like a pressed badge. */
export const ACTIVE_CLASS =
  "border-bluespruce ring-1 ring-bluespruce text-bluespruce font-semibold bg-white";

/** A usable control that does not hold the selection. */
export const IDLE_CLASS =
  "border-neutral-300 text-rmigray-600 bg-white hover:border-neutral-400";

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

export const LevelIcon: React.FC<{ level: RibbonLevel }> = ({ level }) => {
  const Icon = LEVEL_ICON[level];
  return (
    <span
      aria-hidden="true"
      className="inline-flex flex-shrink-0"
    >
      <Icon size={14} />
    </span>
  );
};

/** Only sectors and regions carry extra information; Global and countries do not. */
export function levelHasInfo(level: RibbonLevel): boolean {
  return level === "sector" || level === "region";
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
  if (level === "region") {
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
}> = ({ level, label, tooltip }) => (
  <TextWithTooltip
    as="button"
    position="bottom"
    tooltip={tooltip}
    className={`${CONTROL_CLASS} ${IDLE_STATIC_CLASS} ${FOCUS_CLASS} opacity-50 cursor-not-allowed`}
    buttonProps={{
      "aria-disabled": true,
      "onClick": (event) => event.preventDefault(),
    }}
    text={
      <>
        <LevelIcon level={level} />
        <span className="truncate max-w-[11rem]">{label}</span>
      </>
    }
  />
);

/**
 * A geography level with exactly one option, which has data (spec §4.2).
 *
 * A button rather than a one-item dropdown, and it stays clickable when it is
 * the only option, so a reader who picked a country can return to the region.
 * A region carries its members in a tooltip, having no list to show them in.
 */
export const ChoiceButton: React.FC<{
  level: GeographyLevel;
  option: RibbonOption;
  selected: boolean;
  onSelect: (token: string) => void;
  geography: Geography | null | undefined;
}> = ({ level, option, selected, onSelect, geography }) => {
  const className = `${CONTROL_CLASS} ${CLICKABLE_CLASS} ${selected ? ACTIVE_CLASS : IDLE_CLASS} ${FOCUS_CLASS}`;
  const content = (
    <>
      <LevelIcon level={level} />
      <span className="truncate max-w-[11rem]">{option.label}</span>
    </>
  );

  if (!levelHasInfo(level)) {
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
export const ReadOnlySector: React.FC<{ option: RibbonOption }> = ({
  option,
}) => (
  <TextWithTooltip
    position="bottom"
    className={`${CONTROL_CLASS} ${ACTIVE_CLASS} ${FOCUS_CLASS}`}
    text={
      <>
        <LevelIcon level="sector" />
        <span className="truncate max-w-[11rem]">{option.label}</span>
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

/** The word between geography slots: the three are one choice (spec §4.6). */
export const OrSeparator: React.FC = () => (
  <span className="text-[11px] italic text-rmigray-300 px-0.5 select-none">
    or
  </span>
);
