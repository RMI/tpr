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

/** The sub-sections every case study shares, in order. */
const caseStudySections = [
  { slug: "situation", title: "Situation" },
  {
    slug: "how-the-tpr-helps",
    title: "How the Transition Pathways Repository helps",
  },
  { slug: "analysis", title: "Analysis" },
  { slug: "final-notes", title: "Final notes" },
] as const;

type CaseStudySectionSlug = (typeof caseStudySections)[number]["slug"];

type CaseStudyContent = {
  /** Shown above the first sub-section. */
  intro?: React.ReactNode;
  /** The text of each sub-section. */
  sections: Record<CaseStudySectionSlug, React.ReactNode>;
};

const linkClass =
  "text-energy-700 underline underline-offset-2 hover:text-energy-800";

/**
 * A case study laid out on the shared outline. Each sub-heading gets an id
 * prefixed by the case study's own, so the on-page index nests it under the
 * right entry.
 */
const caseStudyBody = (id: string, content: CaseStudyContent) => (
  <>
    {content.intro}
    {caseStudySections.map((section) => (
      <React.Fragment key={section.slug}>
        <h3
          id={`${id}-${section.slug}`}
          className="scroll-mt-8 text-lg font-semibold text-rmigray-800"
        >
          {section.title}
        </h3>
        {content.sections[section.slug]}
      </React.Fragment>
    ))}
  </>
);

/** Screenshots and charts, styled like the figures on the Updates page. */
const figureClass = "w-full rounded-md border border-neutral-200 shadow-sm";

export const caseStudies: CaseStudy[] = [
  {
    id: "company-target-setting",
    title: "Company target setting",
    teaser:
      "Understand how a company's emissions targets compare to its sector and region.",
    icon: Target,
    body: caseStudyBody("company-target-setting", {
      intro: (
        <p>
          When a lender or investor screens a company’s climate targets and
          transition plan for ambition, the chosen benchmarks have a significant
          impact. Applying a global pathway to a regional utility can flag a
          target as not aligned, while ignoring the region-specific constraints
          they may face.
        </p>
      ),
      sections: {
        "situation": (
          <>
            <p>
              Let’s look at a hypothetical independent power producer operating
              gas assets in Indonesia that has committed to cut its Scope 1
              emissions intensity 50% by 2035 (versus a 2024 baseline). Whether
              the company’s target meets a “high ambition” threshold depends on
              what it is measured against. The IEA’s Net Zero Emissions (NZE)
              scenario for the power sector is a widely used reference, but this
              scenario has very limited regional granularity and the global
              average is typically used. A global average cannot account for
              regional differences in the existing asset mix, coal fleet age,
              retirement schedule, demand growth, and financing constraints. As
              a result, this target is misaligned compared to the IEA NZE global
              power-sector pathway, but could be industry-leading in Southeast
              Asia.
            </p>
            <p>
              Evaluating this target as misaligned could prevent this company
              from accessing pools of much needed transition capital that could
              help it meet its climate targets. The perceived misalignment is
              derived from a global average benchmark being applied in an
              emerging market context, but a benchmark based specifically on the
              Indonesian or Southeast Asian market may be more appropriate.
            </p>
            <p>
              Note that the opposite case could also be possible, where a region
              should be transitioning faster than the global average, and would
              then benefit from comparison to the global benchmark.
            </p>
          </>
        ),
        "how-the-tpr-helps": (
          <>
            <p>
              The Transition Pathways Repository makes it easy to find and
              interpret region-specific pathways for this application. You can
              filter by power sector pathways in Indonesia and Southeast Asia,
              high ambition policies, and data available for download. One of
              the results is the Association of Southeast Asian Nations Centre
              for Energy’s Carbon Neutrality Scenario (ACE CNS). This scenario
              does not have a temperature alignment but sets net zero by 2050 as
              an explicit target, is built specifically to assess the Southeast
              Asian power system, and has emissions intensity data available.
            </p>
            <img
              src="/case-studies/company-target-setting-filters.png"
              alt="The repository's search with filters set for geography, policy ambition, sector and data availability. ACE: Carbon Neutrality Scenario is highlighted among the results, next to JETP ID: Comprehensive Investment and Policy Plan and JRC: 1.5°C Scenario."
              loading="lazy"
              className={figureClass}
            />
          </>
        ),
        "analysis": (
          <>
            <p>
              The chart below shows the NZE and CNS pathways normalized to the
              company starting point in 2024, as well as the company target in
              2035. Comparing this target only to the global IEA NZE pathway
              would result in it being assessed as misaligned. Against the
              regional CNS pathway, the same target reads differently. The
              company’s 2035 target sits below the CNS pathway, indicating it is
              aligned with what is still a highly ambitious pathway for the
              region. Using this benchmark for companies in the region as part
              of a transition framework would make more of them eligible for
              transition finance, while still ensuring a high degree of
              ambition.
            </p>
            <img
              src="/case-studies/company-target-setting-chart.png"
              alt="Line chart of normalized emissions intensity in kgCO2/kWh from 2024 to 2035. Both pathways start at 0.44 in 2024. By 2035, NZE falls to 0.05 and CNS to 0.24. The company's 2035 target of 0.22 sits just below CNS and far above NZE."
              loading="lazy"
              className={figureClass}
            />
            <p>
              Tailoring benchmarks to regions like this makes it more difficult
              to claim alignment with a particular temperature goal. However, it
              addresses the issue of locking emerging market issuers out of
              transition-labeled finance.
            </p>
          </>
        ),
        "final-notes": (
          <p>
            CNS, like most normative pathways, provides a measure of ambition,
            but not necessarily feasibility. There are still many constraints
            (financing, grid capacity, political risk with coal retirement)
            facing companies transitioning in Southeast Asia irrespective of
            their level of ambition. It is critical that any assessment of
            ambition is also paired with a{" "}
            <a
              href="https://rmi.org/resources/creating-transition-intelligence-enhancing-corporate-transition-assessments-for-financial-decision-making/"
              className={linkClass}
            >
              deeper assessment of a company’s transition plan
            </a>{" "}
            including comparing it to other localized benchmarks across a range
            of scenarios.
          </p>
        ),
      },
    }),
  },
  {
    id: "investment-opportunity-identification",
    title: "Investment and financing opportunities",
    teaser:
      "See which technologies regional pathways expect to grow, and how a company's project pipeline compares.",
    icon: HandCoins,
    body: caseStudyBody("investment-opportunity-identification", {
      intro: (
        <p>
          Transition pathways can indicate how renewables are expected to scale
          compared to fossil fuels under current and assumed policy and market
          environments, giving financial institutions an indication of which
          markets may be growing or shrinking.
        </p>
      ),
      sections: {
        "situation": (
          <>
            <p>
              Let’s look at a hypothetical commercial bank in Thailand. The
              hypothetical bank’s power sector lending has mostly gone to
              gas-fired independent power producers (IPPs) that sell to the
              Electricity Generating Authority of Thailand (EGAT) under
              long-term contracts. Gas makes up 75% of the capacity in its
              current portfolio pipeline, with renewables making up the
              remaining share.
            </p>
            <p>
              If more of Thailand’s new capacity shifts to solar and wind, there
              will be fewer gas deals over time, and an increasing opportunity
              for renewables financing. To support existing clients in this
              transition, and win new business, the bank would need to increase
              their expertise and capacity on renewables financing, but how can
              they build confidence that this shift is coming and anticipate the
              market?
            </p>
          </>
        ),
        "how-the-tpr-helps": (
          <>
            <p>
              Regional transition pathways can show where the power sector is
              heading based on different assumptions. Comparing a pathway’s
              future capacity mix with a lending pipeline shows where a bank is
              positioned for growth and where it is exposed to technologies that
              are losing market share.
            </p>
            <p>
              To find a suitable pathway, you can filter for pathways that cover
              the power sector in Thailand, with assumptions aligned with
              current policies, and have data available directly in the tool.
              One option this yields is the JRC reference scenario. This pathway
              is a cost-optimized scenario based on policies legislated by
              December 2025, well-suited to identifying which technologies will
              be competitive and scale in the current policy and market
              environment.
            </p>
            <img
              src="/case-studies/investment-opportunity-identification-filters.png"
              alt="The repository's search with filters set for geography, policy ambition, sector and data availability. Two pathways match: JRC: Reference Scenario, which is highlighted, and TransitionZero: Business as Usual."
              loading="lazy"
              className={figureClass}
            />
          </>
        ),
        "analysis": (
          <>
            <p>
              The chart below shows how the JRC reference pathway projects
              renewables will scale in Thailand by 2030 and 2035.
            </p>
            <img
              src="/case-studies/investment-opportunity-identification-chart.png"
              alt="Stacked bar chart of the share of installed capacity. The 2023 existing fleet is 25% renewables and 75% fossil fuels. Under the JRC Reference pathway, renewables reach 48% in 2030 and 71% in 2035."
              loading="lazy"
              className={figureClass}
            />
            <p>
              Under the JRC reference pathway, renewables go from a minority of
              Thailand’s fleet today to the majority by 2035. Getting there
              means a fifteenfold growth in renewables compared to a 6.5% rise
              in Thailand’s gas capacity from 2022 to 2035. An investment
              pipeline that is majority gas may look like the existing fleet,
              but it puts most of the bank’s new lending into a shrinking
              segment of the market.
            </p>
            <p>
              Since this pathway was published, the government of Thailand has
              drafted a new Power Development Plan (PDP) for 2026–2050. The
              draft targets a 50% clean energy share of electricity generation
              within 10 years. The JRC reference pathway showed this shift
              occurring before the PDP made it a government target (pending
              approval).
            </p>
            <p>
              Banks making use of country-level pathways will have seen this
              signal of the potential for renewables growth in Thailand ahead of
              the shifting targets. With this knowledge, the bank can invest
              internally in capacity building on renewables technologies, and be
              well-positioned to capitalize on this growth market by engaging
              with existing clients on their plans to develop renewables
              pipelines, and winning business supporting new entrants in the
              renewables space.
            </p>
          </>
        ),
        "final-notes": (
          <p>
            The JRC pathway projects this explosion of renewables growth under
            current policy conditions on the basis of cost. However, this
            doesn’t guarantee projects get built. EGAT still buys most of
            Thailand’s power, so procurement rounds, grid access, and the final
            direct PPA rules will also be factors to consider.
          </p>
        ),
      },
    }),
  },
  {
    id: "policy-risk-assessment",
    title: "Policy risk assessment",
    teaser:
      "Spot policy risk in a company's transition plan by comparing it to policy-based pathways.",
    icon: Landmark,
    body: caseStudyBody("policy-risk-assessment", {
      intro: (
        <p>
          When trying to understand how announced energy sector policies may
          impact an independent power producer (IPP), transition pathways can
          play a helpful role as a benchmark.
        </p>
      ),
      sections: {
        "situation": (
          <>
            <p>
              Let’s look at a hypothetical IPP in Malaysia. Malaysia is a
              partially liberalized power market with a large government-linked
              utility (TNB), where IPPs can generate power and sell to TNB’s
              Single Buyer. The type of generation assets an IPP builds will
              determine how energy policies and programs impact its fleet and
              shape its policy risk exposure.
            </p>
            <p>
              In 2024 Malaysia implemented the{" "}
              <a
                href="https://singlebuyer.com.my/market/market-operations/programs/cress"
                className={linkClass}
              >
                Corporate Renewable Energy Supply Scheme
              </a>{" "}
              (
              <a
                href="https://www.st.gov.my/sites/default/files/2026-04/Guidelines-for-CRESS_2.pdf"
                className={linkClass}
              >
                CRESS
              </a>
              ), allowing IPPs to sell renewable electricity directly to
              corporate buyers. Additionally, Malaysia plans to implement{" "}
              <a
                href="https://belanjawan.mof.gov.my/pdf/belanjawan2026/ucapan/bs26.pdf"
                className={linkClass}
              >
                several laws
              </a>{" "}
              that will start to levy a carbon tax on the steel, iron, and
              energy sectors and subsequently introduce a domestic emissions
              trading scheme (ETS). This is intended to support the transition
              toward low-carbon technologies, fund R&amp;D, and align Malaysia’s
              carbon tax regime with the{" "}
              <a
                href="https://bernama.com/en/thoughts/news.php?id=2554435"
                className={linkClass}
              >
                EU’s Carbon Border Adjustment Mechanism
              </a>{" "}
              (CBAM) to ensure international competitiveness.
            </p>
            <p>
              For a Malaysian IPP, policy risks can arise from multiple angles.
              Exporting industries may face tax or tariff regimes elsewhere,
              such as the EU’s CBAM, which in turn influences domestic carbon
              policy. Geopolitical shocks and resulting global fossil fuel
              prices can further impact or delay policy implementation. For
              example, Malaysia recently delayed its planned carbon tax to
              reduce pressure on industry. Nevertheless, government statements
              indicate that carbon pricing remains a question of when, rather
              than if.
            </p>
            <p>
              Navigating these uncertainties is crucial for strategic planning
              at the level of the IPP and its financiers.
            </p>
          </>
        ),
        "how-the-tpr-helps": (
          <>
            <p>
              An IPP’s projected emissions intensity can serve as a proxy for
              its strategic plan and exposure to carbon price risk, as it
              reflects decisions about which technologies to invest in and what
              the future fleet will look like. Comparing this trajectory with
              regional or national pathways can help investors assess exposure
              to policy risk. Projected emissions intensity affects future
              carbon costs, while the underlying technology decisions determine
              which policy or regulatory incentives the IPP can access.
            </p>
            <p>
              The Transition Pathways Repository allows you to identify pathways
              that could provide a suitable benchmark for policy risk. For this
              example, you can filter for pathways that cover the power sector
              in Malaysia, such as JRC GECO’s Reference and NDC-LTS pathways.
              These pathways show how emissions might evolve in a base case
              under existing policies (reference scenario), and an outcome if
              Nationally Determined Contributions and long-term strategies
              (NDC-LTS scenario) are met across Southeast Asia.
            </p>
            <img
              src="/case-studies/policy-risk-assessment-filters.png"
              alt="The repository's search with Malaysia selected in the geography filter, plus filters for sector and data availability. JRC: Nationally Determined Contributions and Long-Term Strategies and JRC: Reference Scenario are highlighted among the results."
              loading="lazy"
              className={figureClass}
            />
          </>
        ),
        "analysis": (
          <>
            <p>
              The exhibit below displays the IPP’s estimated future emissions
              intensity trajectory based on its investment pipeline compared
              with JRC GECO’s Reference and NDC-LTS pathways, normalized to the
              IPP’s emissions intensity starting point.
            </p>
            <img
              src="/case-studies/policy-risk-assessment-chart.png"
              alt="Line chart of emissions intensity indexed to 2022 = 100, from 2022 to 2040. By 2040 the company's projected trajectory falls to about 67, the Reference pathway to about 35 and the NDC-LTS pathway to about 29."
              loading="lazy"
              className={figureClass}
            />
            <p>
              Based on its 2022 starting point and current investment pipeline,
              the company is decarbonizing at a rate that does not keep pace
              with the current policy environment. There is a further gap to the
              NDC-LTS pathway.
            </p>
            <p>
              Both gaps point to policy risk for the company. Depending on the
              policy mechanisms at play, these gaps may lead to anything from a
              loss of market share or foregone profits to actual financial
              penalties. For example, a company that does not take steps to
              decarbonize its power generation may face higher carbon costs due
              to the domestic ETS scheme once it takes effect.
            </p>
          </>
        ),
        "final-notes": (
          <p>
            Policy amendments and delays in response to geopolitical changes and
            price shocks demonstrate how using pathways comes with inherent
            uncertainty. Pathways provide a range of possible future sector
            trajectories that can be used to flag areas for further
            investigation and engagement with companies. Using multiple pathways
            enables analysts to evaluate sensitivity to different assumptions
            and identify commonalities across likely futures.
          </p>
        ),
      },
    }),
  },
];

const CaseStudiesPage: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-gray-50">
      <PageHeader
        title="Case Studies"
        subtitle="Worked examples of how to use the Transition Pathways Repository (TPR) to answer common questions related to corporate transition assessments."
      >
        <p>
          Each case study walks through a question a financial institution might
          ask, how to find pathways that fit it, and how to compare a company
          against those pathways. These are steps in creating transition
          intelligence.
        </p>
        <p>
          The companies in these case studies are hypothetical examples. The
          pathways and their data are real and taken from the TPR.
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
