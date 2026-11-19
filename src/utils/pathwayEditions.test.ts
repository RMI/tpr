import { describe, it, expect } from "vitest";
import {
  editionSeries,
  editionYear,
  groupEditions,
  newestEdition,
  editionLabelSuffix,
} from "./pathwayEditions";
import type { PathwayMetadataType } from "../types";

/** A pathway stripped to what these helpers read: the id and the year. */
const pathway = (id: string, year: number): PathwayMetadataType =>
  ({
    id,
    name: { full: `Pathway ${id}`, short: id },
    publication: { year, publisher: { short: "PUB", full: "Publisher" } },
  }) as unknown as PathwayMetadataType;

const ids = (list: readonly PathwayMetadataType[]) => list.map((p) => p.id);

describe("editionSeries", () => {
  it("returns the text before a trailing four-digit year", () => {
    expect(editionSeries("IEA-NZE-2024")).toBe("IEA-NZE");
    expect(editionSeries("UNSDSN-CW-MAP1-PH-2024")).toBe("UNSDSN-CW-MAP1-PH");
  });

  it("returns null when the id carries no trailing year", () => {
    expect(editionSeries("IEA-NZE")).toBeNull();
    expect(editionSeries("SOME-ID-20")).toBeNull();
    expect(editionSeries("")).toBeNull();
  });

  it("keeps similar series apart", () => {
    expect(editionSeries("IEA-NZE-2024")).not.toBe(
      editionSeries("IEA-NZE-ALT-2024"),
    );
  });
});

describe("editionYear", () => {
  it("reads the metadata, not the id suffix", () => {
    // The three UNSDSN Malaysia records end in -2024 but publish in 2023. The
    // displayed year has to follow the metadata, or the card contradicts
    // itself. Logged for the data team; not fixed here.
    expect(editionYear(pathway("UNSDSN-CW-EP-MY-2024", 2023))).toBe(2023);
  });
});

describe("groupEditions", () => {
  it("collapses a series and sorts it oldest first", () => {
    const groups = groupEditions([
      pathway("IEA-NZE-2025", 2025),
      pathway("IEA-NZE-2024", 2024),
    ]);
    expect(groups).toHaveLength(1);
    expect(ids(groups[0].editions)).toEqual(["IEA-NZE-2024", "IEA-NZE-2025"]);
    expect(groups[0].series).toBe("IEA-NZE");
  });

  it("leaves a single-edition pathway as its own group", () => {
    const groups = groupEditions([pathway("ACE-ATS-2024", 2024)]);
    expect(groups).toHaveLength(1);
    expect(groups[0].editions).toHaveLength(1);
  });

  it("never pools unrelated ids that carry no year", () => {
    // Two convention-breaking ids are unrelated pathways, not editions of
    // each other. Pooling them would merge two real pathways into one card.
    const groups = groupEditions([
      pathway("NO-YEAR-A", 2024),
      pathway("NO-YEAR-B", 2025),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.series === null)).toBe(true);
  });

  it("keeps groups in the order their first member appeared", () => {
    // The grid is already sorted when it reaches us. Reordering here would
    // reshuffle the page whenever a series collapsed.
    const groups = groupEditions([
      pathway("BBB-2024", 2024),
      pathway("AAA-2025", 2025),
      pathway("BBB-2025", 2025),
    ]);
    expect(groups.map((g) => g.series)).toEqual(["BBB", "AAA"]);
  });

  it("breaks a tie on equal publication years with the id suffix", () => {
    const groups = groupEditions([
      pathway("SER-2025", 2024),
      pathway("SER-2024", 2024),
    ]);
    expect(ids(groups[0].editions)).toEqual(["SER-2024", "SER-2025"]);
  });

  it("returns an empty list for no pathways", () => {
    expect(groupEditions([])).toEqual([]);
  });
});

describe("newestEdition", () => {
  it("is the last entry, which is the highest publication year", () => {
    const [group] = groupEditions([
      pathway("IEA-STEPS-2024", 2024),
      pathway("IEA-STEPS-2025", 2025),
    ]);
    expect(newestEdition(group).id).toBe("IEA-STEPS-2025");
  });
});

describe("editionLabelSuffix", () => {
  const nze2024 = pathway("IEA-NZE-2024", 2024);
  const nze2025 = pathway("IEA-NZE-2025", 2025);
  const steps = pathway("IEA-STEPS-2025", 2025);

  it("appends the year when a sibling edition is shown beside it", () => {
    expect(editionLabelSuffix(nze2024, [nze2024, nze2025])).toBe(" (2024)");
    expect(editionLabelSuffix(nze2025, [nze2024, nze2025])).toBe(" (2025)");
  });

  it("adds nothing when no sibling is present", () => {
    expect(editionLabelSuffix(nze2024, [nze2024, steps])).toBe("");
    expect(editionLabelSuffix(nze2024, [nze2024])).toBe("");
  });

  it("adds nothing for an id with no series", () => {
    const loose = pathway("NO-YEAR", 2024);
    expect(editionLabelSuffix(loose, [loose, nze2024])).toBe("");
  });

  it("uses the metadata year, not the id suffix", () => {
    const a = pathway("UNSDSN-CW-EP-MY-2024", 2023);
    const b = pathway("UNSDSN-CW-EP-MY-2025", 2025);
    expect(editionLabelSuffix(a, [a, b])).toBe(" (2023)");
  });
});
