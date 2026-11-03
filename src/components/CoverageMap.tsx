import React, { useEffect, useMemo, useState } from "react";
import { geoCentroid, geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, Geometry } from "geojson";
import countries from "i18n-iso-countries";
import type { GeographyCode, PathwayMetadataType } from "../types";
import { pathwayISOCoverage } from "../utils/geographyUtils";
import { FILTER_REGIONS } from "../utils/filterRegions";

export type CoverageTier = "dedicated" | "planned";

// Countries we plan to add region- or country-specific pathways for next, in
// rollout order (#1036). A country moves to "dedicated" on its own as soon as a
// non-global pathway covers it, so this list only needs pruning, not syncing.
export const PLANNED_COVERAGE: readonly GeographyCode[] = [
  ...FILTER_REGIONS["European Union (EU)"],
  "GB",
  "CA",
  "IN",
  "CN",
];

// Every country a non-global pathway covers is "dedicated"; the planned list
// fills in the rest. Countries absent from the map are covered only by global
// pathways, which publish results for the regions inside their models.
export function coverageTiers(
  pathways: readonly PathwayMetadataType[],
): Map<GeographyCode, CoverageTier> {
  const tiers = new Map<GeographyCode, CoverageTier>();
  for (const code of PLANNED_COVERAGE) tiers.set(code, "planned");
  for (const pathway of pathways) {
    if (pathway.geography?.global) continue;
    for (const code of pathwayISOCoverage(pathway.geography)) {
      tiers.set(code, "dedicated");
    }
  }
  return tiers;
}

const TIER_FILL: Record<CoverageTier | "global", string> = {
  dedicated: "var(--color-rmiblue-800)",
  planned: "var(--color-energy)",
  global: "var(--color-neutral-300)",
};

const LEGEND: { tier: CoverageTier | "global"; label: string }[] = [
  { tier: "dedicated", label: "Region- or country-specific pathways" },
  {
    tier: "planned",
    label: "Region- or country-specific pathways coming next",
  },
  { tier: "global", label: "Covered by global pathways" },
];

// Countries too small to appear on the 1:110m map get a dot instead, at
// [longitude, latitude], so their coverage still shows.
const SMALL_COUNTRY_POINTS: Partial<Record<GeographyCode, [number, number]>> = {
  SG: [103.82, 1.35],
  MT: [14.44, 35.9],
};

const ANTARCTICA_NUMERIC = "010";
const FRANCE_NUMERIC = "250";
const WIDTH = 960;
const HEIGHT = 420;

type CountryShape = { code: string | undefined; geometry: Feature<Geometry> };

// The map draws French Guiana as part of France. Shading it with France reads
// as a mistake on a coverage map, so it becomes its own shape (GF), which no
// tier lists. Mainland France reaches about 5°W, so the cutoff sits in the
// mid-Atlantic and tests each polygon's centre, not one of its vertices.
const FRENCH_GUIANA_MAX_LONGITUDE = -30;

function splitFrenchGuiana(france: Feature<Geometry>): CountryShape[] {
  if (france.geometry.type !== "MultiPolygon") {
    return [{ code: "FR", geometry: france }];
  }
  const polygons = france.geometry.coordinates;
  const isGuiana = (polygon: (typeof polygons)[number]) =>
    geoCentroid({ type: "Polygon", coordinates: polygon })[0] <
    FRENCH_GUIANA_MAX_LONGITUDE;
  const part = (keep: boolean): Feature<Geometry> => ({
    ...france,
    geometry: {
      type: "MultiPolygon",
      coordinates: polygons.filter((p) => isGuiana(p) === keep),
    },
  });
  return [
    { code: "FR", geometry: part(false) },
    { code: "GF", geometry: part(true) },
  ];
}

export function toCountryShapes(topology: Topology): CountryShape[] {
  const collection = feature(
    topology,
    topology.objects.countries as GeometryCollection,
  );
  return collection.features
    .filter((f) => f.id !== ANTARCTICA_NUMERIC)
    .flatMap((f) =>
      f.id === FRANCE_NUMERIC
        ? splitFrenchGuiana(f)
        : [
            {
              code:
                f.id === undefined
                  ? undefined
                  : countries.numericToAlpha2(f.id),
              geometry: f,
            },
          ],
    );
}

interface CoverageMapProps {
  pathways: readonly PathwayMetadataType[];
}

const CoverageMap: React.FC<CoverageMapProps> = ({ pathways }) => {
  const [shapes, setShapes] = useState<CountryShape[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  // The map shapes are ~100 KB, so they load in their own chunk rather than
  // with the landing page.
  useEffect(() => {
    let cancelled = false;
    import("world-atlas/countries-110m.json")
      .then((mod) => {
        // JSON imports infer a literal type that TypeScript can't match to
        // Topology, so this goes through `unknown`.
        const topology = mod.default as unknown as Topology;
        if (!cancelled) setShapes(toCountryShapes(topology));
      })
      .catch((error: unknown) => {
        console.error("[CoverageMap] Could not load the world map.", error);
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tiers = useMemo(() => coverageTiers(pathways), [pathways]);

  const projection = useMemo(
    () =>
      geoEqualEarth().fitExtent(
        [
          [2, 2],
          [WIDTH - 2, HEIGHT - 2],
        ],
        { type: "Sphere" },
      ),
    [],
  );
  const path = useMemo(() => geoPath(projection), [projection]);

  // The surrounding text explains coverage, so a failed load only drops the
  // picture.
  if (loadFailed) return null;

  return (
    <figure>
      <div className="aspect-[960/420] w-full">
        {shapes && (
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto"
            role="img"
            aria-label="World map of the regions and countries the TPR covers, as described above"
          >
            <path
              d={path({ type: "Sphere" }) ?? undefined}
              fill="var(--color-neutral-50)"
              stroke="var(--color-neutral-400)"
            />
            {shapes.map(({ code, geometry }, i) => {
              const tier = code ? tiers.get(code as GeographyCode) : undefined;
              return (
                <path
                  key={code ?? `unmapped-${i}`}
                  d={path(geometry) ?? undefined}
                  fill={TIER_FILL[tier ?? "global"]}
                  stroke="white"
                  strokeWidth={0.5}
                  data-country={code}
                  data-tier={tier ?? "global"}
                />
              );
            })}
            {Object.entries(SMALL_COUNTRY_POINTS).map(([code, lonLat]) => {
              const tier = tiers.get(code as GeographyCode);
              const point = projection(lonLat);
              if (!tier || !point) return null;
              return (
                <circle
                  key={code}
                  cx={point[0]}
                  cy={point[1]}
                  r={3.5}
                  fill={TIER_FILL[tier]}
                  stroke="white"
                  strokeWidth={1}
                  data-tier={tier}
                />
              );
            })}
          </svg>
        )}
      </div>
      <figcaption>
        <ul className="mt-4 flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2 text-sm text-rmigray-700">
          {LEGEND.map(({ tier, label }) => (
            <li
              key={tier}
              className="flex items-center gap-2"
            >
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: TIER_FILL[tier] }}
                aria-hidden="true"
              />
              {label}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
};

export default CoverageMap;
