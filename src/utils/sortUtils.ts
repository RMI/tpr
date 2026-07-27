import { geographyLabel, normalizeGeography } from "./geographyUtils";

// Function to prioritize items that match the search term
export const prioritizeMatches = <T extends string | { name: string }>(
  items: T[],
  searchTerm: string,
): T[] => {
  if (!searchTerm.trim()) return items;

  return [...items].sort((a, b) => {
    const textA = typeof a === "string" ? a : a.name;
    const textB = typeof b === "string" ? b : b.name;

    const matchesA = textA.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesB = textB.toLowerCase().includes(searchTerm.toLowerCase());

    if (matchesA && !matchesB) return -1;
    if (!matchesA && matchesB) return 1;
    return 0;
  });
};

/** Stable partition: items whose code OR label includes the query come first. */
export const prioritizeGeographies = (
  items: string[],
  searchTerm: string,
): string[] => {
  const q = normalizeGeography(searchTerm).toLowerCase();
  if (!q) return items;

  const matched: string[] = [];
  const rest: string[] = [];

  for (const g of items) {
    const code = normalizeGeography(g).toLowerCase();
    const label = geographyLabel(g).toLowerCase();
    const labelNoSpaces = label.replace(/\s+/g, "");
    const hit =
      code.includes(q) || label.includes(q) || labelNoSpaces.includes(q);
    (hit ? matched : rest).push(g);
  }
  return [...matched, ...rest]; // preserve relative order within each bucket
};

// Utility for sorting pathway types according to a fixed order
export const pathwayTypeOrder = ["Predictive", "Exploratory", "Normative"];

export function sortPathwayType<T extends { title: string }>(arr: T[]): T[] {
  return arr.slice().sort((a, b) => {
    const indexA = pathwayTypeOrder.indexOf(a.title);
    const indexB = pathwayTypeOrder.indexOf(b.title);
    return (
      (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB)
    );
  });
}
