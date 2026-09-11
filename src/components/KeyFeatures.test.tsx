import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import KeyFeatures from "./KeyFeatures";
import type { PathwayMetadataType } from "../types";

/**
 * v2 scopes every keyFeature as {sector, geography, value} entries (#858). These
 * fixtures use a single widest-scope entry per field — what the codemod produces —
 * so the rendering assertions below still describe v1's output.
 */
const wide = <T,>(value: T) => [
  { sector: "cross-sector", geography: "Global", value },
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
    // This is what keeps the comparison page free of core-driver content.
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

  it("applies horizontal divider classes to bottom-row groups only", () => {
    render(<KeyFeatures keyFeatures={mockKeyFeatures} />);
    const groups = screen
      .getAllByRole("heading", { level: 4 })
      .map((h) => h.parentElement as HTMLElement);

    // top row — no border-t
    expect(groups[0]).not.toHaveClass("border-t");
    expect(groups[1]).not.toHaveClass("border-t");
    // bottom row — border-t present
    expect(groups[2]).toHaveClass("border-t");
    expect(groups[3]).toHaveClass("border-t");
  });

  it("does not render old box styling on any group", () => {
    render(<KeyFeatures keyFeatures={mockKeyFeatures} />);
    const groups = screen
      .getAllByRole("heading", { level: 4 })
      .map((h) => h.parentElement as HTMLElement);

    groups.forEach((g) => {
      expect(g).not.toHaveClass("bg-white");
      expect(g).not.toHaveClass("rounded-md");
    });
  });

  it("renders without crashing when a feature value is missing", () => {
    const sparse = {
      ...mockKeyFeatures,
      emissionsScope: undefined,
    } as unknown as PathwayMetadataType["keyFeatures"];
    expect(() => render(<KeyFeatures keyFeatures={sparse} />)).not.toThrow();
  });
});
