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
  { slug: "challenge", title: "Challenge" },
  {
    slug: "how-the-tpr-helps",
    title: "How the Transition Pathways Repository helps",
  },
  { slug: "analysis", title: "Analysis" },
  { slug: "final-notes", title: "Final notes" },
] as const;

type CaseStudySectionSlug = (typeof caseStudySections)[number]["slug"];

/** A source the case study cites: a link, a reference without one, or several
 * links grouped under a topic. */
type CaseStudySource =
  { href: string } | { reference: string } | { topic: string; links: string[] };

type CaseStudyContent = {
  /** Shown above the first sub-section. */
  intro?: React.ReactNode;
  /** The text of each sub-section. A missing one shows the placeholder. */
  sections?: Partial<Record<CaseStudySectionSlug, React.ReactNode>>;
  sources?: CaseStudySource[];
};

const linkClass =
  "text-energy-700 underline underline-offset-2 hover:text-energy-800";

/** Long URLs are the link text, so they may break anywhere to fit a phone. */
const SourceLink: React.FC<{ href: string }> = ({ href }) => (
  <a
    href={href}
    className={`${linkClass} break-all`}
  >
    {href}
  </a>
);

const SourceList: React.FC<{ sources: CaseStudySource[] }> = ({ sources }) => (
  <div className="border-t border-neutral-200 pt-4 text-sm">
    <h4 className="font-semibold text-rmigray-800">Sources</h4>
    <ul className="mt-2 list-disc space-y-1 pl-5">
      {sources.map((source) => {
        if ("href" in source) {
          return (
            <li key={source.href}>
              <SourceLink href={source.href} />
            </li>
          );
        }
        if ("reference" in source) {
          return <li key={source.reference}>{source.reference}</li>;
        }
        return (
          <li key={source.topic}>
            {source.topic}
            <ul className="mt-1 list-[circle] space-y-1 pl-5">
              {source.links.map((href) => (
                <li key={href}>
                  <SourceLink href={href} />
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  </div>
);

/**
 * A case study laid out on the shared outline. Each sub-heading gets an id
 * prefixed by the case study's own, so the on-page index nests it under the
 * right entry. Every sub-heading renders even before its text is written.
 */
const caseStudyBody = (id: string, content: CaseStudyContent = {}) => (
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
        {content.sections?.[section.slug] ?? <ToBeAdded />}
      </React.Fragment>
    ))}
    {content.sources ? <SourceList sources={content.sources} /> : null}
  </>
);

/** Screenshots and charts, styled like the figures on the Updates page. */
const figureClass = "w-full rounded-md border border-neutral-200 shadow-sm";

export const caseStudies: CaseStudy[] = [
  {
    id: "company-target-setting",
    title: "Company target setting",
    teaser:
      "Check whether a company's emissions targets are ambitious enough for its sector and region.",
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
          <p>
            Let’s look at a hypothetical independent power producer operating
            coal and gas assets in Indonesia that has committed to cut its Scope
            1 emissions intensity 50% by 2035 (vs. a 2024 baseline). Whether the
            company’s target meets a ‘high ambition’ threshold depends on what
            it is measured against. The IEA’s Net Zero Emissions (NZE) scenario
            for the power sector is a widely used reference, however this
            scenario only provides a global average which does not account for
            regional differences in the existing asset mix, coal fleet age,
            retirement schedule, demand growth, and financing constraints. As a
            result, this target is misaligned compared to the IEA NZE global
            power-sector pathway, but could be industry-leading in Southeast
            Asia (SEA).
          </p>
        ),
        "challenge": (
          <>
            <p>
              Evaluating this target as misaligned could prevent this company
              from accessing pools of much needed transition capital which could
              help it meet its climate targets. The perceived misalignment is
              derived from a global average benchmark being applied in an
              emerging market context, but a benchmark based specifically on the
              Indonesia or Southeast Asia (SEA) market may be more appropriate.
            </p>
            <p>
              Note that the opposite case could also be possible, where a region
              should be transitioning faster than the global average, and
              benefits from comparison to the global benchmark.
            </p>
          </>
        ),
        "how-the-tpr-helps": (
          <>
            <p>
              The TPR makes it easy to find and interpret region-specific
              pathways for this application. Filter by power sector pathways in
              Indonesia and SEA, ‘high ambition policies’, and data available
              for download. This yields five available pathways. One of the
              results is the Association of Southeast Asian Nations (ASEAN)
              Centre for Energy’s Carbon Neutrality Scenario (ACE CNS). This
              scenario does not have a temperature alignment, but sets
              net-zero-by-2050 as an explicit target, is built specifically to
              assess the SEA power system, and has emissions intensity data
              available.
            </p>
            <img
              src="/case-studies/company-target-setting-filters.png"
              alt="The repository's search filtered to Indonesia and Southeast Asia, the power sector, high policy ambition and downloadable data. ACE: Carbon Neutrality Scenario is among the results."
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
              2035. Comparing this target only to the NZE pathway would result
              in it being assessed as misaligned. Against the regional CNS
              pathway, the same target reads differently. The company’s 2035
              target sits below the CNS pathway, indicating it is aligned with
              what is still a highly ambitious pathway for the region. Using
              this benchmark for companies in the region as part of a transition
              framework would make more of them eligible for transition finance,
              while still ensuring a high degree of ambition.
            </p>
            <img
              src="/case-studies/company-target-setting-chart.png"
              alt="Line chart of normalized emissions intensity in kgCO2/kWh from 2024 to 2035. Both pathways start at 0.44 in 2024. By 2035, NZE falls to 0.05 and CNS to 0.24. The company's 2035 target of 0.22 sits just below CNS and far above NZE."
              loading="lazy"
              className={figureClass}
            />
            <p>
              Tailoring benchmarks to regions like this makes it more difficult
              to claim alignment with a particular temperature goal, but
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
            facing companies transitioning in SEA irrespective of their level of
            ambition. It is critical that any assessment of ambition is also
            paired with a{" "}
            <a
              href="https://rmi.org/resources/creating-transition-intelligence-enhancing-corporate-transition-assessments-for-financial-decision-making/"
              className={linkClass}
            >
              deeper assessment of a company’s transition plan
            </a>{" "}
            which includes comparison to other localized benchmarks across a
            range of scenarios.
          </p>
        ),
      },
    }),
  },
  {
    id: "investment-opportunity-identification",
    title: "Investment and financing opportunities",
    teaser:
      "Find the technologies and sectors that pathways expect to grow, to guide where capital goes.",
    icon: HandCoins,
    body: caseStudyBody("investment-opportunity-identification"),
  },
  {
    id: "policy-risk-assessment",
    title: "Policy risk assessment",
    teaser:
      "Understand how changes in policy could affect a company's transition plan.",
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
              determine how energy policies and programs impact its fleet, and
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
              energy sectors and subsequently introduce a domestic Emissions
              Trading Scheme. This is intended to support the transition towards
              low carbon technologies, fund R&amp;D, and align its carbon tax
              regime with the{" "}
              <a
                href="https://bernama.com/en/thoughts/news.php?id=2554435"
                className={linkClass}
              >
                EU’s CBAM
              </a>{" "}
              to ensure international competitiveness.
            </p>
          </>
        ),
        "challenge": (
          <>
            <p>
              For a Malaysian IPP, policy risks can arise from multiple angles.
              Exporting industries may face tax or tariff regimes elsewhere,
              such as the EU’s CBAM, which in turn influences domestic carbon
              policy. Geopolitical shocks, and resulting global fossil fuel
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
              reflects decisions about which technologies to invest in, and what
              the future fleet will look like. Comparing this trajectory with
              regional or national pathways can help investors assess exposure
              to policy risk. Projected emissions intensity affects future
              carbon costs, while the underlying technology decisions determine
              which policy or regulatory incentives the IPP can access.
            </p>
            <p>
              The Transition Pathways Repository allows users to identify
              pathways which could provide a suitable benchmark for policy risk.
              For this example, you can filter for pathways that cover the power
              sector in Malaysia, such as JRC GECO’s Reference and NDC-LTS
              pathways. These pathways show how emissions might evolve in a base
              case under existing policies (reference scenario), and an outcome
              if Nationally Determined Contributions and Long-term Strategies
              (NDC-LTS scenario) are met across Southeast Asia.
            </p>
            <img
              src="/case-studies/policy-risk-assessment-filters.png"
              alt="The repository's search filtered to Malaysia and the power sector, finding 23 pathways. JRC: Nationally Determined Contributions and Long-Term Strategies and JRC: Reference Scenario are among the results."
              loading="lazy"
              className={figureClass}
            />
          </>
        ),
        "analysis": (
          <>
            <p>
              Here we estimate the IPP’s future emissions intensity trajectory
              based on their investment pipeline, and compare it with JRC GECO’s
              Reference and NDC-LTS pathways, normalized to the IPP’s emissions
              intensity starting point.
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
              with the current policy environment. Then there is a further gap
              to the NDC-LTS pathway.
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
            trajectories which can be used to flag areas for further
            investigation and engagement with companies. Using multiple pathways
            enables analysts to evaluate sensitivity to different assumptions
            and identify commonalities across likely futures.
          </p>
        ),
      },
      sources: [
        {
          href: "https://www.iea.org/policies/25681-malaysia-carbon-tax?country%5B0%5D=Malaysia&qs=mal&status=Announced",
        },
        {
          href: "https://www.pwc.com/my/en/publications/2026/preparing-for-compliance-positioning-for-value.html",
        },
        {
          topic: "ETS scheme",
          links: [
            "https://icapcarbonaction.com/en/ets/malaysia",
            "https://www.pmiclimate.org/country/malaysia",
          ],
        },
        {
          href: "https://www.reccessary.com/en/news/malaysia-delays-carbon-tax",
        },
        {
          topic: "Market structure",
          links: ["https://singlebuyer.com.my/about-single-buyer/governance"],
        },
        {
          topic: "CRESS",
          links: [
            "https://singlebuyer.com.my/market/market-operations/programs/cress",
            "https://www.st.gov.my/sites/default/files/2026-04/Guidelines-for-CRESS_2.pdf",
          ],
        },
        {
          topic: "Carbon tax announced",
          links: [
            "https://www.mida.gov.my/mida-news/budget-2025-govt-to-introduce-carbon-tax-on-iron-steel-and-energy-industries-by-2026/",
            "https://belanjawan.mof.gov.my/pdf/belanjawan2026/ucapan/bs26.pdf",
          ],
        },
        {
          topic: "Carbon tax and ETS scope",
          links: [
            "https://www.businesstoday.com.my/2026/03/11/planned-carbon-tax-in-2026-to-focus-iron-steel-and-energy-sectors-first/",
          ],
        },
        {
          topic: "Carbon tax delayed",
          links: [
            "https://www.bernama.com/en/news.php?id=2547455",
            "https://www.thestar.com.my/news/nation/2026/04/21/carbon-tax-plan-put-on-hold-amid-middle-east-tensions-says-kurup",
            "https://www.thestar.com.my/business/business-news/2026/06/24/national-carbon-tax-policy-in-final-phase-says-mof",
            "https://www.thestar.com.my/news/nation/2026/06/19/carbon-tax-a-matter-of-time",
            "https://www.thestar.com.my/news/nation/2026/06/24/carbon-tax-bill-in-final-stage-of-drafting-dewan-rakyat-heard",
          ],
        },
        {
          topic: "EU CBAM connection",
          links: ["https://bernama.com/en/thoughts/news.php?id=2554435"],
        },
        { reference: "JRC Global Energy and Climate Outlook 2024" },
      ],
    }),
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
