import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AssumptionsTrends from "./AssumptionsTrends";
import { PathwayMetadataType } from "../types";

type CoreDrivers = PathwayMetadataType["coreDrivers"];

const allNull: CoreDrivers = {
  policies: null,
  emissionsTargets: null,
  technologyCosts: null,
  investmentChange: null,
  macroeconomicDrivers: null,
  behavioralShifts: null,
  otherDrivers: null,
};

describe("AssumptionsTrends", () => {
  it("renders a card for every driver, labeled", () => {
    render(<AssumptionsTrends coreDrivers={allNull} />);
    for (const label of [
      "Policies",
      "Emissions targets",
      "Technology costs",
      "Investment",
      "Macroeconomic drivers",
      "Behavioral shifts",
      "Other drivers",
    ]) {
      expect(
        screen.getByRole("heading", { name: label }),
      ).toBeInTheDocument();
    }
  });

  it("shows the 'not a core driver' note for each null driver", () => {
    render(<AssumptionsTrends coreDrivers={allNull} />);
    // One note per driver (all seven are null here).
    expect(
      screen.getAllByText("Not a core driver for this pathway."),
    ).toHaveLength(7);
  });

  it("renders authored driver prose and does not add a note for it", () => {
    render(
      <AssumptionsTrends
        coreDrivers={{
          ...allNull,
          policies: "Assumes high-ambition carbon pricing across the region.",
          technologyCosts: "Falling solar PV and battery costs drive the buildout.",
        }}
      />,
    );
    expect(
      screen.getByText(
        "Assumes high-ambition carbon pricing across the region.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Falling solar PV and battery costs drive the buildout.",
      ),
    ).toBeInTheDocument();
    // Two drivers are described, so only the remaining five show the note.
    expect(
      screen.getAllByText("Not a core driver for this pathway."),
    ).toHaveLength(5);
  });
});
