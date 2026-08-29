import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import DependenciesTable from "./DependenciesTable";
import { PathwayMetadataType } from "../types";

type DependencyRow = PathwayMetadataType["dependencies"][number];

const row = (over: Partial<DependencyRow> = {}): DependencyRow => ({
  dependency_name: "Policy strategy",
  dependency_description: "Assumes sustained carbon pricing.",
  sector: "Power",
  evidence_type: "Quantitative",
  ...over,
});

describe("DependenciesTable", () => {
  it("shows an empty state when there are no dependencies", () => {
    render(<DependenciesTable dependencies={[]} />);
    expect(
      screen.getByText(/no dependencies have been recorded/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders a row per dependency with name, evidence, and constraint", () => {
    render(
      <DependenciesTable
        dependencies={[
          row(),
          row({
            dependency_name: "Technology",
            dependency_description: "Depends on CCS scale-up.",
            evidence_type: "Qualitative",
          }),
        ]}
      />,
    );
    const policyRow = screen
      .getByRole("rowheader", { name: "Policy strategy" })
      .closest("tr")!;
    const cells = within(policyRow);
    expect(cells.getByText("Quantitative")).toBeInTheDocument();
    expect(cells.getByText("Assumes sustained carbon pricing.")).toBeInTheDocument();

    expect(
      screen.getByRole("rowheader", { name: "Technology" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Depends on CCS scale-up.")).toBeInTheDocument();
  });

  it("hides the Sector column when every dependency shares one sector", () => {
    render(
      <DependenciesTable
        dependencies={[row(), row({ dependency_name: "Technology" })]}
      />,
    );
    expect(
      screen.queryByRole("columnheader", { name: "Sector" }),
    ).not.toBeInTheDocument();
    for (const header of ["Dependency", "Evidence type", "Constraint"]) {
      expect(
        screen.getByRole("columnheader", { name: header }),
      ).toBeInTheDocument();
    }
  });

  it("shows the Sector column when dependencies span multiple sectors", () => {
    render(
      <DependenciesTable
        dependencies={[
          row({ sector: "Power" }),
          row({ dependency_name: "Technology", sector: "Buildings" }),
        ]}
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "Sector" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Buildings" })).toBeInTheDocument();
  });

  it("renders each evidence type as a labeled badge", () => {
    const types: DependencyRow["evidence_type"][] = [
      "Quantitative",
      "Qualitative",
      "Anecdotal",
      "No evidence",
    ];
    render(
      <DependenciesTable
        dependencies={types.map((evidence_type, i) =>
          row({ dependency_name: `Dep ${i}` as never, evidence_type }),
        )}
      />,
    );
    for (const t of types) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
  });
});
