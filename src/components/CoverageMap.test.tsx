import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { geoContains } from "d3-geo";
import type { Topology } from "topojson-specification";
import worldAtlas from "world-atlas/countries-110m.json";
import CoverageMap, {
  coverageTiers,
  PLANNED_COVERAGE,
  toCountryShapes,
} from "./CoverageMap";
import { pathwayMetadata } from "../data/pathwayMetadata";
import type { PathwayMetadataType } from "../types";

function pathway(
  geography: PathwayMetadataType["geography"],
): PathwayMetadataType {
  return { geography } as PathwayMetadataType;
}

describe("coverageTiers", () => {
  it("marks every country a non-global pathway covers as dedicated", () => {
    const tiers = coverageTiers([
      pathway({ regions: { ASEAN: ["TH", "VN"] }, country: ["PH"] }),
    ]);

    expect(tiers.get("TH")).toBe("dedicated");
    expect(tiers.get("VN")).toBe("dedicated");
    expect(tiers.get("PH")).toBe("dedicated");
  });

  it("ignores global pathways, even for the regions they publish", () => {
    const tiers = coverageTiers([
      pathway({ global: true, regions: { Africa: ["KE", "NG"] } }),
    ]);

    expect(tiers.get("KE")).toBeUndefined();
    expect(tiers.get("NG")).toBeUndefined();
  });

  it("marks planned countries until a dedicated pathway covers them", () => {
    expect(PLANNED_COVERAGE).toEqual(
      expect.arrayContaining(["DE", "GB", "CA", "IN", "CN"]),
    );

    const tiers = coverageTiers([pathway({ country: ["GB"] })]);

    expect(tiers.get("DE")).toBe("planned");
    expect(tiers.get("GB")).toBe("dedicated");
  });

  it("covers Southeast Asia, and only the planned countries beyond it, in the shipped data", () => {
    const tiers = coverageTiers(pathwayMetadata);

    expect(tiers.get("ID")).toBe("dedicated");
    expect(tiers.get("SG")).toBe("dedicated");
    expect(tiers.get("CN")).toBe("planned");
    expect(tiers.get("US")).toBeUndefined();
  });
});

describe("toCountryShapes", () => {
  const shapes = toCountryShapes(worldAtlas as unknown as Topology);
  const shape = (code: string) => {
    const found = shapes.find((s) => s.code === code);
    if (!found) throw new Error(`No shape for ${code}`);
    return found.geometry;
  };

  it("keeps all of mainland France, including west of Greenwich, in France", () => {
    expect(geoContains(shape("FR"), [2.35, 48.86])).toBe(true); // Paris
    expect(geoContains(shape("FR"), [-3.0, 48.2])).toBe(true); // Brittany
    expect(geoContains(shape("FR"), [9.1, 42.1])).toBe(true); // Corsica
    expect(geoContains(shape("GF"), [-3.0, 48.2])).toBe(false);
  });

  it("moves only French Guiana out of France", () => {
    expect(geoContains(shape("GF"), [-53.0, 4.0])).toBe(true);
    expect(geoContains(shape("FR"), [-53.0, 4.0])).toBe(false);
  });
});

describe("CoverageMap", () => {
  it("draws the map once the shapes load, with a dot for Singapore", async () => {
    const { container } = render(
      <CoverageMap pathways={[pathway({ country: ["SG", "TH"] })]} />,
    );

    expect(
      await screen.findByRole("img", { name: /world map/i }),
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll('path[data-tier="dedicated"]'),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll('circle[data-tier="dedicated"]'),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll('path[data-tier="planned"]').length,
    ).toBeGreaterThan(0);
    // Malta is planned (EU) and, like Singapore, too small for a shape.
    expect(
      container.querySelectorAll('circle[data-tier="planned"]'),
    ).toHaveLength(1);
  });

  it("shades France without French Guiana", async () => {
    const { container } = render(
      <CoverageMap pathways={[pathway({ country: ["FR"] })]} />,
    );
    await screen.findByRole("img", { name: /world map/i });

    expect(container.querySelector('path[data-country="FR"]')).toHaveAttribute(
      "data-tier",
      "dedicated",
    );
    expect(container.querySelector('path[data-country="GF"]')).toHaveAttribute(
      "data-tier",
      "global",
    );
  });

  it("names every tier in the legend", () => {
    render(<CoverageMap pathways={[]} />);

    expect(
      screen.getByText("Region- or country-specific pathways"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Region- or country-specific pathways coming next"),
    ).toBeInTheDocument();
    expect(screen.getByText("Covered by global pathways")).toBeInTheDocument();
  });
});
