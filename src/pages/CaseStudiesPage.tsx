import React, { useRef } from "react";
import { HandCoins, Landmark, Target, type LucideIcon } from "lucide-react";
import OnPageIndex from "../components/OnPageIndex";
import PageHeader from "../components/PageHeader";

export type CaseStudy = {
  /** Slug used for the case study heading's `id`. The on-page index and the
   * landing page tiles link to it, so keep it stable once published even if
   * the title is later reworded. */
  id: string;
  title: string;
  /** One-line summary shown on the landing page tile. */
  teaser: string;
  icon: LucideIcon;
  body: React.ReactNode;
};

/** Placeholder until a case study's text is written. */
const ToBeAdded: React.FC = () => (
  <p className="italic text-rmigray-500">Content to be added.</p>
);

/** The sub-sections every case study shares, in order. */
const caseStudySections = [
  { slug: "situation", title: "Situation" },
  { slug: "complication", title: "Complication" },
  {
    slug: "how-the-tpr-helps",
    title: "How the Transition Pathways Repository helps",
  },
  { slug: "analysis", title: "Analysis" },
  { slug: "final-notes", title: "Final notes" },
];

/**
 * The shared outline of a case study. Each sub-heading gets an id prefixed by
 * the case study's own, so the on-page index nests it under the right entry.
 */
const skeleton = (id: string) => (
  <>
    {caseStudySections.map((section) => (
      <React.Fragment key={section.slug}>
        <h3
          id={`${id}-${section.slug}`}
          className="scroll-mt-8 text-lg font-semibold text-rmigray-800"
        >
          {section.title}
        </h3>
        <ToBeAdded />
      </React.Fragment>
    ))}
  </>
);

export const caseStudies: CaseStudy[] = [
  {
    id: "company-target-setting",
    title: "Company target setting",
    teaser:
      "Check whether a company's emissions targets are ambitious enough for its sector and region.",
    icon: Target,
    body: skeleton("company-target-setting"),
  },
  {
    id: "investment-opportunity-identification",
    title: "Investment and financing opportunities",
    teaser:
      "Find the technologies and sectors that pathways expect to grow, to guide where capital goes.",
    icon: HandCoins,
    body: skeleton("investment-opportunity-identification"),
  },
  {
    id: "policy-risk-assessment",
    title: "Policy risk assessment",
    teaser:
      "Understand how changes in policy could affect a company's transition plan.",
    icon: Landmark,
    body: skeleton("policy-risk-assessment"),
  },
];

const CaseStudiesPage: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-gray-50">
      <PageHeader
        title="Case Studies"
        subtitle="Worked examples of how to use the Transition Pathways Repository (TPR) to answer common transition-assessment questions."
      >
        <p>
          Each case study walks through a question a financial institution might
          ask, how to find pathways that fit it, and how to compare a company
          against those pathways.
        </p>
        <p>
          The companies in these case studies are hypothetical examples. The
          pathways and their data are real and taken from the repository.
        </p>
      </PageHeader>

      <div className="container mx-auto px-4 pt-6 pb-12">
        <div className="grid gap-8 xl:grid-cols-[16rem_1fr]">
          <OnPageIndex containerRef={contentRef} />

          <div
            ref={contentRef}
            className="min-w-0 max-w-5xl"
          >
            {caseStudies.map((study) => (
              <article
                key={study.id}
                className="border-b border-neutral-300 py-10 last:border-b-0"
              >
                <h2
                  id={study.id}
                  className="scroll-mt-8 text-2xl font-semibold text-rmigray-800"
                >
                  {study.title}
                </h2>

                <div className="mt-6 max-w-3xl space-y-4 text-rmigray-700 leading-7">
                  {study.body}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseStudiesPage;
