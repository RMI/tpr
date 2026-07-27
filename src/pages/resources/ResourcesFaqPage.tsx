import React, { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type FaqItem = {
  question: string;
  answer: React.ReactNode;
};

type FaqSection = {
  title: string;
  items: FaqItem[];
};

const FaqItemBlock: React.FC<FaqItem> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <div className="px-6 py-5 md:px-7">
      <h3>
        <button
          type="button"
          className="group w-full text-left"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => setIsOpen((value) => !value)}
        >
          <div className="flex items-start justify-between gap-4">
            <span className="text-lg font-semibold text-rmigray-800 transition-colors group-hover:text-rmiblue-800">
              {question}
            </span>
            <span
              className={
                "mt-1 text-rmigray-500 transition-transform " +
                (isOpen ? "rotate-180" : "rotate-0")
              }
              aria-hidden="true"
            >
              ▾
            </span>
          </div>
        </button>
      </h3>

      {isOpen ? (
        <div
          id={contentId}
          className="mt-5 border-t border-neutral-200 pt-5 text-rmigray-700"
        >
          <div className="space-y-3 leading-7 [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:pl-5">
            {answer}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const ResourcesFaqPage: React.FC = () => {
  const sections = useMemo<FaqSection[]>(
    () => [
      {
        title: "About the TPR",
        items: [
          {
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
                    Identify critical decarbonization levers in a particular
                    sector and region
                  </li>
                </ul>
                <p>
                  The TPR centralizes and standardizes this information to
                  increase the use of transition pathways.
                </p>
              </>
            ),
          },
          {
            question: "Who is the TPR built for?",
            answer: (
              <>
                <p>
                  TPR is designed primarily for financial institutions using
                  region- and sector-specific pathways in transition assessment
                  and decision-making.
                </p>
                <p>It is especially relevant for:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Sustainability teams — to evaluate ambition and feasibility
                    of corporate transition plans.
                  </li>
                  <li>Risk teams — to identify potential transition risks.</li>
                  <li>
                    Front-office and client coverage teams — to identify
                    business development and engagement opportunities.
                  </li>
                  <li>
                    Strategy teams — to develop investment theses and set
                    capital allocation targets
                  </li>
                </ul>
                <p>
                  It can also be useful for companies, policymakers, regulators,
                  and other users who want to better understand transition
                  dynamics in specific sectors and regions.
                </p>
              </>
            ),
          },
          {
            question: "What pathways can I find in the TPR?",
            answer: (
              <>
                <p>
                  The TPR currently includes pathways related to the power
                  sector in Southeast Asia. This includes region- and
                  country-specific pathways, as well as global power pathways.
                </p>
                <p>
                  Expansion into other sectors and regions is planned later in
                  2026, stay tuned!
                </p>
              </>
            ),
          },
        ],
      },
      {
        title: "Using the TPR",
        items: [
          {
            question: "How do I use the TPR?",
            answer: (
              <>
                <p>
                  A full description of how to make the most of the TPR can be
                  found in our{" "}
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
            question: "Does the TPR tell me which pathway is best?",
            answer: (
              <>
                <p>
                  No. The TPR helps users compare pathways in a structured way,
                  but it does not automatically choose one for you.
                </p>
                <p>
                  The most useful pathway depends on the question you are trying
                  to answer.
                </p>
              </>
            ),
          },
          {
            question: "Why can’t I use one scenario for everything?",
            answer: (
              <>
                <p>Because different pathways answer different questions.</p>
                <p>
                  A pathway that is useful for assessing target ambition may not
                  be the best fit for assessing policy exposure, local market
                  conditions, or technology feasibility, as these dimensions
                  rely on different underlying assumptions, such as current
                  policy frameworks, infrastructure readiness, and technology
                  maturity.
                </p>
              </>
            ),
          },
          {
            question:
              "Why do some pathways have more or different benchmark data than others?",
            answer: (
              <>
                <p>Not all pathway sources publish the same level of detail.</p>
                <p>
                  Some developers publish the high-level findings of a pathway,
                  but not the exact benchmark data for public download. We are
                  working to make more data available where possible.
                </p>
              </>
            ),
          },
        ],
      },
      {
        title:
          "Using the TPR to support corporate transition assessments (CTAs)",
        items: [
          {
            question: "What is a corporate transition assessment (CTA)?",
            answer: (
              <>
                <p>
                  A CTA is a structured assessment of how credible, ambitious,
                  and feasible a company’s transition strategy appears, usually
                  in the context of financial decision-making.
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
            question: "How does the TPR relate to CTAs?",
            answer: (
              <>
                <p>
                  The TPR helps users identify and interpret granular
                  region-specific pathways that can inform benchmarks for a CTA.
                  It does not replace a full corporate transition assessment. It
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
            question: "What else is the TPR useful for?",
            answer: (
              <>
                <p>CTAs are an important use case, but not the only one.</p>
                <p>
                  The TPR can also support broader transition-related analysis,
                  including informing corporate strategy, transition planning,
                  and identification of transition bottlenecks or enablers for
                  policymaking.
                </p>
              </>
            ),
          },
        ],
      },
    ],
    [],
  );

  return (
    <div className="bg-gray-50">
      <div className="container mx-auto px-4 py-8 md:py-10">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-rmiblue-800 px-6 py-8 text-white shadow-lg md:px-10 md:py-11">
          <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-energy-700/10" />
          <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-white/7 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-energy-500/8 blur-2xl" />

          <div className="relative">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Frequently Asked Questions
            </h1>
            <div className="mt-8 space-y-4 text-sm leading-7 text-white/85 md:text-base">
              <p>
                If you can’t find an answer to your question here, we would love
                to hear from you. Reach out to{" "}
                <a
                  href="mailto:tomwhite+pbtar@rmi.org"
                  className="text-white underline underline-offset-2 transition-colors hover:text-white/80"
                >
                  Tom White
                </a>{" "}
                or{" "}
                <a
                  href="mailto:jkastl+pbtar@rmi.org"
                  className="text-white underline underline-offset-2 transition-colors hover:text-white/80"
                >
                  Jacob Kastl
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        {sections.map((section, index) => (
          <section
            key={section.title}
            className={
              "mx-auto max-w-5xl rounded-[2rem] border border-rmiblue-100 bg-rmiblue-50/60 px-6 py-8 shadow-sm md:px-8 md:py-10 " +
              (index === 0 ? "mt-12" : "mt-14")
            }
          >
            <div className="max-w-5xl">
              <h2 className="text-2xl font-semibold text-rmigray-800">
                {section.title}
              </h2>
            </div>

            <div className="mt-8 max-w-5xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="divide-y divide-neutral-200/80">
                {section.items.map((item) => (
                  <FaqItemBlock
                    key={item.question}
                    question={item.question}
                    answer={item.answer}
                  />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default ResourcesFaqPage;
