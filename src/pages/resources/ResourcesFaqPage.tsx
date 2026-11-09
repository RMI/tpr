import React, { useMemo, useRef } from "react";
import { Link } from "react-router";
import OnPageIndex from "../../components/OnPageIndex";
import PageHeader from "../../components/PageHeader";

type FaqItem = {
  /** Slug used for the heading's `id`, so the on-page index can list the
   * question and deep links to it stay stable if the wording is edited. */
  id: string;
  question: string;
  answer: React.ReactNode;
};

/** Each question is a top-level section of the page: always expanded, and
 * listed in the on-page index. */
const FaqItemBlock: React.FC<FaqItem> = ({ id, question, answer }) => (
  <section className="border-b border-neutral-300 py-8 last:border-b-0">
    <h2
      id={id}
      className="scroll-mt-8 text-2xl font-semibold text-rmigray-800"
    >
      {question}
    </h2>
    <div className="mt-4 max-w-3xl space-y-3 leading-7 text-rmigray-700 [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:pl-5">
      {answer}
    </div>
  </section>
);

const ResourcesFaqPage: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  const faqItems = useMemo<FaqItem[]>(
    () => [
      {
        id: "what-is-the-tpr-for",
        question: "What is the Transition Pathways Repository (TPR) for?",
        answer: (
          <>
            <p>
              The TPR helps users identify which transition pathways are
              available and most relevant for a given use case. Different
              pathways can have a number of different{" "}
              <Link
                to="/resources/use-cases"
                className="text-energy-700 underline underline-offset-2 font-semibold hover:text-energy-800"
              >
                use cases
              </Link>{" "}
              .
            </p>
            <p>Users may need pathways to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Assess the level of ambition of emissions or other
                sustainability targets
              </li>
              <li>Test the feasibility of targets and transition plans</li>
              <li>Understand policy exposure</li>
              <li>
                Identify critical decarbonization levers in a particular sector
                and region
              </li>
            </ul>
            <p>
              The TPR centralizes and standardizes this information to increase
              the use of transition pathways.
            </p>
          </>
        ),
      },
      {
        id: "who-is-the-tpr-built-for",
        question: "Who is the TPR built for?",
        answer: (
          <>
            <p>
              TPR is designed primarily for financial institutions using region-
              and sector-specific pathways in transition assessment and
              decision-making.
            </p>
            <p>It is especially relevant for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Sustainability teams — to evaluate ambition and feasibility of
                corporate transition plans.
              </li>
              <li>Risk teams — to identify potential transition risks.</li>
              <li>
                Front-office and client coverage teams — to identify business
                development and engagement opportunities.
              </li>
              <li>
                Strategy teams — to develop investment theses and set capital
                allocation targets
              </li>
            </ul>
            <p>
              It can also be useful for companies, policymakers, regulators, and
              other users who want to better understand transition dynamics in
              specific sectors and regions.
            </p>
          </>
        ),
      },
      {
        id: "what-pathways-can-i-find-in-the-tpr",
        question: "What pathways can I find in the TPR?",
        answer: (
          <>
            <p>
              The TPR currently includes pathways related to the power sector in
              Southeast Asia. This includes region- and country-specific
              pathways, as well as global power pathways.
            </p>
            <p>
              Expansion into other sectors and regions is planned later in 2026,
              stay tuned!
            </p>
          </>
        ),
      },
      {
        id: "how-do-i-use-the-tpr",
        question: "How do I use the TPR?",
        answer: (
          <>
            <p>
              A full description of how to make the most of the TPR can be found
              in our{" "}
              <Link
                to="/resources/how-to-choose-a-pathway"
                className="text-energy-700 underline underline-offset-2 font-semibold hover:text-energy-800"
              >
                user guide
              </Link>
              .
            </p>
          </>
        ),
      },
      {
        id: "does-the-tpr-tell-me-which-pathway-is-best",
        question: "Does the TPR tell me which pathway is best?",
        answer: (
          <>
            <p>
              No. The TPR helps users compare pathways in a structured way, but
              it does not automatically choose one for you.
            </p>
            <p>
              The most useful pathway depends on the question you are trying to
              answer.
            </p>
          </>
        ),
      },
      {
        id: "why-cant-i-use-one-scenario-for-everything",
        question: "Why can’t I use one scenario for everything?",
        answer: (
          <>
            <p>Because different pathways answer different questions.</p>
            <p>
              A pathway that is useful for assessing target ambition may not be
              the best fit for assessing policy exposure, local market
              conditions, or technology feasibility, as these dimensions rely on
              different underlying assumptions, such as current policy
              frameworks, infrastructure readiness, and technology maturity.
            </p>
          </>
        ),
      },
      {
        id: "why-do-some-pathways-have-more-benchmark-data",
        question:
          "Why do some pathways have more or different benchmark data than others?",
        answer: (
          <>
            <p>Not all pathway sources publish the same level of detail.</p>
            <p>
              Some developers publish the high-level findings of a pathway, but
              not the exact benchmark data for public download. We are working
              to make more data available where possible.
            </p>
          </>
        ),
      },
      {
        id: "what-is-a-corporate-transition-assessment",
        question: "What is a corporate transition assessment (CTA)?",
        answer: (
          <>
            <p>
              A CTA is a structured assessment of how credible, ambitious, and
              feasible a company’s transition strategy appears, usually in the
              context of financial decision-making.
            </p>
            <p>
              See the{" "}
              <a
                href="https://rmi.org/insight/creating-transition-intelligence-enhancing-corporate-transition-assessments-for-financial-decision-making/"
                className="text-energy-700 underline underline-offset-2 font-semibold hover:text-energy-800"
              >
                Creating Transition Intelligence report
              </a>{" "}
              for more details on what constitutes a robust transition
              assessment.
            </p>
          </>
        ),
      },
      {
        id: "how-does-the-tpr-relate-to-ctas",
        question: "How does the TPR relate to CTAs?",
        answer: (
          <>
            <p>
              The TPR helps users identify and interpret granular
              region-specific pathways that can inform benchmarks for a CTA. It
              does not replace a full corporate transition assessment. It
              supports one important part of the process: choosing and
              understanding suitable pathways and benchmarks.
            </p>
            <p>For example, users can utilize pathways to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Benchmark the ambition of company targets given local
                constraints
              </li>
              <li>Assess whether transition assumptions are feasible</li>
              <li>Understand policy exposure</li>
              <li>
                Identify key transition technologies across sectors and
                geographies
              </li>
            </ul>
            <p>
              See the{" "}
              <a
                href="https://rmi.org/insight/leveraging-transition-pathways/"
                className="text-energy-700 underline underline-offset-2 font-semibold hover:text-energy-800"
              >
                Leveraging Transition Pathways report
              </a>
              .
            </p>
          </>
        ),
      },
      {
        id: "what-else-is-the-tpr-useful-for",
        question: "What else is the TPR useful for?",
        answer: (
          <>
            <p>CTAs are an important use case, but not the only one.</p>
            <p>
              The TPR can also support broader transition-related analysis,
              including informing corporate strategy, transition planning, and
              identification of transition bottlenecks or enablers for
              policymaking.
            </p>
          </>
        ),
      },
    ],
    [],
  );

  return (
    <div className="bg-gray-50">
      <PageHeader title="Frequently Asked Questions">
        <p>
          If you can’t find an answer to your question here, we would love to
          hear from you. Reach out to{" "}
          <a
            href="mailto:tomwhite+tpr@rmi.org"
            className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
          >
            Tom White
          </a>{" "}
          or{" "}
          <a
            href="mailto:jkastl+tpr@rmi.org"
            className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
          >
            Jacob Kastl
          </a>
          .
        </p>
      </PageHeader>

      <div className="container mx-auto px-4 pt-6 pb-12">
        <div className="grid gap-8 xl:grid-cols-[16rem_1fr]">
          <OnPageIndex containerRef={contentRef} />

          <div
            ref={contentRef}
            className="min-w-0 max-w-5xl"
          >
            {faqItems.map((item) => (
              <FaqItemBlock
                key={item.id}
                id={item.id}
                question={item.question}
                answer={item.answer}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcesFaqPage;
