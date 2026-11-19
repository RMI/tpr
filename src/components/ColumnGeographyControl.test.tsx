import { describe, it, expect, vi } from "vitest";
import React, { useState } from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ColumnGeographyControl from "./ColumnGeographyControl";
import { columnGeographyOptions } from "../utils/comparisonScope";
import type { Geography } from "../types";

/*
 * One comparison column's geography under Option B
 * (design decision, 2026-11-18): a level switch, then one
 * value line. A stateful harness, since switching level is only meaningful
 * once the selection actually moves.
 */

const geography = {
  global: true,
  regions: {
    "Africa": ["NG", "ZA"],
    "Southeast Asia": ["ID", "TH", "VN"],
  },
  country: { JP: ["JP"] },
} as unknown as Geography;

/** Availability: every token except those listed. */
const optionsWithout = (...missing: string[]) =>
  columnGeographyOptions({ geography } as never, {
    hasGeography: (t: string) => !missing.includes(t),
  });

const Harness: React.FC<{
  initial: string | null;
  onSelect?: (token: string) => void;
  showNames?: boolean;
  missing?: string[];
  geo?: Geography;
}> = ({ initial, onSelect, showNames = true, missing = [], geo }) => {
  const [selected, setSelected] = useState<string | null>(initial);
  return (
    <ColumnGeographyControl
      name="IEA: STEPS (2024)"
      geography={geo ?? geography}
      options={
        geo
          ? columnGeographyOptions({ geography: geo } as never, {
              hasGeography: () => true,
            })
          : optionsWithout(...missing)
      }
      selected={selected}
      onSelect={(token) => {
        onSelect?.(token);
        setSelected(token);
      }}
      showNames={showNames}
    />
  );
};

const radio = (name: string) => screen.getByRole("radio", { name });
const checked = () =>
  screen
    .getAllByRole("radio")
    .find((r) => r.getAttribute("aria-checked") === "true")
    ?.getAttribute("aria-label");

describe("ColumnGeographyControl switching level (§2.4)", () => {
  it("returns to the last value picked at a level", async () => {
    const user = userEvent.setup();
    render(<Harness initial="Southeast Asia" />);

    await user.click(radio("Global"));
    expect(checked()).toBe("Global");
    await user.click(radio("Region"));

    expect(
      screen.getByRole("button", { name: "Region: Southeast Asia" }),
    ).toBeInTheDocument();
  });

  it("otherwise takes the first option with data, alphabetically", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <Harness
        initial="Global"
        onSelect={onSelect}
        missing={["Africa"]}
      />,
    );

    await user.click(radio("Region"));
    // Africa comes first alphabetically, but has no data.
    expect(onSelect).toHaveBeenLastCalledWith("Southeast Asia");
  });

  it("remembers a value picked from the list", async () => {
    // Start at Africa, the alphabetical default, so only the memory can
    // bring Southeast Asia back.
    const user = userEvent.setup();
    render(<Harness initial="Africa" />);

    await user.click(screen.getByRole("button", { name: "Region: Africa" }));
    await user.click(screen.getByRole("option", { name: "Southeast Asia" }));
    await user.click(radio("Country"));
    await user.click(radio("Region"));

    expect(
      screen.getByRole("button", { name: "Region: Southeast Asia" }),
    ).toBeInTheDocument();
  });
});

describe("ColumnGeographyControl value line (§2.3)", () => {
  it("shows a level's only option as a value, not a control", async () => {
    const user = userEvent.setup();
    render(<Harness initial="Global" />);

    await user.click(radio("Country"));
    expect(checked()).toBe("Country");
    expect(screen.getByText("Japan")).toBeInTheDocument();
    // Not a pressed toggle that does nothing.
    expect(screen.queryByRole("button", { name: /Japan/ })).toBeNull();
  });

  it("keeps a one-option region's members reachable in its tooltip", () => {
    const oneRegion = {
      regions: { ASEAN: ["ID", "TH", "VN"] },
    } as unknown as Geography;
    render(
      <Harness
        initial="ASEAN"
        geo={oneRegion}
      />,
    );

    const value = screen.getByText("ASEAN").closest("[tabindex]");
    expect(value).not.toBeNull();
    fireEvent.focus(value as HTMLElement);
    expect(screen.getByRole("tooltip")).toHaveTextContent("3 countries");
  });
});

describe("ColumnGeographyControl keyboard (V10)", () => {
  it("is one tab stop, on the chosen level", () => {
    render(<Harness initial="Southeast Asia" />);

    expect(radio("Region")).toHaveAttribute("tabindex", "0");
    expect(radio("Global")).toHaveAttribute("tabindex", "-1");
    expect(radio("Country")).toHaveAttribute("tabindex", "-1");
  });

  it("moves and chooses with the arrows, wrapping, and Home and End", async () => {
    const user = userEvent.setup();
    render(<Harness initial="Southeast Asia" />);

    radio("Region").focus();
    await user.keyboard("{ArrowRight}");
    expect(radio("Country")).toHaveFocus();
    expect(checked()).toBe("Country");

    await user.keyboard("{ArrowRight}");
    expect(radio("Global")).toHaveFocus();
    expect(checked()).toBe("Global");

    await user.keyboard("{End}");
    expect(checked()).toBe("Country");
    await user.keyboard("{Home}");
    expect(checked()).toBe("Global");
  });

  it("reaches a greyed level, so it can explain itself, but never chooses it", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial="Southeast Asia"
        missing={["JP"]}
      />,
    );

    radio("Region").focus();
    await user.keyboard("{ArrowRight}");
    expect(radio("Country")).toHaveFocus();
    expect(radio("Country")).toHaveAttribute("aria-disabled", "true");
    expect(checked()).toBe("Region");
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "isn't shown in detail",
    );
  });
});

describe("ColumnGeographyControl names", () => {
  it("shows the level names when they fit", () => {
    render(<Harness initial="Global" />);
    const levels = screen.getByRole("radiogroup");
    expect(levels).toHaveTextContent("GlobalRegionCountry");
  });

  it("shows icons only when they don't, keeping the names for assistive tech", () => {
    render(
      <Harness
        initial="Global"
        showNames={false}
      />,
    );
    const levels = screen.getByRole("radiogroup");
    expect(levels.textContent).toBe("");
    expect(
      within(levels)
        .getAllByRole("radio")
        .map((r) => r.getAttribute("aria-label")),
    ).toEqual(["Global", "Region", "Country"]);
  });
});
