import React from "react";
import { PathwayMetadataType } from "../types";
import { GROUPS, FeatureItem } from "./KeyFeatures";
import {
  createKeyFeatureResolver,
  type ResolvedKeyFeature,
} from "../utils/keyFeatureResolution";
import type { KeyFeatureKey } from "../utils/keyFeatureRules";
import { CoreDriverItem, coreDriverLabel } from "./CoreDrivers";
import type { CoreDriverKey } from "./CoreDrivers";

interface ComparisonKeyFeaturesProps {
  pathways: PathwayMetadataType[];
  /** The page's shared sector. Null resolves at each pathway's widest. */
  sector: string | null;
  /**
   * Each column's own geography, keyed by pathway id and written in that
   * publisher's spelling. A missing or null entry resolves at the widest.
   */
  geographies: Readonly<Record<string, string | null>>;
}

/** One column's resolver: a key feature's value for that column's scope. */
type ColumnResolver = (field: KeyFeatureKey) => ResolvedKeyFeature;

/**
 * One row of the grid: a label spanning every column, then one cell per
 * pathway. A driver row and a feature row differ only in what fills the cell.
 */
interface Row {
  key: string;
  label: string;
  cell: (
    pathway: PathwayMetadataType,
    resolve: ColumnResolver,
  ) => React.ReactNode;
}

/**
 * The comparison page's "Assumptions & Trends Overview", as the same six
 * themed groups the detail page uses — core drivers and key features
 * interleaved by theme rather than split into separate sections.
 *
 * Drivers come before their group's features, matching the detail page: the
 * authored narrative reads first and the enumerated values qualify it.
 *
 * Each key feature is resolved for its column's scope (#869) — the shared
 * sector and that column's own geography — and a value inherited from a broader
 * scope carries the same badge it does on the detail page.
 *
 * A driver row is dropped when NO compared pathway describes it. For a single
 * pathway "not a core driver for this pathway" is a real statement, which is
 * why the detail page renders it; but a row where every column says it carries
 * no comparative information, whereas one where some columns describe a driver
 * and others do not is the most informative row here. A group left with no
 * rows at all is skipped, which is what keeps the driver-only "Other" group
 * out until its drivers are authored.
 */
const ComparisonKeyFeatures: React.FC<ComparisonKeyFeaturesProps> = ({
  pathways,
  sector,
  geographies,
}) => {
  const n = pathways.length;

  // A group's rows come from the feature config rather than the data, so with
  // no pathways every heading would still render above empty columns. The page
  // guards this (it needs two pathways to render at all), but the component
  // should not depend on that.
  if (n === 0) return null;

  // One resolver per column per render, shared by every feature in it: the
  // effective scope and its fallback chains are the same for all of them.
  const resolvers: ColumnResolver[] = pathways.map((pathway) =>
    createKeyFeatureResolver(pathway, {
      sector,
      geography: geographies[pathway.id] ?? null,
    }),
  );

  const describedBySomeone = (driverKey: CoreDriverKey): boolean =>
    pathways.some((pathway) => pathway.coreDrivers?.[driverKey]);

  const rowsFor = (group: (typeof GROUPS)[number]): Row[] => [
    ...(group.drivers ?? [])
      .filter(describedBySomeone)
      .map((driverKey): Row => ({
        key: `driver-${driverKey}`,
        label: coreDriverLabel(driverKey),
        cell: (pathway) => (
          <CoreDriverItem
            driverKey={driverKey}
            coreDrivers={pathway.coreDrivers}
            showLabel={false}
          />
        ),
      })),
    ...group.features.map((feature): Row => ({
      key: `feature-${feature.key}`,
      label: feature.label,
      cell: (pathway, resolve) => (
        <FeatureItem
          feature={feature}
          resolution={resolve(feature.key)}
          showLabel={false}
        />
      ),
    })),
  ];

  // Resolved before rendering so a group's visibility and its row separators
  // are both decided from the same list.
  const groups = GROUPS.map((group) => ({
    label: group.label,
    rows: rowsFor(group),
  })).filter((group) => group.rows.length > 0);

  return (
    <div
      className="grid gap-x-6"
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
    >
      {groups.map((group, groupIdx) => (
        <React.Fragment key={group.label}>
          {/* Group header — spans all pathway columns, styled as a section heading */}
          <div
            className={`${groupIdx > 0 ? "mt-6" : ""} mb-3 bg-bluespruce px-3 py-1`}
            style={{ gridColumn: "1 / -1" }}
          >
            <h3 className="text-base font-semibold text-white">
              {group.label}
            </h3>
          </div>

          {group.rows.map((row, rowIdx) => (
            <React.Fragment key={row.key}>
              {/* Single label above all pathway cells */}
              <div
                className="pt-3 pb-1"
                style={{ gridColumn: "1 / -1" }}
              >
                <p className="text-xs font-semibold text-rmigray-500 uppercase tracking-wide">
                  {row.label}
                </p>
              </div>

              {/* Content cells — one per pathway, no label inside */}
              {pathways.map((pathway, idx) => (
                <div
                  key={pathway.id}
                  className="pb-3 min-w-0"
                >
                  {row.cell(pathway, resolvers[idx])}
                </div>
              ))}

              {/* Separator between rows, not after the last one */}
              {rowIdx < group.rows.length - 1 && (
                <div
                  className="border-b border-neutral-200"
                  style={{ gridColumn: "1 / -1" }}
                />
              )}
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ComparisonKeyFeatures;
