import React from "react";
import type { Geography } from "../types";
import {
  countryNameFromISO2,
  geographyKind,
  geographyMemberCodes,
  toISO2,
} from "../utils/geographyUtils";
import { prioritizeGeographies } from "../utils/sortUtils";

/**
 * How many member countries to name before collapsing the tail into "+N more".
 * The tooltip panel in TextWithTooltip is capped at `max-w-xs` and has
 * `pointer-events: none`, so it can neither widen nor scroll — a region like IEA's
 * 54-member "Africa" has to be truncated somewhere.
 */
export const REGION_TOOLTIP_MAX_MEMBERS = 12;

// Every declared region has two or more members (#998), so this is only reached
// for a label the geography does not declare, or no geography at all.
// `hasMemberList` never offers the tooltip for a country without extra codes.
export const NO_REGION_MAPPING_TEXT =
  "No country mapping available for this region.";

type RegionMembersTooltipProps = {
  /** The pathway's own structured geography — the source of the mapping. */
  geography: Geography | null | undefined;
  /** The badge's token: a region label, or a country code (#1071). */
  label: string;
  /** When set, matching members are floated to the front (same rule as the badges). */
  searchTerm?: string;
};

/**
 * Tooltip body listing the countries a pathway's region maps to (#799), or the
 * territories a pathway's country includes besides itself (#1071) — the
 * badge already names the country, so only the extra codes are news. Rendered
 * *into* TextWithTooltip via BadgeArray's `tooltipGetter`, so it owns content only —
 * no positioning, no hover handling. Whether a badge gets one at all is
 * `hasMemberList`'s call.
 */
const RegionMembersTooltip: React.FC<RegionMembersTooltipProps> = ({
  geography,
  label,
  searchTerm,
}) => {
  const isCountry = geographyKind(label) === "country";
  const self = toISO2(label);
  const codes = geographyMemberCodes(geography, label).filter(
    (code) => !isCountry || code !== self,
  );
  if (codes.length === 0) {
    return <span>{NO_REGION_MAPPING_TEXT}</span>;
  }

  // Prioritization lives here rather than in geographyMemberCodes: sortUtils
  // already imports geographyUtils, so the reverse import would be a module cycle.
  const ordered = searchTerm ? prioritizeGeographies(codes, searchTerm) : codes;
  const shown = ordered.slice(0, REGION_TOOLTIP_MAX_MEMBERS);
  const hidden = ordered.length - shown.length;

  return (
    <span>
      <span className="block font-medium text-rmigray-800">
        {isCountry ? "Also includes" : `${ordered.length} countries`}
      </span>
      <span className="block">
        {shown.map((code, idx) => (
          <React.Fragment key={code}>
            {idx > 0 && ", "}
            <span className="whitespace-nowrap">
              {countryNameFromISO2(code) ?? code}
            </span>
          </React.Fragment>
        ))}
        {hidden > 0 && (
          <span className="whitespace-nowrap">, +{hidden} more</span>
        )}
      </span>
    </span>
  );
};

export default RegionMembersTooltip;
