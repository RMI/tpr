# Pathway metadata for the tpr repo

The `src/data` directory in the [tpr](https://github.com/RMI/tpr) repo contains all of the data shown on the Transition Pathways Repository site.
Each JSON file in this directory contains one pathway definition, alongside optional `*_timeseries.json` files holding that pathway's data series.

## Schema and Validation

The JSON files have a strict, specific format, defined by the JSON schema files in [`src/schema/`](https://github.com/RMI/tpr/tree/main/src/schema).
The schema is split across several files: the pathway metadata schema itself, plus shared definitions under `src/schema/common/` that it references (country codes, sector and technology names, publication details, and so on).

The schema defines a number of mandatory fields which must be included.
The structure, the data types, and in many cases the allowed values for a given key must all be correct for things to work as expected.
This repo has CI/CD set up to validate any new JSON added in a PR, so any new JSON added through a PR on `main` must pass before being merged.

After preparing a JSON file, validate it locally with:

```bash
npm run schema:check
```

That checks every file under `src/data` and `testdata/valid`. You can preview a file as it will appear in the UI with `npm run dev`.

If you have changed a schema rather than a data file, run `npm run schema` instead — it validates and then regenerates the TypeScript types in `src/types/` and the HTML schema reference in `public/schema/`. Both are checked in, and CI fails if they are out of date.

### Two schema versions

Two versions of the metadata schema currently exist:

- `pathwayMetadata.v2.json` — the current format. **New pathways should use this.**
- `pathwayMetadata.v1.json` — the previous format, still present so existing files remain valid.

Every file declares which one it follows via its own `$schema` key, and the validator routes each file to the matching schema. A file on either version will pass `npm run schema:check`.

**Only v2 files are loaded by the site.** A file still on v1 validates but does not appear in the app; the dev server logs how many were skipped. Migration of the remaining v1 files is in progress.

## The v2 format

A complete, valid example lives at [`testdata/valid/pathwayMetadata_v2_full.json`](../../testdata/valid/pathwayMetadata_v2_full.json), and a minimal one at `pathwayMetadata_v2_minimal.json`. Real pathways are in the publisher subdirectories here.

If you are used to the v1 format, these are the differences that matter:

### keyFeatures are scoped

In v1 each of the 11 key features held a single value for the whole pathway. In v2 each holds an **array of entries**, so a pathway can record different values for different parts of its coverage:

```json
"keyFeatures": {
  "emissionsTrajectory": [
    { "sector": "cross-sector", "geography": "Global", "value": "Moderate decrease" },
    { "sector": "Power", "geography": "South East Asia", "value": "Significant decrease" }
  ]
}
```

- `sector` is one of the sector names, or `"cross-sector"` meaning "all of the sectors this pathway covers".
- `geography` is `"Global"`, one of the region labels used in this pathway's own `geography.regions`, or one of its country codes.
- `value` is exactly what v1 held for that field — the same allowed values. For the two fields that were arrays in v1 (`policyTypes`, `newTechnologiesIncluded`), `value` is still an array.

Both `sector` and `geography` must be something the pathway actually declares, or one of the widest sentinels. A region label that does not appear in the pathway's own `geography.regions` is rejected, which is what catches a typo like `"Southeast Asia"` where the pathway says `"South East Asia"`.

If a feature does not vary, give it **one entry at the widest scope that applies** — `cross-sector` for a multi-sector pathway (otherwise its only sector), and `Global` for a global pathway (otherwise its region or country).

An empty array means nothing is recorded at any scope. That is different from an entry whose `value` is `"No information"`, which is a deliberate statement that this scope has no data.

### expertOverview is replaced by pathwayDescription

v1's single `expertOverview` was one markdown document containing three sections. Only
one survives as prose in v2:

- `pathwayDescription` (required, may be `null`, max 2500 chars) — the narrative description.
- the "Core Drivers" section becomes the structured `coreDrivers` object below.
- the "Application to Transition Assessment" section is **retired** — the new UI
  does not display it, so v2 has no field for it.

v1's separate `pathwayOverview` field is **retired without replacement**. Do not
carry it into `pathwayDescription`: in practice the two texts restate each other,
so merging them reads as immediate self-repetition. The field had no readers in
the app, so nothing is lost by dropping it.

### coreDrivers and dependencies are new

`coreDrivers` is an object with seven fields, all required but each allowed to be `null`. `null` means "not a core driver for this pathway", which is deliberately different from a driver that applies but has not been described.

```json
"coreDrivers": {
  "policies": "Carbon pricing across both covered sectors.",
  "emissionsTargets": null,
  "technologyCosts": null,
  "investmentChange": null,
  "macroeconomicDrivers": null,
  "behavioralShifts": null,
  "otherDrivers": null
}
```

`dependencies` is an array — use `[]` if there are none. Each entry names a category, describes the dependency, scopes it to one of the pathway's sectors, and states how strong the evidence is:

```json
"dependencies": [
  {
    "dependency_name": "Infrastructure and logistics",
    "dependency_description": "Grid buildout must keep pace with renewable additions.",
    "sector": "Power",
    "evidence_type": "Quantitative"
  }
]
```

The allowed values for `dependency_name` and `evidence_type` are listed in the schema.

## Migrating an existing v1 file

There is a script for this — don't do it by hand:

```bash
npx ts-node --esm scripts/codemod-v1-to-v2.ts --dry-run src/data/<publisher>
```

Drop `--dry-run` to write the changes. It rewrites files in place, skips anything already on v2, and prints the scope it chose for each file.

It does **not** fill in `coreDrivers` — the v1 "Core Drivers" prose does not map onto the seven named fields mechanically, so the script scaffolds them all to `null` and prints the original text for whoever authors them. Run `npx prettier --write` on the files afterwards, then `npm run schema:check`.

## Creating new pathway files

To create a new file in the appropriate format using R, the function below writes a nested `<list>` out as JSON.
It can be copy-pasted to your R console and requires the `jsonlite` package.

```r
write_json <- function(json_obj, file) {
  jsonlite::write_json(
    x = json_obj,
    path = file,
    auto_unbox = TRUE,
    pretty = TRUE,
    null = "null"
  )
}
```

Note on validating from R: the schema is split across several files that reference each other by URL, and the usual `jsonvalidate::json_validate()` call takes a single schema and will not fetch those references. Write the file first, then validate it with `npm run schema:check`, which resolves them correctly and also runs the checks that JSON Schema alone cannot express — such as confirming each `sector` and `geography` is one the pathway declares.

Once the function above is loaded, a new pathway can be created and written out like so.

```r
# Single-element vectors must be wrapped with I(), the identity function, so that
# `jsonlite` writes them as arrays rather than as bare values (everything is a
# vector in R). Fields that must be `null` rather than absent use NA... see below.

scoped <- function(value) {
  list(list(sector = "Power", geography = "VN", value = value))
}

new_pathway_metadata <-
  list(
    `$schema` = "http://pathways.rmi.org/schema/pathwayMetadata.v2.json",
    id = "R-import-example",
    name = list(full = "R Import Pathway", short = "R Example"),
    description = "Pathway imported from R.", # must end in a period
    publication = list(
      title = list(full = "Example Publication"),
      publisher = list(full = "TransitionZero"),
      year = 2021,
      links = list(
        list(description = "Report", url = "https://www.example.com/")
      )
    ),
    pathwayType = "Normative",
    modelYearEnd = 2050,
    modelTempIncrease = 1.5,
    geography = list(
      regions = list(`South East Asia` = I(c("VN", "TH"))),
      country = I(c("VN"))
    ),
    sectors = list(
      list(name = "Power", technologies = I(c("Coal", "Wind")))
    ),
    pathwayDescription = "A short narrative description of the pathway.",
    metric = I(c("Capacity")),
    keyFeatures = list(
      emissionsTrajectory = scoped("Moderate decrease"),
      energyEfficiency = scoped("Moderate improvement"),
      energyDemand = scoped("Minor increase"),
      electrification = scoped("Significant increase"),
      policyTypes = scoped(I(c("Carbon price"))),
      technologyCostTrend = scoped("Decrease"),
      emissionsScope = scoped("CO2"),
      policyAmbition = scoped("Current/legislated policies"),
      technologyCostsDetail = scoped("Total costs"),
      newTechnologiesIncluded = scoped(I(c("Battery storage"))),
      investmentNeeds = scoped("By sector")
    ),
    coreDrivers = list(
      policies = NULL, emissionsTargets = NULL, technologyCosts = NULL,
      investmentChange = NULL, macroeconomicDrivers = NULL,
      behavioralShifts = NULL, otherDrivers = NULL
    ),
    dependencies = list(
      list(
        dependency_name = "Technology",
        dependency_description = "Grid capacity must expand.",
        sector = "Power",
        evidence_type = "Qualitative"
      )
    )
  )

write_json(new_pathway_metadata, "src/data/example-publisher/EXAMPLE-2021.json")
```

One R-specific note: `jsonlite` writes an R `NULL` as `{}` by default, which the schema rejects. That is why `write_json` above passes `null = "null"` — with it, the seven `NULL` entries in `coreDrivers` come out as JSON `null` as intended. All seven keys are required even when every one of them is null, so keep them all.

The example above has been run as written, and the file it produces passes `npm run schema:check`.

## Keeping this up to date

This README should be the definitive source of information about these JSON files and how to add them or modify them.
As this repo is currently under heavy development, such details may change rapidly, and this README should be kept up to date with those changes as they happen.
If you're developing in this repo, please remember to make appropriate changes to this README when relevant changes are made to the underlying code.
If you're maintaining/modifying/adding the pathway data, please refer to the [live version of this README](https://github.com/RMI/tpr/blob/main/src/data/README.md) on `main` for the most up-to-date details.
