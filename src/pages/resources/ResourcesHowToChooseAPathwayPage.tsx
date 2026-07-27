import React, { useId, useState } from "react";
import { Link } from "react-router-dom";

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
    <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 bg-gradient-to-r from-rmiblue-50 via-white to-white p-5 md:p-6">
        <h3 className="text-xl font-semibold leading-8 text-rmigray-800">
          {title}
        </h3>
      </div>

      <div className="p-6 md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rmiblue-700">
          Prioritize
        </p>
        <ul className="mt-4 space-y-3 text-rmigray-700">
          {priorities.map((priority) => (
            <li
              key={priority}
              className="flex gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4"
            >
              <span className="mt-2 h-2.5 w-2.5 flex-none rounded-full bg-energy-700" />
              <span className="leading-7">{priority}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
};

const CollapsibleRow: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();
  const [stepLabel, ...titleParts] = title.split(": ");
  const heading = titleParts.join(": ");

  return (
    <div className="px-6 py-5 md:px-7">
      <h3>
        <button
          type="button"
          className="group w-full text-left"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => setIsOpen((v) => !v)}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rmiblue-700">
                {stepLabel}
              </p>
              <span className="mt-3 block text-xl font-semibold text-rmigray-800 transition-colors group-hover:text-rmiblue-800">
                {heading}
              </span>
            </div>
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
          className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-rmigray-700 leading-7"
        >
          <div className="[&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1 [&>p+ul]:mt-3 [&>p]:text-rmigray-700">
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const ResourcesHowToChooseAPathwayPage: React.FC = () => {
  return (
    <div className="bg-gray-50">
      <div className="container mx-auto px-4 py-8 md:py-10">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-rmiblue-800 px-6 py-8 text-white shadow-lg md:px-10 md:py-11">
          <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-energy-700/10" />
          <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-white/7 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-energy-500/8 blur-2xl" />

          <div className="relative">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              How to Choose a Pathway
            </h1>

            <h2 className="mt-6 text-xl font-semibold leading-8 text-white/95 md:text-2xl">
              Five steps to identify the pathways that fit your assessment
              question
            </h2>

            <div className="mt-8 space-y-4 text-sm leading-7 text-white/85 md:text-base">
              <p>
                Different energy transition pathways answer different questions.
                A pathway that is useful for assessing company target ambition
                may not be the best fit for assessing policy exposure or
                technology feasibility.
              </p>
              <p>
                The Transition Pathways Repository (TPR) helps you compare
                pathways in a more structured way so you can choose the ones
                that are most useful for your application.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-5xl rounded-[2rem] bg-white px-6 py-8 shadow-sm md:px-8 md:py-10">
          <div className="max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rmiblue-700">
              5-step process
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-rmigray-800">
              A structured way to narrow down the right pathway
            </h2>
            <p className="mt-4 text-rmigray-700 leading-7">
              Selecting appropriate pathways for a transition-related question
              follows a straightforward process, as laid out in RMI’s{" "}
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

          <div className="mt-8 grid max-w-5xl gap-8 xl:grid-cols-[1.15fr,0.85fr]">
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-200 bg-gradient-to-r from-rmiblue-50 via-white to-white p-6 md:p-7">
                <h3 className="text-xl font-semibold text-rmigray-800">
                  The five-step process to selecting a pathway
                </h3>
              </div>

              <div className="divide-y divide-neutral-200/80">
                <CollapsibleRow title="Step 1: Define the intended application">
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
                </CollapsibleRow>

                <CollapsibleRow title="Step 2: Check credibility">
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
                    <li>
                      Was it reviewed by relevant experts or stakeholders?
                    </li>
                    <li>Does the methodology appear technically sound?</li>
                  </ul>
                  <p className="mt-3">
                    Pathways hosted on the TPR are all considered credible
                    according to these criteria. Note that this does not mean
                    that experts agree with the outcomes of each pathway, but
                    that for the input assumptions made, the outputs have been
                    appropriately modeled.
                  </p>
                </CollapsibleRow>

                <CollapsibleRow title="Step 3: Review pathway features">
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
                      Main drivers of change (e.g., policies or technology
                      costs),
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
                </CollapsibleRow>

                <CollapsibleRow title="Step 4: Check granularity">
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
                    For example, a pathway that groups all renewables together
                    may not be detailed enough to assess the feasibility of the
                    rate of geothermal deployment. And a pathway that provides
                    outputs for Southeast Asia as a whole may not be granular
                    enough to assess policy risk in Indonesia.
                  </p>
                  <p className="mt-3">
                    This information is available in the expert overview and key
                    features of each pathway in the TPR.
                  </p>
                </CollapsibleRow>

                <CollapsibleRow title="Step 5: Confirm benchmark data availability">
                  <p>
                    Finally, check whether the pathway provides the actual
                    output data you need. A pathway may model a sector in detail
                    but still not publish the specific benchmark metrics needed
                    for comparison with company data.
                  </p>
                  <p className="mt-3">
                    You can see what data is available in the pathway expert
                    overview, as well as the standardized data download in the
                    TPR.
                  </p>
                </CollapsibleRow>
              </div>
            </div>

            <aside className="self-start rounded-2xl border border-energy-200 bg-neutral-100 p-7 shadow-sm">
              <h2 className="text-xl font-semibold text-rmigray-800">
                Credible does not mean suitable
              </h2>
              <div className="mt-5 space-y-4 text-rmigray-700 leading-7">
                <p>Pathway credibility is necessary, but not sufficient.</p>
                <p>
                  A pathway can be robust and well developed, yet still be too
                  broad, too generic, or missing the benchmark data needed for a
                  given application.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-5xl rounded-[2rem] border border-rmiblue-100 bg-rmiblue-50/60 px-6 py-8 shadow-sm md:px-8 md:py-10">
          <div className="max-w-5xl">
            <h2 className="text-2xl font-semibold text-rmigray-800">
              A simple way to start finding the right pathways
            </h2>
          </div>

          <div className="mt-8 grid max-w-5xl grid-cols-1 gap-6 xl:grid-cols-2">
            {quickStartCards.map((card) => (
              <QuickStartCard
                key={card.title}
                title={card.title}
                priorities={card.priorities}
              />
            ))}
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-5xl rounded-[2rem] border border-neutral-200 bg-neutral-100/80 px-6 py-8 shadow-sm md:px-8 md:py-10">
          <div className="max-w-5xl rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-semibold text-rmigray-800">
              What to do next
            </h2>
            <ul className="mt-5 list-disc space-y-3 pl-6 text-rmigray-700 marker:text-lg">
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
  );
};

export default ResourcesHowToChooseAPathwayPage;
