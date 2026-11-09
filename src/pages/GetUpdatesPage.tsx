import React from "react";
import PageHeader from "../components/PageHeader";
import NewsletterSignupForm from "../components/NewsletterSignupForm";

/**
 * Standalone newsletter signup page, `/get-updates`, in the manner of
 * rmi.org/get-updates. It is for links from outside the site (LinkedIn posts
 * and the like), so nothing in the site's navigation points here; on the
 * site itself, the signup buttons open the form in a dialog instead. This is
 * the one place the form sits in the page.
 *
 * After submit the form's iframe scrolls itself into view (the
 * `FormAssemblyEmbed` default), so the confirmation is what shows.
 */
const GetUpdatesPage: React.FC = () => (
  <div className="bg-gray-50">
    <PageHeader
      title="Stay up to date with the TPR"
      subtitle="Get news on the Transition Pathways Repository in your inbox."
    >
      <p>
        Sign up for news on new pathways, sectors and features in the Transition
        Pathways Repository.
      </p>
    </PageHeader>

    <div className="container mx-auto px-4 pt-6 pb-12">
      <div className="max-w-2xl rounded-lg border border-neutral-200 bg-white p-5 md:p-6">
        <NewsletterSignupForm />
      </div>
    </div>
  </div>
);

export default GetUpdatesPage;
