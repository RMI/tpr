import type * as Taxonomy from "../utils/timeseriesTaxonomy";

/**
 * The timeseries taxonomy with extra sectors treated as covered in detail.
 *
 * Only Power is covered in detail today (#1081), which leaves no second sector
 * to test multi-sector behaviour with: sector filtering, the Sector column, a
 * sector selectable through its dependencies alone. Tests that need one mock
 * the taxonomy with this, standing in for Steel's release:
 *
 *   vi.mock("../utils/timeseriesTaxonomy", async (importOriginal) => {
 *     const { withSectorsInDetail } = await import("../test/sectorsInDetail");
 *     return withSectorsInDetail(await importOriginal(), ["Steel"]);
 *   });
 *
 * Every other sector keeps the real rule, so Aviation stays hidden and can
 * test the hiding in the same file.
 */
export function withSectorsInDetail(
  actual: typeof Taxonomy,
  sectors: readonly string[],
): typeof Taxonomy {
  return {
    ...actual,
    isDetailedSector: (sector: string) =>
      sectors.includes(sector) || actual.isDetailedSector(sector),
  };
}
