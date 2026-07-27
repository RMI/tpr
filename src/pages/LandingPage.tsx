import React from "react";
import { Link } from "react-router-dom";
import HeaderNav from "../components/HeaderNav";
import { HeaderBrand } from "../components/Header";

const WavePattern: React.FC = () => {
  return (
    <div className="absolute inset-0">
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id="gradient1"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop
              offset="0%"
              stopColor="rgba(255,255,255,0.04)"
            />
            <stop
              offset="50%"
              stopColor="rgba(255,255,255,0.06)"
            />
            <stop
              offset="100%"
              stopColor="rgba(255,255,255,0.04)"
            />
          </linearGradient>
          <linearGradient
            id="gradient2"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop
              offset="0%"
              stopColor="rgba(255,255,255,0.05)"
            />
            <stop
              offset="50%"
              stopColor="rgba(255,255,255,0.1)"
            />
            <stop
              offset="100%"
              stopColor="rgba(255,255,255,0.05)"
            />
          </linearGradient>
          <linearGradient
            id="gradient3"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop
              offset="0%"
              stopColor="rgba(255,255,255,0.03)"
            />
            <stop
              offset="50%"
              stopColor="rgba(255,255,255,0.07)"
            />
            <stop
              offset="100%"
              stopColor="rgba(255,255,255,0.03)"
            />
          </linearGradient>
        </defs>
        <path
          d="M-10 50 Q 25 20, 50 50 T 110 50 V100 H-10"
          fill="url(#gradient1)"
        >
          <animate
            attributeName="d"
            dur="45s"
            repeatCount="indefinite"
            values="
      M-10 45 Q 25 35, 50 55 T 110 45 V100 H-10;
      M-10 55 Q 20 45, 50 35 T 110 55 V100 H-10;
      M-10 45 Q 30 55, 50 45 T 110 45 V100 H-10;
      M-10 45 Q 25 35, 50 55 T 110 45 V100 H-10"
          />
        </path>
        <path
          d="M-10 50 Q 25 30, 50 50 T 110 50 V100 H-10"
          fill="url(#gradient2)"
        >
          <animate
            attributeName="d"
            dur="30s"
            repeatCount="indefinite"
            values="
      M-10 45 Q 35 40, 50 55 T 110 45 V100 H-10;
      M-10 55 Q 15 50, 50 45 T 110 55 V100 H-10;
      M-10 45 Q 25 40, 50 55 T 110 45 V100 H-10;
      M-10 45 Q 35 40, 50 55 T 110 45 V100 H-10"
          />
        </path>
        <path
          d="M-10 50 Q 25 40, 50 50 T 110 50 V100 H-10"
          fill="url(#gradient3)"
        >
          <animate
            attributeName="d"
            dur="60s"
            repeatCount="indefinite"
            values="
      M-10 52 Q 20 45, 50 48 T 110 52 V100 H-10;
      M-10 48 Q 30 55, 50 52 T 110 48 V100 H-10;
      M-10 52 Q 20 45, 50 48 T 110 52 V100 H-10;
      M-10 52 Q 20 45, 50 48 T 110 52 V100 H-10"
          />
        </path>
      </svg>
    </div>
  );
};

const InfoCard: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="rounded-lg bg-white shadow p-6">
    <h3 className="text-sm font-semibold text-rmiblue-800 mb-3 text-center">
      {title}
    </h3>
    <div className="text-sm text-rmigray-700 text-center">{children}</div>
  </div>
);

const LandingPage: React.FC = () => {
  return (
    <div className="bg-gray-50">
      {/* Hero */}
      <div className="relative overflow-x-hidden">
        <div className="absolute inset-0 bg-rmiblue-800/100" />
        <WavePattern />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-energy/5 to-transparent" />

        <div className="relative text-white">
          <div className="container mx-auto px-4 pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <HeaderBrand to="/" />
              <HeaderNav />
            </div>
          </div>

          <div className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Transition Pathways Repository
              </h1>
              <p className="mt-4 text-lg md:text-xl text-white/90">
                Find and compare transition pathways to support corporate
                transition assessments.
              </p>

              <p className="mt-8 text-sm md:text-base text-white/85 max-w-3xl mx-auto">
                The Transition Pathways Repository helps financial institutions
                identify and compare pathways based on their specific analytical
                needs. Use it to identify key transition levers, benchmark
                ambition, test transition plan feasibility, and assess policy
                exposure.
              </p>

              <p className="mt-8 text-sm md:text-base text-white/85 max-w-3xl mx-auto">
                Note that this version of the TPR is a pilot covering only
                pathways related to the power sector in Southeast Asia. Stay
                tuned for more pathways being added in 2026!
              </p>

              <div className="mt-10">
                <Link
                  to="/pathway"
                  className="inline-block px-8 py-4 bg-energy-700 text-neutral-300 rounded-md hover:bg-energy-800 transition-colors duration-200 text-lg font-semibold"
                >
                  Explore Pathways
                </Link>
              </div>

              <p className="mt-6 text-sm italic text-white/80">
                See what pathways are available for the Southeast Asia power
                sector.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <section className="pb-10 border-b border-neutral-200">
            <h2 className="text-xl font-semibold text-rmiblue-800 mb-3">
              What is the Transition Pathways Repository?
            </h2>
            <p className="text-rmigray-700">
              The Transition Pathways Repository (TPR) is an online repository
              designed to help financial institutions identify, interpret, and
              compare the transition pathways available across sectors and
              regions.
            </p>
            <p className="text-rmigray-700 mt-4">
              The goal is to support financial institutions to better
              incorporate the opportunities and risks created by the transition
              into their decision-making by integrating region-specific pathways
              into transition assessments, risk analysis, client engagement, and
              capital allocation.
            </p>
          </section>

          <section className="py-10 border-b border-neutral-200">
            <h2 className="text-xl font-semibold text-rmiblue-800 mb-3">
              Why are transition pathways important?
            </h2>
            <p className="text-rmigray-700">
              Transition pathways provide the critical context needed to turn
              data into decision-useful insights for financial institutions. As
              corporations navigate uncertainty, transition pathways can reveal
              how different factors could impact their business.
            </p>
            <p className="text-rmigray-700 mt-4">
              Different pathways answer different questions. A pathway that is
              useful for assessing target ambition may not be appropriate for
              understanding regional policy or market risk.
            </p>
            <p className="text-rmigray-700 mt-4">
              The TPR helps users understand those differences to ensure that
              selected pathways are aligned with specific assessment objectives
              and decision-making needs.
            </p>
          </section>

          <section className="py-10 border-b border-neutral-200">
            <h2 className="text-xl font-semibold text-rmiblue-800 mb-3">
              Who is the TPR designed for?
            </h2>
            <p className="text-rmigray-700">
              The TPR is designed primarily for financial institutions (e.g.,
              sustainability, risk, and front-office teams) conducting corporate
              transition assessments. See the{" "}
              <Link
                to="/resources/use-cases"
                className="text-energy-700 hover:text-energy-800 underline underline-offset-2"
              >
                use case page
              </Link>{" "}
              for more details.
            </p>
            <p className="text-rmigray-700 mt-4">
              This tool could also be applied by corporations developing their
              own transition strategies, and by policymakers and regulators to
              inform policy design and regulatory frameworks.
            </p>
          </section>

          <section className="py-10 border-b border-neutral-200">
            <h2 className="text-xl font-semibold text-rmiblue-800 mb-6">
              What can you do with the Transition Pathways Repository?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoCard title="Find new pathways">
                Trying to understand your clients’ exposure to transition risk?
                Want to understand how different policies might impact your
                client’s transition strategy? Unsure if your client’s investment
                pipeline matches sector trends? The TPR helps you find relevant
                pathways for these and other use cases.
              </InfoCard>
              <InfoCard title="Interpret them easily">
                These use cases are made clear by detailed analysis of each
                pathway’s scope, underlying assumptions, and output data in a
                standardized format for streamlined integration into existing
                workflows.
              </InfoCard>
              <InfoCard title="Compare pathways">
                Pathways have been assessed across key common variables for easy
                comparison. Skip trawling through lengthy reports and let the
                repository simplify the process of deciphering and comparing
                pathways.
              </InfoCard>
            </div>
          </section>

          <section className="py-10">
            <h2 className="text-xl font-semibold text-rmiblue-800 mb-3">
              Learn more with these resources
            </h2>
            <div className="rounded-lg bg-white shadow p-6">
              <ul className="list-disc pl-5 space-y-2 text-rmigray-700">
                <li>
                  <Link
                    to="/resources/how-to-choose-a-pathway"
                    className="text-energy-700 hover:text-energy-800 underline underline-offset-2"
                  >
                    How to choose a pathway
                  </Link>
                </li>
                <li>
                  <Link
                    to="/resources/use-cases"
                    className="text-energy-700 hover:text-energy-800 underline underline-offset-2"
                  >
                    Use cases for pathways
                  </Link>
                </li>
                <li>
                  <Link
                    to="/resources/methodology"
                    className="text-energy-700 hover:text-energy-800 underline underline-offset-2"
                  >
                    How pathways are assessed and classified
                  </Link>
                </li>
                <li>
                  <Link
                    to="/resources/updates"
                    className="text-energy-700 hover:text-energy-800 underline underline-offset-2"
                  >
                    Latest updates
                  </Link>
                </li>
                <li>
                  <Link
                    to="/resources/faq"
                    className="text-energy-700 hover:text-energy-800 underline underline-offset-2"
                  >
                    FAQs
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="text-energy-700 hover:text-energy-800 underline underline-offset-2"
                  >
                    Get in touch
                  </Link>
                </li>
              </ul>
            </div>

            <div className="mt-12 pt-10 border-t border-neutral-200 text-center">
              <h2 className="text-2xl font-semibold text-rmigray-800">
                Ready to explore?
              </h2>
              <p className="mt-3 text-rmigray-700 max-w-2xl mx-auto">
                See what pathways are available for the Southeast Asia power
                sector.
              </p>
              <div className="mt-8">
                <Link
                  to="/pathway"
                  className="inline-block px-8 py-4 bg-energy-700 text-neutral-300 rounded-md hover:bg-energy-800 transition-colors duration-200 text-lg font-semibold"
                >
                  Explore Pathways
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
