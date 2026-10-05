import React, { useRef } from "react";
import OnPageIndex from "../../components/OnPageIndex";
import PageHeader from "../../components/PageHeader";

const financialInstitutionRoles = [
  {
    title: "Sustainability",
    description:
      "Assess the credibility and ambition of client and portfolio transition plans, benchmark against sectoral and regional pathways, and support alignment with net-zero and climate targets.",
  },
  {
    title: "Risk",
    description:
      "Evaluate exposure to transition-related risks, including sectoral misalignment and structural dependencies (e.g., technology, policy, and market conditions), to inform risk management frameworks and stress testing.",
  },
  {
    title: "Front-office (lending, investment, advisory)",
    description:
      "Inform client engagement, assess corporate transition plans, corporate deal structuring, and portfolio alignment by identifying credible transition pathways and investment opportunities in low-carbon technologies.",
  },
  {
    title: "Strategy",
    description:
      "Identify emerging clean technologies, develop investment theses, and set capital allocation targets to support and steer the teams above.",
  },
];

const audienceCards = [
  {
    title: "Corporations",
    description:
      "Develop and refine corporate transition plans, align business strategies and capital allocation with credible sectoral pathways, and anticipate external dependencies shaping the transition.",
  },
  {
    title: "Public institutions",
    description:
      "Support policy design, regulation, and supervisory approaches by identifying priority sectors and technologies, assessing transition feasibility, and pinpointing areas where additional policy support is needed to accelerate progress and capitalize on opportunities.",
  },
];

const useCases = [
  {
    title: "Assess target ambition",
    subtitle:
      "Ambition is often benchmarked on the basis of global 1.5°C pathways. This is a fair approach for a diversified global portfolio, but global pathways that lack regional granularity do not account for local constraints. Region-specific pathways may not always align to a clear temperature outcome, but they can provide a useful indication of what high ambition looks like in a specific region.",
    bullets: [
      "Test ambition against common global benchmarks: Check if company targets are leading, lagging, or broadly aligned with global benchmarks.",
      "Understand ambition under local constraints: Complement global benchmarks with region-specific benchmarks to prevent unfairly locking some regions out of transition finance.",
    ],
  },
  {
    title: "Assess feasibility of transition plans",
    subtitle:
      "Targets signal intent but need to be balanced with a feasible plan for implementation. Understanding feasibility ensures that credible opportunities are identified for financing and risks can be managed effectively.",
    bullets: [
      "Test assumptions: Compare company plans against technology, cost, and deployment assumptions embedded in pathways.",
      "Assess dependencies: Evaluate reliance on external factors such as policy support, infrastructure, technology availability, or market evolution.",
    ],
  },
  {
    title: "Identify emerging technologies",
    subtitle:
      "Emissions are a lagging indicator for the progression of the energy transition. To understand how the transition may progress, you need to understand the technologies that drive it and how these could scale.",
    bullets: [
      "Identify decarbonization levers: Find common technologies across pathways that will be integral to the energy transition within and across sectors.",
      "Steer capital allocation: Prioritize investments in technologies and sectors consistent with the energy transition to build expertise and gain exposure to new markets.",
    ],
  },
  {
    title: "Understand transition risks and their drivers",
    subtitle:
      "Transition risks are shaped by evolving policies, technologies, and market conditions that can materially impact performance, and are often modeled in pathways.",
    bullets: [
      "Map exposure: Evaluate portfolio and corporate sensitivity to policy changes, carbon pricing, and regulatory shifts.",
      "Analyze market dynamics: Understand how demand, costs, and technology adoption may evolve and impact markets.",
      "Identify structural dependencies: Assess what enablers such as infrastructure or supply chains need to be in place to support the transition.",
    ],
  },
];

type UseCaseCardProps = {
  title: string;
  subtitle: string;
  bullets: string[];
};

const UseCaseCard: React.FC<UseCaseCardProps> = ({
  title,
  subtitle,
  bullets,
}) => {
  return (
    <article className="overflow-hidden rounded-lg border border-rmiblue-200 bg-white shadow-sm">
      <div className="border-b border-rmiblue-200 p-6">
        <div className="flex items-start gap-4">
          <span className="mt-1 h-12 w-1.5 flex-none rounded-full bg-energy-700" />
          <div>
            <h3 className="text-lg font-semibold text-rmigray-800">{title}</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-rmigray-600">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <ul className="space-y-3 text-rmigray-700">
          {bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex gap-3"
            >
              <span className="mt-2.5 h-2 w-2 flex-none rounded-full bg-energy-700" />
              <span className="leading-7">{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
};

const AudienceCard: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => {
  return (
    <article className="rounded-lg border border-rmiblue-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-rmiblue-800">{title}</h3>
      <div className="mt-4 text-rmigray-700 leading-7">{children}</div>
    </article>
  );
};

const ResourcesUseCasesPage: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-gray-50">
      <PageHeader
        title="Use cases of RMI’s Transition Pathways Repository"
        subtitle="Transition pathways are critical to understanding how the energy transition might unfold"
      >
        <p>
          The energy transition is a technological revolution with dramatic
          implications for global markets, international development, and
          geopolitics. It presents one of the greatest economic and industrial
          opportunities in history, and creates risks for those that fail to
          adapt and plan accordingly. Transition pathways provide one valuable
          tool for navigating this uncertainty. It does this by modeling what
          the future might hold across different regions and sectors under
          different assumption sets.
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
                  id="how-pathways-inform-users"
                  className="scroll-mt-8 text-2xl font-semibold text-rmigray-800"
                >
                  How pathways inform different users
                </h2>
                <p className="mt-3 text-rmigray-700 leading-7">
                  The Transition Pathways Repository (TPR) enables financial
                  institutions, public institutions, and other stakeholders to
                  identify, compare, and apply transition pathways for corporate
                  transition assessments and other strategic and analytical
                  applications. It streamlines pathway selection, enhances
                  transparency, and supports the decision-usefulness of
                  analyses.
                </p>
                <p className="mt-3 text-rmigray-700 leading-7">
                  The TPR was built primarily to support teams across financial
                  institutions shaping and implementing transition strategies.
                  It is also a valuable resource for corporations and public
                  institutions.
                </p>
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
                <AudienceCard title="Financial Institutions">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {financialInstitutionRoles.map((role) => (
                      <div
                        key={role.title}
                        className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
                      >
                        <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-rmiblue-800">
                          {role.title}
                        </h4>
                        <p className="mt-3 text-sm leading-7 text-rmigray-700">
                          {role.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </AudienceCard>

                <div className="grid gap-6">
                  {audienceCards.map((audience) => (
                    <AudienceCard
                      key={audience.title}
                      title={audience.title}
                    >
                      <p>{audience.description}</p>
                    </AudienceCard>
                  ))}
                </div>
              </div>
            </section>

            <section className="border-b border-neutral-300 py-10">
              <div className="max-w-3xl">
                <h2
                  id="pathway-use-cases"
                  className="scroll-mt-8 text-2xl font-semibold text-rmigray-800"
                >
                  Pathway use cases
                </h2>
                <div className="mt-5 space-y-4 text-rmigray-700 leading-7">
                  <p>
                    No one pathway can provide all the information or answer all
                    the questions an analyst might have. Different transition
                    pathways are necessary to answer different questions.
                  </p>
                  <p>
                    A global 1.5°C pathway may be well suited to assessing the
                    level of ambition of a global portfolio, while a regional,
                    policy-driven pathway provides more relevant insights into
                    risks and dynamics within a specific market. Selecting the
                    right pathway is therefore critical to ensuring that an
                    analysis is meaningful, robust, and decision-useful.
                  </p>
                  <p>
                    The Transition Pathways Repository helps users understand
                    these differences up front — making it easier to choose the
                    most appropriate pathway for their specific objective and
                    avoid misinterpretation or an inaccurate analysis.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
                {useCases.map((useCase) => (
                  <UseCaseCard
                    key={useCase.title}
                    title={useCase.title}
                    subtitle={useCase.subtitle}
                    bullets={useCase.bullets}
                  />
                ))}
              </div>
            </section>

            <section className="border-b border-neutral-300 py-10">
              <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <h2
                    id="transition-intelligence"
                    className="scroll-mt-8 text-2xl font-semibold text-rmigray-800"
                  >
                    Creating transition intelligence
                  </h2>
                  <div className="mt-5 space-y-4 text-rmigray-700 leading-7">
                    <p>
                      Corporate transition assessments should not be a simple
                      box-checking exercise. Corporate transition assessments
                      should deliver business value through transition
                      intelligence.
                    </p>
                    <p>
                      This requires a forward-looking understanding of how
                      sectors are expected to evolve, the technologies that will
                      underpin decarbonization, and the external conditions that
                      will shape the pace and feasibility of change. Transition
                      pathways provide this essential context, enabling a more
                      rigorous evaluation of whether corporate strategies are
                      credible, actionable, and aligned with broader
                      system-level transformations. See this{" "}
                      <a
                        href="https://rmi.org/scaling-transition-intelligence/"
                        className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
                      >
                        case study
                      </a>{" "}
                      for an example analysis.
                    </p>
                    <p>
                      The Transition Pathways Repository supports this by
                      providing structured, comparable, and transparent pathway
                      data that can be directly applied in corporate transition
                      assessments.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="py-10">
              <div className="max-w-3xl">
                <h2
                  id="looking-for-more-information"
                  className="scroll-mt-8 text-2xl font-semibold text-rmigray-800"
                >
                  Looking for more information?
                </h2>
                <p className="mt-4 max-w-3xl text-rmigray-700 leading-7">
                  Find RMI’s thought leadership related to transition
                  intelligence, pathway selection, and other transition finance
                  topics at RMI’s{" "}
                  <a
                    href="https://rmi.org/transitionfinance/"
                    className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
                  >
                    <b>Transition Finance Resource Hub</b>
                  </a>
                  .
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcesUseCasesPage;
