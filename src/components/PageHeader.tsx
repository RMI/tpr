import React from "react";

type PageHeaderProps = {
  title: string;
  /** One-line framing under the title. Omitted on the FAQ page. */
  subtitle?: string;
  /** Intro prose for the page as a whole. Omitted on the Updates page. */
  children?: React.ReactNode;
};

/**
 * The page header for the resource and contact pages.
 *
 * It is a full-bleed band — the background and the closing rule run to the
 * viewport edges, with the copy inset by the usual `container` gutter, the
 * same idiom as `Header` and `Footer`. That is what makes it read as a page
 * header: the body below sits in a grid whose content column starts one
 * 16rem index track further in, so a header that merely spanned the
 * container looks like a section that failed to line up. Spanning the
 * viewport instead makes the gutter alignment obviously the band's own.
 *
 * Render it as a **sibling of** the page's `container` div, never inside
 * one, or it loses the full bleed.
 *
 * The copy is capped at `max-w-3xl` even though the band is not, which
 * leaves visible slack to its right on wide screens. That is deliberate:
 * `container` here is stock Tailwind, reaching 80rem at `xl` and 96rem at
 * `2xl`, so uncapped intro paragraphs would run roughly 130 characters per
 * line at 1440px and 180 on a wider monitor. The cap covers the title and
 * subtitle too, rather than the prose alone, so all three share one left
 * edge. Weighed against a two-column header and against dropping the cap;
 * the reading measure won.
 *
 * Note this `<header>` renders inside App's `<main>`, so it does not take
 * `role="banner"` and cannot collide with `Header`, which does.
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  children,
}) => (
  <header className="border-b border-neutral-200 bg-white">
    <div className="container mx-auto px-4 py-10 md:py-14">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-rmigray-800 md:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 text-lg leading-8 text-rmigray-600">{subtitle}</p>
        ) : null}
        {children ? (
          <div className="mt-6 space-y-4 text-rmigray-700 leading-7">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  </header>
);

export default PageHeader;
