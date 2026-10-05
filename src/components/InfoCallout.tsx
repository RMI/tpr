import React from "react";
import clsx from "clsx";
import { Info } from "lucide-react";

type InfoCalloutProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * A note or definition set apart from the surrounding prose: blue frame, pale
 * blue fill, and a leading ⓘ.
 *
 * The resource pages have two tiers of box. Plain reference cards get a blue
 * frame on white and no icon; this one adds the tint and the icon and is
 * reserved for content the reader should treat as an aside — a caution, or a
 * definition they may need before the surrounding text makes sense. Keeping
 * the icon rare is the point: put it on every "allowed values" box and
 * fourteen of them read as fourteen warnings.
 *
 * Callers supply their own heading, because the cases genuinely differ — a
 * caution wants a bold lead-in inline with its prose, a definition wants a
 * real `<h3>`, and a footnote wants neither.
 *
 * This is deliberately not built on `AdditionalInfoBox`: that component wraps
 * its content in a `<section className="mt-8">`, whose fixed margin would
 * break the definition cards' grid alignment, and it is shared with the
 * pathway detail page, which must not pick up this styling.
 */
const InfoCallout: React.FC<InfoCalloutProps> = ({ children, className }) => (
  <div
    className={clsx(
      "rounded-lg border border-rmiblue-200 bg-rmiblue-100/30 p-5",
      className,
    )}
  >
    <div className="flex gap-3">
      <Info
        size={18}
        aria-hidden="true"
        className="mt-1 flex-none text-rmiblue-800"
      />
      <div className="min-w-0 flex-1 text-rmiblue-800 leading-7">
        {children}
      </div>
    </div>
  </div>
);

export default InfoCallout;
