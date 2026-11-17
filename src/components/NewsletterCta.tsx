import React, { useId } from "react";
import { useNewsletterSignup } from "../context/NewsletterSignupContext";
import { primaryCtaClass } from "./buttonStyles";

/**
 * Call to action for the TPR newsletter (#995): the band above the footer on
 * the inner pages. (The landing page has a signup button in its hero
 * instead.) The button opens the signup form in a dialog rather than
 * embedding the (tall) form in the page. The dialog itself belongs to
 * `NewsletterSignupProvider`, not to this CTA, so it outlives route changes
 * that unmount the band.
 */
const NewsletterCta: React.FC = () => {
  const { openSignup } = useNewsletterSignup();
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="bg-rmiblue-100"
    >
      <div className="container mx-auto px-4 py-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2
            id={headingId}
            className="text-xl font-semibold text-rmigray-800"
          >
            Stay up to date with the TPR
          </h2>
          <p className="mt-2 text-rmigray-700">
            Sign up for news on new pathways, sectors and features in the
            Transition Pathways Repository.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={openSignup}
            className={`${primaryCtaClass} shrink-0 px-6 py-3`}
          >
            Sign up for updates
          </button>
        </div>
      </div>
    </section>
  );
};

export default NewsletterCta;
