import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ComparisonKeyFeatures from "./ComparisonKeyFeatures";
import { NOT_A_CORE_DRIVER_TEXT } from "./CoreDrivers";
import type { CoreDrivers } from "./CoreDrivers";
import type { PathwayMetadataType } from "../types";
import {
  resolveKeyFeature,
  sourceScopeLabel,
} from "../utils/keyFeatureResolution";
import { ACROSS_SECTORS } from "../utils/keyFeatureRules";

/**
 * v2 stores every key feature as scoped entries. One entry at the pathway's
 * widest scope, which is where a grid with no scope selected resolves.
 */
const wide = (value: string | string[]) => [
  { sector: "across sectors", geography: "Global", value },
];

const KEY_FEATURES = {
  policyAmbition: wide("High ambition policies"),
  policyTypes: wide(["Carbon price"]),
  emissionsTrajectory: wide("Moderate decrease"),
  emissionsScope: wide("CO2"),
  technologyCostTrend: wide("Decrease"),
  technologyCostsDetail: wide("Total costs"),
  newTechnologiesIncluded: wide(["CCUS"]),
  investmentNeeds: wide("Total investment"),
  energyDemand: wide("Low or no change"),
  electrification: wide("Moderate increase"),
  energyEfficiency: wide("Significant improvement"),
};

/** Every driver null — the state of every pathway file in the repo today. */
const NO_DRIVERS: CoreDrivers = {
  policies: null,
  emissionsTargets: null,
  technologyCosts: null,
  investmentChange: null,
  macroeconomicDrivers: null,
  behavioralShifts: null,
  otherDrivers: null,
};

const pathway = (
  id: string,
  coreDrivers: Partial<CoreDrivers> = {},
): PathwayMetadataType =>
  ({
    id,
    name: { full: `Pathway ${id}`, short: id },
    sectors: [{ name: "Power" }],
    geography: { global: true },
    keyFeatures: KEY_FEATURES,
    coreDrivers: { ...NO_DRIVERS, ...coreDrivers },
  }) as unknown as PathwayMetadataType;

/** No sector or geography selected: every column resolves at its widest. */
const renderGrid = (pathways: PathwayMetadataType[]) =>
  render(
    <ComparisonKeyFeatures
      pathways={pathways}
      sector={null}
      geographies={{}}
    />,
  );

const renderScoped = (
  pathways: PathwayMetadataType[],
  sector: string | null,
  geographies: Record<string, string | null>,
) =>
  render(
    <ComparisonKeyFeatures
      pathways={pathways}
      sector={sector}
      geographies={geographies}
    />,
  );

/** A scoped entry. */
const e = (sector: string, geography: string, value: string | string[]) => ({
  sector,
  geography,
  value,
});

/**
 * A Power pathway with its own region and country mapping, holding only the
 * key features given.
 */
const scopedPathway = (
  id: string,
  regions: Record<string, string[]>,
  keyFeatures: Record<string, ReturnType<typeof e>[]>,
): PathwayMetadataType =>
  ({
    id,
    name: { full: `Pathway ${id}`, short: id },
    sectors: [{ name: "Power" }, { name: "Buildings" }],
    geography: { global: true, regions, country: ["TH", "VN"] },
    keyFeatures,
    coreDrivers: NO_DRIVERS,
  }) as unknown as PathwayMetadataType;

/**
 * The cells of one feature row, in column order. A row is its label, spanning
 * every column, followed by one cell per pathway.
 */
const cellsOf = (label: string, columns: number): HTMLElement[] => {
  let el = screen.getByText(label, { selector: "p" }).parentElement;
  const cells: HTMLElement[] = [];
  for (let i = 0; i < columns; i++) {
    el = el?.nextElementSibling as HTMLElement | null;
    if (el) cells.push(el);
  }
  return cells;
};

/** Any scope badge, whatever it names: they all read "<sector> · <geography>". */
const queryScopeBadge = (cell: HTMLElement) => within(cell).queryByText(/ · /);

const groupHeadings = () =>
  screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

const rowLabels = () =>
  screen
    .getAllByText(
      (_, el) =>
        el?.tagName === "P" &&
        el.className.includes("uppercase") &&
        el.className.includes("font-semibold"),
    )
    .map((el) => el.textContent);

describe("ComparisonKeyFeatures", () => {
  describe("groups", () => {
    it("shows the five feature-bearing groups when no driver is described", () => {
      // Every core driver is null in every pathway file today, so this is what
      // the page actually renders.
      renderGrid([pathway("a"), pathway("b")]);

      expect(groupHeadings()).toEqual([
        "Policies",
        "Emissions",
        "Technology",
        "Investment",
        "Energy System",
      ]);
    });

    it("skips Other until one of its drivers is described", () => {
      // "Other" carries three drivers and no features, so with nothing
      // authored it would render as an empty heading bar.
      renderGrid([pathway("a"), pathway("b")]);
      expect(groupHeadings()).not.toContain("Other");
    });

    it("shows Other once any of its drivers is described", () => {
      renderGrid([
        pathway("a", { behavioralShifts: "Reduced car ownership." }),
        pathway("b"),
      ]);

      expect(groupHeadings()).toEqual([
        "Policies",
        "Emissions",
        "Technology",
        "Investment",
        "Energy System",
        "Other",
      ]);
    });
  });

  describe("driver rows", () => {
    it("omits a driver no compared pathway describes", () => {
      // All-null carries no comparative information — every column would read
      // the same sentence.
      renderGrid([pathway("a"), pathway("b")]);

      expect(rowLabels()).not.toContain("Policy drivers");
      expect(screen.queryByText(NOT_A_CORE_DRIVER_TEXT)).toBeNull();
    });

    it("shows a driver one pathway describes, and says the other does not", () => {
      renderGrid([
        pathway("a", { policies: "Carbon pricing across both sectors." }),
        pathway("b"),
      ]);

      expect(rowLabels()).toContain("Policy drivers");
      expect(
        screen.getByText("Carbon pricing across both sectors."),
      ).toBeInTheDocument();
      // The contrast is the point: B not having it is a real statement.
      expect(screen.getAllByText(NOT_A_CORE_DRIVER_TEXT)).toHaveLength(1);
    });

    it("reads the driver from each pathway's own data", () => {
      renderGrid([
        pathway("a", { policies: "A's policy story." }),
        pathway("b", { policies: "B's policy story." }),
      ]);

      expect(screen.getByText("A's policy story.")).toBeInTheDocument();
      expect(screen.getByText("B's policy story.")).toBeInTheDocument();
      expect(screen.queryByText(NOT_A_CORE_DRIVER_TEXT)).toBeNull();
    });

    it("puts a group's drivers above its features", () => {
      // Matching the detail page: the authored narrative reads first and the
      // enumerated values qualify it.
      renderGrid([pathway("a", { policies: "Policy prose." }), pathway("b")]);

      const labels = rowLabels();
      expect(labels.indexOf("Policy drivers")).toBeLessThan(
        labels.indexOf("Policy ambition"),
      );
    });

    it("places a driver in its own theme's group", () => {
      renderGrid([
        pathway("a", { technologyCosts: "Falling battery costs." }),
        pathway("b"),
      ]);

      const labels = rowLabels();
      // technologyCosts belongs to Technology, so it precedes that group's
      // features and follows the Emissions group's.
      expect(labels.indexOf("Emissions scope")).toBeLessThan(
        labels.indexOf("Technology cost drivers"),
      );
      expect(labels.indexOf("Technology cost drivers")).toBeLessThan(
        labels.indexOf("Technology cost trend"),
      );
    });
  });

  describe("layout", () => {
    it("labels each row once for all columns, not per cell", () => {
      renderGrid([pathway("a"), pathway("b"), pathway("c")]);

      expect(screen.getAllByText("Policy ambition")).toHaveLength(1);
    });

    it("gives every column a cell in every row", () => {
      renderGrid([
        pathway("a", { policies: "A prose." }),
        pathway("b"),
        pathway("c"),
      ]);

      // Two columns lack the driver, so two "not a core driver" notes.
      expect(screen.getAllByText(NOT_A_CORE_DRIVER_TEXT)).toHaveLength(2);
    });

    it("sizes the grid to the number of pathways", () => {
      const { container } = renderGrid([pathway("a"), pathway("b")]);
      const grid = container.firstChild as HTMLElement;

      expect(grid.style.gridTemplateColumns).toBe("repeat(2, 1fr)");
    });

    it("keeps the group heading bars rather than the detail page's cards", () => {
      // The comparison grid deliberately did not adopt the card treatment.
      renderGrid([pathway("a"), pathway("b")]);

      const heading = screen.getByRole("heading", { name: "Policies" });
      expect(heading.parentElement).toHaveClass("bg-bluespruce");
      expect(heading.parentElement).not.toHaveClass("bg-white");
    });

    it("separates rows but does not trail a separator after the last", () => {
      const { container } = renderGrid([pathway("a"), pathway("b")]);

      const separators = container.querySelectorAll(".border-b");
      // 11 features across five groups, minus one per group.
      expect(separators).toHaveLength(11 - 5);
    });
  });

  describe("key feature values", () => {
    it("renders each pathway's own values", () => {
      renderGrid([pathway("a"), pathway("b")]);

      // One cell per column, so the widest-scope value appears twice.
      expect(screen.getAllByText("High ambition policies")).toHaveLength(2);
    });

    it("explains a value on hover, as the detail page does", () => {
      // FeatureItem carries the tooltips, and the comparison grid renders
      // FeatureItem — so this comes for free and should stay that way.
      renderGrid([pathway("a"), pathway("b")]);

      const pill = screen.getAllByText("Carbon price")[0];
      expect(pill.closest("[tabindex]")).not.toBeNull();
    });
  });

  describe("resolution per column (#869)", () => {
    const SEA = { "Southeast Asia": ["TH", "VN"] };

    it("resolves each column against its own geography", () => {
      // The same data in both columns, so only the geography tells them apart.
      const trajectory = {
        emissionsTrajectory: [
          e("Power", "Southeast Asia", "Moderate decrease"),
          e("across sectors", "Global", "Significant increase"),
        ],
      };
      renderScoped(
        [
          scopedPathway("a", SEA, trajectory),
          scopedPathway("b", SEA, trajectory),
        ],
        "Power",
        { a: "Southeast Asia", b: "Global" },
      );

      const [a, b] = cellsOf("Emissions trajectory", 2);
      expect(within(a).getByText("Moderate decrease")).toBeInTheDocument();
      expect(within(b).getByText("Significant increase")).toBeInTheDocument();
    });

    it("walks each column out through its own regions", () => {
      // Both columns ask for Thailand, which neither records. Each falls back to
      // the region that contains it in its own publication's mapping, spelled
      // as that publisher spells it.
      renderScoped(
        [
          scopedPathway("a", SEA, {
            emissionsTrajectory: [
              e("Power", "Southeast Asia", "Minor decrease"),
            ],
          }),
          scopedPathway(
            "b",
            { "South East Asia": ["TH", "VN"] },
            {
              emissionsTrajectory: [
                e("Power", "South East Asia", "Moderate increase"),
              ],
            },
          ),
        ],
        "Power",
        { a: "TH", b: "TH" },
      );

      const [a, b] = cellsOf("Emissions trajectory", 2);
      expect(within(a).getByText("Minor decrease")).toBeInTheDocument();
      expect(within(a).getByText("Power · Southeast Asia")).toBeInTheDocument();
      expect(within(b).getByText("Moderate increase")).toBeInTheDocument();
      expect(
        within(b).getByText("Power · South East Asia"),
      ).toBeInTheDocument();
    });

    it("badges a fallback cell, and only that cell", () => {
      const trajectory = {
        emissionsTrajectory: [
          e("Power", "TH", "Moderate decrease"),
          e("Power", "Southeast Asia", "Minor decrease"),
        ],
      };
      renderScoped(
        [
          scopedPathway("a", SEA, trajectory),
          scopedPathway("b", SEA, trajectory),
        ],
        "Power",
        { a: "TH", b: "VN" },
      );

      const [a, b] = cellsOf("Emissions trajectory", 2);
      expect(queryScopeBadge(a)).not.toBeInTheDocument();
      expect(within(b).getByText("Minor decrease")).toBeInTheDocument();
      expect(within(b).getByText("Power · Southeast Asia")).toBeInTheDocument();
    });

    it("falls Electrification on Power back to across sectors, badged", () => {
      // Electrification is not recorded for Power itself. Asserted against the
      // resolver's own answer rather than tooltip copy, which is changing.
      const pathway = scopedPathway("a", SEA, {
        electrification: [e("across sectors", "Global", "Moderate increase")],
      });
      const other = scopedPathway("b", SEA, {});
      const resolution = resolveKeyFeature(pathway, "electrification", {
        sector: "Power",
        geography: "Global",
      });
      if (resolution.status !== "resolved") {
        throw new Error("expected Electrification to resolve");
      }
      expect(resolution.isFallback).toBe(true);
      expect(resolution.sourceScope.sector).toBe(ACROSS_SECTORS);

      renderScoped([pathway, other], "Power", { a: "Global", b: "Global" });

      const [a] = cellsOf("Electrification", 2);
      expect(within(a).getByText("Moderate increase")).toBeInTheDocument();
      expect(
        within(a).getByText(sourceScopeLabel(resolution.sourceScope)),
      ).toBeInTheDocument();
    });

    it("says Not applicable for Electrification on Power with nothing across sectors", () => {
      // The JETP-CIPP / SDSN Singapore shape: Power only, so nothing broader
      // to inherit. The grid must say the feature does not apply rather than
      // that nothing is recorded (#1045), while a column with an across-sectors
      // value still inherits it.
      const powerOnly = {
        ...scopedPathway("a", SEA, {}),
        sectors: [{ name: "Power" }],
      } as PathwayMetadataType;
      const inherits = scopedPathway("b", SEA, {
        electrification: [e("across sectors", "Global", "Moderate increase")],
      });
      const resolution = resolveKeyFeature(powerOnly, "electrification", {
        sector: "Power",
        geography: "Global",
      });
      expect(resolution).toMatchObject({
        status: "unavailable",
        notApplicableSector: "Power",
      });

      renderScoped([powerOnly, inherits], "Power", {
        a: "Global",
        b: "Global",
      });

      const [a, b] = cellsOf("Electrification", 2);
      expect(within(a).getByText("Not applicable")).toBeInTheDocument();
      expect(within(a).queryByText("No information")).not.toBeInTheDocument();
      expect(within(b).getByText("Moderate increase")).toBeInTheDocument();
    });
  });

  describe("degenerate input", () => {
    it("renders nothing for an empty comparison", () => {
      const { container } = renderGrid([]);
      expect(within(container).queryAllByRole("heading")).toHaveLength(0);
    });

    it("tolerates a pathway with no coreDrivers object", () => {
      const bare = {
        id: "bare",
        name: { full: "Bare", short: "BARE" },
        keyFeatures: KEY_FEATURES,
      } as unknown as PathwayMetadataType;

      expect(() => renderGrid([bare, pathway("b")])).not.toThrow();
      expect(groupHeadings()).toContain("Policies");
    });
  });
});
