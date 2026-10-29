import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import KeyFeatures, { FeatureItem, GROUPS } from "./KeyFeatures";
import { resolveKeyFeature } from "../utils/keyFeatureResolution";
import type { KeyFeatureKey } from "../utils/keyFeatureRules";
import type { PathwayMetadataType, PathwayScopeSelection } from "../types";
import metadataSchema from "../schema/pathwayMetadata.v2.json" with { type: "json" };
import emissionsScopeSchema from "../schema/common/emissionsScope.v1.json" with { type: "json" };

/**
 * v2 scopes every keyFeature as {sector, geography, value} entries (#858). These
 * fixtures use a single widest-scope entry per field — what the codemod produces —
 * so the rendering assertions below still describe v1's output.
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
    render(<KeyFeatures keyFeatures={mockKeyFeatures} />);
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
        keyFeatures={mockKeyFeatures}
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
        keyFeatures={mockKeyFeatures}
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
        keyFeatures={mockKeyFeatures}
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
    render(<KeyFeatures keyFeatures={mockKeyFeatures} />);

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
        keyFeatures={mockKeyFeatures}
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
        keyFeatures={mockKeyFeatures}
        title={null}
      />,
    );
    expect(screen.queryByText("Key Features")).not.toBeInTheDocument();
  });

  it("shows a description directly under the heading (#1029)", () => {
    render(
      <KeyFeatures
        keyFeatures={mockKeyFeatures}
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
        keyFeatures={mockKeyFeatures}
        groups={[]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("single-select: selected pill has blue classes, unselected have neutral classes", () => {
    render(<KeyFeatures keyFeatures={mockKeyFeatures} />);

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
    render(<KeyFeatures keyFeatures={mockKeyFeatures} />);

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
    render(<KeyFeatures keyFeatures={mockKeyFeatures} />);

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
    render(<KeyFeatures keyFeatures={unfavorable} />);

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
    render(<KeyFeatures keyFeatures={noInfo} />);

    // The Badge text should be present; no span with colored font for that feature
    const badge = screen.getAllByText("No information")[0];
    expect(badge).toBeInTheDocument();
    expect(badge).not.toHaveClass("text-success-600");
    expect(badge).not.toHaveClass("text-rmired-400");
  });

  it("neutral feature: selected value is bold, uses blue scale color, not a pill", () => {
    render(<KeyFeatures keyFeatures={mockKeyFeatures} />);

    // "NDCs incl. conditional targets" is the policyAmbition value — NeutralScale color
    const label = screen.getByText("NDCs incl. conditional targets");
    expect(label).toHaveClass("font-semibold");
    expect(label).toHaveClass("text-rmiblue-400");
    expect(label).not.toHaveClass("text-rmigray-500");
    expect(label).not.toHaveClass("bg-rmiblue-100");
  });

  it("renders every group as its own bordered card", () => {
    render(<KeyFeatures keyFeatures={mockKeyFeatures} />);
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
    render(<KeyFeatures keyFeatures={mockKeyFeatures} />);
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
        keyFeatures={mockKeyFeatures}
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
    expect(() => render(<KeyFeatures keyFeatures={sparse} />)).not.toThrow();
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
      country: ["TH"],
    },
    keyFeatures,
  } as unknown as PathwayMetadataType;
}

const POWER_TH: PathwayScopeSelection = { sector: "Power", geography: "TH" };

const configFor = (key: string) =>
  GROUPS.flatMap((g) => g.features).find((f) => f.key === key)!;

/** Render one feature, resolved for `scope` against a pathway holding `entries`. */
function renderResolved(
  key: KeyFeatureKey,
  entries: ReturnType<typeof e>[],
  scope: PathwayScopeSelection = POWER_TH,
  props: { selectedOnly?: boolean; showLabel?: boolean } = {},
) {
  const pathway = scopedPathway({ [key]: entries });
  return render(
    <FeatureItem
      feature={configFor(key)}
      keyFeatures={pathway.keyFeatures}
      resolution={resolveKeyFeature(pathway, key, scope)}
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

/** Any scope badge, whatever it names: they all read "<sector> · <geography>". */
const queryScopeBadge = () => screen.queryByText(/ · /);

describe("FeatureItem with a resolution (#869)", () => {
  it("renders an exact match as it always has, with no scope badge", () => {
    renderResolved("emissionsTrajectory", [
      e("Power", "TH", "Moderate decrease"),
      e("across sectors", "Global", "Significant decrease"),
    ]);

    expect(screen.getByText("Moderate decrease")).toHaveClass(
      "font-semibold",
      "text-success-600",
    );
    expect(queryScopeBadge()).not.toBeInTheDocument();
  });

  it("badges an inherited value with its source scope, beside the label", async () => {
    renderResolved("emissionsTrajectory", [
      e("across sectors", "South East Asia", "Moderate decrease"),
    ]);

    const badge = screen.getByText("Across sectors · South East Asia");
    expect(badge).toHaveClass("bg-transparent", "text-rmigray-500");
    // Same row as the label, not down with the value.
    expect(badge.closest("div")).toContainElement(
      screen.getByText("Emissions trajectory"),
    );
    expect(screen.getByText("Moderate decrease")).toBeInTheDocument();
    expect(await tooltipOf("Across sectors · South East Asia")).toBe(
      "No value for Power in Thailand; showing the closest broader scope" +
        " this pathway reports.",
    );
  });

  it("badges an inherited value on pill features too", () => {
    renderResolved("policyTypes", [
      e("Power", "South East Asia", ["Carbon price"]),
    ]);

    const badge = screen.getByText("Power · South East Asia");
    expect(badge.closest("div")).toContainElement(
      screen.getByText("Policy types"),
    );
    expect(screen.getByText("Carbon price").closest("span")).toHaveClass(
      "bg-rmiblue-100",
    );
  });

  it("keeps the badge on an inherited No information", async () => {
    renderResolved("energyDemand", [
      e("across sectors", "South East Asia", "No information"),
      e("across sectors", "Global", "Minor increase"),
    ]);

    expect(
      screen.getByText("Across sectors · South East Asia"),
    ).toBeInTheDocument();
    expect(await tooltipOf("No information")).toBe(
      "The pathway does not report this.",
    );
  });

  it("tells an authored No information from an exhausted chain", async () => {
    const { unmount } = renderResolved("energyDemand", [
      e("Power", "TH", "No information"),
    ]);
    const authored = await tooltipOf("No information");
    unmount();

    renderResolved("energyDemand", []);
    const exhausted = await tooltipOf("No information");

    expect(authored).toBe("The pathway does not report this.");
    expect(exhausted).toBe(
      "Nothing is recorded for this pathway at any scope.",
    );
    // Neither is inherited, so neither is badged.
    expect(queryScopeBadge()).not.toBeInTheDocument();
  });

  it("inherits Electrification of Power from across sectors, and says why", async () => {
    renderResolved("electrification", [
      e("across sectors", "South East Asia", "Moderate increase"),
    ]);

    expect(screen.getByText("Moderate increase")).toBeInTheDocument();
    expect(screen.queryByText(/not applicable/i)).not.toBeInTheDocument();
    expect(await tooltipOf("Across sectors · South East Asia")).toBe(
      "Electrification does not apply to the Power sector; showing the" +
        " closest broader scope this pathway reports.",
    );
  });

  it("shows Not applicable for Electrification of Power with nothing across sectors", async () => {
    renderResolved("electrification", []);

    expect(screen.queryByText("No information")).not.toBeInTheDocument();
    expect(queryScopeBadge()).not.toBeInTheDocument();
    expect(await tooltipOf("Not applicable")).toBe(
      "Electrification does not apply to the Power sector.",
    );
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
    expect(screen.getByText("Across sectors · Thailand")).toBeInTheDocument();
    expect(screen.queryByText(SENTINEL)).not.toBeInTheDocument();
    unmount();

    // The array shape, with nothing to fall back to.
    renderResolved("policyTypes", [e("Power", "TH", [SENTINEL])], POWER_TH, {
      selectedOnly: true,
    });
    expect(screen.getByText("No information")).toBeInTheDocument();
    expect(screen.queryByText(SENTINEL)).not.toBeInTheDocument();
  });

  it("explains a selected No information pill like the badge", async () => {
    // emissionsScope lists "No information" among its pills.
    renderResolved("emissionsScope", []);

    expect(screen.getByText("No information").closest("span")).toHaveClass(
      "bg-rmiblue-100",
    );
    expect(await tooltipOf("No information")).toBe(
      "Nothing is recorded for this pathway at any scope.",
    );
  });

  it("still names the source scope when there is no label to sit beside", () => {
    renderResolved(
      "emissionsTrajectory",
      [e("across sectors", "Global", "Moderate decrease")],
      POWER_TH,
      { showLabel: false },
    );

    expect(screen.getByText("Across sectors · Global")).toBeInTheDocument();
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
        country: ["US"],
      },
      keyFeatures: {
        emissionsTrajectory: [
          e("across sectors", "Global", "Moderate decrease"),
        ],
      },
    } as unknown as PathwayMetadataType;
    render(
      <FeatureItem
        feature={configFor("emissionsTrajectory")}
        keyFeatures={pathway.keyFeatures}
        resolution={resolveKeyFeature(pathway, "emissionsTrajectory", {
          sector: null,
          geography: null,
        })}
      />,
    );

    expect(await tooltipOf("Across sectors · Global")).toBe(
      "No value for all sectors in all regions; showing the closest broader" +
        " scope this pathway reports.",
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

  it("resolves each feature for the scope it is given", () => {
    const { rerender } = render(
      <KeyFeatures
        keyFeatures={ace.keyFeatures}
        pathway={ace}
        scope={{ sector: "Buildings", geography: "South East Asia" }}
      />,
    );
    expect(screen.getByText("Low or no change")).toBeInTheDocument();
    expect(
      screen.getAllByText("Across sectors · South East Asia"),
    ).toHaveLength(2);

    rerender(
      <KeyFeatures
        keyFeatures={ace.keyFeatures}
        pathway={ace}
        scope={{ sector: "Power", geography: "South East Asia" }}
      />,
    );
    // Power skips to the same across sectors row Buildings inherits.
    expect(screen.getByText("Low or no change")).toBeInTheDocument();
    expect(
      screen.getAllByText("Across sectors · South East Asia"),
    ).toHaveLength(2);
  });

  it("resolves at the widest scope when given no scope", () => {
    render(
      <KeyFeatures
        keyFeatures={ace.keyFeatures}
        pathway={ace}
      />,
    );
    // across sectors · South East Asia is the widest, so nothing is inherited.
    expect(screen.getByText("Moderate increase")).toBeInTheDocument();
    expect(queryScopeBadge()).not.toBeInTheDocument();
  });

  it("renders the widest values, unbadged, without a pathway", () => {
    render(<KeyFeatures keyFeatures={ace.keyFeatures} />);

    expect(screen.getByText("Low or no change")).toBeInTheDocument();
    expect(queryScopeBadge()).not.toBeInTheDocument();
    // And its "No information" badges stay untooltipped, as before the
    // resolver. (The pills of that name always carried a tooltip.)
    const badges = screen
      .getAllByText("No information")
      .filter((el) => el.classList.contains("bg-rmigray-100"));
    expect(badges.length).toBeGreaterThan(0);
    for (const badge of badges) {
      expect(badge.closest("[tabindex]")).toBeNull();
    }
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
    // Retired: Electrification × Power, the one place it was used, now carries
    // no value at all. Leaves the schema with the validator change.
    "Not Applicable",
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
