import React from "react";

const EnvironmentBanner: React.FC = () => {
  const mode = (import.meta.env.MODE ?? "development").trim().toLowerCase(); // "development", "production", "staging", etc.

  const isProd = mode === "production"; // boolean at build time
  if (isProd) {
    return null;
  }

  function getBgColor(mode: string): string {
    if (mode === "main") {
      return "bg-green-500";
    } else if (mode === "next") {
      return "bg-yellow-500";
    } else if (mode.startsWith("hotfix")) {
      return "bg-orange-500";
    } else if (mode.startsWith("develop")) {
      return "bg-red-500";
    } else if (mode.startsWith("pr-")) {
      return "bg-indigo-500";
    } else {
      return "bg-pink-500";
    }
  }

  const bgColor = getBgColor(mode);

  return (
    <div
      data-env-banner
      className={`${bgColor} text-white h-(--env-banner-height) flex items-center justify-center text-sm font-medium sticky top-0 z-50`}
    >
      {mode.toUpperCase()} Environment
    </div>
  );
};

export default EnvironmentBanner;
