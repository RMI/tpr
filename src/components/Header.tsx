import React from "react";
import { Link } from "react-router-dom";
import HeaderNav from "./HeaderNav";

export const HeaderBrand: React.FC<{ to?: string }> = ({ to = "/" }) => {
  return (
    <Link
      to={to}
      className="flex items-center space-x-3 group transition-all duration-300"
    >
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">
          Transition Pathways Repository
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs md:text-sm text-white/80">Created by</span>
          <img
            src="/RMILogo-white.svg"
            alt="RMI logo"
            className="h-4 md:h-5 w-auto"
          />
        </div>
      </div>
    </Link>
  );
};

const Header: React.FC = () => {
  return (
    <header className="relative z-50 bg-bluespruce text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center">
        <HeaderBrand />
        <HeaderNav />
      </div>
    </header>
  );
};

export default Header;
