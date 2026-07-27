import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import KeyFeatures from "./KeyFeatures";
import type { PathwayMetadataType } from "../types";

const mockKeyFeatures: PathwayMetadataType["keyFeatures"] = {
  emissionsScope: "CO2",
  emissionsTrajectory: "Moderate decrease",
  energyEfficiency: "Minor improvement",
  energyDemand: "Low or no change",
  electrification: "Moderate increase",
  policyTypes: ["Carbon price", "Subsidies"],
  policyAmbition: "NDCs incl. conditional targets",
  newTechnologiesIncluded: ["CCUS", "Battery storage"],
  technologyCostTrend: "Decrease",
  technologyCostsDetail: "Total costs",
  investmentNeeds: "By technology",
};

describe("KeyFeatures", () => {
  it("renders all four group headers", () => {
    render(<KeyFeatures keyFeatures={mockKeyFeatures} />);
    expect(
      screen.getByText("Emissions Boundary & Trajectory"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Energy System & Transition Levers"),
    ).toBeInTheDocument();
    expect(screen.getByText("Policy Environment")).toBeInTheDocument();
    expect(
      screen.getByText("Technology & Feasibility Assumptions"),
    ).toBeInTheDocument();
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
      emissionsTrajectory: "Significant increase",
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
      emissionsTrajectory: undefined,
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
