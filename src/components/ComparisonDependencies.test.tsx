import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ComparisonDependencies from "./ComparisonDependencies";
import type { DependencyRow } from "./DependenciesTable";
import type { PathwayMetadataType } from "../types";
import pathwayMetadataSchema from "../schema/pathwayMetadata.v2.json" with { type: "json" };

const dependency = (overrides: Partial<DependencyRow> = {}): DependencyRow => ({
  dependency_name: "Policy strategy",
  dependency_description: "Relies on a national carbon price.",
  sector: "Power",
  evidence_type: "Qualitative",
  ...overrides,
});

const pathway = (
  id: string,
  dependencies: DependencyRow[],
): PathwayMetadataType =>
  ({
    id,
    name: { full: `Pathway ${id}`, short: id },
    dependencies,
  }) as unknown as PathwayMetadataType;

const rowLabels = () =>
  screen
    .getAllByText(
      (_, el) =>
        el?.tagName === "P" &&
        el.className.includes("uppercase") &&
        el.className.includes("font-semibold"),
    )
    .map((el) => el.textContent);

describe("ComparisonDependencies", () => {
  it("lists every dependency category from the schema, in schema order", () => {
    render(
      <ComparisonDependencies
        pathways={[pathway("a", [dependency()]), pathway("b", [dependency()])]}
        sector="Power"
      />,
    );

    expect(rowLabels()).toEqual(
      pathwayMetadataSchema.properties.dependencies.items.properties
        .dependency_name.enum,
    );
  });

  it("shows each pathway's evidence and description under its category", () => {
    render(
      <ComparisonDependencies
        pathways={[
          pathway("a", [dependency()]),
          pathway("b", [
            dependency({
              dependency_name: "Technology",
              dependency_description: "Assumes CCUS at scale.",
              evidence_type: "Anecdotal",
            }),
          ]),
        ]}
        sector="Power"
      />,
    );

    expect(
      screen.getByText("Relies on a national carbon price."),
    ).toBeInTheDocument();
    expect(screen.getByText("Qualitative")).toBeInTheDocument();
    expect(screen.getByText("Assumes CCUS at scale.")).toBeInTheDocument();
    expect(screen.getByText("Anecdotal")).toBeInTheDocument();
  });

  it("says when a pathway records nothing under a category", () => {
    render(
      <ComparisonDependencies
        pathways={[pathway("a", [dependency()]), pathway("b", [dependency()])]}
        sector="Power"
      />,
    );

    // Two columns, ten categories, one recorded in each column.
    expect(screen.getAllByText("No information")).toHaveLength(18);
  });

  it("shows only the selected sector's dependencies", () => {
    render(
      <ComparisonDependencies
        pathways={[
          pathway("a", [
            dependency(),
            dependency({
              sector: "Steel",
              dependency_description: "Needs green hydrogen.",
            }),
          ]),
          pathway("b", [
            dependency({
              sector: "Steel",
              dependency_description: "Needs scrap supply.",
            }),
          ]),
        ]}
        sector="Steel"
      />,
    );

    expect(screen.getByText("Needs green hydrogen.")).toBeInTheDocument();
    expect(screen.getByText("Needs scrap supply.")).toBeInTheDocument();
    expect(
      screen.queryByText("Relies on a national carbon price."),
    ).not.toBeInTheDocument();
  });

  it("stacks a category a pathway records more than once", () => {
    render(
      <ComparisonDependencies
        pathways={[
          pathway("a", [
            dependency(),
            dependency({ dependency_description: "Also needs grid reform." }),
          ]),
          pathway("b", [dependency()]),
        ]}
        sector="Power"
      />,
    );

    expect(screen.getByText("Also needs grid reform.")).toBeInTheDocument();
    expect(
      screen.getAllByText("Relies on a national carbon price."),
    ).toHaveLength(2);
  });

  it("explains a column with nothing for the sector once, leaving its cells blank", () => {
    render(
      <ComparisonDependencies
        pathways={[
          pathway("a", [dependency()]),
          pathway("b", [dependency({ sector: "Steel" })]),
        ]}
        sector="Power"
      />,
    );

    expect(
      screen.getAllByText(
        "This pathway has no dependencies recorded for Power.",
      ),
    ).toHaveLength(1);
    // Only column a's nine unrecorded categories say so; column b stays blank.
    expect(screen.getAllByText("No information")).toHaveLength(9);
    expect(rowLabels()).toHaveLength(10);
  });

  it("leaves out the column note when every column has something", () => {
    render(
      <ComparisonDependencies
        pathways={[pathway("a", [dependency()]), pathway("b", [dependency()])]}
        sector="Power"
      />,
    );

    expect(
      screen.queryByText(/has no dependencies recorded/),
    ).not.toBeInTheDocument();
  });

  it("shows one message instead of empty rows when no pathway has any", () => {
    render(
      <ComparisonDependencies
        pathways={[pathway("a", [dependency()]), pathway("b", [])]}
        sector="Steel"
      />,
    );

    expect(
      screen.getByText("None of these pathways record dependencies for Steel."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Policy strategy")).not.toBeInTheDocument();
  });

  it("handles pathways without a dependencies list", () => {
    render(
      <ComparisonDependencies
        pathways={[
          { id: "a" } as unknown as PathwayMetadataType,
          pathway("b", [dependency()]),
        ]}
        sector="Power"
      />,
    );

    expect(
      screen.getByText("This pathway has no dependencies recorded for Power."),
    ).toBeInTheDocument();
  });

  it("explains an empty section when there is no sector to scope by", () => {
    render(
      <ComparisonDependencies
        pathways={[pathway("a", [dependency()]), pathway("b", [dependency()])]}
        sector={null}
      />,
    );

    expect(
      screen.getByText(
        "No dependencies are recorded for the sectors these pathways share.",
      ),
    ).toBeInTheDocument();
  });

  it("renders nothing without pathways", () => {
    const { container } = render(
      <ComparisonDependencies
        pathways={[]}
        sector="Power"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
