import { describe, it, expect } from "vitest";
import { render, screen, within, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import ResourcesMethodologyPage from "./ResourcesMethodologyPage";
import pathwayMetadataSchema from "../../schema/pathwayMetadata.v2.json" with { type: "json" };
import dataAvailabilitySchema from "../../schema/common/dataAvailability.v1.json" with { type: "json" };
import sectorSchema from "../../schema/common/sector.v1.json" with { type: "json" };
import metricSchema from "../../schema/common/metric.v1.json" with { type: "json" };
import { REGION_MAPPING_DISCLAIMER } from "../../utils/geographyUtils";
import { GROUPS } from "../../components/KeyFeatures";
import {
  CORE_DRIVER_LABELS,
  NOT_A_CORE_DRIVER_TEXT,
} from "../../components/CoreDrivers";
import { MockIntersectionObserver } from "../../test/mockIntersectionObserver";

const renderPage = () =>
  render(
    <MemoryRouter>
      <ResourcesMethodologyPage />
    </MemoryRouter>,
  );

/** Page text with whitespace collapsed, so JSX line wrapping doesn't matter. */
const flatText = (container: HTMLElement): string =>
  (container.textContent ?? "").replace(/\s+/g, " ");

const countOf = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1;

describe("ResourcesMethodologyPage — Regions note", () => {
  it("states that regional representations follow the data sources, not RMI (#917)", () => {
    const { container } = renderPage();
    expect(flatText(container)).toContain(`Note: ${REGION_MAPPING_DISCLAIMER}`);
  });

  it("drops the earlier territorial-claims sentence and shows the note once", () => {
    const { container } = renderPage();
    const text = flatText(container);

    expect(text).not.toContain("conflicting territorial claims");
    expect(countOf(text, REGION_MAPPING_DISCLAIMER)).toBe(1);
  });

  it("renders the note as a single italic block", () => {
    const { container } = renderPage();

    const italics = Array.from(container.querySelectorAll("i")).filter((el) =>
      flatText(el).includes(REGION_MAPPING_DISCLAIMER),
    );
    expect(italics).toHaveLength(1);
  });

  it("shows the note without any interaction, now that subsections no longer collapse (#955)", () => {
    const { container } = renderPage();
    expect(flatText(container)).toContain(REGION_MAPPING_DISCLAIMER);
    // The whole page is readable without clicking: no disclosure buttons left.
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("ResourcesMethodologyPage — on-page index (#802)", () => {
  it("lists the page's top-level sections, in order, excluding the hero subtitle", () => {
    render(
      <MemoryRouter>
        <ResourcesMethodologyPage />
      </MemoryRouter>,
    );

    const nav = screen.getByRole("navigation", { name: "On this page" });
    // First link is the "Back to top" entry, not one of the page's sections.
    const links = within(nav).getAllByRole("link").slice(1);

    expect(links.map((link) => link.textContent)).toEqual([
      "Key definitions",
      "Values by sector and geography",
      "Pathway overview",
      "Assumptions & trends",
      "Dependencies",
      "Data availability",
      "Coverage",
      "What to do next",
    ]);
  });

  it("reveals a section's subsections in the index only while that section is the one in view (#955)", () => {
    renderPage();

    const nav = screen.getByRole("navigation", { name: "On this page" });
    const entries = () =>
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent);

    // "Key definitions" is active on load and has no subsections, so no
    // sub-entries are listed anywhere yet.
    expect(entries()).not.toContain("Pathway type");
    expect(entries()).not.toContain("Regions");

    const observer = MockIntersectionObserver.instances[0];
    act(() => {
      observer.trigger(document.getElementById("pathway-overview")!, true);
    });

    // Its own subsections expand...
    expect(entries()).toContain("Pathway type");
    expect(entries()).toContain("Net zero by");
    // ...and no other section's do.
    expect(entries()).not.toContain("Regions");

    act(() => {
      observer.trigger(document.getElementById("coverage")!, true);
      observer.trigger(document.getElementById("pathway-overview")!, false);
    });

    expect(entries()).toContain("Regions");
    expect(entries()).not.toContain("Pathway type");
  });

  it("marks the parent section expanded when a subsection itself is in view", () => {
    renderPage();

    const nav = screen.getByRole("navigation", { name: "On this page" });
    const observer = MockIntersectionObserver.instances[0];

    act(() => {
      observer.trigger(document.getElementById("regions")!, true);
    });

    const active = within(nav)
      .getAllByRole("link")
      .find((link) => link.getAttribute("aria-current"));
    expect(active?.textContent).toBe("Regions");
    // Its parent's other subsections are listed alongside it.
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toContain("Sectors");
  });
});

/** The list items inside the element with `id`'s enclosing block. */
const listedUnder = (id: string): string[] => {
  const block = document.getElementById(id)!.parentElement!;
  return within(block)
    .getAllByRole("listitem")
    .map((item) => flatText(item).trim());
};

const termsUnder = (id: string): string[] => {
  const block = document.getElementById(id)!.parentElement!;
  return Array.from(block.querySelectorAll("dt")).map((term) =>
    flatText(term).trim(),
  );
};

describe("ResourcesMethodologyPage — v2 classifications (#1055)", () => {
  it("no longer describes the v1 expert overview", () => {
    const { container } = renderPage();
    expect(flatText(container)).not.toMatch(/expert overview/i);
  });

  it("describes every key feature under its v1 anchor, with the values the pathway page shows", () => {
    renderPage();

    for (const feature of GROUPS.flatMap((group) => group.features)) {
      const anchor = feature.key.replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`,
      );
      const heading = document.getElementById(anchor);
      expect(heading?.tagName, anchor).toBe("H4");
      expect(heading?.textContent).toBe(feature.label);

      const values =
        feature.type === "single-select" || feature.type === "multi-select"
          ? feature.options
          : feature.scaleValues;
      expect(listedUnder(anchor), anchor).toEqual(values);
    }
  });

  it("lists every key feature group in the index, in the pathway page's order", () => {
    renderPage();

    const observer = MockIntersectionObserver.instances[0];
    act(() => {
      observer.trigger(
        document.getElementById("assumptions-and-trends")!,
        true,
      );
    });

    const nav = screen.getByRole("navigation", { name: "On this page" });
    const entries = within(nav)
      .getAllByRole("link")
      .map((link) => link.textContent);
    const start = entries.indexOf("Assumptions & trends");
    expect(entries.slice(start + 1, start + 1 + GROUPS.length)).toEqual(
      GROUPS.map((group) => group.label),
    );
  });

  it("explains editions under Pathway overview, not among the key definitions", () => {
    renderPage();

    const edition = document.getElementById("edition");
    expect(edition?.tagName).toBe("H3");
    expect(
      flatText(document.getElementById("key-definitions")!.closest("section")!),
    ).not.toContain("Edition");
  });

  it("marks every core driver as a text field, with what it shows when it does not apply", () => {
    renderPage();

    const labels = screen.getAllByText("Core driver:");
    expect(labels).toHaveLength(CORE_DRIVER_LABELS.length);
    for (const label of labels) {
      const item = label.closest<HTMLElement>("h4 + div")!;
      expect(flatText(item)).toContain("This text field describes");
      expect(flatText(item)).toContain(
        "Free text description for each individual pathway.",
      );
      expect(flatText(item)).toContain(NOT_A_CORE_DRIVER_TEXT);
    }
  });

  it("lists the dependency categories and evidence types from the schema", () => {
    renderPage();

    const dependency =
      pathwayMetadataSchema.properties.dependencies.items.properties;
    expect(termsUnder("dependency-categories")).toEqual(
      dependency.dependency_name.enum,
    );
    expect(termsUnder("evidence-types")).toEqual(dependency.evidence_type.enum);
  });

  it("lists the data availability vocabularies, sectors and benchmark metrics from the schema", () => {
    renderPage();

    expect(listedUnder("time-resolution")).toEqual(
      dataAvailabilitySchema.$defs.timeResolution.enum,
    );
    expect(listedUnder("data-format")).toEqual(
      dataAvailabilitySchema.$defs.dataFormat.enum,
    );
    expect(listedUnder("sectors")).toEqual(sectorSchema.$defs.displayName.enum);
    expect(listedUnder("metrics")).toEqual(metricSchema.$defs.displayName.enum);
  });
});
