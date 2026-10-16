import React from "react";
import TextWithTooltip from "./TextWithTooltip";
import { coalesceOptional, isAbsent } from "../utils/absent";

interface BadgeProps {
  children: string | number;
  // ReactNode, not string: BadgeArray's `tooltipGetter` already returns ReactNode,
  // and geography badges pass a rendered member-country list (#799).
  tooltip?: React.ReactNode;
  variant?:
    | "default"
    | "pathwayType"
    | "temperature"
    | "year"
    | "geographyGlobal"
    | "geographyRegion"
    | "geographyCountry"
    | "sector"
    | "sectorSegment"
    | "metric"
    | "keyFeature"
    | "geographyGlobal-pub"
    | "geographyRegion-pub"
    | "geographyCountry-pub"
    | "sector-pub"
    | "metric-pub";
  className?: string;
  /**
   * When set, the badge renders as a `<button>` carrying these attributes
   * instead of a static span — for badges that are also controls, such as the
   * detail page's scope ribbon (#872). A tooltipped badge routes this through
   * TextWithTooltip's `as="button"`, because nesting a button around its
   * `tabindex` trigger would be invalid markup.
   */
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  tooltip,
  variant = "default",
  className,
  buttonProps,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "pathwayType":
        return "bg-rmipurple-100 text-rmipurple-800 border-rmipurple-200";
      case "temperature":
        return "bg-rmired-100 text-rmired-800 border-rmired-200";
      case "year":
        return "bg-rmiblue-100 text-rmiblue-800 border-rmiblue-200";
      case "geographyGlobal":
        return "bg-pinishgreen-800 text-pinishgreen-100 border-pinishgreen-100";
      case "geographyRegion":
        return "bg-pinishgreen-200 text-pinishgreen-800 border-pinishgreen-800";
      case "geographyCountry":
        return "bg-pinishgreen-100 text-pinishgreen-800 border-pinishgreen-200";
      case "sector":
        return "bg-solar-100 text-solar-800 border-solar-200";
      // A segment is a subdivision of a sector, so it gets its own family
      // rather than a shade of the sector amber — the two appear side by side
      // under every plot and need to be told apart at a glance.
      case "sectorSegment":
        return "bg-rmipink-100 text-rmipink-800 border-rmipink-200";
      case "metric":
        return "bg-rmipurple-100 text-rmipurple-800 border-rmipurple-200";
      case "keyFeature":
        return "bg-rmiblue-100 text-rmiblue-800 border-rmiblue-200";
      case "geographyGlobal-pub":
        return "bg-transparent text-pinishgreen-800 border-pinishgreen-800";
      // `pinishgreen` defines only 100/200/400/800 in `@theme`, so the 500/600/700
      // these two used to reference produced no colour at all — an outlined badge
      // with no text and no border. They follow `sector-pub` and `metric-pub`
      // instead: the family's 800 for text, its 400 for the outline.
      case "geographyRegion-pub":
      case "geographyCountry-pub":
        return "bg-transparent text-pinishgreen-800 border-pinishgreen-400";
      case "sector-pub":
        return "bg-transparent text-solar-800 border-solar-400";
      case "metric-pub":
        return "bg-transparent text-rmipurple-800 border-rmipurple-400";
      default:
        return "bg-rmigray-100 text-rmigray-800 border-rmigray-200";
    }
  };

  const badgeStylesBase = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getVariantStyles()} mr-2 mb-1`;
  const badgeStyles = className
    ? `${badgeStylesBase} ${className}`
    : badgeStylesBase;

  // If no tooltip, just return the basic badge
  if (!tooltip) {
    return buttonProps ? (
      <button
        type="button"
        className={badgeStyles}
        {...buttonProps}
      >
        {children}
      </button>
    ) : (
      <span className={badgeStyles}>{children}</span>
    );
  }

  // With tooltip, use the TextWithTooltip component
  return (
    <TextWithTooltip
      text={<span className={badgeStyles}>{children}</span>}
      tooltip={tooltip}
      position="right"
      as={buttonProps ? "button" : "span"}
      buttonProps={buttonProps}
    />
  );
};

export default Badge;
// --- value-aware helpers (schema-agnostic) --------------------

export type BadgeMaybeAbsentProps<T extends string | number> = Omit<
  React.ComponentProps<typeof Badge>,
  "children"
> & {
  /** Scalar children to show inside the badge (null/undefined => "None"). */
  children: T | null | undefined;
  /** Optional labeler for non-absent values (e.g., pretty format). */
  toLabel?: (v: T) => string;
  /** Visible text for the "None" case (default "None"). */
  noneLabel?: string;
  /** Optional decorator for the final label (e.g., highlight search matches). */
  renderLabel?: (label: string, isAbsent: boolean) => React.ReactNode;
};

export function BadgeMaybeAbsent<T extends string | number>({
  children,
  toLabel,
  noneLabel,
  renderLabel,
  ...rest
}: BadgeMaybeAbsentProps<T>) {
  const normalized = coalesceOptional(children);
  const absent = isAbsent(normalized);

  let base: string | number;
  if (absent) {
    base = noneLabel ?? "None";
  } else if (toLabel) {
    base = toLabel(children as T);
  } else if (typeof children === "string" || typeof children === "number") {
    base = String(children);
  } else {
    // Should be unreachable at runtime due to typing, but keep a safe fallback
    base = String(children);
  }

  const content =
    renderLabel && typeof base === "string" ? renderLabel(base, absent) : base;
  return <Badge {...rest}>{content}</Badge>;
}
