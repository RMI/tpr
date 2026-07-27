import React from "react";
import { Link } from "react-router-dom";
import ResourcesDropdown from "./ResourcesDropdown";

const HeaderNav: React.FC = () => {
  return (
    <nav className="mt-3 flex items-center gap-2 md:mt-0">
      <Link
        to="/contact"
        className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white"
      >
        Contact Us
      </Link>

      <ResourcesDropdown />
    </nav>
  );
};

export default HeaderNav;
