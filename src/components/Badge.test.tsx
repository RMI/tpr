import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import Badge, { BadgeMaybeAbsent } from "./Badge";
import { pathwayTypeTooltips, sectorTooltips } from "../utils/tooltipUtils";

/** Every variant the union offers, so the guard below cannot miss one. */
const ALL_VARIANTS = [
  "default",
  "pathwayType",
  "temperature",
  "year",
  "geographyGlobal",
  "geographyRegion",
  "geographyCountry",
  "sector",
  "sectorSegment",
  "metric",
  "keyFeature",
  "geographyGlobal-pub",
  "geographyRegion-pub",
  "geographyCountry-pub",
  "sector-pub",
  "metric-pub",
] as const;

describe("Badge component", () => {
  it("renders with the provided text", () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText("Test Badge")).toBeInTheDocument();
  });

  it("renders numbers as content", () => {
    render(<Badge>{123}</Badge>);
    expect(screen.getByText("123")).toBeInTheDocument();
  });

  it("uses default styling when no variant is provided", () => {
    const { container } = render(<Badge>Default Badge</Badge>);
    const badge = container.firstChild as HTMLElement;

    expect(badge).toHaveClass("bg-rmigray-100");
    expect(badge).toHaveClass("text-rmigray-800");
    expect(badge).toHaveClass("border-rmigray-200");
  });

  // Type assertions: children must be scalar (string|number)
  it("disallows ReactNode children for Badge at compile-time", () => {
    // @ts-expect-error - Badge children must be string | number
    render(
      <Badge>
        <span>Not allowed</span>
      </Badge>,
    );
  });

  it("applies pathwayType styling when variant is 'pathwayType'", () => {
    const { container } = render(
      <Badge
        text="Pathway Type"
        variant="pathwayType"
      />,
    );
    const badge = container.firstChild as HTMLElement;

    expect(badge).toHaveClass("bg-rmipurple-100");
    expect(badge).toHaveClass("text-rmipurple-800");
    expect(badge).toHaveClass("border-rmipurple-200");
  });

  it("applies temperature styling when variant is 'temperature'", () => {
    const { container } = render(
      <Badge
        text="1.5°C"
        variant="temperature"
      />,
    );
    const badge = container.firstChild as HTMLElement;

    expect(badge).toHaveClass("bg-rmired-100");
    expect(badge).toHaveClass("text-rmired-800");
    expect(badge).toHaveClass("border-rmired-200");
  });

  it("applies year styling when variant is 'year'", () => {
    const { container } = render(
      <Badge
        text="2050"
        variant="year"
      />,
    );
    const badge = container.firstChild as HTMLElement;

    expect(badge).toHaveClass("bg-rmiblue-100");
    expect(badge).toHaveClass("text-rmiblue-800");
    expect(badge).toHaveClass("border-rmiblue-200");
  });

  it("applies geography styling when variant is 'geographyGlobal'", () => {
    const { container } = render(
      <Badge
        text="Global"
        variant="geographyGlobal"
      />,
    );
    const badge = container.firstChild as HTMLElement;

    expect(badge).toHaveClass("bg-pinishgreen-800");
    expect(badge).toHaveClass("text-pinishgreen-100");
    expect(badge).toHaveClass("border-pinishgreen-100");
  });

  it("applies geography styling when variant is 'geographyRegion'", () => {
    const { container } = render(
      <Badge
        text="RegionName"
        variant="geographyRegion"
      />,
    );
    const badge = container.firstChild as HTMLElement;

    expect(badge).toHaveClass("bg-pinishgreen-200");
    expect(badge).toHaveClass("text-pinishgreen-800");
    expect(badge).toHaveClass("border-pinishgreen-800");
  });

  it("applies geography styling when variant is 'geographyCountry'", () => {
    const { container } = render(
      <Badge
        text="CountryName"
        variant="geographyCountry"
      />,
    );
    const badge = container.firstChild as HTMLElement;

    expect(badge).toHaveClass("bg-pinishgreen-100");
    expect(badge).toHaveClass("text-pinishgreen-800");
    expect(badge).toHaveClass("border-pinishgreen-200");
  });

  it("applies sector styling when variant is 'sector'", () => {
    const { container } = render(
      <Badge
        text="Energy"
        variant="sector"
      />,
    );
    const badge = container.firstChild as HTMLElement;

    expect(badge).toHaveClass("bg-solar-100");
    expect(badge).toHaveClass("text-solar-800");
    expect(badge).toHaveClass("border-solar-200");
  });

  it("applies sectorSegment styling when variant is 'sectorSegment'", () => {
    const { container } = render(
      <Badge variant="sectorSegment">Power generation</Badge>,
    );
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass("bg-rmipink-100");
    expect(badge).toHaveClass("text-rmipink-800");
    expect(badge).toHaveClass("border-rmipink-200");
    // Must not be confusable with the sector badge it sits next to.
    expect(badge).not.toHaveClass("bg-solar-100");
  });

  it("applies metric styling when variant is 'metric'", () => {
    const { container } = render(<Badge variant="metric">Intensity</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass("bg-rmipurple-100");
    expect(badge).toHaveClass("text-rmipurple-800");
    expect(badge).toHaveClass("border-rmipurple-200");
  });

  describe("publication-only (-pub) variants", () => {
    it("applies geographyGlobal-pub styling with transparent background", () => {
      const { container } = render(
        <Badge variant="geographyGlobal-pub">Global</Badge>,
      );
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass("bg-transparent");
      expect(badge).toHaveClass("text-pinishgreen-800");
      expect(badge).toHaveClass("border-pinishgreen-800");
    });

    it("applies geographyRegion-pub styling with transparent background", () => {
      const { container } = render(
        <Badge variant="geographyRegion-pub">Asia Pacific</Badge>,
      );
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass("bg-transparent");
      expect(badge).toHaveClass("text-pinishgreen-800");
      expect(badge).toHaveClass("border-pinishgreen-400");
    });

    it("applies geographyCountry-pub styling with transparent background", () => {
      const { container } = render(
        <Badge variant="geographyCountry-pub">Germany</Badge>,
      );
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass("bg-transparent");
      expect(badge).toHaveClass("text-pinishgreen-800");
      expect(badge).toHaveClass("border-pinishgreen-400");
    });

    it("applies sector-pub styling with transparent background", () => {
      const { container } = render(<Badge variant="sector-pub">Power</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass("bg-transparent");
      expect(badge).toHaveClass("text-solar-800");
      expect(badge).toHaveClass("border-solar-400");
    });

    it("applies metric-pub styling with transparent background", () => {
      const { container } = render(
        <Badge variant="metric-pub">Capacity</Badge>,
      );
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass("bg-transparent");
      expect(badge).toHaveClass("text-rmipurple-800");
      expect(badge).toHaveClass("border-rmipurple-400");
    });
  });

  describe("every colour class resolves to a defined theme token", () => {
    /*
      Tailwind v4 takes its palette from `@theme` in index.css. A class naming a
      shade that is not defined there emits no CSS at all and fails silently — an
      outlined badge with no text colour and no border, which is exactly how
      geographyRegion-pub and geographyCountry-pub shipped referencing
      pinishgreen-500/600/700 when the family defines only 100/200/400/800.

      Asserting the class strings one by one cannot catch that, because the class
      is present either way. This checks them against the theme.
    */
    // Read rather than imported: vitest's CSS handling returns "" for
    // `index.css?raw`, which would make every case below vacuously pass. The
    // sanity check below stops that happening silently again.
    const themeCss = readFileSync("src/index.css", "utf8");
    const defined = new Set(
      [...themeCss.matchAll(/--color-([a-z0-9]+-[0-9]+)\s*:/g)].map(
        (m) => m[1],
      ),
    );

    // The families index.css owns. Anything else (transparent, white, and
    // Tailwind's own built-ins) is not ours to verify.
    const OWNED =
      /^(?:bg|text|border)-((?:rmi[a-z]+|pinishgreen|solar)-[0-9]+)$/;

    it("has a non-empty theme to check against", () => {
      // Guards the regex above: an empty set would make every case below vacuous.
      expect(defined.size).toBeGreaterThan(20);
      expect(defined).toContain("pinishgreen-800");
    });

    it.each(ALL_VARIANTS)("%s", (variant) => {
      const { container } = render(<Badge variant={variant}>Label</Badge>);
      const badge = container.firstChild as HTMLElement;

      const missing = [...badge.classList]
        .map((cls) => OWNED.exec(cls)?.[1])
        .filter((token): token is string => token !== undefined)
        .filter((token) => !defined.has(token));

      expect(missing).toEqual([]);
    });
  });

  it("always includes base badge styling", () => {
    // Testing that common styles are applied to all variants
    const { container } = render(
      <Badge
        text="Test"
        variant="pathwayType"
      />,
    );
    const badge = container.firstChild as HTMLElement;

    // Check for common styling classes that should be on all badges
    expect(badge).toHaveClass("inline-flex");
    expect(badge).toHaveClass("items-center");
    expect(badge).toHaveClass("rounded-full");
    expect(badge).toHaveClass("text-xs");
    expect(badge).toHaveClass("font-medium");
    expect(badge).toHaveClass("border");
    expect(badge).toHaveClass("mr-2");
    expect(badge).toHaveClass("mb-1");
  });

  it("renders as a span element", () => {
    const { container } = render(<Badge text="Test" />);
    expect(container.firstChild?.nodeName).toBe("SPAN");
  });

  // Tooltip tests
  it("does not render tooltip when no tooltip is provided", () => {
    render(<Badge>No Tooltip</Badge>);

    // Find the badge span
    const badge = screen.getByText("No Tooltip");

    // Check that it's a plain span without tabindex
    expect(badge).toBeInTheDocument();
    expect(badge).not.toHaveAttribute("tabindex");
  });

  it("uses TextWithTooltip when tooltip is provided", () => {
    render(<Badge tooltip="This is a tooltip">With Tooltip</Badge>);

    // Badge text should still be present
    const badgeText = screen.getByText("With Tooltip");
    expect(badgeText).toBeInTheDocument();

    // The outer span from TextWithTooltip should have tabindex attribute
    // We need to look for a parent element with tabindex since the badge text itself
    // is wrapped in its own span
    const triggerElement = badgeText.closest("span")?.parentElement;
    expect(triggerElement).toHaveAttribute("tabindex", "0");

    // The aria-describedby attribute is added when tooltip is visible
    expect(triggerElement).not.toHaveAttribute("aria-describedby");
  });

  // Testing tooltip visibility requires checking document.body, since tooltips are now in portals
  it("doesn't show tooltip initially", () => {
    render(<Badge tooltip="Hover tooltip">Hover me</Badge>);

    // Initially the tooltip shouldn't be in document.body
    const tooltipElement = document.querySelector("[role='tooltip']");
    expect(tooltipElement).not.toBeInTheDocument();
  });

  describe("tooltip content tests", () => {
    it("displays correct tooltip for Normative pathway type", () => {
      render(
        <Badge
          tooltip={pathwayTypeTooltips["Normative"]}
          variant="pathwayType"
        >
          Normative
        </Badge>,
      );

      const badge = screen.getByText("Normative");
      expect(badge).toBeInTheDocument();
      expect(badge.closest("span")?.parentElement).toHaveAttribute(
        "tabindex",
        "0",
      );
    });

    it("displays correct tooltip for Exploratory pathway type", () => {
      render(
        <Badge
          tooltip={pathwayTypeTooltips["Exploratory"]}
          variant="pathwayType"
        >
          Exploratory
        </Badge>,
      );

      const badge = screen.getByText("Exploratory");
      expect(badge).toBeInTheDocument();
      expect(badge.closest("span")?.parentElement).toHaveAttribute(
        "tabindex",
        "0",
      );
    });

    it("displays correct tooltip for Power sector", () => {
      render(
        <Badge
          tooltip={sectorTooltips["Power"]}
          variant="sector"
        >
          Power
        </Badge>,
      );

      const badge = screen.getByText("Power");
      expect(badge).toBeInTheDocument();
      expect(badge.closest("span")?.parentElement).toHaveAttribute(
        "tabindex",
        "0",
      );
    });

    it("displays correct tooltip for Aviation sector", () => {
      render(
        <Badge
          tooltip={sectorTooltips["Aviation"]}
          variant="sector"
        >
          Aviation
        </Badge>,
      );

      const badge = screen.getByText("Aviation");
      expect(badge).toBeInTheDocument();
      expect(badge.closest("span")?.parentElement).toHaveAttribute(
        "tabindex",
        "0",
      );
    });
  });
});

describe("BadgeMaybeAbsent", () => {
  it("renders 'None' for undefined/null", () => {
    const { rerender } = render(<BadgeMaybeAbsent text={undefined} />);
    expect(screen.getByText("None")).toBeInTheDocument();
    rerender(<BadgeMaybeAbsent text={null} />);
    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("renders string as text", () => {
    const { rerender } = render(<BadgeMaybeAbsent>Power</BadgeMaybeAbsent>);
    expect(screen.getByText("Power")).toBeInTheDocument();
    rerender(<BadgeMaybeAbsent>2030</BadgeMaybeAbsent>);
    expect(screen.getByText("2030")).toBeInTheDocument();
  });

  it("renders processed label", () => {
    render(<BadgeMaybeAbsent>{"  Europe  "}</BadgeMaybeAbsent>);
    expect(screen.getByText("Europe")).toBeInTheDocument();
  });

  it("uses toLabel only for present values", () => {
    const toLabel = (v: number) => `Y${v}`;
    const { rerender } = render(
      <BadgeMaybeAbsent<number> toLabel={toLabel}>2030</BadgeMaybeAbsent>,
    );
    expect(screen.getByText("Y2030")).toBeInTheDocument();
    rerender(
      <BadgeMaybeAbsent<number>
        text={undefined}
        toLabel={toLabel}
      />,
    );
    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("disallows ReactNode children for BadgeMaybeAbsent at compile-time", () => {
    // @ts-expect-error - BadgeMaybeAbsent children must be string | number | null | undefined
    render(
      <BadgeMaybeAbsent>
        <span>Not allowed</span>
      </BadgeMaybeAbsent>,
    );
  });

  it("supports noneLabel override", () => {
    render(
      <BadgeMaybeAbsent
        text={undefined}
        noneLabel="No Value"
      />,
    );
    expect(screen.getByText("No Value")).toBeInTheDocument();
  });

  it("renderLabel decorates only string labels", () => {
    const renderLabel = (label: string) => `**${label}**`;
    render(
      <BadgeMaybeAbsent renderLabel={renderLabel}>EUROPE</BadgeMaybeAbsent>,
    );
    expect(screen.getByText("**EUROPE**")).toBeInTheDocument();
  });
});
