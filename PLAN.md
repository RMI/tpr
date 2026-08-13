# #858 — v2 pathway metadata schema + ACE/IEA migration

## Context

#858 is the foundation ticket of epic #860 (best-effort / inheritance search). The epic's goal: when a
user narrows a search (e.g. "Solar power in Thailand"), show the most specific value each pathway
actually has, falling back to a broader scope rather than dropping the pathway. That requires
keyFeature values to carry the scope they apply to — today each is a single flat scalar (or flat array)
per pathway, with no scope at all.

#858 delivers the data-model half: a `pathwayMetadata.v2.json` where each of the 11 keyFeatures is an
array of `{sector, geography, value}` entries, plus the new `coreDrivers`, `dependencies`, and
`pathwayDescription` sections. The resolver that ranks scopes is #869; the scope badges are #859.
Neither is in scope here — #858 lands the shape and the search/render changes that shape forces.

**Scope decided with the user, narrower than the issue text:**

- **Data migration covers 7 files** — the 4 ACE and 3 IEA files, edited in place. The other 49 move in a
  follow-up PR.
- **No runtime v1→v2 conversion.** The loader validates against v2 only, so the 49 un-migrated files
  simply don't load. If a compatibility shim turns out to be wanted, that's a later decision.
- **#801's NGFS region work is dropped** and handed to a separate thread (see *Handoffs*).

### Consequence to be aware of

Loading v2 only means **the app goes from 56 pathways to 7** until the follow-up PR lands. Search,
comparison, and the step-by-step guide will all be working off ACE + IEA alone. That's fine on a
feature branch but would look broken if deployed, so the follow-up shouldn't lag far behind.

Two things make this cheaper than it sounds. `validateDataCollect` already filters entries to the one
schema `$id` it's handed, so "only load v2" is a one-line pointer change in
`src/data/pathwayMetadata.ts` rather than new machinery. And the test suite doesn't hardcode the corpus
size — the only real-data assertion, `PathwaySearch.test.tsx:46`, compares rendered cards to
`pathwayMetadata.length`, so it stays green at 7. The 2108 baseline should hold.

The one thing worth adding: the drop is currently **silent**. Have the loader log how many documents
were skipped for an unrecognised `$schema`, so 49 missing pathways can't be mistaken for a data bug.

## Findings that change #858 as written

1. **`expertOverview` is a 3-section markdown document, identical in structure across all 56 files.**
   The migration is a *decomposition*, not a copy:

   | Section | n | median | max | v2 destination |
   |---|---|---|---|---|
   | `#### Pathway Description` | 56 | 1343 | 2727 | `pathwayDescription` |
   | `#### Core Drivers` | 55 | 1184 | 2137 | `coreDrivers` — prose, needs a human |
   | `#### Application to Transition Assessment` | 56 | 1860 | 2655 | **nothing in v2** |

   #858's 2500-char cap on `pathwayDescription` is **correct** — it applies to the section, not the
   whole 4.4 KB `expertOverview`. All 7 in-scope files land between 730 and 1467 chars.

2. **The third section has no home.** Per your call, v2 gains a nullable `transitionAssessment`
   (string, max 2500) so the migration orphans no authored content. Flag on #858 as a scope addition.

3. **`coreDrivers` cannot be codemodded.** The `#### Core Drivers` prose uses loose italic sub-labels
   (`*Policy:*`, `*Emissions goals:*`, `*Technology Deployment & Technology costs:*`) that don't map
   cleanly onto the 7 required fields. Per #858, scaffold all 7 as `null`; keep the prose in
   `transitionAssessment` so nothing is lost pending hand-authoring.

4. **`ACE-CNS-2024.json` has a malformed heading.** Its "Core Drivers" heading lost its `####` markers,
   so it reads as one 2727-char Pathway Description. Restore the markers and the description measures
   1204 chars. Only file of 56 affected.

5. **v2's keyFeature `geography` must not be a closed enum.** #858 says `geography ∈ geographyItem
   values`, but `geographyItem.v1.json`'s enum holds only 8 region labels, while `geography.regions`
   keys are free-form by #783's design — IEA's own files already use `Asia Pacific`, `Eurasia`,
   `Middle East`, and `Central and South America`, none of them in that enum. A closed enum would
   reject any future finer-scope entry on an IEA pathway.

6. **`pathwayOverview` has zero production readers.** Authored in 5 files and typed, never rendered.
   For the 2 in-scope IEA files that have it (493 and 419 chars), prepend it as the lead paragraph of
   `pathwayDescription`; both stay well under 2500.

7. **`npm run json:check` does not exist.** The real gate is `npm run schema` (= `schema:check` + type
   regen + docs regen). `src/data/README.md:15` is stale.

8. **TypeScript will not catch this migration.** `keyof PathwayMetadataType["keyFeatures"]` is unchanged
   by the shape change, so `KeyFeatures.tsx:241`'s `rawValue` flows into `Array.isArray` / `typeof`
   guards that silently degrade to "No information" rather than erroring. Expect near-zero compile
   errors and real runtime breakage — the tests below are the actual safety net.

## Commit sequence

Your order works, with one correction and one insertion.

**Correction to commit 1:** it must *not* repoint `PathwayMetadataType`. If it does, every consumer
starts reading v1 data through v2 array types immediately and commit 1 is broken on its own. Keep it
purely additive — v2 schema and types land alongside v1, nothing consumes them yet.

**Insertion:** the loader pointer flip is what makes v2 shape reach the consumers, so it belongs at the
head of commit 3, not in commit 2. Commit 2 then stays green: the 7 files validate against v2 via
`schema:check` but aren't loaded yet, so the app still runs on the 49 v1 files.

### 1. Schema + generated types (additive, green)

New `src/schema/pathwayMetadata.v2.json` and the two new common subschemas; register them in
`src/schema/common/index.ts`; regenerate `src/types/**` and `public/schema/*.html`. `v1` untouched and
still loadable. `PathwayMetadataType` still points at v1. No behaviour change.

### 2. Migrate the 7 ACE/IEA data files (green)

The 7 files get `$schema` → v2, decomposed `expertOverview`, wrapped keyFeatures, scaffolded
`coreDrivers`/`dependencies`. Plus v2 fixtures under `testdata/valid/`, keeping at least one fixture on
v1 so `schema:check` covers coexistence. App unchanged — still loading v1.

### 3. Loader flip + search semantics

`src/data/pathwayMetadata.ts` points at v2; `PathwayMetadataType` → `PathwayMetadataV2`; both facet arms
and option-building in `searchUtils.ts` move to scoped entries. **This is where the corpus drops to 7.**

Intermediate state to accept knowingly: between commits 3 and 4, keyFeature pills render "No
information" for all 7 pathways, because `KeyFeatures.tsx` is still reading arrays as scalars. It
degrades silently rather than crashing, which is exactly finding 8 — worth a line in the commit message
so it doesn't read as a regression to a reviewer bisecting.

### 4. Rendering

`KeyFeatures.tsx` reads through the widest-entry helper; `PathwayDetailPage.tsx` swaps `expertOverview`
→ `pathwayDescription`. Pills come back. This is the commit that restores parity.

## Schema design (`src/schema/pathwayMetadata.v2.json`)

`$id: http://pathways.rmi.org/schema/pathwayMetadata.v2.json`. Copy v1, then:

**keyFeatures** — each of the 11 fields becomes an array of scoped entries. Extract one reusable scoped-
entry shape (the `value` differs per field, the scope doesn't):

```jsonc
{ "type": "array", "uniqueItems": true, "items": {
    "type": "object", "additionalProperties": false,
    "required": ["sector", "geography", "value"],
    "properties": {
      "sector":    { "$ref": ".../common/scopeSector.v2.json" },
      "geography": { "$ref": ".../common/scopeGeography.v2.json" },
      "value":     { /* per-field: v1's enum verbatim, or array-of-enum for the 2 array fields */ }
    } } }
```

- All 11 fields stay in `required`, with no `minItems` — an empty array is the legal "absent at every
  scope" state that lets #869's resolver fall through to "No information".
- **Two fields keep array values**: `policyTypes` and `newTechnologiesIncluded` (both `minItems: 1`
  arrays in v1). The codemod must nest, not splat: one entry whose `value` is the whole v1 array.
  `emissionsScope` is a `$ref` scalar and behaves like the other 8.
- `"No information"` is **already** in every v1 enum except `policyTypes` (which has `"None"`). Add
  `"No information"` to `policyTypes`' item enum so #858's terminate-the-fallback semantics work
  uniformly across all 11.

**Two new common subschemas** — both must be added to `src/schema/common/index.ts` by hand or AJV fails
with "no schema with key or ref"; typegen auto-discovers, so only AJV needs the manual step:

- `scopeSector.v2.json` — `sector.v1.json#/$defs/displayName`'s 15 members **+ `"cross-sector"`**.
- `scopeGeography.v2.json` — an **open** string: `"Global"`, `"cross-region"`, any `countryCode.v1`
  member, or any author-defined region label. Carries `geographyItem`'s non-enum guards
  (`minLength: 1`, non-blank pattern, `not` 3-letter) instead of a closed enum, per finding 5.

**New top-level fields**, as #858 specifies except where noted:

- `pathwayDescription`: `["string","null"]`, max 2500. Replaces `expertOverview` and `pathwayOverview`,
  both **removed**. Root `required` swaps `expertOverview` → `pathwayDescription`.
- `transitionAssessment`: `["string","null"]`, max 2500. **Addition beyond #858** (finding 2).
- `coreDrivers`: object, `additionalProperties: false`, all 7 required and nullable
  (`["string","null"]`, max 500): `policies`, `emissionsTargets`, `technologyCosts`,
  `investmentChange`, `macroeconomicDrivers`, `behavioralShifts`, `otherDrivers`.
- `dependencies`: array of `{dependency_name, dependency_description (≤500), sector, evidence_type}`,
  all required, `additionalProperties: false`, enums per #858.

**Cross-field constraint is not expressible in draft-07.** #858 requires an entry's `sector`/
`geography` to be declared in the pathway's own `sectors`/`geography`. That needs sibling data with
dynamic keys — AJV's `$data` can't compute the union either. Implement as a structural check in
`scripts/schema-check-files.ts` alongside AJV so `npm run schema:check` still enforces it. Note AJV runs
`strict: true`: any new keyword must be registered (as `tsType` already is) or `addSchema` throws.

## Search-facet semantics (the #858 gap)

`emissionsTrajectory` and `policyAmbition` are keyFeature fields **and** search facets read as scalars.
Both option-building (`searchUtils.ts:86,91`) and matching (`:438–500`) break on arrays — and break
*silently*: `buildOptionsFromValues` would label entries `"[object Object]"`, and `concrete.includes(v)`
against an array is always false, so **selecting either facet would return zero pathways**.

Per your steer, matching respects the user's selected scope. Implement containment without pre-empting
#869's cost model:

- **Option building** — `entries.flatMap(e => e.value)` (flatten twice for the two array-valued fields).
  Values are unchanged from v1, so the dropdowns and `StepByStepGuide`'s hardcoded remap categories
  keep working.
- **Matching** — a pathway matches if it has an entry whose scope **contains** the active
  sector/geography filter and whose value is selected:
  - *sector* — entry sector equals the selected sector, or is `"cross-sector"` **and** the selected
    sector is one the pathway declares (per Jacob on #869: `"cross-sector"` is the union of the
    pathway's own sectors, not a universal match).
  - *geography* — the selected region's ISO set ⊆ the entry's ISO set, reusing
    `selectedGeographyToISO` (`src/utils/filterRegions.ts`) and `pathwayISOCoverage`
    (`src/utils/geographyUtils.ts:36`). `"Global"` contains everything.
  - With no sector/geography filter active this degenerates to "any entry matches", preserving today's
    behaviour.
- **No cost model, no ranking, no fallback ordering** — those are #869. This decides inclusion only.

The four near-identical ~30-line single-valued-token blocks (`pathwayType`, `emissionsTrajectory`,
`policyAmbition`, `dataAvailability`) should collapse into one `scopedFacet()` helper rather than being
edited in parallel. `ABSENT_FILTER_TOKEN` maps to an empty entries array.

**One semantic question stays open for Jacob** — draft comment at the end.

## Rendering

`KeyFeatures.tsx` is the only place values are interpreted (`ComparisonKeyFeatures.tsx` imports its
`GROUPS`/`FeatureItem`, so one fix covers both). Add a small provisional helper — e.g.
`src/utils/keyFeatureValues.ts` — that picks the widest-scope entry, and use it at
`KeyFeatures.tsx:241` so all four branches (`single-select`, `multi-select`, `sentiment`, `neutral`)
receive the shape they get today. Views stay pixel-identical; #859 replaces the helper with the
resolver's `{value, scope, isExact}` and adds badges. Mark it explicitly provisional, referencing #869.

`PathwayDetailPage.tsx:257–265` swaps `pathway.expertOverview` → `pathwayDescription`. Two copy
decisions ride along: the "Expert Overview" `<h2>` and the matching user-facing prose at
`ResourcesMethodologyPage.tsx:161–176`. Renaming is #859's call — keep current wording and note it, so
this PR carries no visible copy change.

## Files to change

**Commit 1 — schema + types**
- new `src/schema/pathwayMetadata.v2.json`; new `src/schema/common/scopeSector.v2.json` and
  `scopeGeography.v2.json`; register both in `src/schema/common/index.ts`.
- `src/schema/pathwayMetadata.v1.json` — untouched.
- `src/types/index.ts` — export `PathwayMetadataV2`; **leave `PathwayMetadataType` on v1**.
- Regenerate, never hand-edit: `src/types/**/*.d.ts`, `public/schema/*.html`. CI's `types-check` and
  `schema-docs` jobs re-run both generators and fail on any diff, so both must be regenerated and left
  in the tree.
- `scripts/schema-check-files.ts` — the cross-field structural check.

**Commit 2 — data**
- `src/data/asean-centre-for-energy/ACE-{ATS,BAS,CNS,RAS}-2024.json` — all `cross-sector` /
  `South East Asia`. Fix ACE-CNS's `####` heading first.
- `src/data/iea/IEA-{APS,NZE,STEPS}-2024.json` — all `cross-sector` / `Global`. APS and STEPS also fold
  `pathwayOverview` into `pathwayDescription`.
- `testdata/valid/` — v2 fixtures, at least one left on v1. `pathwayMetadata_standard.json` is spread
  ~20× in `validateData.test.tsx`, and `_full`/`_sample_01..04` feed `searchUtils`, `PathwayCard`, and
  `SearchSection` tests, so decide per fixture rather than migrating all 7.
- `scripts/codemod-v1-to-v2.ts` — one-shot dev tool doing the section split and keyFeature wrap. Not a
  runtime path, and not needed for correctness at 7 files, but the other 49 are a re-run and doing 7 ×
  (3-section split + 11 wraps) by hand is where transcription errors come from. Push back if you'd
  rather not carry it.

**Commit 3 — loader flip + search**
- `src/data/pathwayMetadata.ts` — point at v2; log the skipped-document count.
- `src/types/index.ts` — `PathwayMetadataType = PathwayMetadataV2`; keep v1 exported for the migration
  window; re-check `Sector`/`Metric`/`PathwayType` (indexed accesses, should follow) and `Geography`.
- `src/utils/searchUtils.ts` — options at `:86,91`; matching at `:438–500`; extract `scopedFacet()`.
- `src/components/StepByStepGuide.tsx` — verify only; its remap categories key off values, not shapes.

**Commit 4 — rendering**
- new `src/utils/keyFeatureValues.ts`; `src/components/KeyFeatures.tsx:241`.
  `ComparisonKeyFeatures.tsx` needs no change.
- `src/pages/PathwayDetailPage.tsx:257–265`.
- `src/utils/tooltipUtils.ts:64` — `keyof`-derived, should survive; verify.

**Tests, spread across commits 2–4**
- `src/utils/validateData.test.tsx:95` — `REQ` array: `expertOverview` → `pathwayDescription`.
  Assertions match on `instancePath` regexes, so renamed fields break them.
- `src/components/KeyFeatures.test.tsx:6–18` + override casts at `:87,102,153` — the only inline
  all-11-field fixture; assertions are on rendered strings and Tailwind classes.
- `src/pages/ComparisonPage.test.tsx:27,44` and `PathwaySearch.test.tsx:68,81,92,103,114` —
  `keyFeatures: { emissionsTrajectory: "foo" }` stubs.
- **New tests**, since TypeScript won't catch this class of bug (finding 8): the section splitter
  (including ACE-CNS's malformed heading), a v1/v2 coexistence case in `validateData.test.tsx`, and a
  scope-containment table test for the two facet arms.

**Docs**
- `src/data/README.md` — v2 authoring shape; fix the stale `expertOverview` R example at `:93`, the
  stale `pbtar_schema.json` link, and `npm run json:check` at `:15`.

## Verification

Per commit:

```bash
npm run schema:check
```

```bash
npm run schema && git status --short
```

The second regenerates types and docs; a `git status` clean but for intended files is what CI's
`types-check` / `schema-docs` jobs assert. Note `schema:generate:docs` builds a Python venv and
`pip install json-schema-for-humans` — if that can't run offline I'll say so rather than leave
`public/schema/` stale.

```bash
npm test -- --run
```

Baseline is 2108 passing. A lone `ComparisonPage.test.tsx` timeout is flaky under full-suite
parallelism — re-run alone to confirm:

```bash
npx vitest run src/pages/ComparisonPage.test.tsx
```

After commit 4, check the app on the 7-pathway corpus:

```bash
npm run dev
```

Spot-check an IEA detail page (`Global` scope) and an ACE one (`South East Asia`), then the Policy
Ambition dropdown and the guide's Emissions Trajectory step — those two facets are the silent-failure
sites, and "returns zero pathways" is what a regression there looks like.

## Handoffs — issues to point other threads at

- **NGFS region memberships** → **#801**. The 7 `src/data/ngfs/NGFS-*-2024.json` files each carry the
  same 8 region labels with empty ISO arrays; they're the only empty memberships left in `src/data`.
  Context for that thread: commit `56079cb` converted the flat geography array to
  `{global, regions, country}` and dropped the memberships, but nothing is unrecoverable — each file
  still holds the complete 143-code `country` list. The 8 labels are World Bank groupings plus "South
  East Asia", and the 7 WB regions partition those 143 codes **exactly** (zero unassigned, zero
  overlap), with South East Asia = ASEAN ∩ list = 9 codes, a clean subset of East Asia and Pacific. So
  the memberships are derivable and self-checking. NGFS's own Phase V publication reports on model
  regions (REMIND/GCAM/MESSAGE), not these labels, so the labels look RMI-authored.
- **The remaining 49 data files** → follow-up PR on **#858**, or a new child of #860. A re-run of the
  codemod over the rest. Worth prioritising, since until it lands the app shows 7 pathways.
- **`coreDrivers` / `dependencies` content authoring** → its own ticket. The codemod only scaffolds
  `null`/`[]`; the `#### Core Drivers` prose exists in 55 files but doesn't map mechanically onto the 7
  fields.

## Draft comment for Jacob (facet scope semantics)

~~~~
**Question on #858 / #869: what should a keyFeature *facet* match when the value is scoped?**

Context: in v2, `keyFeatures.emissionsTrajectory` and `keyFeatures.policyAmbition` become arrays of
`{sector, geography, value}`. Both are also **search facets**. Today each is one scalar per pathway, so
"does this pathway match `Significant decrease`?" has one answer. In v2 it can have several.

Take a pathway covering Power and Steel that holds:

- `{sector: "Power", geography: "Global", value: "Significant decrease"}`
- `{sector: "Steel", geography: "Global", value: "Minor decrease"}`

A user filters **sector = Steel** and ticks **emissionsTrajectory = Significant decrease**.

We've implemented the scope-respecting reading: the pathway is **excluded**, because the only entry
whose scope contains "Steel" says `Minor decrease`. Containment is on both axes — an entry matches a
sector query if it's that sector or `"cross-sector"` (and, per your note on #869, `"cross-sector"` only
counts when the queried sector is one the pathway actually declares); geography matches when the
query's ISO set is a subset of the entry's. With no sector/geography filter active this degenerates to
"any entry matches", so today's behaviour is unchanged.

The alternative would be to include the pathway whenever *any* entry has the ticked value, and let
ranking push the non-matching scope down. That never hides a pathway, but it does mean a facet can
return pathways whose value at the user's scope is different from what they ticked.

**Two things to confirm:**

1. Is the scope-respecting reading right — a facet filters on the value at the user's scope, and a
   pathway holding that value only at some *other* scope is excluded?
2. When the user's scope has no entry at all and the chain falls back to a broader one, should the
   facet match on the **fallback** value? (My assumption: yes — the fallback is what we display, so it
   should be what we filter on. This is also where #869's cost model starts to matter for the facets,
   not just for ranking.)

For reference, #858 as written doesn't mention the facets, and these two fields are the only
keyFeatures that are also facets — so whatever we pick is a small, contained change.
~~~~

## Also worth flagging on #858 itself

- `pathwayDescription`'s 2500 cap is right, but only because it applies to the `#### Pathway
  Description` section — the whole `expertOverview` runs 4.4 KB median. Worth stating on the issue so
  the follow-up PR doesn't mis-scope it.
- `#### Application to Transition Assessment` (all 56 files, median 1860 chars) has no destination in
  #858's field list; this plan adds `transitionAssessment`.
- The `geography ∈ geographyItem values` bullet is wrong for author-defined region labels (finding 5).
- The cross-field "declared in the pathway's own sectors/geography" constraint can't live in draft-07;
  it becomes a structural check in `schema-check-files.ts`.
