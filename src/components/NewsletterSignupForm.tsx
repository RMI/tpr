import React from "react";
import FormAssemblyEmbed from "./FormAssemblyEmbed";

/** The TPR newsletter signup form, hosted on RMI's FormAssembly account. */
export const NEWSLETTER_FORM_URL = "https://rmi.tfaforms.net/312";

type NewsletterSignupFormProps = {
  /** Passed through to `FormAssemblyEmbed`; see there. */
  onFormNavigate?: () => void;
};

/**
 * The newsletter signup form with its open-in-a-new-tab fallback, as shown
 * both in the signup dialog and on the `/get-updates` page.
 */
const NewsletterSignupForm: React.FC<NewsletterSignupFormProps> = ({
  onFormNavigate,
}) => (
  <>
    {/* Above the form, not below it: when the form is blocked (ad blockers,
        an http page) the iframe is an empty box at its initial height, and a
        link under it would be out of sight. */}
    <p className="mb-3 text-sm text-rmigray-600">
      Form not loading?{" "}
      <a
        href={NEWSLETTER_FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-energy-800 underline underline-offset-2 hover:text-rmigray-800"
      >
        Open it in a new tab
      </a>
      .
    </p>
    <FormAssemblyEmbed
      formUrl={NEWSLETTER_FORM_URL}
      title="Transition Pathways Repository newsletter signup form"
      onFormNavigate={onFormNavigate}
    />
  </>
);

export default NewsletterSignupForm;
