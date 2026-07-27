import React, { useId, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface TextWithTooltipProps {
  text: React.ReactNode;
  tooltip: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  position?: "right" | "top" | "bottom" | "left";
}

// Arrow component that uses Tailwind classes
const TooltipArrow = ({
  position,
}: {
  position: "right" | "top" | "bottom" | "left";
}) => {
  let positionClasses = "";
  let borderClasses = "";

  switch (position) {
    case "right":
      positionClasses = "top-1/2 -left-2 transform -translate-y-1/2";
      borderClasses = "border-r-rmigray-100";
      break;
    case "left":
      positionClasses = "top-1/2 -right-2 transform -translate-y-1/2";
      borderClasses = "border-l-rmigray-100";
      break;
    case "top":
      positionClasses = "-bottom-2 left-1/2 transform -translate-x-1/2";
      borderClasses = "border-t-rmigray-100";
      break;
    case "bottom":
      positionClasses = "-top-2 left-1/2 transform -translate-x-1/2";
      borderClasses = "border-b-rmigray-100";
      break;
  }

  return (
    <div
      className={`absolute border-4 opacity-95 border-transparent ${positionClasses} ${borderClasses}`}
      aria-hidden="true"
    />
  );
};

const TextWithTooltip: React.FC<TextWithTooltipProps> = ({
  text,
  tooltip,
  ariaLabel,
  className = "",
  position = "right",
}) => {
  // Generate a unique ID for this tooltip instance
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Handle click to blur (remove focus) from tooltip trigger
  const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.currentTarget.blur();
  };

  // Handle keydown to allow dismissing tooltip with Escape key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Escape") {
      e.currentTarget.blur();
      setIsVisible(false);
    }
  };

  // Update tooltip position based on trigger position
  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const scrollY =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop;
    const scrollX =
      window.scrollX ||
      window.pageXOffset ||
      document.documentElement.scrollLeft;

    // Calculate position based on trigger element and desired position
    let top = 0;
    let left = 0;

    switch (position) {
      case "right":
        top = rect.top + scrollY + rect.height / 2;
        left = rect.right + scrollX;
        break;
      case "left":
        top = rect.top + scrollY + rect.height / 2;
        left = rect.left + scrollX;
        break;
      case "top":
        top = rect.top + scrollY;
        left = rect.left + scrollX + rect.width / 2;
        break;
      case "bottom":
        top = rect.bottom + scrollY;
        left = rect.left + scrollX + rect.width / 2;
        break;
      default:
        top = rect.top + scrollY + rect.height / 2;
        left = rect.right + scrollX;
    }
    setTooltipPosition({ top, left });
  }, [position]);

  // Add an effect to calculate initial position after mount
  useEffect(() => {
    if (triggerRef.current) {
      updatePosition();
    }
  }, [updatePosition]);

  // Add event handlers
  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const handleMouseEnter = () => {
      updatePosition();
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleFocus = () => {
      updatePosition();
      setIsVisible(true);
    };

    const handleBlur = () => {
      setIsVisible(false);
    };

    trigger.addEventListener("mouseenter", handleMouseEnter);
    trigger.addEventListener("mouseleave", handleMouseLeave);
    trigger.addEventListener("focus", handleFocus);
    trigger.addEventListener("blur", handleBlur);

    // Update position on window resize
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    // Cleanup event listeners on unmount
    return () => {
      trigger.removeEventListener("mouseenter", handleMouseEnter);
      trigger.removeEventListener("mouseleave", handleMouseLeave);
      trigger.removeEventListener("focus", handleFocus);
      trigger.removeEventListener("blur", handleBlur);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [updatePosition]);

  // Get tooltip CSS classes based on position
  const getTooltipTransformClass = () => {
    switch (position) {
      case "right":
        return "transform -translate-y-1/2";
      case "left":
        return "transform -translate-y-1/2 -translate-x-full";
      case "top":
        return "transform -translate-y-full -translate-x-1/2";
      case "bottom":
        return "transform -translate-x-1/2";
      default:
        return "transform -translate-y-1/2";
    }
  };

  // Calculate tooltip container styles
  const getTooltipStyles = () => {
    // Default position if tooltipPosition is null
    if (!tooltipPosition) {
      return {
        position: "absolute",
        top: 0,
        left: 0,
        opacity: 0,
        visibility: "hidden",
      } as React.CSSProperties;
    }

    return {
      position: "absolute",
      top: tooltipPosition.top,
      left: tooltipPosition.left,
      zIndex: 9999,
      opacity: isVisible ? 1 : 0,
      visibility: isVisible ? "visible" : "hidden",
      transition: "opacity 200ms ease-in-out, visibility 200ms ease-in-out",
      pointerEvents: "none",
    } as React.CSSProperties;
  };

  return (
    <>
      <span
        ref={triggerRef}
        className={`relative inline-block cursor-help ${className}`}
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        {text}
      </span>

      {isVisible &&
        tooltipPosition &&
        createPortal(
          <div
            style={getTooltipStyles()}
            className={getTooltipTransformClass()}
          >
            <div
              className="bg-white text-rmigray-500 text-xs rounded shadow-lg max-w-xs border border-rmigray-100 px-3 py-2 relative opacity-95"
              id={tooltipId}
              role="tooltip"
            >
              {tooltip}
              <TooltipArrow position={position} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default TextWithTooltip;
