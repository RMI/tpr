import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ColumnGeographySelect from "./ColumnGeographySelect";
import type { ColumnGeographyOption } from "../utils/comparisonScope";

/**
 * IEA's real shape in miniature: Global and Southeast Asia are the two its
 * timeseries actually carries; the rest are declared by the publication only.
 */
const OPTIONS: ColumnGeographyOption[] = [
  { token: "Global", label: "Global", kind: "global", available: true },
  {
    token: "Southeast Asia",
    label: "Southeast Asia",
    kind: "region",
    available: true,
  },
  { token: "Europe", label: "Europe", kind: "region", available: false },
  {
    token: "US",
    label: "United States of America",
    kind: "country",
    available: false,
  },
];

const setup = (
  props: Partial<React.ComponentProps<typeof ColumnGeographySelect>> = {},
) => {
  const onSelect = vi.fn();
  render(
    <ColumnGeographySelect
      pathwayName="Announced Pledges Scenario"
      options={OPTIONS}
      selected="Global"
      onSelect={onSelect}
      {...props}
    />,
  );
  return { onSelect, user: userEvent.setup() };
};

const trigger = () =>
  screen.getByRole("button", {
    name: "Geography for Announced Pledges Scenario",
  });

describe("ColumnGeographySelect", () => {
  describe("trigger", () => {
    it("shows the selected geography", () => {
      setup();
      expect(trigger()).toHaveTextContent("Global");
    });

    it("names the column it belongs to, since position is not accessible", () => {
      setup();
      // The visible text is a geography, so the accessible name has to carry
      // which pathway this control is for.
      expect(trigger()).toBeInTheDocument();
      expect(trigger()).toHaveAttribute("aria-haspopup", "listbox");
    });

    it("reports its collapsed state", () => {
      setup();
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
    });

    it("prompts when nothing is selected yet", () => {
      setup({ selected: null });
      expect(trigger()).toHaveTextContent("Select a geography");
    });

    it("is disabled and says so for a pathway declaring no geography", () => {
      setup({ options: [], selected: null });
      expect(trigger()).toBeDisabled();
      expect(trigger()).toHaveTextContent("No geography");
    });
  });

  describe("opening and closing", () => {
    it("opens on click", async () => {
      const { user } = setup();
      await user.click(trigger());

      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
    });

    it("closes on a second click of the trigger", async () => {
      // The shell this borrows from opened without ever toggling closed.
      const { user } = setup();
      await user.click(trigger());
      await user.click(trigger());

      expect(screen.queryByRole("listbox")).toBeNull();
    });

    it("closes on Escape, returning focus to the trigger", async () => {
      const { user } = setup();
      await user.click(trigger());
      await user.keyboard("{Escape}");

      expect(screen.queryByRole("listbox")).toBeNull();
      // Without this a keyboard reader loses their place in the page.
      expect(trigger()).toHaveFocus();
    });

    it("closes on a click outside", async () => {
      const { user } = setup();
      await user.click(trigger());
      await user.click(document.body);

      expect(screen.queryByRole("listbox")).toBeNull();
    });
  });

  describe("options", () => {
    it("offers every declared geography, plainly labelled", async () => {
      const { user } = setup();
      await user.click(trigger());

      const names = screen
        .getAllByRole("option")
        .map((o) => o.textContent?.trim());
      expect(names).toEqual([
        "Global",
        "Southeast Asia",
        "Europe",
        "United States of America",
      ]);
      // No publisher suffix: the column carries the provenance.
      expect(names.join(" ")).not.toContain("(");
    });

    it("marks exactly one option selected", async () => {
      const { user } = setup();
      await user.click(trigger());

      const selected = screen
        .getAllByRole("option")
        .filter((o) => o.getAttribute("aria-selected") === "true");
      expect(selected.map((o) => o.textContent?.trim())).toEqual(["Global"]);
    });

    it("shows geographies this tool cannot plot, outlined rather than hidden", async () => {
      // 13 of IEA's 15 declared geographies produce no chart. Hiding them would
      // disagree with the coverage section, which lists all 15.
      const { user } = setup();
      await user.click(trigger());

      const europe = screen.getByRole("option", { name: "Europe" });
      expect(europe.querySelector(".bg-transparent")).not.toBeNull();

      const global = screen.getByRole("option", { name: "Global" });
      expect(global.querySelector(".bg-transparent")).toBeNull();
    });

    it("explains what the outlines mean", async () => {
      const { user } = setup();
      await user.click(trigger());

      expect(
        screen.getByText(
          /Outlined badges indicate the data for this geography/,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("reports the token, not the label", async () => {
      // The token is what lands in the URL and what the column resolves.
      const { onSelect, user } = setup();
      await user.click(trigger());
      await user.click(
        screen.getByRole("option", { name: "United States of America" }),
      );

      expect(onSelect).toHaveBeenCalledWith("US");
    });

    it("closes after choosing", async () => {
      const { user } = setup();
      await user.click(trigger());
      await user.click(screen.getByRole("option", { name: "Europe" }));

      expect(screen.queryByRole("listbox")).toBeNull();
    });

    it("lets an unavailable geography be chosen", async () => {
      // Shaded is a caveat, not a veto — the fallback note under the chart
      // then says what was shown instead.
      const { onSelect, user } = setup();
      await user.click(trigger());
      await user.click(screen.getByRole("option", { name: "Europe" }));

      expect(onSelect).toHaveBeenCalledWith("Europe");
    });
  });

  describe("keyboard", () => {
    it("focuses the selected option on open, not the first", async () => {
      const { user } = setup({ selected: "Europe" });
      await user.click(trigger());

      expect(screen.getByRole("option", { name: "Europe" })).toHaveFocus();
    });

    it("moves through the options with the arrow keys", async () => {
      const { user } = setup();
      await user.click(trigger());
      expect(screen.getByRole("option", { name: "Global" })).toHaveFocus();

      await user.keyboard("{ArrowDown}");
      expect(
        screen.getByRole("option", { name: "Southeast Asia" }),
      ).toHaveFocus();

      await user.keyboard("{ArrowUp}");
      expect(screen.getByRole("option", { name: "Global" })).toHaveFocus();
    });

    it("stops at the ends rather than wrapping", async () => {
      // With 152 options the ends are a useful landmark.
      const { user } = setup();
      await user.click(trigger());

      await user.keyboard("{ArrowUp}");
      expect(screen.getByRole("option", { name: "Global" })).toHaveFocus();

      await user.keyboard("{End}{ArrowDown}");
      expect(
        screen.getByRole("option", { name: "United States of America" }),
      ).toHaveFocus();
    });

    it("jumps to the ends with Home and End", async () => {
      const { user } = setup();
      await user.click(trigger());

      await user.keyboard("{End}");
      expect(
        screen.getByRole("option", { name: "United States of America" }),
      ).toHaveFocus();

      await user.keyboard("{Home}");
      expect(screen.getByRole("option", { name: "Global" })).toHaveFocus();
    });

    it("selects the focused option with Enter", async () => {
      const { onSelect, user } = setup();
      await user.click(trigger());
      await user.keyboard("{ArrowDown}{Enter}");

      expect(onSelect).toHaveBeenCalledWith("Southeast Asia");
    });
  });
});
