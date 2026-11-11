import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PathwayContextRibbon from "./PathwayContextRibbon";
import { MockIntersectionObserver } from "../test/mockIntersectionObserver";
import type { PathwayMetadataType, PathwayScopeSelection } from "../types";
import {
  ALL_AVAILABLE,
  type ScopeAvailability,
} from "../utils/scopeAvailability";

const pathway = {
  id: "ribbon-fixture",
  name: { full: "Ribbon Test Pathway", short: "RTP" },
  pathwayType: "Normative",
  modelYearNetzero: 2050,
  modelTempIncrease: 1.5,
  sectors: [{ name: "Power", technologies: [] }],
  geography: {
    global: true,
    regions: { "South East Asia": ["VN", "TH"] },
    country: ["US"],
  },
} as unknown as PathwayMetadataType;

const NO_SCOPE: PathwayScopeSelection = { sector: null, geography: null };

// Several options per axis, so the dropdowns are exercised. Buildings and
// Germany have no data; everything else does.
const multi = {
  ...pathway,
  sectors: [
    { name: "Steel", technologies: [] },
    { name: "Power", technologies: [] },
    { name: "Buildings", technologies: [] },
  ],
  geography: {
    global: true,
    regions: { "South East Asia": ["VN", "TH"], "Europe": ["DE", "FR"] },
    country: ["VN", "US", "DE"],
  },
} as unknown as PathwayMetadataType;
const MULTI_DATA: ScopeAvailability = {
  hasSector: (s) => s !== "Buildings",
  hasGeography: (g) => g !== "DE",
};
const renderMulti = (
  scope: PathwayScopeSelection = { sector: "Power", geography: "Global" },
  onScopeChange: (next: PathwayScopeSelection) => void = () => {},
) =>
  render(
    <PathwayContextRibbon
      pathway={multi}
      scope={scope}
      onScopeChange={onScopeChange}
      availability={MULTI_DATA}
    >
      <div role="tablist">
        <button role="tab">At a glance</button>
      </div>
    </PathwayContextRibbon>,
  );

const renderRibbon = (
  scope: PathwayScopeSelection = NO_SCOPE,
  onScopeChange: (next: PathwayScopeSelection) => void = () => {},
  availability: ScopeAvailability = ALL_AVAILABLE,
) =>
  render(
    <PathwayContextRibbon
      pathway={pathway}
      scope={scope}
      onScopeChange={onScopeChange}
      availability={availability}
    >
      <div role="tablist">
        <button role="tab">At a glance</button>
      </div>
    </PathwayContextRibbon>,
  );

/** Drive the sentinel past the top of the viewport. */
const scrollPast = () =>
  act(() => {
    const observer = MockIntersectionObserver.instances.at(-1);
    const sentinel = document.querySelector("[aria-hidden='true']");
    observer?.trigger(sentinel as Element, false, { top: -10 });
  });

/** Sentinel below the viewport — not intersecting, but not scrolled past. */
const scrollBelow = () =>
  act(() => {
    const observer = MockIntersectionObserver.instances.at(-1);
    const sentinel = document.querySelector("[aria-hidden='true']");
    observer?.trigger(sentinel as Element, false, { top: 800 });
  });

describe("PathwayContextRibbon", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances.length = 0;
  });

  it("lists the pathway's sectors and geographies", () => {
    renderRibbon();

    expect(screen.getByText("Sector")).toBeInTheDocument();
    expect(screen.getByText("Power")).toBeInTheDocument();

    expect(screen.getByText("Geography")).toBeInTheDocument();
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getByText("South East Asia")).toBeInTheDocument();
    // Country codes are shown by name, as elsewhere on the page.
    expect(screen.getByText("United States of America")).toBeInTheDocument();
  });

  it("gives region badges a member-country tooltip, and others none", async () => {
    renderRibbon();

    // Every badge is now a toggle button, so the distinction is behavioural
    // rather than structural: only a region has members worth listing.
    const region = screen.getByRole("button", { name: "South East Asia" });
    fireEvent.focus(region);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Vietnam");
    // Blur explicitly: fireEvent.focus does not move real focus, so the open
    // tooltip would otherwise linger and mask the assertions below.
    fireEvent.blur(region);

    for (const name of ["Global", "United States of America"]) {
      const badge = screen.getByRole("button", { name });
      fireEvent.focus(badge);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      fireEvent.blur(badge);
    }
  });

  it("keeps the tab list rendered and reachable", () => {
    renderRibbon();

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "At a glance" })).toBeVisible();
  });

  it("collapses the condensed title until the header scrolls away", () => {
    const { container } = renderRibbon();

    const slot = container.querySelector(
      "[class*='transition-\\[height\\]']",
    ) as HTMLElement;
    expect(slot).toHaveClass("h-0");
    expect(slot).not.toHaveClass("h-10");

    scrollPast();
    expect(slot).toHaveClass("h-10");
    expect(slot).not.toHaveClass("h-0");
  });

  it("stays expanded when the sentinel is merely below the viewport", () => {
    const { container } = renderRibbon();
    const slot = container.querySelector(
      "[class*='transition-\\[height\\]']",
    ) as HTMLElement;

    // IntersectionObserver also reports not-intersecting for a sentinel below
    // the fold; that must not be mistaken for "scrolled past".
    scrollBelow();
    expect(slot).toHaveClass("h-0");
  });

  it("condenses as the header passes under the environment banner", () => {
    const banner = document.createElement("div");
    banner.setAttribute("data-env-banner", "");
    vi.spyOn(banner, "getBoundingClientRect").mockReturnValue({
      height: 28,
    } as DOMRect);
    document.body.prepend(banner);

    try {
      const { container } = renderRibbon();
      const slot = container.querySelector(
        "[class*='transition-\\[height\\]']",
      ) as HTMLElement;

      // The sticky bar pins at the banner's bottom edge, so the observed band
      // starts there, and a sentinel hidden behind the banner has scrolled past.
      expect(MockIntersectionObserver.instances.at(-1)?.rootMargin).toBe(
        "-28px 0px 0px 0px",
      );
      act(() => {
        const observer = MockIntersectionObserver.instances.at(-1);
        const sentinel = container.querySelector("[aria-hidden='true']");
        observer?.trigger(sentinel as Element, false, { top: 10 });
      });
      expect(slot).toHaveClass("h-10");
    } finally {
      banner.remove();
    }
  });

  it("restates the title without adding a second heading", () => {
    renderRibbon();
    scrollPast();

    // The condensed bar repeats the name visually only — the page's single <h1>
    // lives in the full header and stays in the accessibility tree regardless.
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("RTP")).toBeInTheDocument();
  });

  it("shows the type, net-zero year and warming pills when condensed", () => {
    renderRibbon();
    scrollPast();

    expect(screen.getByText("Normative")).toBeInTheDocument();
    expect(screen.getByText("2050")).toBeInTheDocument();
    expect(screen.getByText("1.5°C")).toBeInTheDocument();
  });

  it("omits the optional pills when the pathway lacks those values", () => {
    render(
      <PathwayContextRibbon
        pathway={
          {
            ...pathway,
            modelYearNetzero: null,
            modelTempIncrease: null,
          } as unknown as PathwayMetadataType
        }
        scope={NO_SCOPE}
        onScopeChange={() => {}}
        availability={ALL_AVAILABLE}
      >
        <div role="tablist" />
      </PathwayContextRibbon>,
    );
    scrollPast();

    expect(screen.getByText("Normative")).toBeInTheDocument();
    expect(screen.queryByText("2050")).not.toBeInTheDocument();
    expect(screen.queryByText("1.5°C")).not.toBeInTheDocument();
  });

  it("labels each axis as a group", () => {
    renderRibbon();

    expect(screen.getByRole("group", { name: "Sector" })).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Geography" }),
    ).toBeInTheDocument();
  });

  it("marks the control holding the selection, and only that one", () => {
    // Replaces "presses the badge matching the active scope". The selection now
    // shows on the control of the slot that holds it; the other slots stay idle.
    renderMulti({ sector: "Steel", geography: "VN" });

    expect(
      screen.getByRole("button", { name: "Sector: Steel" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Country: Vietnam" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Region: not selected" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Global/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("presses a one-option geography button when it holds the selection", () => {
    renderRibbon({ sector: "Power", geography: "Global" });

    expect(screen.getByRole("button", { name: "Global" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "South East Asia" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("merges a click into the existing scope rather than replacing it", async () => {
    const onScopeChange = vi.fn();
    renderRibbon({ sector: "Power", geography: null }, onScopeChange);

    await userEvent.click(
      screen.getByRole("button", { name: "South East Asia" }),
    );

    // The sector axis must survive a geography click.
    expect(onScopeChange).toHaveBeenCalledWith({
      sector: "Power",
      geography: "South East Asia",
    });
  });

  it("ignores a click on the already-selected option", async () => {
    // Both axes always carry a value, so there is no "no selection" state to
    // toggle back to; re-picking is a no-op rather than a clear.
    const onScopeChange = vi.fn();
    renderMulti({ sector: "Power", geography: "Global" }, onScopeChange);

    await userEvent.click(screen.getByRole("button", { name: /Global/ }));
    await userEvent.click(
      screen.getByRole("button", { name: "Sector: Power" }),
    );
    await userEvent.click(screen.getByRole("option", { name: "Power" }));

    expect(onScopeChange).not.toHaveBeenCalled();
  });

  describe("availability (#1017; #1046 reversed for this ribbon)", () => {
    it("lists every declared token, those without data last and unpickable", async () => {
      // Replaces "lists only the tokens with something to show". This ribbon
      // deliberately reverses #1046 (Sebastian, 2026-11-05): a token the
      // pathway declares is listed even with nothing to show, greyed and last.
      const onScopeChange = vi.fn();
      renderMulti({ sector: "Power", geography: "Global" }, onScopeChange);

      await userEvent.click(
        screen.getByRole("button", { name: "Country: not selected" }),
      );
      const names = screen.getAllByRole("option").map((o) => o.textContent);
      expect(names).toEqual(["United States of America", "Vietnam", "Germany"]);
      const germany = screen.getByRole("option", { name: "Germany" });
      expect(germany).toHaveAttribute("aria-disabled", "true");
      await userEvent.click(germany);
      expect(onScopeChange).not.toHaveBeenCalled();
    });

    it("shows inactive slots that explain themselves when nothing can be selected", async () => {
      // Replaces the empty-axis note. Nothing is hidden: each slot is greyed,
      // still reachable by keyboard, and says why in its tooltip.
      renderRibbon(NO_SCOPE, () => {}, {
        hasSector: () => false,
        hasGeography: () => false,
      });

      const unavailable = screen
        .getAllByRole("button")
        .filter((b) => b.getAttribute("aria-disabled") === "true");
      // Sector, Global, Region and Country.
      expect(unavailable).toHaveLength(4);
      expect(
        screen.queryByText(/specific information for this pathway/),
      ).toBeNull();

      fireEvent.focus(screen.getByRole("button", { name: /United States/ }));
      expect(await screen.findByRole("tooltip")).toHaveTextContent(
        "No data for United States of America in TPR yet.",
      );
    });
  });

  it("offers no clear control", () => {
    renderRibbon({ sector: "Power", geography: "Global" });

    expect(
      screen.queryByRole("button", { name: /^Clear/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the selection on its slot's control, however long the list", () => {
    // Replaces "keeps the selected token visible rather than hidden behind
    // '+N more'". There is no overflow now: the selection always names the
    // control of the slot that holds it. The scope holds the raw token ("US");
    // the control shows its label.
    renderMulti({ sector: "Power", geography: "US" });

    expect(
      screen.getByRole("button", { name: "Country: United States of America" }),
    ).toHaveTextContent("United States of America");
  });

  it("reaches every option by opening its dropdown", async () => {
    // Replaces "reveals the remaining options on request" ("Show all").
    renderMulti();

    await userEvent.click(
      screen.getByRole("button", { name: "Region: not selected" }),
    );
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Europe",
      "South East Asia",
    ]);
  });

  it("exposes each dropdown's state and the list it opens", async () => {
    // Replaces "exposes the expand control's state and the badges it controls".
    renderMulti();

    const trigger = screen.getByRole("button", {
      name: "Region: not selected",
    });
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox", { name: "Region" })).toBeInTheDocument();
  });

  it("always joins the three geography slots with 'or', even when some are inactive", () => {
    // The word states that Global, Region and Country are one choice (spec
    // §4.6). The slots are always rendered, so the separators always are too.
    renderRibbon(NO_SCOPE, () => {}, {
      hasSector: () => true,
      hasGeography: () => false,
    });
    const geography = screen.getByRole("group", { name: "Geography" });
    expect(
      Array.from(geography.querySelectorAll("span")).filter(
        (el) => el.textContent === "or",
      ),
    ).toHaveLength(2);
  });

  it("offers no 'Show all' control: long lists live in the dropdowns", () => {
    // Was "offers no 'Show all' when every badge already fits (#1026)". With
    // dropdowns there is no overflow to reveal, on any pathway.
    renderMulti();

    expect(screen.queryByRole("button", { name: "Show all" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Show fewer" })).toBeNull();
  });

  it("respects reduced motion on the collapse transition", () => {
    const { container } = renderRibbon();
    const slot = container.querySelector(
      "[class*='transition-\\[height\\]']",
    ) as HTMLElement;

    expect(slot).toHaveClass("motion-reduce:transition-none");
  });
});
