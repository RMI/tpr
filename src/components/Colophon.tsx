import React, { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";

interface ColophonProps {
  className?: string;
  trigger?: React.ReactNode;
}

interface SystemInfo {
  userAgent: string;
  screenResolution: string;
  connectionType: string;
  language: string;
  devicePixelRatio: string;
}

interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  connection?: {
    effectiveType?: string;
    downlink?: number;
  };
}

const Colophon: React.FC<ColophonProps> = ({
  className = "",
  trigger = "Build and System Information",
}) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    userAgent: "Loading...",
    screenResolution: "Loading...",
    connectionType: "Loading...",
    language: "Loading...",
    devicePixelRatio: "Loading...",
  });
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    const getConnectionInfo = () => {
      if ("connection" in navigator) {
        const conn = navigator as unknown as NetworkInformation;
        const effectiveType =
          conn.connection?.effectiveType ?? conn.effectiveType ?? "unknown";
        const downlink = conn.connection?.downlink ?? conn.downlink ?? 0;
        return `${effectiveType} (${downlink}Mbps)`;
      }
      return "Not available";
    };

    setSystemInfo({
      userAgent: navigator.userAgent,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`,
      connectionType: getConnectionInfo(),
      language: navigator.language || "N/A",
      devicePixelRatio: `${window.devicePixelRatio}x`,
    });
  }, []);

  const formatInfoForCopy = () => {
    type EnvValue = string | boolean | undefined;

    const getEnvValue = (key: string, defaultValue: string = "N/A"): string => {
      const value = import.meta.env[key] as EnvValue;
      if (typeof value === "boolean") return String(value);
      return value?.toString() ?? defaultValue;
    };

    const sections = {
      "Build Info": {
        "App Version": getEnvValue("VITE_APP_VERSION"),
        "Build ID": getEnvValue("VITE_BUILD_ID"),
        "Git SHA": getEnvValue("VITE_GIT_SHA").slice(0, 7),
        "Node Version": getEnvValue("VITE_NODE_VERSION"),
        "Vite Version": getEnvValue("VITE_VERSION"),
      },
      "Runtime Info": {
        "User Agent": systemInfo.userAgent,
        "Screen Resolution": systemInfo.screenResolution,
        "Device Pixel Ratio": systemInfo.devicePixelRatio,
        "Language": systemInfo.language,
        "Connection": systemInfo.connectionType,
      },
    };

    return Object.entries(sections)
      .map(([section, data]) => {
        const items = Object.entries(data)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n");
        return `### ${section} ###\n${items}`;
      })
      .join("\n\n");
  };

  const handleCopy = () => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(formatInfoForCopy());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
        setCopyError(true);
        setTimeout(() => setCopyError(false), 2000);
      }
    })();
  };

  return (
    <details className={className}>
      <summary className="cursor-pointer">{trigger}</summary>
      <div className="mt-2">
        <button
          onClick={(e) => {
            e.preventDefault();
            handleCopy();
          }}
          className="mb-4 px-3 py-1.5 text-sm rounded border border-rmigray-300 hover:bg-rmigray-100 transition-colors inline-flex items-center gap-1.5"
          title="Copy all information"
        >
          {copied ? (
            <>
              <Check
                size={14}
                className="text-success-600"
              />
              <span className="text-success-800">Copied!</span>
            </>
          ) : copyError ? (
            <>
              <span className="text-error-600">Failed to copy</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>

        <div className="mb-3">
          <h4 className="font-medium mb-1">Build Info</h4>
          <ul className="list-none text-s">
            <li>App Version: {import.meta.env["VITE_APP_VERSION"] ?? "N/A"}</li>
            <li>Build ID: {import.meta.env["VITE_BUILD_ID"] ?? "N/A"}</li>
            <li>
              Git SHA: {import.meta.env["VITE_GIT_SHA"]?.slice(0, 7) ?? "N/A"}
            </li>
            <li>
              Node Version: {import.meta.env["VITE_NODE_VERSION"] ?? "N/A"}
            </li>
            <li>Vite Version: {import.meta.env["VITE_VERSION"] ?? "N/A"}</li>
          </ul>
        </div>

        <div className="mb-3">
          <h4 className="font-medium mb-1">Runtime Info</h4>
          <ul className="list-none text-s">
            <li>User Agent: {systemInfo.userAgent}</li>
            <li>Screen Resolution: {systemInfo.screenResolution}</li>
            <li>Device Pixel Ratio: {systemInfo.devicePixelRatio}</li>
            <li>Language: {systemInfo.language}</li>
            <li>Connection: {systemInfo.connectionType}</li>
          </ul>
        </div>
      </div>
    </details>
  );
};

export default Colophon;
