# Key-feature fallback resolver: detail page (first slice of #869 / #859). Draft 2

## Context

v2 key features are arrays of `{sector, geography, value}` entries, but every surface still
renders `widestValue()` (`src/utils/keyFeatureScope.ts:292`), the placeholder for #869. The
detail page already holds a sector + geography selection in the pathway's own vocabulary (ribbon,
#872 / PR #946), and its plots and tables follow it. Key features don't yet.

**This plan** makes the detail page's key features follow the ribbon. Each feature shows the
value for the selected scope. If there is none, it walks up a fixed fallback chain: the
geography chain within the selected sector first, then the same chain under `across sectors`.
A badge appears when the value came from a broader scope. The plan also adds the semantic
states from Jacob's key-features note (cookbook decision 0023): the forbidden combination
Electrification × Power, the skipped scope-level sentinel, and authored vs. exhausted
"No information".

Branch: `feat/keyfeature-resolver` off `epic/v2`. No commits or pushes unless asked.

## PR split (keep PRs small)

| # | PR | Plan | CI |
|---|---|---|---|
| 1 | **Resolver + detail page** | **this plan** | green: no validator changes, so `schema:check` is unaffected |
| 1b | Comparison page wiring | separate plan, **same PR**, before review (per decision) | green |
| 2 | Key-feature value validation | separate plan (sketch below) | **red** until Jacob's workbook is re-imported (accepted) |
| 3 | Sentinel-placement / cardinality validation | separate plan (sketch below); could merge into 2 if small | red (same data) |

Keeping the validator out of PR 1 means the resolver can be reviewed with green CI. The red
`schema:check` lives only in the PR whose job is to make the data wrong.

## Decisions (settled)

- **Fixed order, no cost model.** A nested loop over `[selectedSector, "across sectors"]`
  (outer) × the geography chain (inner). There is no `TRANSITION_COSTS`; swapping the axis
  priority is swapping the loops.
- **Exact token lookup:** each step looks for an entry with exactly that
  `(sector, geography)` pair. `validateScopedEntries` already guarantees entry tokens are
  declared and that each scope has one value.
- **Geography chain:** the selected token, then every declared token whose countries include
  the selection's (smallest first, ties in declaration order), then `across regions`, then
  `Global`.
  - Examples: IEA-2025 `Japan → Japan and Korea → Asia Pacific → across regions → Global`;
    IEA-2024 `Southeast Asia → Asia Pacific → …` (by size, even though Asia Pacific is
    declared first).
- **`across regions`** is valid and sits as the widest fallback, just before `Global`.
- **Empty axis = widest scope.** A `null` sector becomes `widestSector(pathway)`, or
  `across sectors` if that's undefined. A `null` geography becomes `widestGeography(pathway)`.
- **Terminal vs. skipped values:** an authored `No information`, `None` or
  `No new technologies` ends the chain. A missing entry, or a `Not applicable at this scope
  level` cell, keeps it going. That includes arrays containing the sentinel: the sentinel
  stands for the whole cell.
- **Forbidden Electrification × Power** is declared once and short-circuits to "Not
  applicable" whether or not an entry exists. It never takes an `across sectors` value.
- **"Fallback"** means the source token differs from the requested (effective) token on
  either axis.
- **Wording:** exhausted and authored "No information" are distinct states in code, with the
  same visible text. The tooltips differ: "The pathway does not report this" (authored)
  versus "Nothing is recorded for this pathway at any scope" (exhausted).
- **Badge:** small and outlined, beside the feature label, only on fallbacks (including an
  inherited `No information`). Text: `"<Sector> · <Geography>"`.

## 1. Shared rules: `src/utils/keyFeatureRules.ts` (new)

Type-only imports, so PR 2's validator can import it from ts-node (`.ts` extension imports),
the same way it already imports `timeseriesTaxonomy.ts`.

- **Constants:**
  - `ACROSS_SECTORS`, `ACROSS_REGIONS`, `GLOBAL_SCOPE`. Re-export from `keyFeatureScope.ts`
    to avoid adding a fourth copy.
  - `SCOPE_LEVEL_NOT_APPLICABLE = "Not applicable at this scope level"`
  - `MEASURE_NOT_APPLICABLE = "Not Applicable"`
- **`FORBIDDEN_KEY_FEATURE_SECTORS`:** `{ electrification: ["Power"] }`, plus
  `isForbiddenKeyFeatureSector(field, sector)`.
- **`isScopeLevelNotApplicable(value)`:** true for the scalar, or for any array containing
  it.
- **`declaredTokenCodes(token, geography)`:** the countries a token covers, for declared
  tokens only (`Global` → `null` = everything; region key → members; declared country →
  itself; `across regions` → union of all). This is the single place both the resolver and
  the widest helpers compute a token's countries. Region keys are checked first, so JRC's
  region `"TH"` and region `"EU"` resolve as regions.
- **`widestSector(pathway)`:** `across sectors` if any key-feature row uses it; otherwise the
  single declared sector; otherwise `null`.
- **`widestGeography(pathway)`:** `Global` if `geography.global`; otherwise the declared token
  whose countries contain every other token's; otherwise `across regions`.

## 2. Resolver: `src/utils/keyFeatureResolution.ts` (new)

This is kept separate from `keyFeatureScope.ts`, which keeps search's overlap semantics.

```ts
export type ResolvedKeyFeature =
  | { status: "resolved"; value: string | string[]; sourceScope: Scope; requestedScope: Scope; isFallback: boolean }
  | { status: "forbidden"; requestedScope: Scope }   // renders "Not applicable"
  | { status: "unavailable"; requestedScope: Scope }; // exhausted; renders "No information"

export function geographyChain(selected: string, geography: Geography | null | undefined): string[];
export function resolveKeyFeature(pathway, field: KeyFeatureKey, selection: PathwayScopeSelection): ResolvedKeyFeature;
```

1. **Effective scope:** fill each empty axis with its widest value (see Decisions).
2. **Forbidden:** if `isForbiddenKeyFeatureSector(field, sector)`, return `forbidden`.
3. **Sector chain:**
   - `[sector, across sectors]`;
   - just `[across sectors]` when the sector already is that;
   - just `[sector]` when the pathway doesn't declare the sector (across sectors is the union
     of *declared* sectors, per #869).
4. **Geography chain** (`geographyChain`):
   - `Global` → `[Global]`.
   - `across regions` → `[across regions, Global]`.
   - Otherwise, take the selection's countries `S`:
     - if `S` is empty or unknown (unmapped region, stale token) →
       `[selected, across regions, Global]`;
     - else `[selected, …containing declared tokens (countries ⊇ S, excluding Global and the
       selected token, sorted by size then declaration order), across regions, Global]`,
       deduplicated.
5. **Search:** for each sector in the sector chain, then each geography in the geography
   chain, find the exact entry. Skip it if it's missing or `isScopeLevelNotApplicable`.
   Otherwise return `resolved` with `isFallback` set from the token comparison.
6. **Nothing found:** return `unavailable`.

Malformed or non-array input degrades to "no entries" (export and reuse `asEntries` from
`keyFeatureScope.ts`).

Also add `sourceScopeLabel(scope)` → `"Across sectors · South East Asia"`, using
`geographyLabel(normalizeGeography())` as `scopeLabel.ts` does.

## 3. UI: `src/components/KeyFeatures.tsx`, `src/components/Badge.tsx`

- **`KeyFeatures`** gains optional `pathway` + `scope` props. When `pathway` is present it
  resolves each feature and passes `resolution` to `FeatureItem`. Without it (the comparison
  page, until 1b), `FeatureItem` keeps the `widestValue` path unchanged.
- **`FeatureItem`** renders from `resolution`:
  - **`resolved`, exact:** today's rendering, no badge.
  - **`resolved`, fallback:** today's rendering of `value`, plus a scope badge beside the
    label in both label branches (pills, and sentiment/neutral). Tooltip:
    "No value for {scopeSelectionLabel(requestedScope)}; showing the closest broader scope
    this pathway reports."
  - **Authored `No information`:** as today, with tooltip "The pathway does not report this"
    (plus the scope badge if it's a fallback).
  - **`unavailable`:** the same "No information" display, with tooltip "Nothing is recorded
    for this pathway at any scope". No badge.
  - **`forbidden`:** a "Not applicable" badge with tooltip "{Feature} does not apply to the
    {sector} sector". Scales and pills render with nothing selected. This is handled before
    the sentiment/neutral code, which today turns `Not Applicable` into "No information".
  - The sentinel string is never rendered.
- **Known limit, left to #852:** in full-option pill mode (single/multi-select without
  `selectedOnly`), "no value" shows as all pills unselected, so the two tooltips only appear
  where a "No information" badge or pill renders.
- **`Badge.tsx`:** add one outlined neutral variant (e.g. `scope`) for the source badge, in
  the style of the `-pub` variants.

## 4. Detail page: `src/pages/PathwayDetailPage.tsx`

Pass `pathway={pathway}` and `scope={scope}` to both `KeyFeatures` instances (around lines 362
and 370). An empty axis needs no special guard, because the resolver treats it as widest.

Also update stale comments that point to #869: `KeyFeatures.tsx:292-296` and `widestValue`'s
doc, which should say only the comparison page uses it until 1b. In `scopeSeed.ts:47`, change
the stale `cross-sector` token to `across sectors`.

## 5. Tests

- **`keyFeatureRules.test.ts`:**
  - `declaredTokenCodes`, including JRC-style `"TH"`/`"EU"` region keys;
  - `widestSector`: across sectors present / single sector / PHDOE-shaped `null`;
  - `widestGeography`: global / ACE single region / SDSN single country / containing region /
    no container → `across regions`;
  - `isScopeLevelNotApplicable`: scalar and array.
- **`keyFeatureResolution.test.ts`:**
  - **Geography chain:**
    - IEA-2025 nesting `Japan → Japan and Korea → Asia Pacific`;
    - IEA-2024 smallest-first even though the broader region is declared first;
    - equal-size ties in declaration order;
    - region → its containing regions;
    - Global → `[Global]`;
    - unmapped/stale token → `[selected, across regions, Global]`;
    - `across regions` sits just before Global.
  - **Order:** the selected sector exhausts the geography chain before `across sectors`, so
    `Power·Global` beats `across sectors·TH`; once in `across sectors`, `TH` beats wider
    geographies.
  - **Terminal vs. skipped:**
    - a missing entry continues;
    - the sentinel continues, scalar and array (the ACE Buildings electrification shape);
    - exact and inherited `No information` stop, with the source scope recorded;
    - `None` and `No new technologies` are answers.
  - **Edge cases:**
    - an exhausted chain → `unavailable`;
    - `electrification·Power` → `forbidden` with only an `across sectors` entry present,
      including null sector on a single-sector Power pathway;
    - an undeclared sector gets no `across sectors` fallback;
    - null axes → widest;
    - array values are preserved;
    - a non-array field → `unavailable`.
- **`KeyFeatures.test.tsx`:**
  - exact: no badge;
  - fallback: badge text and tooltip;
  - inherited `No information` has the badge;
  - the authored vs. exhausted tooltips differ;
  - forbidden renders "Not applicable", not "No information";
  - the sentinel never appears;
  - the no-`pathway` path renders exactly as before.
- **`Badge.test.tsx`:** the new variant.
- **`PathwayDetailPage.scope.test.tsx`:**
  - Change the fixture's stale `"cross-sector"` to `"across sectors"` (around lines 36–42).
    Exact lookup never matches the old spelling.
  - Reverse "does not re-scope key features" (around lines 321–343) into: changing the
    ribbon changes the resolved value and the badge.

## Verification

1. Run the targeted vitest files above, then `npm test`, `npm run lint`,
   `npm run format:check` and `npm run build`. Don't rely on `tsc` (see memory).
2. `npm run schema:check` should be unchanged from `epic/v2` (green), since there are no
   validator changes in this PR.
3. Browser check on the dev server (:3000):

| Pathway | Selection | Expected |
|---|---|---|
| ACE-ATS-2024 | Buildings | Electrification "Low or no change" with badge "Across sectors · ASEAN" |
| IEA-NZE-2024 | Power | "Across sectors · Global" badges |
| SDSN (any) | Power | Electrification "Not applicable" |
| JRC GECO | South East Asia | "Power · Global" badges (chain SEA → across regions → Global) |
| JRC GECO | Power · TH | no badges |
| PHDOE-CES2 | Other | resolves without errors |

## Issue text to update (external write, so I won't do it unasked)

In #869, remove the `TRANSITION_COSTS` block and the "flipping `TRANSITION_COSTS` swaps to
chain B" acceptance criterion. Replace them with: the fixed order is sector-preserving, and
swapping the axis priority is swapping the loop nesting in `resolveKeyFeature`.

---

## Out of scope for this plan → separate plans

### 1b. Comparison page (same PR, before review)

- Pass the shared `sector` and the per-column `selectedGeographies[id]` into
  `ComparisonKeyFeatures`, and resolve each cell with the same resolver and `FeatureItem`.
- Integration tests:
  - each column uses its own geography;
  - two columns resolve through different regions;
  - forbidden behaves as on the detail page.
- Then delete `widestValue`, `sectorBreadth` and `geographyBreadth` (which also removes the
  two-letter-regex bug that ranks JRC's `"EU"` as a country).
- From the PR 1 review:
  - **Drop `KeyFeatures`' `keyFeatures` prop.** It only feeds the widest-value path; once every
    caller passes `pathway`, it duplicates `pathway.keyFeatures` and the two can disagree.
    `FeatureItem`'s `keyFeatures` goes the same way once `resolution` is required.
  - **Electrification × Power with an empty sector.** On a Power-only pathway that has an
    `across sectors` row, a `null` sector resolves to `across sectors`, so the forbidden check
    misses and Electrification inherits that row's value. The detail page never leaves the
    sector empty; if the comparison page can, treat `across sectors` on a pathway whose only
    declared sector is forbidden as that sector (e.g. in `isForbiddenKeyFeatureSector`'s caller).

### PR 2. Key-feature value validation (red CI accepted)

- **In `validateScopedEntries`:**
  - forbidden combinations both ways: Electrification·Power must be `Not Applicable`, and
    `Not Applicable` is rejected anywhere else;
  - reject arrays that mix the sentinel with real values.
- **Schema:** drop `No information` from the `policyTypes` enum, regenerate types, and update
  `pathwayMetadata.v2.test.ts`.
- **Expected failures** (listed in the PR description for Jacob): 6 SDSN-CW-*-SG-2024 files
  (`No information`), and PHDOE-CES1/REFERENCE-2023 (`Moderate increase`).

### PR 3. Sentinel placement + widest-sector validation (could fold into PR 2)

- Encode the note's per-field cardinality table (`SCOPE_CARDINALITY`) in
  `keyFeatureRules.ts`.
- Using `widestSector` / `widestGeography` from this PR: inside the pattern the value must
  not be the sentinel; outside it, it must be. Forbidden-combination entries are exempt.
- 2+ sectors with no `across sectors` row → error.
- **Expected failures:** 13 SDSN files with the sentinel on their widest row, and
  PHDOE-CES1/REFERENCE (no `across sectors` row).

### Later / other plans

- Search integration: resolved facet values, exact-over-fallback ranking, card indicators.
  The policyAmbition facet probably shouldn't offer the sentinel as an option.
- #852 badge taxonomy, including a "No information" display for full-option pill mode, and
  #837 scale alignment.
- Cardinality completeness (required rows per D10).
- A technology axis, if a technology selection ever exists.
