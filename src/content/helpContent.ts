import { DETAIL_TABS } from "../pages/PathwayDetailPage";

/**
 * Copy for the on-page help panel (#906): the questions a reader is likely to
 * have on each of the three main views, a short answer, and a link to the
 * docs section that covers it in full.
 *
 * Which questions show depends on the view and, on the Detail view, the active
 * tab. Answers summarize the Resources pages, so when those pages change, the
 * matching answer here may need to change too.
 */

export type HelpLink = { label: string; to: string };

export type HelpTopic = {
  /** Stable id, unique within the view. */
  id: string;
  question: string;
  answer: string;
  /**
   * The docs section that covers this topic in full. Omitted for coming-soon
   * answers, and for answers about a page control that the docs don't cover.
   */
  readMore?: HelpLink;
};

export type HelpGroup = { label: string; topics: HelpTopic[] };

/** Shown at the bottom of the panel on every view. */
export const GENERAL_HELP_LINKS: HelpLink[] = [
  { label: "Methodology", to: "/resources/methodology" },
  {
    label: "How to choose a pathway",
    to: "/resources/how-to-choose-a-pathway",
  },
  { label: "FAQ", to: "/resources/faq" },
];

export const COMING_SOON_ANSWER =
  "We're still writing this part of the documentation. It's coming soon.";

const methodology = (anchor: string, label: string): HelpLink => ({
  label,
  to: `/resources/methodology#${anchor}`,
});

// Topics that appear on more than one view.

const pathwayOverview: HelpTopic = {
  id: "pathway-overview",
  question: "What do pathway type, warming and net zero mean?",
  answer:
    "These describe the overall idea behind a pathway. Type says whether it projects likely futures from current trends (Predictive), explores plausible futures under explicit assumptions (Exploratory), or starts from a desired end state and works backward (Normative). Warming is the temperature rise it reaches by 2100, and net zero is the year it reaches net-zero emissions. They describe the pathway as a whole, so they don't change by sector or geography.",
  readMore: methodology("pathway-overview", "Pathway overview"),
};

const coverage: HelpTopic = {
  id: "coverage",
  question: "What does coverage mean?",
  answer:
    "Coverage lists the regions, sectors and metrics a pathway includes. To compare a company with a pathway fairly, the pathway needs to cover the company's sector and geography. Filled badges mean the TPR has data and charts for that value. Outlined badges mean the source publication covers it, but the TPR doesn't hold the data.",
  readMore: methodology("coverage", "Coverage"),
};

// The Detail and Comparison views show different sections, so each gets its
// own answer to the same question.
const VALUES_BY_SCOPE_QUESTION =
  "What does choosing a sector and geography change?";

const detailValuesByScope: HelpTopic = {
  id: "values-by-scope",
  question: VALUES_BY_SCOPE_QUESTION,
  answer:
    "Some values differ by sector and geography, so the selectors at the top choose which ones you see. They change Assumptions & Trends, Dependencies (by sector only), the benchmark plots and Data Availability. Pathway overview and Coverage describe the whole pathway and stay the same.",
  readMore: methodology("values-by-scope", "Values by sector and geography"),
};

const comparisonValuesByScope: HelpTopic = {
  id: "values-by-scope",
  question: VALUES_BY_SCOPE_QUESTION,
  answer:
    "Some values differ by sector and geography. The sector at the top applies to every pathway, and each pathway has its own geography selector. Together they change the plots, the assumptions & trends rows and Dependencies (by sector only). Pathway overview and Coverage describe each pathway as a whole and stay the same.",
  readMore: methodology("values-by-scope", "Values by sector and geography"),
};

const assumptionsAndTrends: HelpTopic = {
  id: "assumptions-and-trends",
  question: "What are assumptions & trends?",
  answer:
    "Assumptions are the inputs that drive a pathway's changes over time, such as policies or technology costs. Trends are the results, such as emissions or the energy mix. Knowing these helps you judge whether a pathway's story fits your analysis.",
  readMore: methodology("assumptions-and-trends", "Assumptions & trends"),
};

const dependencies: HelpTopic = {
  id: "dependencies",
  question: "What are dependencies?",
  answer:
    "Dependencies are conditions a pathway's outcomes rely on, such as infrastructure or supply chains. They can hold a sector's transition back or help it along, so they show where a plan depends on things outside a company's control. They're filtered by the selected sector.",
  readMore: methodology("dependencies", "Dependencies"),
};

// Groups for each view.

const CARD_VIEW: HelpGroup[] = [
  {
    label: "Getting started",
    topics: [
      {
        id: "case-studies",
        question: "Where can I see examples of pathways in use?",
        answer:
          "The Case Studies page walks through three worked examples: assessing a company's targets, finding investment and financing opportunities, and assessing policy risk. Each one shows how to find pathways that fit the question and how to compare a company against them.",
        readMore: { label: "Case studies", to: "/case-studies" },
      },
      pathwayOverview,
    ],
  },
  {
    label: "Pathway cards",
    topics: [
      {
        id: "what-a-card-shows",
        question: "What does a pathway card show?",
        answer:
          "Each card summarizes one pathway: its name, publisher and pathway overview, plus the geographies and sectors it covers. Open a card for the full details, or add it to Compare Pathways to see it side by side with others.",
        readMore: methodology("pathway-overview", "Pathway overview"),
      },
    ],
  },
  {
    label: "Choosing pathways",
    topics: [
      {
        id: "select-a-pathway",
        question: "How do I choose the right pathway?",
        answer:
          "Start from your question: what you want to assess decides which pathways fit. Use the filters to narrow the list by geography, sector, pathway type, warming and more, then open a pathway to check it in detail.",
        readMore: {
          label: "How to choose a pathway",
          to: "/resources/how-to-choose-a-pathway",
        },
      },
      {
        id: "start-a-comparison",
        question: "How do I compare pathways?",
        answer:
          "Click Compare Pathways below the filters to open the comparison tray. Add two or three pathways with the + button on their cards, then click Compare to see their benchmarks, assumptions and coverage side by side.",
        readMore: {
          label: "How to compare pathways",
          to: "/resources/how-to-choose-a-pathway#how-to-compare-pathways",
        },
      },
    ],
  },
];

/** Shown first on every Detail view tab. */
const DETAIL_PAGE: HelpGroup = {
  label: "Pathway detail",
  topics: [
    {
      id: "what-detail-shows",
      question: "What does the Detail Page show me?",
      answer:
        "This page shows detailed information on one pathway, organized in tabs: its narrative (At a glance), its assumptions and dependencies (Assumptions & Dependencies), its outputs (Timeseries) and its coverage (Scope & Granularity). Some of what you see depends on the sector and geography selected at the top. They start from the filters you set on the pathway list, so changing them may change the content.",
      readMore: { label: "Methodology", to: "/resources/methodology" },
    },
    pathwayOverview,
    detailValuesByScope,
  ],
};

/** Keyed by Detail view tab id; the active tab's group shows last. */
const DETAIL_VIEW_BY_TAB: Record<string, HelpGroup> = {
  "at-a-glance": {
    label: "At a glance",
    topics: [
      {
        id: "pathway-description",
        question: "What is this pathway about?",
        answer:
          "The description at the top sums up what the pathway models and why. The pathway overview in the header (type, net zero and warming) tells you the kind of pathway it is at a glance.",
        readMore: methodology("pathway-overview", "Pathway overview"),
      },
      {
        id: "timeseries-preview",
        question: "How do I read the time series preview?",
        answer: COMING_SOON_ANSWER,
      },
      assumptionsAndTrends,
    ],
  },
  "assumptions": {
    label: "Assumptions & Dependencies",
    topics: [assumptionsAndTrends, dependencies],
  },
  "timeseries": {
    label: "Timeseries",
    topics: [
      {
        id: "benchmark-plots",
        question: "How do I read the benchmark plots?",
        answer: COMING_SOON_ANSWER,
      },
    ],
  },
  "scope": {
    label: "Scope & Granularity",
    topics: [
      {
        id: "data-availability",
        question: "What does data availability mean?",
        answer:
          "The Data Availability table shows, for each metric, where and how you can get the pathway's data. Use it to judge what kind of analysis the pathway can support. It's filtered by the selected sector and geography.",
        readMore: methodology("data-availability", "Data availability"),
      },
      coverage,
    ],
  },
};

const COMPARISON_VIEW: HelpGroup[] = [
  {
    label: "Pathway comparison",
    topics: [
      {
        id: "what-comparison-shows",
        question: "What does the Comparison Page show me?",
        answer:
          "This page shows two or three pathways side by side: an overview of each, then their benchmark plots, assumptions & trends, dependencies, and the geographies, sectors and benchmark metrics they cover. The sector at the top applies to every pathway, and each pathway has its own geography selector. You can share the page's link and it opens the same comparison.",
        readMore: {
          label: "How to compare pathways",
          to: "/resources/how-to-choose-a-pathway#how-to-compare-pathways",
        },
      },
      pathwayOverview,
      comparisonValuesByScope,
    ],
  },
  {
    label: "Time series",
    topics: [
      {
        id: "comparison-plots",
        question: "How do I read the comparison plots?",
        answer: COMING_SOON_ANSWER,
      },
      {
        id: "plot-controls",
        question: "What do Plot type and Freeze plots do?",
        answer:
          "Plot type picks the metric every pathway's plot shows, such as emissions intensity, capacity or technology mix, so you always compare like with like. Freeze plots pins the plots below the header while you scroll, so you can keep them in view next to the sections further down.",
      },
    ],
  },
  {
    label: "Assumptions & dependencies",
    topics: [assumptionsAndTrends, dependencies],
  },
  // Named after the page's Geographies, Sectors and Benchmark Metrics
  // sections, which together show a pathway's coverage.
  { label: "Geographies, sectors & metrics", topics: [coverage] },
];

/**
 * The help groups for a page, in display order, or `null` on pages without
 * on-page help. On the Detail view, the general page group comes first and
 * the active tab's group last.
 *
 * @param pathname The current route, e.g. `/pathway/abc`.
 * @param tab The Detail view's `?tab=` value. Missing or unknown values mean
 *   the first tab, matching `useActiveTab`.
 */
export function getHelpGroups(
  pathname: string,
  tab: string | null,
): HelpGroup[] | null {
  const path = pathname.replace(/\/+$/, "");

  if (path === "/pathway") return CARD_VIEW;
  if (path === "/compare") return COMPARISON_VIEW;

  if (/^\/pathway\/[^/]+$/.test(path)) {
    // `Object.hasOwn`, not `tab in …`: `?tab=constructor` must not match a
    // property inherited from Object.prototype.
    const tabId =
      tab !== null && Object.hasOwn(DETAIL_VIEW_BY_TAB, tab)
        ? tab
        : DETAIL_TABS[0].id;
    return [DETAIL_PAGE, DETAIL_VIEW_BY_TAB[tabId]];
  }

  return null;
}
