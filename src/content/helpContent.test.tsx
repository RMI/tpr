import React from "react";
import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import {
  COMING_SOON_ANSWER,
  GENERAL_HELP_LINKS,
  getHelpGroups,
  type HelpGroup,
} from "./helpContent";
import { DETAIL_TABS } from "../pages/PathwayDetailPage";
import ResourcesMethodologyPage from "../pages/resources/ResourcesMethodologyPage";
import ResourcesHowToChooseAPathwayPage from "../pages/resources/ResourcesHowToChooseAPathwayPage";
import ResourcesFaqPage from "../pages/resources/ResourcesFaqPage";
import CaseStudiesPage from "../pages/CaseStudiesPage";

const labels = (groups: HelpGroup[] | null) => groups?.map((g) => g.label);

const ALL_CONTEXTS: HelpGroup[][] = [
  getHelpGroups("/pathway", null)!,
  getHelpGroups("/compare", null)!,
  ...DETAIL_TABS.map((t) => getHelpGroups("/pathway/some-id", t.id)!),
];

describe("getHelpGroups", () => {
  it("returns null on pages without on-page help", () => {
    for (const path of [
      "/",
      "/contact",
      "/legal",
      "/resources/methodology",
      "/pathway/a/b",
    ]) {
      expect(getHelpGroups(path, null)).toBeNull();
    }
  });

  it("returns the Card and Comparison view groups", () => {
    expect(labels(getHelpGroups("/pathway", null))).toEqual([
      "Getting started",
      "Pathway cards",
      "Choosing pathways",
    ]);
    expect(labels(getHelpGroups("/pathway/", null))).toEqual(
      labels(getHelpGroups("/pathway", null)),
    );
    expect(labels(getHelpGroups("/compare", null))).toEqual([
      "Pathway comparison",
      "Time series",
      "Assumptions & dependencies",
      "Coverage",
    ]);
  });

  it("puts the page group first and the active Detail tab last", () => {
    expect(labels(getHelpGroups("/pathway/x", "scope"))).toEqual([
      "Pathway detail",
      "Scope & Granularity",
    ]);
    expect(labels(getHelpGroups("/pathway/x", "assumptions"))).toEqual([
      "Pathway detail",
      "Assumptions & Dependencies",
    ]);
  });

  it("opens the Comparison view with what the page shows", () => {
    expect(getHelpGroups("/compare", null)![0].topics[0].question).toBe(
      "What does the Comparison Page show me?",
    );
  });

  it("opens the Detail view with what the page shows, on every tab", () => {
    for (const tab of [null, ...DETAIL_TABS.map((t) => t.id)]) {
      const first = getHelpGroups("/pathway/x", tab)![0].topics[0];
      expect(first.question).toBe("What does the Detail Page show me?");
    }
  });

  it("falls back to the first Detail tab for a missing or unknown tab", () => {
    const atAGlance = labels(getHelpGroups("/pathway/x", "at-a-glance"));
    expect(labels(getHelpGroups("/pathway/x", null))).toEqual(atAGlance);
    expect(labels(getHelpGroups("/pathway/x", "nope"))).toEqual(atAGlance);
    // Not a prototype property lookup.
    expect(labels(getHelpGroups("/pathway/x", "constructor"))).toEqual(
      atAGlance,
    );
  });

  it("only mentions Data Availability where the page has it", () => {
    const scopeAnswer = (groups: HelpGroup[] | null) =>
      groups!.flatMap((g) => g.topics).find((t) => t.id === "values-by-scope")!
        .answer;
    expect(scopeAnswer(getHelpGroups("/pathway/x", null))).toMatch(
      /Data Availability/,
    );
    expect(scopeAnswer(getHelpGroups("/compare", null))).not.toMatch(
      /Data Availability/,
    );
  });

  it("has a group for every Detail tab", () => {
    for (const tab of DETAIL_TABS) {
      expect(getHelpGroups("/pathway/x", tab.id)!.at(-1)!.label).toBe(
        tab.label,
      );
    }
  });

  it("uses unique topic ids within each view", () => {
    for (const groups of ALL_CONTEXTS) {
      const topics = groups.flatMap((g) => g.topics);
      const distinct = new Map(topics.map((t) => [t.id, t]));
      // A topic may appear in two groups, but only as the same object.
      for (const t of topics) expect(distinct.get(t.id)).toBe(t);
    }
  });

  it("never adds Read more to coming-soon answers", () => {
    for (const groups of ALL_CONTEXTS) {
      for (const topic of groups.flatMap((g) => g.topics)) {
        if (topic.answer === COMING_SOON_ANSWER) {
          expect(topic.readMore).toBeUndefined();
        }
      }
    }
  });
});

describe("help links", () => {
  const PAGES: Record<string, React.FC> = {
    "/resources/methodology": ResourcesMethodologyPage,
    "/resources/how-to-choose-a-pathway": ResourcesHowToChooseAPathwayPage,
    "/resources/faq": ResourcesFaqPage,
    "/case-studies": CaseStudiesPage,
  };

  const targets = new Set([
    ...GENERAL_HELP_LINKS.map((l) => l.to),
    ...ALL_CONTEXTS.flatMap((groups) =>
      groups.flatMap((g) => g.topics.flatMap((t) => t.readMore?.to ?? [])),
    ),
  ]);

  it.each([...targets])("%s points to an existing page and section", (to) => {
    const [path, hash] = to.split("#");
    const Page = PAGES[path];
    expect(Page, `no page registered for ${path}`).toBeDefined();

    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    if (hash) expect(document.getElementById(hash)).not.toBeNull();
    cleanup();
  });
});
