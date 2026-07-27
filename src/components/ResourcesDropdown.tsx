import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const resourceMenuItems = [
  {
    label: "How to choose a pathway",
    to: "/resources/how-to-choose-a-pathway",
  },
  { label: "Use cases", to: "/resources/use-cases" },
  { label: "Methodology", to: "/resources/methodology" },
  { label: "Updates", to: "/resources/updates" },
  { label: "FAQs", to: "/resources/faq" },
];

const ResourcesDropdown: React.FC = () => {
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!resourcesOpen) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setResourcesOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [resourcesOpen]);

  return (
    <div
      ref={menuRef}
      className="relative"
    >
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white"
        aria-expanded={resourcesOpen}
        onClick={() => setResourcesOpen((value) => !value)}
      >
        Resources
        <span className="text-white/70">▾</span>
      </button>

      {resourcesOpen && (
        <nav
          aria-label="Resources"
          className="absolute right-0 z-[60] mt-2 w-72 overflow-hidden rounded-md bg-white text-rmigray-800 shadow-lg ring-1 ring-black/5"
        >
          {resourceMenuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="block px-4 py-3 text-sm hover:bg-neutral-100"
              onClick={() => setResourcesOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
};

export default ResourcesDropdown;
