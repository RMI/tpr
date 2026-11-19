// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DownloadDataset from "./DownloadDataset";

describe("<DownloadDataset />", () => {
  it("renders label and a download link with href", () => {
    render(
      <DownloadDataset
        label="BAS Timeseries"
        href="/data/BAS-2024_timeseries.json"
      />,
    );
    expect(screen.getByText("BAS Timeseries")).toBeInTheDocument();
    const link = screen.getByText("Download");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/data/BAS-2024_timeseries.json");
    expect(link.getAttribute("download")).not.toBeNull();
  });

  it("shows summary when provided", () => {
    render(
      <DownloadDataset
        label="Dataset"
        href="/data/ds.json"
        summary="1990 → 2050 · 5 sectors · 3 geographies · 1620 rows"
      />,
    );
    expect(screen.getByText(/1990/)).toBeInTheDocument();
  });

  it("displays disclaimer about data deviations", () => {
    render(
      <DownloadDataset
        label="Dataset"
        href="/data/ds.json"
      />,
    );
    expect(
      screen.getByText(/Minor deviations from the source data may occur/),
    ).toBeInTheDocument();
  });

  it("says the download is complete only when it runs past the plots", () => {
    const { rerender } = render(
      <DownloadDataset
        label="Dataset"
        href="/data/ds.csv"
      />,
    );
    expect(screen.queryByText(/show years up to 2050/)).toBeNull();

    rerender(
      <DownloadDataset
        label="Dataset"
        href="/data/ds.csv"
        extendsPastPlots
      />,
    );
    expect(
      screen.getByText(
        "The plots on this page show years up to 2050. This download contains every year.",
      ),
    ).toBeInTheDocument();
  });
});
