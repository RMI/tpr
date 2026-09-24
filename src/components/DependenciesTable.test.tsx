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
    expect(
      cells.getByText("Assumes sustained carbon pricing."),
    ).toBeInTheDocument();

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

describe("DependenciesTable — sector scoping (#872)", () => {
  const multiSector = [
    row({ dependency_name: "Policy strategy", sector: "Power" }),
    row({ dependency_name: "Technology", sector: "Power" }),
    row({ dependency_name: "Resource availability", sector: "Steel" }),
  ];

  const names = () =>
    screen.getAllByRole("rowheader").map((th) => th.textContent);

  it("shows every dependency when no sector is selected", () => {
    render(<DependenciesTable dependencies={multiSector} />);
    expect(names()).toHaveLength(3);
  });

  it("filters to the selected sector", () => {
    render(
      <DependenciesTable
        dependencies={multiSector}
        sector="Steel"
      />,
    );
    expect(names()).toEqual(["Resource availability"]);
  });

  it("hides the Sector column once one sector is selected", () => {
    // Deliberate: the column would repeat the ribbon's selection on every row,
    // and the notice names the sector instead.
    render(
      <DependenciesTable
        dependencies={multiSector}
        sector="Power"
      />,
    );

    const headers = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(headers).not.toContain("Sector");
    expect(
      screen.getByText("Showing 2 of 3 dependencies for Power."),
    ).toBeInTheDocument();
  });

  it("keeps the Sector column when the visible rows still span sectors", () => {
    render(<DependenciesTable dependencies={multiSector} />);
    const headers = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(headers).toContain("Sector");
  });

  it("says nothing when the selection hides nothing", () => {
    render(
      <DependenciesTable
        dependencies={[row({ sector: "Power" })]}
        sector="Power"
      />,
    );
    expect(screen.queryByText(/^Showing /)).not.toBeInTheDocument();
  });

  it("distinguishes filtered-empty from nothing-recorded", () => {
    render(
      <DependenciesTable
        dependencies={multiSector}
        sector="Cement"
      />,
    );

    expect(
      screen.getByText("No dependencies are recorded for Cement."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/records 3 dependencies in other sectors/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/have been recorded for this pathway yet/),
    ).not.toBeInTheDocument();
  });

  it("keeps the unfiltered empty state when nothing is recorded", () => {
    render(
      <DependenciesTable
        dependencies={[]}
        sector="Power"
      />,
    );
    expect(
      screen.getByText(/have been recorded for this pathway yet/),
    ).toBeInTheDocument();
  });

  it("uses the singular when exactly one dependency is hidden", () => {
    render(
      <DependenciesTable
        dependencies={[row({ sector: "Steel" })]}
        sector="Cement"
      />,
    );
    expect(
      screen.getByText(/records one dependency in another sector/),
    ).toBeInTheDocument();
  });
});
