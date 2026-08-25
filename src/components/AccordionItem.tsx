import React, { useId, useState } from "react";

/**
 * Shared collapsible list-item primitive behind the FAQ, five-step, and
 * step-by-step guide accordions. Centralizes the toggle wiring
 * (aria-expanded/aria-controls, rotating caret) so each caller only needs
 * to supply its own header and panel content/styling.
 *
 * The panel stays mounted and is toggled with the `hidden` attribute
 * instead of being conditionally rendered, so `aria-controls` always
 * points at an element that actually exists in the DOM (unmounting the
 * panel breaks that reference for screen readers while collapsed).
 */
const AccordionItem: React.FC<{
  header: React.ReactNode;
  panelClassName: string;
  children: React.ReactNode;
}> = ({ header, panelClassName, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <div className="px-6 py-5 md:px-7">
      <h3>
        <button
          type="button"
          className="group w-full text-left"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => setIsOpen((value) => !value)}
        >
          <div className="flex items-start justify-between gap-4">
            {header}
            <span
              className={
                "mt-1 text-rmigray-500 transition-transform " +
                (isOpen ? "rotate-180" : "rotate-0")
              }
              aria-hidden="true"
            >
              ▾
            </span>
          </div>
        </button>
      </h3>

      <div
        id={contentId}
        hidden={!isOpen}
        className={panelClassName}
      >
        {children}
      </div>
    </div>
  );
};

export default AccordionItem;
