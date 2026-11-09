import React, { useRef } from "react";
import { Link } from "react-router";
import InfoCallout from "../../components/InfoCallout";
import OnPageIndex from "../../components/OnPageIndex";
import PageHeader from "../../components/PageHeader";

const quickStartCards = [
  {
    title: "If your use case is about target ambition",
    priorities: [
      "Temperature outcome",
      "Pathway type",
      "Benchmark availability",
    ],
  },
  {
    title: "If your use case is about policy exposure",
    priorities: [
      "Policy-driven assumptions",
      "Geographic scope",
      "Benchmark data for the markets where the company operates.",
    ],
  },
  {
    title: "If your use case is about technology readiness",
    priorities: [
      "Technology granularity",
      "Deployment and cost assumptions",
      "Temporal detail",
    ],
  },
  {
    title: "If your use case is about identifying dependencies",
    priorities: [
      "Geographic scope",
      "Technology detail",
      "Technology cost assumptions",
      "Policy assumptions",
    ],
  },
];

const QuickStartCard: React.FC<{
  title: string;
  priorities: string[];
}> = ({ title, priorities }) => {
  return (
    <article className="overflow-hidden rounded-lg border border-rmiblue-200 bg-white shadow-sm">
      <div className="border-b border-rmiblue-200 p-6">
        <h3 className="text-lg font-semibold leading-8 text-rmigray-800">
          {title}
        </h3>
      </div>

      <div className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rmiblue-800">
          Prioritize
        </p>
        <ul className="mt-4 space-y-3 text-rmigray-700">
          {priorities.map((priority) => (
            <li
              key={priority}
              className="flex gap-3"
            >
              <span className="mt-2.5 h-2 w-2 flex-none rounded-full bg-energy-700" />
              <span className="leading-7">{priority}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
};

/**
 * One of the five steps. Always visible — the step used to be collapsed
 * behind a disclosure button, which also kept it out of the on-page index
 * (#955). The "Step N" label sits outside the heading so the index entry
 * reads as the step's title alone.
 */
const Step: React.FC<{
  id: string;
  label: string;
  title: string;
  children: React.ReactNode;
}> = ({ id, label, title, children }) => (
  <div className="mt-10">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rmiblue-800">
      {label}
    </p>
    <h3
      id={id}
      className="mt-2 scroll-mt-8 text-lg font-semibold text-rmigray-800"
    >
      {title}
    </h3>
    <div className="mt-4 max-w-3xl text-rmigray-700 leading-7 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1 [&>p+ul]:mt-3">
      {children}
    </div>
  </div>
);

const GuideScreenshot: React.FC<{ src: string; alt: string }> = ({
  src,
  alt,
}) => (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    className="w-full rounded-md border border-neutral-200 shadow-sm"
  />
);

type Guide = {
  id: string;
  title: string;
  content: React.ReactNode;
};

const guides: Guide[] = [
  {
    id: "how-to-compare-pathways",
    title: "How to compare pathways using the TPR",
    content: (
      <>
        <p>
          The pathway comparison feature built into the Transition Pathways
          Repository allows you to see the benchmarks, assumptions, and scopes
          of different pathways side-by-side.
        </p>
        <ol className="list-decimal space-y-4 pl-5">
          <li>
            To select pathways for comparison, click the{" "}
            <b>"Compare Pathways"</b> button below the drop-down filter section
            on the main pathway view.
            <div className="mt-3">
              <GuideScreenshot
                src="/guides/how-to-compare-pathways-1.png"
                alt="Pathway list filters with the collapsed 'Compare Pathways' link."
              />
            </div>
          </li>
          <li>
            This will open a ribbon showing the pathways selected for
            comparison, and the pathway cards will now show a <b>"Plus"</b>{" "}
            button next to the <b>"View Details"</b> button. Two to three
            pathways can be added to the comparison tray, and you can remove a
            pathway from the tray at any time.
            <div className="mt-3">
              <GuideScreenshot
                src="/guides/how-to-compare-pathways-2.png"
                alt="Expanded comparison tray with empty pathway slots and a disabled 'Compare' button."
              />
            </div>
          </li>
          <li>
            To add a pathway for comparison, click on the <b>"Plus"</b> button
            on the pathway card. A selected pathway will now show a checkmark on
            the pathway card and you will see it in the comparison tray.
            Clicking on the <b>"Checkmark"</b> button will remove the pathway
            from the comparison tray.
            <div className="mt-3">
              <GuideScreenshot
                src="/guides/how-to-compare-pathways-3.png"
                alt="Pathway cards with one already added to the comparison tray, and an 'Add to comparison' button shown on another."
              />
            </div>
          </li>
          <li>
            Once you have selected the pathways you want to compare, you can
            access the comparison view by clicking on the <b>"Compare"</b>{" "}
            button on the right side of the comparison ribbon.
            <div className="mt-3">
              <GuideScreenshot
                src="/guides/how-to-compare-pathways-4.png"
                alt="Comparison tray filled with three selected pathways and the 'Compare' button enabled."
              />
            </div>
          </li>
          <li>
            This will open the side-by-side comparison of your selected
            pathways. Scroll down to compare benchmarks for each pathway.
            <div className="mt-3">
              <GuideScreenshot
                src="/guides/how-to-compare-pathways-5.png"
                alt="Comparison view showing pathway summary cards and benchmark capacity plots side by side."
              />
            </div>
          </li>
          <li>
            Scroll further to compare model assumptions such as modelled policy
            types and technology cost assumptions.
            <div className="mt-3">
              <GuideScreenshot
                src="/guides/how-to-compare-pathways-6.png"
                alt="Comparison view showing policy environment and technology and feasibility assumptions side by side."
              />
            </div>
          </li>
          <li>
            Further down, you can compare pathway coverage side by side (for
            example, which geographies and sectors each pathway covers).
            <div className="mt-3">
              <GuideScreenshot
                src="/guides/how-to-compare-pathways-7.png"
                alt="Comparison view showing the geographies and sectors covered by each pathway side by side."
              />
            </div>
          </li>
          <li>
            If you find an insight you want to share, you can simply send the
            URL to a colleague, and it will open the same comparison.
          </li>
          <li>
            If you find anything you would like to share with us, please{" "}
            <Link
              to="/contact"
              className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
            >
              get in touch
            </Link>
            .
          </li>
        </ol>
      </>
    ),
  },
];

const GuideItemBlock: React.FC<Guide> = ({ id, title, content }) => (
  <div className="mt-8">
    <h3
      id={id}
      className="scroll-mt-8 text-lg font-semibold text-rmigray-800"
    >
      {title}
    </h3>
    <div className="mt-4 max-w-3xl space-y-4 leading-7 text-rmigray-700">
      {content}
    </div>
  </div>
);

const ResourcesHowToChooseAPathwayPage: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-gray-50">
      <PageHeader
        title="How to Choose a Pathway"
        subtitle="Five steps to identify the pathways that fit your assessment question"
      >
        <p>
          Different energy transition pathways answer different questions. A
          pathway that is useful for assessing company target ambition may not
          be the best fit for assessing policy exposure or technology
          feasibility.
        </p>
        <p>
          The Transition Pathways Repository (TPR) helps you compare pathways in
          a more structured way so you can choose the ones that are most useful
          for your application.
        </p>
      </PageHeader>

      <div className="container mx-auto px-4 pt-6 pb-12">
        <div className="grid gap-8 xl:grid-cols-[16rem_1fr]">
          <OnPageIndex containerRef={contentRef} />

          <div
            ref={contentRef}
            className="min-w-0 max-w-5xl"
          >
            <section className="border-b border-neutral-300 py-10">
              <div className="max-w-3xl">
                <h2
                  id="five-steps"
                  className="scroll-mt-8 text-2xl font-semibold text-rmigray-800"
                >
                  Five steps to finding the right pathway
                </h2>
                <p className="mt-4 max-w-3xl text-rmigray-700 leading-7">
                  Selecting appropriate pathways for a transition-related
                  question follows a straightforward process, as laid out in
                  RMI’s{" "}
                  <a
                    href="https://rmi.org/insight/leveraging-transition-pathways/"
                    className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <b>Leveraging Transition Pathways report</b>
                  </a>
                  .
                </p>
              </div>

              <Step
                id="define-the-intended-application"
                label="Step 1"
                title="Define the intended application"
              >
                <p>
                  The ‘right’ pathway depends on the use case, so it is
                  important to clarify what question you need the pathway help
                  answer. This will then inform the decisions made in the
                  following steps. The more specific you can be, the easier it
                  will be to narrow down your options.
                </p>
                <p className="mt-3">Example questions could include:</p>
                <ul className="mt-3">
                  <li>
                    Are a company’s emissions targets still ambitious given
                    local policy constraints?
                  </li>
                  <li>
                    Are a company’s solar deployment targets feasible given
                    local land-use constraints?
                  </li>
                  <li>
                    Is a company on track to align with the NDC targets in the
                    jurisdictions where they operate?
                  </li>
                  <li>
                    What external constraints are preventing a company from
                    achieving their transition goals?
                  </li>
                </ul>
              </Step>

              <Step
                id="check-credibility"
                label="Step 2"
                title="Check credibility"
              >
                <p>
                  Review who produced the pathway and whether it was developed
                  through a robust process.
                </p>
                <p className="mt-3">Useful questions include:</p>
                <ul className="mt-3">
                  <li>
                    Was it developed by an organization with strong technical
                    expertise?
                  </li>
                  <li>Was it reviewed by relevant experts or stakeholders?</li>
                  <li>Does the methodology appear technically sound?</li>
                </ul>
                <p className="mt-3">
                  Pathways hosted on the TPR are all considered credible
                  according to these criteria. Note that this does not mean that
                  experts agree with the outcomes of each pathway, but that for
                  the input assumptions made, the outputs have been
                  appropriately modeled.
                </p>

                <InfoCallout className="mt-6">
                  <p>
                    <b>Credible does not mean suitable.</b> Pathway credibility
                    is necessary, but not sufficient. A pathway can be robust
                    and well developed, yet still be too broad, too generic, or
                    missing the benchmark data needed for a given application.
                  </p>
                </InfoCallout>
              </Step>

              <Step
                id="review-pathway-features"
                label="Step 3"
                title="Review pathway features"
              >
                <p>
                  Look at the main characteristics of the pathway and evaluate
                  whether they are appropriate for the question being asked.
                </p>
                <p className="mt-3">These include:</p>
                <ul className="mt-3">
                  <li>Pathway type,</li>
                  <li>Temperature outcome,</li>
                  <li>Sector and geographic scope,</li>
                  <li>
                    Main drivers of change (e.g., policies or technology costs),
                  </li>
                  <li>
                    Trends and outcomes (e.g., technology deployment or
                    emissions trends).
                  </li>
                </ul>
                <p className="mt-3">
                  These features will help you interpret the results. See the{" "}
                  <Link
                    to="/resources/methodology"
                    className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
                  >
                    <b>Methodology section</b>
                  </Link>{" "}
                  for more details.
                </p>
                <p className="mt-3">
                  You can find these features in the pathway summary and key
                  features sections of the TPR.
                </p>
              </Step>

              <Step
                id="check-granularity"
                label="Step 4"
                title="Check granularity"
              >
                <p>
                  Check whether the pathway is granular enough for your
                  application across:
                </p>
                <ul className="mt-3">
                  <li>Geography</li>
                  <li>Technology</li>
                  <li>Time</li>
                </ul>
                <p className="mt-3">
                  For example, a pathway that groups all renewables together may
                  not be detailed enough to assess the feasibility of the rate
                  of geothermal deployment. And a pathway that provides outputs
                  for Southeast Asia as a whole may not be granular enough to
                  assess policy risk in Indonesia.
                </p>
                <p className="mt-3">
                  This information is available in the expert overview and key
                  features of each pathway in the TPR.
                </p>
              </Step>

              <Step
                id="confirm-benchmark-data-availability"
                label="Step 5"
                title="Confirm benchmark data availability"
              >
                <p>
                  Finally, check whether the pathway provides the actual output
                  data you need. A pathway may model a sector in detail but
                  still not publish the specific benchmark metrics needed for
                  comparison with company data.
                </p>
                <p className="mt-3">
                  You can see what data is available in the pathway expert
                  overview, as well as the standardized data download in the
                  TPR.
                </p>
              </Step>
            </section>

            <section className="border-b border-neutral-300 py-10">
              <div className="max-w-3xl">
                <h2
                  id="pathway-characteristics"
                  className="scroll-mt-8 text-2xl font-semibold text-rmigray-800"
                >
                  Pathway characteristics for different use cases
                </h2>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
                {quickStartCards.map((card) => (
                  <QuickStartCard
                    key={card.title}
                    title={card.title}
                    priorities={card.priorities}
                  />
                ))}
              </div>
            </section>

            <section className="border-b border-neutral-300 py-10">
              <div className="max-w-3xl">
                <h2
                  id="how-to-guides"
                  className="scroll-mt-8 text-2xl font-semibold text-rmigray-800"
                >
                  How-to guides
                </h2>
                <p className="mt-4 max-w-3xl text-rmigray-700 leading-7">
                  Short click-through guides for specific TPR features.
                </p>
              </div>

              {guides.map((guide) => (
                <GuideItemBlock
                  key={guide.id}
                  id={guide.id}
                  title={guide.title}
                  content={guide.content}
                />
              ))}
            </section>

            <section className="py-10">
              <div className="max-w-3xl">
                <h2
                  id="what-to-do-next"
                  className="scroll-mt-8 text-2xl font-semibold text-rmigray-800"
                >
                  What to do next
                </h2>
                <ul className="mt-5 max-w-3xl list-disc space-y-3 pl-6 text-rmigray-700 marker:text-lg">
                  <li className="font-semibold leading-7">
                    <Link
                      to="/pathway"
                      className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
                    >
                      Explore the available pathways
                    </Link>
                  </li>
                  <li className="font-semibold leading-7">
                    Read the{" "}
                    <Link
                      to="/resources/methodology"
                      className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
                    >
                      Methodology page
                    </Link>{" "}
                    for detailed definitions of pathway features and their
                    interpretation
                  </li>
                  <li className="font-semibold leading-7">
                    Read our{" "}
                    <a
                      href="https://rmi.org/insight/leveraging-transition-pathways/"
                      className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Leveraging Transition Pathways report
                    </a>{" "}
                    for more guidance on how financial institutions can use
                    transition pathways in their assessments
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcesHowToChooseAPathwayPage;
