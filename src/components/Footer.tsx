import React from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import Colophon from "../components/Colophon";

const Footer: React.FC = () => {
  return (
    <footer className="bg-bluespruce border-t border-basalt mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <img
              src="/RMILogo-white.svg"
              alt="RMI logo"
              className="h-6 w-auto mr-2"
            />
            <span className="text-sm font-medium text-white">
              Transition Pathways Repository
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0">
            <Link
              to="/legal"
              className="text-sm text-white hover:text-energy transition-colors duration-200 sm:mr-6"
            >
              Legal
            </Link>
            <a
              href="mailto:tomwhite+pbtar@rmi.org"
              className="flex items-center text-sm text-white hover:text-energy transition-colors duration-200"
            >
              <Mail
                size={16}
                className="mr-1"
              />
              Give Feedback
            </a>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-basalt text-center">
          <Colophon
            className="inline-block text-xs text-white"
            trigger={`© ${new Date().getFullYear()} RMI. All rights reserved.`}
          />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
