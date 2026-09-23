import React, { useRef } from "react";
import OnPageIndex from "../components/OnPageIndex";
import PageHeader from "../components/PageHeader";

const ContactPage: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-gray-50">
      <PageHeader
        title="Contact"
        subtitle="Get in touch with the team behind the Transition Pathways Repository."
      >
        <p>
          We are building the Transition Pathways Repository to support informed
          transition-related decisions by making pathway data easier to access,
          understand, and apply.
        </p>
        <p>
          We actively engage with financial institutions, companies,
          policymakers, and other stakeholders to refine the tool, expand its
          coverage, and improve its usability. Whether you are using pathways in
          analysis, strategy, risk management, or policy development, your input
          helps shape how the repository evolves.
        </p>
      </PageHeader>

      <div className="container mx-auto px-4 pt-6 pb-12">
        <div className="grid gap-8 xl:grid-cols-[16rem_1fr]">
          <OnPageIndex containerRef={contentRef} />

          <div
            ref={contentRef}
            className="min-w-0 max-w-5xl"
          >
            <section className="max-w-3xl border-b border-neutral-300 py-10">
              <h2
                id="how-to-reach-us"
                className="scroll-mt-8 text-2xl font-semibold text-rmigray-800"
              >
                How to reach us
              </h2>
              <p className="mt-4 text-rmigray-700 leading-7">
                We welcome feedback, questions, and opportunities for
                collaboration.
              </p>
              <p className="mt-4 text-rmigray-700 leading-7">
                To get in touch, reach out to{" "}
                <a
                  href="mailto:tomwhite+tpr@rmi.org"
                  className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
                >
                  Tom White
                </a>{" "}
                or{" "}
                <a
                  href="mailto:nherrera+tpr@rmi.org"
                  className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
                >
                  Nayra Herrera
                </a>
                , or open an issue on our{" "}
                <a
                  href="https://github.com/RMI/tpr/issues"
                  className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
                >
                  GitHub repository
                </a>{" "}
                with a short description of your request.
              </p>
            </section>

            <section className="max-w-3xl py-10">
              <h2
                id="feedback-and-suggestions"
                className="scroll-mt-8 text-2xl font-semibold text-rmigray-800"
              >
                Feedback and suggestions
              </h2>
              <p className="mt-4 text-rmigray-700 leading-7">
                We welcome feedback of all kinds and encourage you to share your
                experience, questions, and ideas for improvement.
              </p>
              <p className="mt-4 text-rmigray-700 leading-7">
                We are especially interested in hearing about:
              </p>

              <ul className="mt-5 list-disc space-y-3 pl-6 text-rmigray-700 marker:text-lg">
                <li className="font-semibold leading-7">
                  Missing pathways or benchmarks
                </li>
                <li className="font-semibold leading-7">
                  Unclear classifications or assumptions
                </li>
                <li className="font-semibold leading-7">
                  Gaps in sector or regional coverage
                </li>
                <li className="font-semibold leading-7">
                  Workflow pain points
                </li>
                <li className="font-semibold leading-7">
                  Requests for training, guidance, or additional support
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
