import React from "react";

/**
 * A one- or two-sentence explanation of what a section is for, set directly
 * under its heading (#1029), so readers do not have to guess. The heading above
 * it should drop its own bottom margin to `mb-1`, so the intro reads as part of
 * the heading rather than as the first line of content.
 */
const SectionIntro: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <p className="mb-3 text-sm text-rmigray-600">{children}</p>;

export default SectionIntro;
