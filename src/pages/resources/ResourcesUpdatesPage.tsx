import React from "react";

type UpdatePost = {
  title: string;
  date: string;
  body: React.ReactNode;
};

const posts: UpdatePost[] = [
  // Add new posts at the top so the latest update appears first.
  // Example:
  // {
  //   title: "Power sector coverage expanded for Southeast Asia",
  //   date: "May 7, 2026",
  //   body: (
  //     <>
  //       <p>
  //         We added new pathway coverage for additional Southeast Asian
  //         markets and refreshed several pathway summaries.
  //       </p>
  //       <p>
  //         This update makes it easier to compare regional and country-level
  //         pathways for transition assessments.
  //       </p>
  //     </>
  //   ),
  // },
  {
    title: "Why comparing energy transition pathways matters",
    date: "August 27, 2026",
    body: (
      <>
        <p>
          Energy transition pathways are essential for Corporate Transition
          Assessments (CTAs). They provide benchmarks for evaluating whether a
          company’s emissions targets, investments, technology strategy, and
          asset portfolio are consistent with its transition plan and the
          broader sectoral transition trends.
        </p>
        <p>
          However, selecting an appropriate pathway is rarely straightforward.
          Sector pathways targeting similar climate outcomes can differ
          significantly in geographic scope, energy-demand assumptions,
          technology cost and deployment trends, and the pace of emissions
          reductions, among other factors. This makes it difficult for users to
          decide which pathway to use as a benchmark for a CTA or understand how
          the choice of pathway affects the assessment’s conclusions.
        </p>
        <p>
          The new comparison view in RMI’s Transition Pathway Repository helps
          users understand how assumptions and scopes vary across pathways. It
          allows users to examine up to three pathways side by side, including
          their geographic and sector coverage, key model assumptions, trends,
          and quantitative benchmarks. This makes it easier to understand not
          only where pathways agree, but also why they differ.
        </p>
        <p>
          The following comparison of three ambitious power-sector pathways
          demonstrates the value of this new feature. The pathways being
          compared are:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            International Energy Agency’s Net Zero Emissions by 2050 Scenario
            (IEA NZE)
          </li>
          <li>
            European Commission Joint Research Centre’s Global Energy and
            Climate Outlook 1.5°C Scenario (GECO 1.5°C)
          </li>
          <li>
            ASEAN Centre for Energy’s Carbon Neutrality Scenario (ACE CNS)
          </li>
        </ul>
        <p>
          All three pathways model substantial power-sector decarbonization. Yet
          comparing them reveals different views of how quickly the transition
          occurs, which technologies drive it, and how regional conditions
          change implementation.
        </p>
        <h3 className="text-lg font-semibold text-rmigray-800">
          Insight #1: Global ambition and regional context provide different
          insights
        </h3>
        <p>
          IEA NZE and GECO 1.5°C are global pathways. They provide benchmarks
          for understanding the scale and pace of change required to meet
          ambitious international climate goals. ACE CNS focuses specifically on
          Southeast Asia and reflects the region’s growing electricity demand,
          existing power mix, renewable resource potential, national
          commitments, and infrastructure needs.
        </p>
        <p>
          Although GECO 1.5°C is developed as a global pathway, its results can
          be viewed at the Southeast Asian and country levels. This can provide
          useful geographic detail, but the regional results also inherit
          globally applied assumptions, including assumptions about policy and
          carbon pricing. As global results are translated to the regional
          level, some country- and region-specific information may therefore be
          generalized or simplified. In comparison, ACE CNS was developed
          through regional and national energy system modeling, using data from
          ASEAN Member States, allowing it to reflect regional conditions more
          directly.
        </p>
        <img
          src="/updates/how-to-comparison-view-1.png"
          alt="Comparison view showing pathway summary cards and policy assumptions side by side."
          loading="lazy"
          className="w-full rounded-xl border border-neutral-200 shadow-sm"
        />
        <p>
          GECO 1.5°C may be most appropriate for testing whether a Southeast
          Asia electricity company’s overall ambition is consistent with a 1.5°C
          future, but the ACE CNS provides a more relevant benchmark for
          evaluating whether a company’s technology development and transition
          plans are feasible given local constraints.
        </p>
        <p>
          The comparison tool does not identify one pathway as ‘the best’.
          Instead, it helps users determine which pathway is most appropriate
          for the question being assessed and where multiple pathways may be
          needed.
        </p>
        <h3 className="text-lg font-semibold text-rmigray-800">
          Insight #2: Similar pathway goals can produce different regional
          benchmarks
        </h3>
        <p>
          Comparing GECO 1.5°C and ACE CNS at the Southeast Asia regional level
          shows that pathways with similarly ambitious long-term goals can still
          produce materially different regional benchmarks. GECO uses a global
          modeling framework on Southeast Asia, while ACE CNS is constructed
          specifically around the ASEAN energy system. This provides a useful
          test of how different assumptions and modeling approaches shape the
          transition shown for the same region.
        </p>
        <p>
          The difference is evident in the pathways’ near-term power sector
          benchmarks. ACE CNS shows a slower decline in emissions intensity than
          the Southeast Asian results from GECO. This corresponds with a slower
          buildout of wind and solar capacity in ACE CNS, while its power system
          retains a larger role for existing generation sources, including
          fossil fuels. This comparison, therefore, shows that selecting the
          same apparent high ambition and geography does not necessarily yield
          the same transition trajectory.
        </p>
        <img
          src="/updates/how-to-comparison-view-2.png"
          alt="Comparison view showing pathway summary cards and benchmark capacity plots side by side."
          loading="lazy"
          className="w-full rounded-xl border border-neutral-200 shadow-sm"
        />
        <p>
          These differences reflect the pathways’ assumptions around regional
          constraints and technology costs. Both GECO 1.5°C and ACE CNS use
          least-cost optimization approaches to identify cost-effective
          transition pathways, but they use different modeling frameworks and
          assumptions. CNS is intended to balance decarbonization with regional
          energy security, affordability, and development needs. At the same
          time, different assumptions about future technology costs and
          deployment can influence how quickly technologies become competitive
          in cost-optimization models. The comparison view does not provide
          every assumption and modeling difference for comparison, but it will
          highlight differences in outputs that warrant a deeper look.
        </p>
        <p>
          The comparison view also highlights subtle differences in geographic
          coverage. While ACE defines Southeast Asia as the ASEAN Member States,
          JRC GECO uses a broader regional definition that additionally includes
          Mongolia, North Korea, and Taiwan<sup>1</sup>. As a result, benchmark
          differences may reflect both modeling assumptions and differences in
          regional boundaries.
        </p>
        <p>
          As a result of these differences, a company may appear more or less
          aligned depending on which regional benchmark is used. Rather than
          treating one pathway result as definitive, users can consider which
          pathway assumptions are most relevant to their use case.
        </p>
        <div className="mt-6 border-t border-neutral-200 pt-4">
          <p className="text-sm text-rmigray-500">
            <sup>1</sup> Country and regional representations follow the
            conventions used in the underlying data sources and do not reflect
            any institutional point of view by RMI.
          </p>
        </div>
      </>
    ),
  },
  {
    title:
      "Four lessons learned from evaluating the transition pathway landscape in the Southeast Asia power sector",
    date: "May 15, 2026",
    body: (
      <>
        <p>
          RMI’s Transition Pathway Repository was developed to make transition
          pathways easier to find and use, starting with the Southeast Asia
          power sector. The development process revealed where decision-useful
          pathways data already exists, but also where key gaps still limit how
          these pathways can be effectively used in transition assessments.
        </p>
        <p>Four key lessons learned from this process were:</p>
        <ol className="list-decimal space-y-4 pl-5">
          <li>
            <p>
              <b>
                The power pathway landscape in emerging markets is richer than
                expected
              </b>
            </p>
            <p>
              RMI’s systematic review of the pathways available in Southeast
              Asia revealed almost 60 pathways currently available on the
              Repository from 17 different publications and 11 different
              institutions.
            </p>
          </li>
          <li>
            <p>
              <b>
                Pathway developers output consistent and granular data points
                for most power sector indicators
              </b>
            </p>
            <p>
              Transition assessment methodologies show a high degree of
              convergence around a core set of power-sector indicators,
              including absolute emissions, installed capacity mix, generation
              mix, and emissions intensity.
            </p>
          </li>
          <li>
            <p>
              <b>Access to underlying pathway data is still limited</b>
            </p>
            <p>
              Underlying data for these pathways is often confined to high-level
              reports and not readily available publicly.
            </p>
          </li>
          <li>
            <p>
              <b>
                By focusing on generation, transition pathways can miss other
                dependencies
              </b>
            </p>
            <p>
              Assumptions or modeling related to grid infrastructure, demand
              flexibility, interconnection, and investment needs are frequently
              simplified, lack granularity, or are absent.
            </p>
          </li>
        </ol>

        <p>
          <b>
            Read the{" "}
            <a
              href="https://rmi.org/improving-energy-transition-assessments-with-regional-pathways/"
              className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
            >
              full article
            </a>{" "}
            for a complete explanation of these lessons.
          </b>
        </p>
      </>
    ),
  },
  {
    title:
      "Introducing the Transition Pathways Repository: Making Transition Analysis Actionable",
    date: "December 11, 2025",
    body: (
      <>
        <p>
          On December 11, 2025, RMI’s Climate Finance team launched the pilot
          version of the Transition Pathways Repository (TPR), an online tool
          designed to bring clarity and efficiency to corporate transition
          analysis by making more than 50 transition pathways accessible in a
          single place.
        </p>
        <p>
          During the launch webinar, we explored the evolving landscape of
          corporate transition analyses and discussed how transition plan
          assessments can inform decision-making within financial institutions,
          strengthening metrics used across sustainability, risk, strategy, and
          front office functions.
        </p>
        <p>
          To deliver real value, transition plan credibility assessments must go
          beyond high-level narratives. They need to be granular,
          forward-looking, and generate metrics that are decision-useful for
          existing risk and front office workflows. These metrics often require
          transition pathways to put them into context but finding the right
          transition pathway to provide that context can be time-consuming and
          resource intensive.{" "}
          <b>
            The TPR helps financial institutions navigate the vast field of
            transition pathways, making it easier and faster to identify
            relevant benchmarks for assessing how effectively companies are
            navigating the transition.
          </b>
        </p>
        <p>
          Watch the{" "}
          <a
            href="https://www.youtube.com/watch?v=Xq730bspPh4"
            className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
          >
            <b>recording of our launch webinar</b>
          </a>
          .
        </p>
        <p>
          The pilot version of this tool focuses on the power sector in
          Southeast Asia, offering a first look at the platform’s capabilities.
          But stay tuned for updates on new features and expanded regional and
          sectoral coverage in 2026.
        </p>
      </>
    ),
  },
];

const ResourcesUpdatesPage: React.FC = () => {
  return (
    <div className="bg-gray-50">
      <div className="container mx-auto px-4 py-8 md:py-10">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-rmiblue-800 px-6 py-8 text-white shadow-lg md:px-10 md:py-11">
          <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-energy-700/10" />
          <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-white/7 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-energy-500/8 blur-2xl" />

          <div className="relative">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Updates
            </h1>

            <p className="mt-6 text-xl font-semibold leading-8 text-white/95 md:text-2xl">
              Check out the latest from our team on the Transition Pathways
              Repository (TPR) and its use cases.
            </p>
          </div>
        </section>

        {/* No OnPageIndex on this page (#802): it has only one top-level h2
            ("Latest updates" below), so a table of contents would have
            nothing to navigate to. */}
        <section className="mx-auto mt-12 max-w-5xl">
          <div className="max-w-5xl">
            <h2 className="text-2xl font-semibold text-rmigray-800 mt-8">
              Latest updates
            </h2>
          </div>

          {posts.length > 0 ? (
            <div className="mt-8 max-w-5xl space-y-6">
              {posts.map((post) => (
                <article
                  key={`${post.date}-${post.title}`}
                  className="rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm"
                >
                  <div>
                    <h3 className="text-2xl font-semibold text-rmigray-800">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-rmigray-500">
                      {post.date}
                    </p>
                  </div>

                  <div className="mt-6 space-y-4 text-rmigray-700 leading-7">
                    {post.body}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8 max-w-5xl rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm">
              <p className="text-rmigray-700 leading-7">
                No posts have been added yet. When you are ready, add a new
                entry to the `posts` array at the top of this file.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ResourcesUpdatesPage;
