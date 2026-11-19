import { describe, it, expect } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import KeyFeatures, { GROUPS, ScopedFeature } from "./KeyFeatures";
import { resolveKeyFeature } from "../utils/keyFeatureResolution";
import type { KeyFeatureKey } from "../utils/keyFeatureRules";
import type { PathwayMetadataType, PathwayScopeSelection } from "../types";
import metadataSchema from "../schema/pathwayMetadata.v2.json" with { type: "json" };
import emissionsScopeSchema from "../schema/common/emissionsScope.v1.json" with { type: "json" };

/**
 * v2 scopes every keyFeature as {sector, geography, value} entries (#858). These
 * fixtures use a single widest-scope entry per field — what the codemod produces —
 * which the panel's default scope resolves exactly, so nothing below is badged.
 */
const wide = <T,>(value: T) => [
  { sector: "across sectors", geography: "Global", value },
];

const mockKeyFeatures: PathwayMetadataType["keyFeatures"] = {
  emissionsScope: wide("CO2"),
  emissionsTrajectory: wide("Moderate decrease"),
  energyEfficiency: wide("Minor improvement"),
  energyDemand: wide("Low or no change"),
  electrification: wide("Moderate increase"),
  policyTypes: wide(["Carbon price", "Subsidies"]),
  policyAmbition: wide("NDCs incl. conditional targets"),
  newTechnologiesIncluded: wide(["CCUS", "Battery storage"]),
  technologyCostTrend: wide("Decrease"),
  technologyCostsDetail: wide("Total costs"),
  investmentNeeds: wide("By technology"),
} as unknown as PathwayMetadataType["keyFeatures"];

/** A global pathway holding `keyFeatures`, for the panel to resolve against. */
const pathwayWith = (
  keyFeatures: PathwayMetadataType["keyFeatures"],
): PathwayMetadataType =>
  ({
    sectors: [{ name: "Power", technologies: [] }],
    geography: { global: true, regions: {}, country: {} },
    keyFeatures,
  }) as unknown as PathwayMetadataType;

const mockPathway = pathwayWith(mockKeyFeatures);

const mockCoreDrivers = {
  policies: "Carbon pricing sustained region-wide.",
  emissionsTargets: null,
  technologyCosts: "Solar and battery costs keep falling.",
  investmentChange: null,
  macroeconomicDrivers: "Steady GDP growth to 2030.",
  behavioralShifts: null,
  otherDrivers: null,
} as unknown as PathwayMetadataType["coreDrivers"];

describe("KeyFeatures", () => {
  it("renders all six group headers in wireframe order", () => {
    render(<KeyFeatures pathway={mockPathway} />);
    expect(
      screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent),
    ).toEqual([
      "Policies",
      "Emissions",
      "Technology",
      "Investment",
      "Energy System",
      "Other",
    ]);
  });

  it("renders only the requested groups", () => {
    render(
      <KeyFeatures
        pathway={mockPathway}
        groups={["policies"]}
      />,
    );

    expect(
      screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent),
    ).toEqual(["Policies"]);
  });

  it("renders core drivers above the features of their own group", () => {
    render(
      <KeyFeatures
        pathway={mockPathway}
        coreDrivers={mockCoreDrivers}
      />,
    );

    const prose = screen.getByText("Carbon pricing sustained region-wide.");
    const policiesGroup = screen
      .getAllByRole("heading", { level: 4 })
      .find((h) => h.textContent === "Policies")?.parentElement as HTMLElement;

    // The driver belongs to Policies, and reads before that group's pills.
    expect(policiesGroup).toContainElement(prose);
    const ambition = screen.getByText("Policy ambition");
    expect(
      prose.compareDocumentPosition(ambition) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders the featureless Other group from its drivers alone", () => {
    render(
      <KeyFeatures
        pathway={mockPathway}
        coreDrivers={mockCoreDrivers}
        groups={["other"]}
      />,
    );

    expect(screen.getByText("Macroeconomic drivers")).toBeInTheDocument();
    expect(screen.getByText("Behavioral shifts")).toBeInTheDocument();
    expect(screen.getByText("Other drivers")).toBeInTheDocument();
    expect(screen.getByText("Steady GDP growth to 2030.")).toBeInTheDocument();
  });

  it("renders no driver prose at all when coreDrivers is omitted", () => {
    // Drivers are opt-in: a caller that passes only key features gets only key
    // features. (This used to be what kept the comparison page driver-free;
    // that page now builds its own driver rows from the same group config.)
    render(<KeyFeatures pathway={mockPathway} />);

    expect(
      screen.queryByText("Carbon pricing sustained region-wide."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Not a core driver for this pathway."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Policy drivers")).not.toBeInTheDocument();
  });

  it("renders a custom panel title, and none when it is null", () => {
    const { unmount } = render(
      <KeyFeatures
        pathway={mockPathway}
        title="Assumptions & Trends Overview"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Assumptions & Trends Overview" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Key Features")).not.toBeInTheDocument();
    unmount();

    render(
      <KeyFeatures
        pathway={mockPathway}
        title={null}
      />,
    );
    expect(screen.queryByText("Key Features")).not.toBeInTheDocument();
  });

  it("shows a description directly under the heading (#1029)", () => {
    render(
      <KeyFeatures
        pathway={mockPathway}
        title="Assumptions & Trends"
        description="What this panel is for."
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Assumptions & Trends" })
        .nextElementSibling,
    ).toHaveTextContent("What this panel is for.");
  });

  it("renders nothing when the requested group set is empty", () => {
    const { container } = render(
      <KeyFeatures
        pathway={mockPathway}
        groups={[]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("single-select: selected pill has blue classes, unselected have neutral classes", () => {
    render(<KeyFeatures pathway={mockPathway} />);

    // "CO2" is selected for emissionsScope
    const selected = screen.getByText("CO2").closest("span") as HTMLElement;
    expect(selected).toHaveClass("bg-rmiblue-100");
    expect(selected).toHaveClass("text-rmiblue-800");

    // "CO2e (Kyoto)" is not selected
    const unselected = screen
      .getByText("CO2e (Kyoto)")
      .closest("span") as HTMLElement;
    expect(unselected).toHaveClass("bg-neutral-50");
    expect(unselected).toHaveClass("text-neutral-400");
    expect(unselected).not.toHaveClass("bg-rmiblue-100");
  });

  it("multi-select: all selected pills have blue classes, unselected have neutral classes", () => {
    render(<KeyFeatures pathway={mockPathway} />);

    // "Carbon price" and "Subsidies" are selected for policyTypes
    const carbonPrice = screen
      .getByText("Carbon price")
      .closest("span") as HTMLElement;
    expect(carbonPrice).toHaveClass("bg-rmiblue-100");

    const subsidies = screen
      .getByText("Subsidies")
      .closest("span") as HTMLElement;
    expect(subsidies).toHaveClass("bg-rmiblue-100");

    // "Phaseout dates" is not selected
    const phaseout = screen
      .getByText("Phaseout dates")
      .closest("span") as HTMLElement;
    expect(phaseout).toHaveClass("bg-neutral-50");
    expect(phaseout).not.toHaveClass("bg-rmiblue-100");
  });

  it("sentiment feature: selected value is bold, uses scale segment color, not a pill", () => {
    render(<KeyFeatures pathway={mockPathway} />);

    // "Moderate decrease" is index 1 in emissionsTrajectory (greenEnd: first, 7 values)
    // → reversed PALETTE_7[1] = text-success-600
    const label = screen.getByText("Moderate decrease");
    expect(label).toHaveClass("font-semibold");
    expect(label).toHaveClass("text-success-600");
    expect(label).not.toHaveClass("text-rmigray-500");
    expect(label).not.toHaveClass("bg-rmiblue-100");
  });

  it("sentiment feature: unfavorable value uses red scale color", () => {
    const unfavorable = {
      ...mockKeyFeatures,
      emissionsTrajectory: wide("Significant increase"),
    } as unknown as PathwayMetadataType["keyFeatures"];
    render(<KeyFeatures pathway={pathwayWith(unfavorable)} />);

    // "Significant increase" is index 6 in emissionsTrajectory (greenEnd: first, 7 values)
    // → reversed PALETTE_7[6] = text-rmired-400
    const label = screen.getByText("Significant increase");
    expect(label).toHaveClass("font-semibold");
    expect(label).toHaveClass("text-rmired-400");
    expect(label).not.toHaveClass("text-rmigray-500");
  });

  it("sentiment feature: no-info value renders a Badge, not a colored text span", () => {
    const noInfo = {
      ...mockKeyFeatures,
      // v2's way of saying "nothing authored at any scope" is an empty entry
      // array, not a missing field — the field stays required.
      emissionsTrajectory: [],
    } as unknown as PathwayMetadataType["keyFeatures"];
    render(<KeyFeatures pathway={pathwayWith(noInfo)} />);

    // The Badge text should be present; no span with colored font for that feature
    const badge = screen.getAllByText("No information")[0];
    expect(badge).toBeInTheDocument();
    expect(badge).not.toHaveClass("text-success-600");
    expect(badge).not.toHaveClass("text-rmired-400");
  });

  it("neutral feature: selected value is bold, uses blue scale color, not a pill", () => {
    render(<KeyFeatures pathway={mockPathway} />);

    // "NDCs incl. conditional targets" is the policyAmbition value — NeutralScale color
    const label = screen.getByText("NDCs incl. conditional targets");
    expect(label).toHaveClass("font-semibold");
    expect(label).toHaveClass("text-rmiblue-400");
    expect(label).not.toHaveClass("text-rmigray-500");
    expect(label).not.toHaveClass("bg-rmiblue-100");
  });

  it("renders every group as its own bordered card", () => {
    render(<KeyFeatures pathway={mockPathway} />);
    const groups = screen
      .getAllByRole("heading", { level: 4 })
      .map((h) => h.parentElement as HTMLElement);

    expect(groups).toHaveLength(6);
    groups.forEach((g) => {
      expect(g).toHaveClass("bg-white");
      expect(g).toHaveClass("rounded-lg");
      expect(g).toHaveClass("border");
      // Separation is the grid gap's job now, not a per-group edge border.
      expect(g).not.toHaveClass("border-t");
      expect(g).not.toHaveClass("md:border-l");
    });
  });

  it("separates the cards with a grid gap rather than derived borders", () => {
    render(<KeyFeatures pathway={mockPathway} />);
    const grid = (
      screen.getAllByRole("heading", { level: 4 })[0]
        .parentElement as HTMLElement
    ).parentElement as HTMLElement;

    expect(grid).toHaveClass("gap-4");
    expect(grid).toHaveClass("md:grid-cols-2");
    expect(grid).toHaveClass("lg:grid-cols-3");
  });

  it("does not add grid columns when only one group is shown", () => {
    render(
      <KeyFeatures
        pathway={mockPathway}
        groups={["policies"]}
      />,
    );
    const grid = (
      screen.getAllByRole("heading", { level: 4 })[0]
        .parentElement as HTMLElement
    ).parentElement as HTMLElement;

    expect(grid).not.toHaveClass("md:grid-cols-2");
    expect(grid).not.toHaveClass("lg:grid-cols-3");
  });

  it("renders without crashing when a feature value is missing", () => {
    const sparse = {
      ...mockKeyFeatures,
      emissionsScope: undefined,
    } as unknown as PathwayMetadataType["keyFeatures"];
    expect(() =>
      render(<KeyFeatures pathway={pathwayWith(sparse)} />),
    ).not.toThrow();
  });
});

/*
  The resolver path (#869). Fixtures are resolved with the real resolver rather
  than hand-built resolutions, so these also pin how the two fit together.
*/
const SENTINEL = "Not applicable at this scope level";

const e = (sector: string, geography: string, value: string | string[]) => ({
  sector,
  geography,
  value,
});

/** Two sectors in one mapped region, with Thailand also declared on its own. */
function scopedPathway(
  keyFeatures: Record<string, unknown>,
): PathwayMetadataType {
  return {
    sectors: [
      { name: "Power", technologies: [] },
      { name: "Buildings", technologies: [] },
    ],
    geography: {
      regions: { "South East Asia": ["ID", "TH", "VN"] },
      country: { TH: ["TH"] },
    },
    keyFeatures,
  } as unknown as PathwayMetadataType;
}

const POWER_TH: PathwayScopeSelection = { sector: "Power", geography: "TH" };

const configFor = (key: string) =>
  GROUPS.flatMap((g) => g.features).find((f) => f.key === key)!;

/**
 * Render one feature in its scope container, resolved for `scope` against a
 * pathway holding `entries`.
 */
function renderResolved(
  key: KeyFeatureKey,
  entries: ReturnType<typeof e>[],
  scope: PathwayScopeSelection = POWER_TH,
  props: { showLabel?: boolean } = {},
) {
  const pathway = scopedPathway({ [key]: entries });
  return render(
    <ScopedFeature
      feature={configFor(key)}
      resolution={resolveKeyFeature(pathway, key, scope)}
      pathway={pathway}
      {...props}
    />,
  );
}

/** Open the tooltip on the element showing `text`, and read it. */
async function tooltipOf(text: string): Promise<string | null> {
  const trigger = screen.getByText(text).closest("[tabindex]") as HTMLElement;
  // Re-fired inside waitFor: TextWithTooltip attaches its listeners in an
  // effect, and a focus that lands before them is dropped without a trace.
  await waitFor(() => {
    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });
  const content = screen.getByRole("tooltip").textContent;
  fireEvent.blur(trigger);
  return content;
}

/** The halves of every scope tab on the page, in order. */
const tabHalves = () =>
  screen.getAllByRole("list", { name: "Scope shown" }).map((tab) =>
    within(tab)
      .getAllByRole("listitem")
      .map((half) => half.textContent),
  );

/** A tab half's label, to read its colour. */
const half = (text: string) =>
  screen.getByText(text, { selector: "[data-scope-label]" });

const NEUTRAL = "bg-neutral-100";
const GREY = "bg-neutral-300";
const YELLOW = "bg-solar-100";
const LIGHT_YELLOW = "bg-solar-100/50";

/** The scope badge the tab replaced: "<sector> · <geography>". */
const queryScopeBadge = () => screen.queryByText(/ · /);

describe("ScopedFeature: the scope tab (scope-tab-spec)", () => {
  it("names the selected scope, neutral, for an exact match", async () => {
    renderResolved("emissionsTrajectory", [
      e("Power", "TH", "Moderate decrease"),
      e("across sectors", "Global", "Significant decrease"),
    ]);

    expect(screen.getByText("Moderate decrease")).toHaveClass(
      "font-semibold",
      "text-success-600",
    );
    expect(tabHalves()).toEqual([["Power", "Thailand"]]);
    expect(half("Power")).toHaveClass(NEUTRAL);
    expect(half("Thailand")).toHaveClass(NEUTRAL);
    expect(await tooltipOf("Thailand")).toBe(
      "Thailand: the geography you selected.",
    );
    expect(queryScopeBadge()).not.toBeInTheDocument();
  });

  it("colours each axis the tool fell back on yellow, with its own reason", async () => {
    renderResolved("emissionsTrajectory", [
      e("across sectors", "South East Asia", "Moderate decrease"),
    ]);

    expect(screen.getByText("Moderate decrease")).toBeInTheDocument();
    expect(tabHalves()).toEqual([["Across sectors", "South East Asia"]]);
    expect(half("Across sectors")).toHaveClass(YELLOW);
    expect(half("South East Asia")).toHaveClass(YELLOW);
    expect(await tooltipOf("Across sectors")).toBe(
      "Nothing recorded for Power, so this is the value across all of the" +
        " pathway's sectors.",
    );
    expect(await tooltipOf("South East Asia")).toBe(
      "Nothing recorded for Thailand, so this is the closest broader" +
        " geography: South East Asia.",
    );
    // The tab replaced the badge beside the label.
    expect(queryScopeBadge()).not.toBeInTheDocument();
  });

  it("names both scopes, grey, where the publisher records it more broadly", async () => {
    renderResolved("energyEfficiency", [
      e("Power", "TH", SENTINEL),
      e("across sectors", "TH", SENTINEL),
      e("across sectors", "South East Asia", "Minor improvement"),
    ]);

    expect(tabHalves()).toEqual([
      ["Across sectors < Power", "South East Asia < Thailand"],
    ]);
    expect(half("Across sectors < Power")).toHaveClass(GREY);
    expect(half("South East Asia < Thailand")).toHaveClass(GREY);
    expect(await tooltipOf("Across sectors < Power")).toBe(
      "The publisher records this across all of the pathway's sectors, not" +
        " for Power on its own.",
    );
    expect(await tooltipOf("South East Asia < Thailand")).toBe(
      "The publisher records this for South East Asia, not for Thailand on" +
        " its own.",
    );
  });

  it("puts the tab on pill features too", () => {
    renderResolved("policyTypes", [
      e("Power", "South East Asia", ["Carbon price"]),
    ]);

    expect(tabHalves()).toEqual([["Power", "South East Asia"]]);
    expect(half("Power")).toHaveClass(NEUTRAL);
    expect(screen.getByText("Carbon price").closest("span")).toHaveClass(
      "bg-rmiblue-100",
    );
  });

  it("names where an inherited No information came from", async () => {
    renderResolved("energyDemand", [
      e("across sectors", "South East Asia", "No information"),
      e("across sectors", "Global", "Minor increase"),
    ]);

    expect(tabHalves()).toEqual([["Across sectors", "South East Asia"]]);
    expect(await tooltipOf("No information")).toBe(
      "The pathway does not report this.",
    );
  });

  it("shows no value as centred words, with no scale and no pills", async () => {
    const { unmount } = renderResolved("energyDemand", [
      e("Power", "TH", "No information"),
    ]);
    const authored = await tooltipOf("No information");
    // No ramp: none of the scale's steps is drawn.
    expect(screen.queryByText("Minor increase")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /increase/ }),
    ).not.toBeInTheDocument();
    unmount();

    renderResolved("energyDemand", []);
    const exhausted = await tooltipOf("No information");

    expect(authored).toBe("The pathway does not report this.");
    expect(exhausted).toBe(
      "Nothing is recorded for this pathway at any scope.",
    );
    // The tab stays, neutral, naming the scope the page looked at.
    expect(tabHalves()).toEqual([["Power", "Thailand"]]);
    expect(half("Power")).toHaveClass(NEUTRAL);
    expect(half("Thailand")).toHaveClass(NEUTRAL);
  });

  it("drops the pills too when a pill feature has nothing", () => {
    // emissionsScope lists "No information" among its own pills.
    renderResolved("emissionsScope", []);

    expect(screen.getByText("No information")).toHaveClass(
      "text-sm",
      "text-rmigray-400",
    );
    expect(screen.queryByText("CO2")).not.toBeInTheDocument();
  });

  it("treats an authored No information pill as no value", async () => {
    // "No information" is one of emissionsScope's own options, but it is an
    // absence, not a value to draw as a selected pill.
    renderResolved("emissionsScope", [e("Power", "TH", "No information")]);

    expect(screen.queryByText("CO2")).not.toBeInTheDocument();
    expect(screen.getByText("No information")).toHaveClass("text-sm");
    expect(await tooltipOf("No information")).toBe(
      "The pathway does not report this.",
    );
  });

  it("inherits Electrification of Power from across sectors, light yellow, and says why", async () => {
    renderResolved("electrification", [
      e("across sectors", "South East Asia", "Moderate increase"),
    ]);

    expect(screen.getByText("Moderate increase")).toBeInTheDocument();
    expect(screen.queryByText(/not applicable/i)).not.toBeInTheDocument();
    expect(half("Across sectors")).toHaveClass(LIGHT_YELLOW);
    expect(await tooltipOf("Across sectors")).toBe(
      "Electrification does not apply to the Power sector, so this is the" +
        " value across all of the pathway's sectors.",
    );
  });

  it("shows Not applicable for Electrification of Power with nothing across sectors", async () => {
    renderResolved("electrification", []);

    expect(screen.queryByText("No information")).not.toBeInTheDocument();
    expect(await tooltipOf("Not applicable")).toBe(
      "Electrification does not apply to the Power sector.",
    );
    expect(half("Power")).toHaveClass(NEUTRAL);
  });

  it("still shows No information for Electrification of another sector", async () => {
    renderResolved("electrification", [], {
      sector: "Buildings",
      geography: "TH",
    });

    expect(screen.queryByText("Not applicable")).not.toBeInTheDocument();
    expect(await tooltipOf("No information")).toBe(
      "Nothing is recorded for this pathway at any scope.",
    );
  });

  it("never renders the scope-level sentinel", () => {
    const { unmount } = renderResolved("energyEfficiency", [
      e("Power", "TH", SENTINEL),
      e("across sectors", "TH", "Minor improvement"),
    ]);
    expect(screen.getByText("Minor improvement")).toBeInTheDocument();
    expect(tabHalves()).toEqual([["Across sectors < Power", "Thailand"]]);
    expect(screen.queryByText(SENTINEL)).not.toBeInTheDocument();
    unmount();

    // The array shape, with nothing to fall back to.
    renderResolved("policyTypes", [e("Power", "TH", [SENTINEL])]);
    expect(screen.getByText("No information")).toBeInTheDocument();
    expect(screen.queryByText(SENTINEL)).not.toBeInTheDocument();
  });

  it("still names the source scope when there is no label", () => {
    renderResolved(
      "emissionsTrajectory",
      [e("across sectors", "Global", "Moderate decrease")],
      POWER_TH,
      { showLabel: false },
    );

    expect(tabHalves()).toEqual([["Across sectors", "Global"]]);
    expect(screen.queryByText("Emissions trajectory")).not.toBeInTheDocument();
  });

  it("words the request in prose when empty axes were filled with sentinels", async () => {
    // No token contains the rest, so the widest geography is `across regions`;
    // the across sectors row makes `across sectors` the widest sector.
    const pathway = {
      sectors: [
        { name: "Power", technologies: [] },
        { name: "Buildings", technologies: [] },
      ],
      geography: {
        global: false,
        regions: { Europe: ["DE", "FR"] },
        country: { US: ["US"] },
      },
      keyFeatures: {
        emissionsTrajectory: [
          e("across sectors", "Global", "Moderate decrease"),
        ],
      },
    } as unknown as PathwayMetadataType;
    render(
      <ScopedFeature
        feature={configFor("emissionsTrajectory")}
        resolution={resolveKeyFeature(pathway, "emissionsTrajectory", {
          sector: null,
          geography: null,
        })}
        pathway={pathway}
      />,
    );

    expect(tabHalves()).toEqual([["Across sectors", "Global"]]);
    expect(half("Across sectors")).toHaveClass(NEUTRAL);
    expect(await tooltipOf("Global")).toBe(
      "Nothing recorded across regions, so this is the closest broader" +
        " geography: Global.",
    );
  });
});

describe("KeyFeatures with a pathway", () => {
  // The ACE Buildings shape: electrification recorded only across sectors,
  // with the sentinel on the Buildings row.
  const ace = scopedPathway({
    electrification: [
      e("across sectors", "South East Asia", "Low or no change"),
      e("Buildings", "South East Asia", SENTINEL),
    ],
    emissionsTrajectory: [
      e("across sectors", "South East Asia", "Moderate increase"),
    ],
  });

  /** The sector half of the tab under the feature showing `value`. */
  const sectorHalfFor = (value: string) =>
    within(
      screen.getByText(value).closest(".rounded-lg") as HTMLElement,
    ).getAllByRole("listitem")[0];

  it("resolves each feature for the scope it is given", () => {
    const { rerender } = render(
      <KeyFeatures
        pathway={ace}
        scope={{ sector: "Buildings", geography: "South East Asia" }}
      />,
    );
    expect(screen.getByText("Low or no change")).toBeInTheDocument();
    // Buildings is marked for electrification, and simply missing for the
    // emissions trajectory.
    expect(sectorHalfFor("Low or no change")).toHaveTextContent(
      "Across sectors < Buildings",
    );
    expect(sectorHalfFor("Moderate increase")).toHaveTextContent(
      /^Across sectors$/,
    );

    rerender(
      <KeyFeatures
        pathway={ace}
        scope={{ sector: "Power", geography: "South East Asia" }}
      />,
    );
    // Power skips to the same across sectors row Buildings inherits, because
    // electrification does not apply to it.
    expect(screen.getByText("Low or no change")).toBeInTheDocument();
    expect(
      within(sectorHalfFor("Low or no change")).getByText("Across sectors"),
    ).toHaveClass(LIGHT_YELLOW);
  });

  it("resolves at the widest scope when given no scope", () => {
    render(<KeyFeatures pathway={ace} />);
    // across sectors · South East Asia is the widest, so nothing is inherited.
    expect(screen.getByText("Moderate increase")).toBeInTheDocument();
    expect(
      within(sectorHalfFor("Moderate increase")).getByText("Across sectors"),
    ).toHaveClass(NEUTRAL);
  });
});

describe("feature config against the schema", () => {
  /*
    Values the schema allows that are deliberately not an option or a scale
    step, because the item renders them some other way. Anything else missing
    from the config would show as "No information", or as nothing selected, for
    a value the pathway really reports — which is how SMR went unshown.
  */
  const RENDERED_OTHERWISE = new Set([
    // A badge, or the field's own "No information" pill where it has one.
    "No information",
    // Skipped by the resolver, never rendered.
    "Not applicable at this scope level",
  ]);

  type ValueSchema = {
    enum?: string[];
    items?: { enum?: string[] };
    anyOf?: { enum?: string[]; $ref?: string }[];
  };
  const fields = (
    metadataSchema as unknown as {
      properties: {
        keyFeatures: {
          properties: Record<
            string,
            { items: { properties: { value: ValueSchema } } }
          >;
        };
      };
    }
  ).properties.keyFeatures.properties;

  /** Every value the v2 schema allows for one field, following its one $ref. */
  function schemaValues(key: KeyFeatureKey): string[] {
    const value = fields[key].items.properties.value;
    return (
      value.enum ??
      value.items?.enum ??
      (value.anyOf ?? []).flatMap((option) =>
        option.$ref ? emissionsScopeSchema.enum : (option.enum ?? []),
      )
    );
  }

  it.each(GROUPS.flatMap((g) => g.features).map((f) => [f.key, f] as const))(
    "%s offers every value the schema allows",
    (key, feature) => {
      const allowed = schemaValues(key);
      // Guards the lookup above: an empty list would make this pass vacuously.
      expect(allowed.length).toBeGreaterThan(1);

      const offered =
        "options" in feature ? feature.options : feature.scaleValues;
      expect(
        allowed.filter(
          (v) => !RENDERED_OTHERWISE.has(v) && !offered.includes(v),
        ),
      ).toEqual([]);
    },
  );
});
