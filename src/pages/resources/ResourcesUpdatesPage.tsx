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
