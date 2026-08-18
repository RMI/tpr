import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RegionMembersTooltip, {
  REGION_TOOLTIP_MAX_MEMBERS,
  NO_REGION_MAPPING_TEXT,
} from "./RegionMembersTooltip";
import type { Geography } from "../types";

// A region whose members exercise the >REGION_TOOLTIP_MAX_MEMBERS path: 15 real
// ISO-2 codes, deliberately unsorted so the A→Z-by-code ordering is observable.
const FIFTEEN = [
  "IT",
  "IE",
  "HU",
  "HR",
  "GR",
  "FR",
  "FI",
  "EE",
  "DK",
  "DE",
  "CZ",
  "CY",
  "BG",
  "BE",
  "AT",
] as const;

describe("RegionMembersTooltip", () => {
  it("names the member countries instead of showing raw ISO codes", () => {
    const geography: Geography = {
      regions: { "South East Asia": ["TH", "ID"] },
      country: ["US"],
    };
    render(
      <RegionMembersTooltip
        geography={geography}
        label="South East Asia"
      />,
    );

    expect(screen.getByText("Indonesia")).toBeInTheDocument();
    expect(screen.getByText("Thailand")).toBeInTheDocument();
    // The raw codes must not leak into the copy.
    expect(screen.queryByText("TH")).toBeNull();
    expect(screen.queryByText("ID")).toBeNull();
  });

  it("heads the list with a count, pluralized", () => {
    const { unmount } = render(
      <RegionMembersTooltip
        geography={{ regions: { Pair: ["TH", "ID"] } }}
        label="Pair"
      />,
    );
    expect(screen.getByText("2 countries")).toBeInTheDocument();
    unmount();

    render(
      <RegionMembersTooltip
        geography={{ regions: { Single: ["TH"] } }}
        label="Single"
      />,
    );
    expect(screen.getByText("1 country")).toBeInTheDocument();
  });

  it("orders members A→Z by ISO2, matching the country badges", () => {
    const { container } = render(
      <RegionMembersTooltip
        geography={{ regions: { Some: ["VN", "ID", "TH"] } }}
        label="Some"
      />,
    );
    // ID → TH → VN
    expect(container.textContent).toMatch(/Indonesia.*Thailand.*Vietnam/);
  });

  it(`caps the list at ${REGION_TOOLTIP_MAX_MEMBERS} names and counts the rest`, () => {
    const geography = {
      regions: { Europe: [...FIFTEEN] },
    } as unknown as Geography;
    render(
      <RegionMembersTooltip
        geography={geography}
        label="Europe"
      />,
    );

    // The count line still reports the full membership...
    expect(screen.getByText("15 countries")).toBeInTheDocument();
    // ...while the list stops after the cap. A→Z by code puts AT first and
    // leaves HR, HU, IE, IT beyond the 12th slot.
    expect(
      screen.getByText(
        `, +${FIFTEEN.length - REGION_TOOLTIP_MAX_MEMBERS} more`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Austria")).toBeInTheDocument();
    expect(screen.queryByText("Italy")).toBeNull();
    expect(screen.queryByText("Ireland")).toBeNull();
  });

  it("floats search-term matches to the front when given one", () => {
    const { container } = render(
      <RegionMembersTooltip
        geography={{ regions: { Some: ["DE", "FR", "TH"] } }}
        label="Some"
        searchTerm="thai"
      />,
    );
    // Without the search term this would read Germany, France, Thailand.
    expect(container.textContent).toMatch(/Thailand.*Germany/);
  });

  it("says so when the publication provides no mapping for the region", () => {
    render(
      <RegionMembersTooltip
        geography={{ regions: { "South East Asia": [] } }}
        label="South East Asia"
      />,
    );
    expect(screen.getByText(NO_REGION_MAPPING_TEXT)).toBeInTheDocument();
  });

  it("shows the no-mapping copy rather than an empty box for unknown or missing geography", () => {
    const { unmount } = render(
      <RegionMembersTooltip
        geography={{ regions: { Europe: ["DE"] } }}
        label="Africa"
      />,
    );
    expect(screen.getByText(NO_REGION_MAPPING_TEXT)).toBeInTheDocument();
    unmount();

    render(
      <RegionMembersTooltip
        geography={undefined}
        label="Europe"
      />,
    );
    expect(screen.getByText(NO_REGION_MAPPING_TEXT)).toBeInTheDocument();
  });
});
