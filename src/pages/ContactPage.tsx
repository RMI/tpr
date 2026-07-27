import React from "react";

const ContactPage: React.FC = () => {
  return (
    <div className="bg-gray-50">
      <div className="container mx-auto px-4 py-8 md:py-10">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-rmiblue-800 px-6 py-8 text-white shadow-lg md:px-10 md:py-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-energy-700/10" />
          <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-white/7 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-energy-500/8 blur-2xl" />

          <div className="relative">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Contact
            </h1>

            <div className="mt-6 space-y-4 text-sm leading-7 text-white/85 md:text-base">
              <p>
                We are building the Transition Pathways Repository to support
                informed transition-related decisions by making pathway data
                easier to access, understand, and apply.
              </p>
              <p>
                We actively engage with financial institutions, companies,
                policymakers, and other stakeholders to refine the tool, expand
                its coverage, and improve its usability. Whether you are using
                pathways in analysis, strategy, risk management, or policy
                development, your input helps shape how the repository evolves.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-5xl rounded-[2rem] border border-rmiblue-100 bg-rmiblue-50/60 px-6 py-8 shadow-sm md:px-8 md:py-10">
          <div className="max-w-5xl">
            <h2 className="text-2xl font-semibold text-rmigray-800">
              How to reach us
            </h2>
            <p className="mt-4 text-rmigray-700 leading-7">
              We welcome feedback, questions, and opportunities for
              collaboration.
            </p>
            <p className="mt-4 text-rmigray-700 leading-7">
              To get in touch, reach out to{" "}
              <a
                href="mailto:tomwhite+pbtar@rmi.org"
                className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
              >
                Tom White
              </a>{" "}
              or{" "}
              <a
                href="mailto:nherrera+pbtar@rmi.org"
                className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
              >
                Nayra Herrera
              </a>
              , or open an issue on our{" "}
              <a
                href="https://github.com/RMI/pbtar/issues"
                className="text-energy-700 underline underline-offset-2 hover:text-energy-800"
              >
                GitHub repository
              </a>{" "}
              with a short description of your request.
            </p>
          </div>

          <div className="mt-10 border-t border-rmiblue-100 pt-8">
            <h2 className="text-2xl font-semibold text-rmigray-800">
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
              <li className="font-semibold leading-7">Workflow pain points</li>
              <li className="font-semibold leading-7">
                Requests for training, guidance, or additional support
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ContactPage;
