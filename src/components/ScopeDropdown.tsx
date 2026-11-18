import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import TextWithTooltip from "./TextWithTooltip";
import { LABEL_CLASS } from "./ScopeAxisRow";
import { useDropdown } from "../hooks/useDropdown";
import {
  LEVEL_NAME,
  NO_DATA_GROUP_LABEL,
  filterOptions,
  needsSearch,
  type RibbonOption,
} from "../utils/scopeRibbon";
import {
  ACTIVE_CLASS,
  CLICKABLE_CLASS,
  CONTROL_CLASS,
  FOCUS_CLASS,
  IDLE_CLASS,
  InfoTooltipBody,
  LevelIcon,
  OptionInfo,
  optionHasInfo,
  type RibbonLevel,
} from "./ScopeRibbonControls";
import type { Geography } from "../types";

interface ScopeDropdownProps {
  level: RibbonLevel;
  /** Options with data, already in display order. */
  withData: RibbonOption[];
  /** Options the pathway declares but has no data for, in display order. */
  withoutData: RibbonOption[];
  /** The axis's selected token. It may belong to another slot, or be null. */
  selectedToken: string | null;
  onSelect: (token: string) => void;
  geography: Geography | null | undefined;
}

/**
 * One ribbon dropdown: the sector control, or the Region or Country slot.
 *
 * Built on `useDropdown` for open/close, click-outside and Escape with focus
 * returned to the trigger, the same behaviour as the app's other dropdowns.
 *
 * Keyboard focus stays in the search field (or the list) while the arrow keys
 * move a highlight, announced through `aria-activedescendant`. Moving real
 * focus onto each option would stop the reader typing to filter, which matters
 * more here than matching `ColumnGeographySelect`, which has no search.
 *
 * Options without data are listed, last and greyed, and can never be picked
 * (spec §4.5). The highlight skips them.
 */
const ScopeDropdown: React.FC<ScopeDropdownProps> = ({
  level,
  withData,
  withoutData,
  selectedToken,
  onSelect,
  geography,
}) => {
  const { open, triggerRef, menuRef, toggle, close } =
    useDropdown<HTMLButtonElement>();
  const baseId = useId();
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  // Keeps the trigger's tooltip down after the panel closes and focus is
  // returned to the trigger, until the pointer or focus moves on.
  const [quiet, setQuiet] = useState(false);

  const all = useMemo(
    () => [...withData, ...withoutData],
    [withData, withoutData],
  );
  const optionId = useMemo(() => {
    const ids = new Map<string, string>();
    all.forEach((o, i) => ids.set(o.token, `${baseId}-opt-${i}`));
    return ids;
  }, [all, baseId]);

  const selected = withData.find((o) => o.token === selectedToken) ?? null;
  const searchable = needsSearch(all.length);
  const lookToken = hover ?? cursor ?? selected?.token ?? null;
  const look = all.find((o) => o.token === lookToken) ?? null;
  // The pane shows only while the option being looked at has something to
  // show (Sebastian, 2026-11-12: no "Nothing more to show." placeholder).
  // Always for sectors and regions; for a country, only one with member codes
  // (China with Hong Kong, say), so pointing at Japan folds the pane away.
  const hasPane = look !== null && optionHasInfo(level, look.token, geography);
  // Whether any option could open the pane. Such a list keeps the narrower
  // column even while the pane is folded away, so its rows don't re-wrap as
  // the pointer moves between China and Japan.
  const anyInfo = all.some((o) => optionHasInfo(level, o.token, geography));
  // The closed trigger describes its selection only when there is one, and
  // only for levels that carry information (sector, region).
  const showsInfo =
    selected !== null && optionHasInfo(level, selected.token, geography);
  const name = LEVEL_NAME[level];

  const visibleData = filterOptions(withData, query);
  const visibleNoData = filterOptions(withoutData, query);

  // Opening: clear the search, put the highlight on the selection, and focus
  // the search field or the list.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setQuery("");
      setHover(null);
      setCursor(selected?.token ?? withData[0]?.token ?? null);
      (searchable ? searchRef.current : listRef.current)?.focus();
    }
    if (!open && wasOpen.current) {
      setQuiet(true);
      setHover(null);
    }
    wasOpen.current = open;
  }, [open, searchable, selected, withData]);

  /*
    Keep the open panel on screen. It is anchored to its trigger's left edge,
    and the spec caps its WIDTH at the viewport minus 32px, but not its
    POSITION: on a phone, a dropdown at the right of the row opened partly
    off-screen. Measured once it opens, then nudged sideways to leave the same
    16px gutter at both edges. jsdom has no layout, so this is a no-op there.
  */
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    if (!open) {
      setShift(0);
      return;
    }
    const panel = menuRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    if (rect.width === 0) return;
    const gutter = 16;
    // The visible width, not window.innerWidth: on a phone an overflowing
    // panel widens the layout viewport itself, so innerWidth grows to fit the
    // very panel being measured (461px on a 375px screen, measured).
    const visible = document.documentElement.clientWidth;
    let dx = 0;
    if (rect.right > visible - gutter) dx = visible - gutter - rect.right;
    if (rect.left + dx < gutter) dx = gutter - rect.left;
    setShift(dx);
    // Re-measured when the pane comes or goes, since that changes the width.
  }, [open, menuRef, hasPane]);

  // Keep the highlighted option in view as it moves.
  useEffect(() => {
    if (!open || !cursor) return;
    document
      .getElementById(optionId.get(cursor) ?? "")
      ?.scrollIntoView({ block: "nearest" });
  }, [open, cursor, optionId]);

  const pick = (token: string): void => {
    onSelect(token);
    close();
  };

  const onQueryChange = (next: string): void => {
    setQuery(next);
    const still = filterOptions(withData, next);
    setCursor((current) =>
      current && still.some((o) => o.token === current)
        ? current
        : (still[0]?.token ?? null),
    );
  };

  const onPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const tokens = visibleData.map((o) => o.token);
    const at = cursor ? tokens.indexOf(cursor) : -1;
    const moveTo = (index: number) => {
      // Clamped rather than wrapping: the ends of a long list are landmarks.
      const clamped = Math.min(tokens.length - 1, Math.max(0, index));
      setHover(null);
      setCursor(tokens[clamped] ?? null);
    };

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveTo(at + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveTo(at - 1);
        break;
      case "Home":
      case "End":
        // In the search field these move the caret; only the list takes them.
        if (event.target === searchRef.current) return;
        event.preventDefault();
        moveTo(event.key === "Home" ? 0 : tokens.length - 1);
        break;
      case "Enter":
        if (cursor && tokens.includes(cursor)) {
          event.preventDefault();
          pick(cursor);
        }
        break;
    }
  };

  // Escape is handled by useDropdown, which closes and returns focus.

  const activeId = cursor ? optionId.get(cursor) : undefined;

  const triggerContent = (
    <>
      <LevelIcon level={level} />
      <span
        className={`truncate max-w-[11rem] ${selected ? "" : "text-rmigray-500 font-normal"}`}
      >
        {selected?.label ?? name}
      </span>
      <ChevronDown
        size={14}
        aria-hidden="true"
        className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      />
    </>
  );
  const triggerClass = `${CONTROL_CLASS} ${CLICKABLE_CLASS} ${selected ? ACTIVE_CLASS : IDLE_CLASS} ${FOCUS_CLASS}`;
  const triggerLabel = `${name}: ${selected?.label ?? "not selected"}`;
  const triggerAttrs = {
    "onClick": toggle,
    "aria-haspopup": "listbox" as const,
    "aria-expanded": open,
    "onMouseEnter": () => setQuiet(false),
    "onBlur": () => setQuiet(false),
  };

  const row = (option: RibbonOption, available: boolean) => {
    const isSelected = option.token === selected?.token;
    const isCursor = available && option.token === cursor;
    // One lit row, the one the pane describes: the held pointer when there
    // is one, else the keyboard cursor. The pointer can rest on a no-data
    // row too, since those have a pane worth reading.
    const isLit = hover !== null ? option.token === hover : isCursor;
    return (
      <li
        key={option.token}
        id={optionId.get(option.token)}
        role="option"
        aria-selected={isSelected}
        aria-disabled={available ? undefined : true}
        onMouseEnter={() => setHover(option.token)}
        // Keep focus in the search field or list: the click is the pick.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (available) pick(option.token);
        }}
        className={`flex items-start gap-2 px-3 py-1.5 text-sm text-rmigray-800 ${
          available ? "cursor-pointer" : "cursor-not-allowed opacity-50"
        } ${isLit ? "bg-neutral-100" : ""}`}
      >
        <span className="w-3.5 flex-shrink-0 pt-0.5">
          {isSelected && (
            <Check
              size={14}
              aria-hidden="true"
              className="text-bluespruce"
            />
          )}
        </span>
        <span
          className={`flex-1 min-w-0 block truncate ${isSelected ? "font-semibold text-bluespruce" : ""}`}
        >
          {option.label}
        </span>
      </li>
    );
  };

  const noDataHeaderId = `${baseId}-nodata`;
  const [noDataHead, noDataRest] = NO_DATA_GROUP_LABEL.split(" · ");
  const listId = `${baseId}-list`;
  const paneId = `${baseId}-pane`;

  return (
    <div className="relative inline-block">
      {/*
        Always the same component, whatever the selection: only the tooltip
        switches off when there is nothing to show. Rendering a plain <button>
        when idle and a TextWithTooltip once selected swapped the element on
        the first pick, and focus returned to the old one was lost with it.
      */}
      <TextWithTooltip
        as="button"
        position="bottom"
        triggerRef={triggerRef}
        suppressed={!showsInfo || open || quiet}
        ariaLabel={triggerLabel}
        className={triggerClass}
        text={triggerContent}
        tooltip={
          showsInfo && selected ? (
            <InfoTooltipBody name={selected.label}>
              <OptionInfo
                level={level}
                token={selected.token}
                geography={geography}
                capped
              />
            </InfoTooltipBody>
          ) : null
        }
        buttonProps={triggerAttrs}
      />

      {open && (
        <div
          ref={menuRef}
          onKeyDown={onPanelKeyDown}
          style={shift ? { transform: `translateX(${shift}px)` } : undefined}
          className={`absolute left-0 top-full mt-1 z-40 max-w-[calc(100vw-32px)] rounded-md border border-neutral-200 bg-white shadow-lg ${
            hasPane ? "w-72 sm:w-[34rem]" : anyInfo ? "w-72 sm:w-60" : "w-72"
          }`}
        >
          {searchable && (
            <div className="flex items-center gap-2 px-3 h-9 border-b border-neutral-200 text-rmigray-500">
              <Search
                size={14}
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={`Search ${name.toLowerCase()}`}
                aria-label={`Search ${name.toLowerCase()}`}
                aria-controls={listId}
                aria-activedescendant={activeId}
                className="flex-1 min-w-0 text-sm text-rmigray-800 bg-transparent focus:outline-none"
              />
            </div>
          )}

          <div className={anyInfo ? "flex flex-col sm:flex-row" : ""}>
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              tabIndex={-1}
              aria-label={name}
              aria-activedescendant={searchable ? undefined : activeId}
              aria-describedby={hasPane ? paneId : undefined}
              // No onMouseLeave reset: the pointed-at option holds the pane
              // until another option is pointed at or the list closes, so a
              // reader can move into the pane and scroll a long member list
              // (Sebastian, 2026-11-12). Clearing on leave reverted the pane to
              // the selection the moment the pointer crossed into it.
              className={`max-h-72 overflow-y-auto py-1 focus:outline-none ${
                anyInfo ? "sm:w-60 sm:shrink-0" : ""
              }`}
            >
              {visibleData.length === 0 && visibleNoData.length === 0 && (
                <li
                  role="presentation"
                  className="px-3 py-2 text-sm text-rmigray-500"
                >
                  No matches
                </li>
              )}
              {visibleData.map((option) => row(option, true))}
              {visibleNoData.length > 0 && (
                <li role="presentation">
                  <div
                    id={noDataHeaderId}
                    className={`${LABEL_CLASS} px-3 pt-2 pb-1`}
                  >
                    {/*
                      The label wraps in the 15rem list. Kept whole after the
                      dot, so it breaks as "Covered ·" / "not shown in detail
                      yet" rather than leaving "yet" or "shown" stranded.
                    */}
                    {noDataHead} ·{" "}
                    <span className="whitespace-nowrap">{noDataRest}</span>
                  </div>
                  <ul
                    role="group"
                    aria-labelledby={noDataHeaderId}
                  >
                    {visibleNoData.map((option) => row(option, false))}
                  </ul>
                </li>
              )}
            </ul>

            {hasPane && look && (
              <div
                id={paneId}
                aria-live="polite"
                className="border-t sm:border-t-0 sm:border-l border-neutral-200 p-3 text-xs text-rmigray-500 sm:w-[17rem] max-h-72 overflow-y-auto"
              >
                <p className="font-semibold text-rmigray-800 text-[13px] mb-1">
                  {look.label}
                </p>
                {!look.hasData && (
                  <p className="mb-1 text-rmigray-300">{NO_DATA_GROUP_LABEL}</p>
                )}
                <OptionInfo
                  level={level}
                  token={look.token}
                  geography={geography}
                  capped={false}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScopeDropdown;
