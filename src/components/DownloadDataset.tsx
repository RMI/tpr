// src/components/DownloadDataset.tsx
import React from "react";
import AdditionalInfoBox from "./AdditionalInfoBox";
import { MAX_PLOT_YEAR } from "../utils/plotYears";

type Props = {
  label: string;
  href: string;
  summary?: string;
  /**
   * The dataset runs past the last year the plots show, so the summary's year
   * range and the plots disagree; say that the download is complete.
   */
  extendsPastPlots?: boolean;
  className?: string;
};

export default function DownloadDataset({
  label,
  href,
  summary,
  extendsPastPlots = false,
  className,
}: Props) {
  return (
    <AdditionalInfoBox
      title="Related Dataset"
      className={className}
      actions={
        <a
          href={href}
          download
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 bg-energy text-white rounded-md hover:bg-energy-700 transition-colors duration-200"
        >
          Download
        </a>
      }
    >
      <p className="text-rmigray-700">{label}</p>
      {summary && (
        <p className="text-xs text-neutral-500 mt-1 truncate">{summary}</p>
      )}
      {extendsPastPlots && (
        <p className="text-xs text-rmigray-700 mt-1">
          The plots on this page show years up to {MAX_PLOT_YEAR}. This download
          contains every year.
        </p>
      )}
      <p className="text-xs text-rmigray-700 mt-1">
        Note: Minor deviations from the source data may occur due to light
        processing required for standardizing pathways to a common format.
      </p>
    </AdditionalInfoBox>
  );
}
