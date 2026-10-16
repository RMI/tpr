import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoreDriverItem, CORE_DRIVER_LABELS } from "./CoreDrivers";
import type { CoreDrivers } from "./CoreDrivers";

const drivers = {
  policies: "Carbon pricing sustained across the region.",
  emissionsTargets: null,
  technologyCosts: "Costs fall with capacity expansion.",
  investmentChange: null,
  macroeconomicDrivers: null,
  behavioralShifts: null,
  otherDrivers: null,
} as unknown as CoreDrivers;

describe("CoreDriverItem", () => {
  it("renders the authored prose under its label", () => {
    render(
      <CoreDriverItem
        driverKey="policies"
        coreDrivers={drivers}
      />,
    );

    expect(screen.getByText("Policy drivers")).toBeInTheDocument();
    expect(
      screen.getByText("Carbon pricing sustained across the region."),
    ).toBeInTheDocument();
  });

  it("states explicitly that a null driver is not a core driver", () => {
    render(
      <CoreDriverItem
        driverKey="behavioralShifts"
        coreDrivers={drivers}
      />,
    );

    // A null driver is authored information, not an absence to hide.
    expect(
      screen.getByText("Not a core driver for this pathway."),
    ).toBeInTheDocument();
  });

  it("can render without its label", () => {
    render(
      <CoreDriverItem
        driverKey="policies"
        coreDrivers={drivers}
        showLabel={false}
      />,
    );

    expect(screen.queryByText("Policy drivers")).not.toBeInTheDocument();
    expect(
      screen.getByText("Carbon pricing sustained across the region."),
    ).toBeInTheDocument();
  });

  it("never renders the driver label as a heading", () => {
    render(
      <CoreDriverItem
        driverKey="policies"
        coreDrivers={drivers}
      />,
    );

    // KeyFeatures locates groups by their <h4>; a heading here would collide.
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("treats missing coreDrivers as 'not a core driver'", () => {
    render(
      <CoreDriverItem
        driverKey="policies"
        coreDrivers={null as unknown as CoreDrivers}
      />,
    );

    expect(
      screen.getByText("Not a core driver for this pathway."),
    ).toBeInTheDocument();
  });

  it("covers all seven schema drivers", () => {
    expect(CORE_DRIVER_LABELS.map((d) => d.key)).toEqual([
      "policies",
      "emissionsTargets",
      "technologyCosts",
      "investmentChange",
      "macroeconomicDrivers",
      "behavioralShifts",
      "otherDrivers",
    ]);
  });
});
