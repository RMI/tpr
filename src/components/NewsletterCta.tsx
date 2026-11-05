import React, { useId, useState } from "react";
import clsx from "clsx";
import NewsletterSignupDialog from "./NewsletterSignupDialog";
import { primaryCtaClass, primaryCtaLargeClass } from "./buttonStyles";

type NewsletterCtaProps = {
  /**
   * `ribbon`: the compact band above the footer on every page but the landing
   * page. `landing`: the larger band just below the landing page hero.
   */
  variant: "ribbon" | "landing";
};

/**
 * Call to action for the TPR newsletter (#995). The button opens the signup
 * form in a dialog rather than embedding the (tall) form in the page.
 */
const NewsletterCta: React.FC<NewsletterCtaProps> = ({ variant }) => {
  const [open, setOpen] = useState(false);
  const headingId = useId();
  const isLanding = variant === "landing";

  return (
    <section
      aria-labelledby={headingId}
      className="bg-rmiblue-100"
    >
      <div
        className={clsx(
          "container mx-auto px-4",
          isLanding
            ? "py-12 text-center"
            : "py-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
        )}
      >
        <div className={clsx(isLanding && "max-w-3xl mx-auto")}>
          <h2
            id={headingId}
            className={clsx(
              "font-semibold text-rmigray-800",
              isLanding ? "text-2xl md:text-3xl" : "text-xl",
            )}
          >
            Stay up to date with the TPR
          </h2>
          <p
            className={clsx("mt-2 text-rmigray-700", isLanding && "md:text-lg")}
          >
            Sign up for news on new pathways, sectors and features in the
            Transition Pathways Repository.
          </p>
        </div>

        <div className={clsx(isLanding && "mt-8")}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={clsx(
              primaryCtaClass,
              "shrink-0",
              isLanding ? primaryCtaLargeClass : "px-6 py-3",
            )}
          >
            Sign up for updates
          </button>
        </div>
      </div>

      <NewsletterSignupDialog
        open={open}
        onClose={() => setOpen(false)}
      />
    </section>
  );
};

export default NewsletterCta;
