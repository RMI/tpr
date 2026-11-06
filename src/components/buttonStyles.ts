/**
 * Look of the site's primary call-to-action buttons and links ("Explore
 * Pathways", "Sign up for updates"), without size or padding, which each use
 * sets for itself.
 */
export const primaryCtaClass =
  "inline-block rounded-md bg-energy-700 font-semibold text-neutral-300 transition-colors duration-200 hover:bg-energy-800";

/** The large size used on the landing page. */
export const primaryCtaLargeClass = "px-8 py-4 text-lg";

/**
 * A secondary call to action on a dark background, such as the landing page
 * hero. Its white outline is an inset ring rather than a border, so it is the
 * same size as a primary button beside it. Size and padding are left to each
 * use, as with `primaryCtaClass`.
 */
export const secondaryCtaOnDarkClass =
  "inline-block rounded-md font-semibold text-white ring-2 ring-inset ring-white transition-colors duration-200 hover:bg-white/10";
