import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScopeDropdown from "./ScopeDropdown";
import { NO_DATA_GROUP_LABEL, type RibbonOption } from "../utils/scopeRibbon";
import type { Geography } from "../types";

const opt = (label: string, hasData = true, token = label): RibbonOption => ({
  token,
  label,
  hasData,
});

const geography = {
  regions: {
    Europe: [
      "DE",
      "FR",
      "IT",
      "ES",
      "PL",
      "NL",
      "BE",
      "SE",
      "AT",
      "PT",
      "CZ",
      "DK",
      "FI",
      "IE",
    ],
    Asia: ["CN", "JP"],
  },
} as unknown as Geography;

const renderDropdown = (
  props: Partial<React.ComponentProps<typeof ScopeDropdown>> = {},
) => {
  const onSelect = vi.fn();
  const utils = render(
    <ScopeDropdown
      level="sector"
      withData={[opt("Power"), opt("Steel")]}
      withoutData={[opt("Buildings", false)]}
      selectedToken="Power"
      onSelect={onSelect}
      geography={geography}
      {...props}
    />,
  );
  const trigger = screen.getByRole("button", {
    name: /^Sector:|^Region:|^Country:/,
  });
  return { ...utils, onSelect, trigger };
};

describe("ScopeDropdown trigger", () => {
  it("shows the selection and names it for assistive tech", () => {
    const { trigger } = renderDropdown();
    expect(trigger).toHaveAccessibleName("Sector: Power");
    expect(trigger).toHaveTextContent("Power");
    expect(trigger.className).toContain("ring-bluespruce");
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the level name, idle, when this slot does not hold the selection", () => {
    // The selection is a country, so the Region slot is just a way in.
    const { trigger } = renderDropdown({
      level: "region",
      withData: [opt("Asia"), opt("Europe")],
      withoutData: [],
      selectedToken: "FR",
    });
    expect(trigger).toHaveAccessibleName("Region: not selected");
    expect(trigger).toHaveTextContent("Region");
    expect(trigger.className).not.toContain("ring-bluespruce");
  });
});

describe("ScopeDropdown list", () => {
  it("lists options with data first, then the no-data group", async () => {
    const { trigger } = renderDropdown();
    await userEvent.click(trigger);
    const list = screen.getByRole("listbox");
    const options = within(list).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Power",
      "Steel",
      "Buildings",
    ]);
    expect(within(list).getByText(NO_DATA_GROUP_LABEL)).toBeInTheDocument();
    expect(
      within(list).getByRole("group", { name: NO_DATA_GROUP_LABEL }),
    ).toBeInTheDocument();
  });

  it("marks the selected option and the unpickable ones", async () => {
    const { trigger } = renderDropdown();
    await userEvent.click(trigger);
    expect(screen.getByRole("option", { name: "Power" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const noData = screen.getByRole("option", { name: "Buildings" });
    expect(noData).toHaveAttribute("aria-disabled", "true");
    expect(noData.className).toContain("opacity-50");
  });

  it("picks an option with data, closes, and returns focus to the trigger", async () => {
    const { trigger, onSelect } = renderDropdown();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("option", { name: "Steel" }));
    expect(onSelect).toHaveBeenCalledWith("Steel");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("keeps focus on the trigger when the first pick gives this slot its selection", async () => {
    // An idle Region slot gains a selection on its first pick, so its trigger
    // starts showing a tooltip. If that swapped the trigger element, focus
    // returned to the old one would be lost with it.
    const onSelect = vi.fn();
    const { rerender } = render(
      <ScopeDropdown
        level="region"
        withData={[opt("Asia"), opt("Europe")]}
        withoutData={[]}
        selectedToken="FR"
        onSelect={onSelect}
        geography={geography}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Region: not selected" }),
    );
    await userEvent.click(screen.getByRole("option", { name: "Asia" }));
    rerender(
      <ScopeDropdown
        level="region"
        withData={[opt("Asia"), opt("Europe")]}
        withoutData={[]}
        selectedToken="Asia"
        onSelect={onSelect}
        geography={geography}
      />,
    );
    expect(screen.getByRole("button", { name: "Region: Asia" })).toHaveFocus();
  });

  it("ignores a click on an option without data", async () => {
    const { trigger, onSelect } = renderDropdown();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("option", { name: "Buildings" }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });
});

describe("ScopeDropdown keyboard", () => {
  it("moves the highlight with the arrows, skipping options without data", async () => {
    const { trigger } = renderDropdown();
    await userEvent.click(trigger);
    const list = screen.getByRole("listbox");
    // Opens on the selection.
    expect(list.getAttribute("aria-activedescendant")).toBe(
      screen.getByRole("option", { name: "Power" }).id,
    );
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(list.getAttribute("aria-activedescendant")).toBe(
      screen.getByRole("option", { name: "Steel" }).id,
    );
    // Clamped at the last option with data: Buildings is never reachable.
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(list.getAttribute("aria-activedescendant")).toBe(
      screen.getByRole("option", { name: "Steel" }).id,
    );
  });

  it("picks the highlighted option with Enter", async () => {
    const { trigger, onSelect } = renderDropdown();
    await userEvent.click(trigger);
    const list = screen.getByRole("listbox");
    fireEvent.keyDown(list, { key: "ArrowDown" });
    fireEvent.keyDown(list, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("Steel");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const { trigger } = renderDropdown();
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger).toHaveFocus();
  });
});

describe("ScopeDropdown search", () => {
  const nine = ["A", "B", "C", "D", "E", "F", "G", "H", "I"].map((l) =>
    opt(`Country ${l}`, true, l),
  );

  it("has no search field at eight options or fewer", async () => {
    const { trigger } = renderDropdown({
      level: "country",
      withData: nine.slice(0, 8),
      withoutData: [],
      selectedToken: "A",
    });
    await userEvent.click(trigger);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("has one above eight, focused on open, that filters by label or token", async () => {
    const { trigger } = renderDropdown({
      level: "country",
      withData: nine,
      withoutData: [],
      selectedToken: "A",
    });
    await userEvent.click(trigger);
    const search = screen.getByRole("textbox", { name: "Search country" });
    expect(search).toHaveFocus();
    await userEvent.type(search, "country c");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Country C",
    ]);
    await userEvent.clear(search);
    await userEvent.type(search, "zzz");
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });

  it("keeps typing in the search field while the arrows move the highlight", async () => {
    const { trigger } = renderDropdown({
      level: "country",
      withData: nine,
      withoutData: [],
      selectedToken: "A",
    });
    await userEvent.click(trigger);
    const search = screen.getByRole("textbox");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(search).toHaveFocus();
    expect(search.getAttribute("aria-activedescendant")).toBe(
      screen.getByRole("option", { name: "Country B" }).id,
    );
  });
});

describe("ScopeDropdown preview pane", () => {
  it("shows the selected option's information when the list opens", async () => {
    const { trigger } = renderDropdown();
    await userEvent.click(trigger);
    const pane = document.getElementById(
      screen.getByRole("listbox").getAttribute("aria-describedby") ?? "",
    );
    expect(pane).toHaveTextContent("Power");
    expect(pane).toHaveTextContent("Includes power generation");
  });

  it("follows the pointer, and labels an option without data", async () => {
    const { trigger } = renderDropdown();
    await userEvent.click(trigger);
    fireEvent.mouseEnter(screen.getByRole("option", { name: "Buildings" }));
    const pane = document.getElementById(
      screen.getByRole("listbox").getAttribute("aria-describedby") ?? "",
    );
    expect(pane).toHaveTextContent("Buildings");
    expect(pane).toHaveTextContent(NO_DATA_GROUP_LABEL);
  });

  it("lists every region member, uncapped", async () => {
    // The tooltip caps at 12; the pane scrolls instead.
    const { trigger } = renderDropdown({
      level: "region",
      withData: [opt("Asia"), opt("Europe")],
      withoutData: [],
      selectedToken: "Europe",
    });
    await userEvent.click(trigger);
    const pane = document.getElementById(
      screen.getByRole("listbox").getAttribute("aria-describedby") ?? "",
    );
    expect(pane).toHaveTextContent("14 countries");
    expect(pane).toHaveTextContent("Ireland");
    expect(pane).not.toHaveTextContent("more");
  });

  it("is absent for countries, which carry no information", async () => {
    const { trigger } = renderDropdown({
      level: "country",
      withData: [opt("France", true, "FR"), opt("Spain", true, "ES")],
      withoutData: [],
      selectedToken: "FR",
    });
    await userEvent.click(trigger);
    expect(screen.getByRole("listbox")).not.toHaveAttribute("aria-describedby");
  });
});

describe("ScopeDropdown trigger tooltip", () => {
  it("shows the selected option's information on hover, capped", () => {
    const { trigger } = renderDropdown({
      level: "region",
      withData: [opt("Asia"), opt("Europe")],
      withoutData: [],
      selectedToken: "Europe",
    });
    fireEvent.mouseEnter(trigger);
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("Europe");
    expect(tip).toHaveTextContent("+2 more");
  });

  it("stays hidden while the list is open", async () => {
    const { trigger } = renderDropdown();
    await userEvent.click(trigger);
    fireEvent.mouseEnter(trigger);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("does not pop up over the page when Escape returns focus to the trigger", async () => {
    const { trigger } = renderDropdown();
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
