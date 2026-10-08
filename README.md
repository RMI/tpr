# Transition Pathways Repository (TPR)

|                   |                                                                                                                                                         Production |                                                                                                                             Development (`main`) |
| ----------------- | -----------------------------------------------------------------------------------------------------------------------------------------------------------------: | -----------------------------------------------------------------------------------------------------------------------------------------------: |
| **Link**          |                                                                                            **[Production](https://proud-glacier-0f640931e.2.azurestaticapps.net)** |                                                           **[Development](https://proud-glacier-0f640931e-main.westus2.2.azurestaticapps.net/)** |
| **`node` checks** | [![Node Package Checks](https://github.com/RMI/tpr/actions/workflows/node.yml/badge.svg?branch=production)](https://github.com/RMI/tpr/actions/workflows/node.yml) | [![Node Package Checks](https://github.com/RMI/tpr/actions/workflows/node.yml/badge.svg)](https://github.com/RMI/tpr/actions/workflows/node.yml) |

## Running the application

1. Clone the Repo

```sh
git clone https://github.com/RMI/tpr
cd tpr
```

2. Create an `.env` file to store the desired frontend port

```sh
cp env.example .env
```

3. Run the service

```sh
npm run dev
```

## Deployments

The application is deployed using Azure Static Web Apps:

- **Production**: [View Production Site](https://proud-glacier-0f640931e.2.azurestaticapps.net/)  
  _Deployed automatically when changes are merged to the `production` branch_

- **Development**: [View Development Site](https://proud-glacier-0f640931e-main.westus2.2.azurestaticapps.net/)  
  _Reflects the current state of the `main` branch_

Pull requests automatically deploy to preview environments with URLs provided in the PR comments.

## Adding or updating pathways

Each pathway on the site has two parts:

1. **A description** (the "metadata"): who published it, which sectors and regions it covers, its key features, drivers, dependencies and what data it offers. Every pathway needs one.
2. **Benchmark data** (the "timeseries"): the numbers behind the charts and the download, for example installed solar capacity in Southeast Asia, year by year. This part is optional.

**The description always comes first.** Benchmark data may only use the region names its pathway's description lists, so a new pathway, or a new region, has to be in the description before its data can be added.

Neither part is edited by hand. Data people fill in a shared workbook or run a preparation script, and a developer brings the result into this repository with an import script that checks the data and prints a report of every problem it finds. Every change then goes through a pull request, which builds a preview of the site (the link appears in the pull request) so the new pathway can be checked before it goes live.

### Adding or updating a pathway description

**Who:** someone who knows the publication fills in the workbook; a developer does the import.

1. **Fill in the workbook.** Descriptions are written in the shared workbook `pathway_data_prepared.xlsx` (on RMI's SharePoint; ask the TPR data team for access). Each pathway gets a row in the metadata sheet and rows in the sheets for key features, core drivers, dependencies and data availability. The classification cookbook says which values are allowed and how to choose them.
2. **Tell the developer what's new.** The importer only handles pathways on its own list (`TARGETS` in `scripts/import-pathway-data.ts`); a workbook row it doesn't know is reported as "unmatched" and skipped.
   - **Updating a pathway on that list** needs nothing extra. Some older pathways on the site are not on it yet.
   - **A new pathway** needs a line on the list, naming the file to create and an existing pathway file to use as a template. The importer takes the publication's title and year from the workbook but copies the rest of the publication details (publisher, licence, links) from the template, so pick one from the same publisher and check those details afterwards.
   - **A new publisher** has no such template. The developer adds it to the allowed publishers (`src/schema/common/publication.v1.json`), teaches the importer to recognise its name (`publisherGroup` in the same script), and writes the new file's publication details by hand after the import.
3. **Import (developer).** Run a dry run first. It writes nothing and prints a report of everything it could not take over cleanly, such as a value that isn't allowed or a missing field. Some problems stop the import (for example a data-availability row that is only partly "Not covered"); others are skipped and listed in the report, so read it all:

   ```bash
   npx ts-node --esm scripts/import-pathway-data.ts --xlsx <path/to/pathway_data_prepared.xlsx> --dry-run
   ```

   Fix problems in the workbook (not in the files here) and repeat until the report shows nothing you want to fix. Then run the same command without `--dry-run`, followed by:

   ```bash
   npx prettier --write "src/data/**/*.json"
   npm run schema:check
   ```

4. **Review and publish.** Open a pull request. Check the pathway on the preview site, then merge.

### Adding or updating benchmark data

**Who:** the benchmark data is prepared in a separate repository, [RMI/tpr_benchmark_data_preparation](https://github.com/RMI/tpr_benchmark_data_preparation) (RMI internal), by someone with access to the raw publication files; a developer does the import.

1. **Prepare the data.** Run the preparation pipeline as its README describes. It produces two things:
   - `benchmark_data_prepared.xlsx`, a workbook for checking the numbers by eye. Review it before going on.
   - a `tpr_timeseries` folder with one file per dataset, ready to import. A dataset usually belongs to one pathway but can be shared by several.
2. **Import (developer).** Again, a dry run first. This import is stricter: if anything is wrong it writes nothing at all, and it lists every problem in one go:

   ```bash
   npx ts-node --esm scripts/import-benchmark-data.ts --in <path/to/tpr_timeseries> --dry-run
   ```

   The most common problems, and what to do about them:

   | The import says                           | What it means                                                                                    | What to do                                                                                                                                                                                                                                                                           |
   | ----------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
   | "… is not a geography pathway … declares" | The data names a region that is not written exactly like any region in the pathway's description | Check the publication. If the data's name is a typo or differs from the publication's wording, fix it in the preparation repository. If the publication really covers that region and the description leaves it out, add it to the description (see above) and re-import that first. |
   | "… is not the id of any pathway"          | The data points to a pathway id that has no description                                          | If the id is mistyped, fix it in the preparation repository. If the pathway is new, add its description first.                                                                                                                                                                       |
   | "… is not a segment of …"                 | A row names a part of the sector that doesn't belong to that sector                              | Fix it in the preparation repository.                                                                                                                                                                                                                                                |

   Once the dry run is clean, run it again without `--dry-run`. It updates existing files and adds new ones next to their pathway's description; it never deletes anything. Then:

   ```bash
   npm run build:timeseries
   npm run schema:check
   ```

3. **Review and publish.** Open a pull request, check the charts and the data download on the preview site, then merge.

The file formats and every validation rule are described in [`src/data/README.md`](src/data/README.md).

## Development

### Set-Up

This project uses Node.js and npm for dependency management.

To install Node.js, follow the [official installation guide](https://nodejs.org/en/download/).

1. Install Dependencies

```bash
cd tpr
npm install
```

2. Running the Frontend
   You can locally serve the frontend _alone_ with:

```bash
npm run dev
```

The local development service will be accessible at `http://localhost:3000`. It automatically reloads on file changes.

3. Building the application
   To render the site,

```bash
npm run build

# or for a PROD BUILD
VITE_BUILD_MODE=production npm run build
```

Then you can serve the `dist/` directory using your favorite local server.
For example, to use python's server,

```bash
python3 -m http.server 9001 -d ./dist
```

## Contributing

Dependencies are managed using `npm`. To add a new library, run:

```bash
npm install <library> # for runtime dependencies
npm install --save-dev <library> # for development dependencies
```

## Testing

This project uses Vitest for unit testing. To run the tests, use:

```bash
npm run test
```

## Linting and Formatting

This project uses ESLint and Prettier for code consistency:

```bash
# Check code for issues
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code with Prettier
npm run format
```

## Releases

This project uses [`semantic-release`](https://semantic-release.gitbook.io/semantic-release) to manage release versions.
See "Releases" on the right of the main GitHub repository page to see the latest released version, or click through to see pre-releases.

### Managing Releases (For developers)

To trigger an update in released version, use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) in your normal development process.
Commits with a `feat` prefix (in the commit summary) will cause a bump in the minor version (`x.X.x`), while a `fix`, `build`, `docs`, `perf`, `refactor`, `style`, or `test` prefix will bump the patch version (`x.x.X`).
The commit summary used will appear in the release notes.

The "released" version of the application is updated when the `production` branch is updated, but we can see pre-release versions by updating `main` (updates `x.x.x-dev.y`) or `next` (updates `x.x.x-rc.y`).
When opening a Pull Request, an GitHub workflow will dry-run the release process and comment with a preview of the expected version tag and release notes.

### Note on schemata

At the moment, schemata are for internal use only and are treated as malleable. We do not consider a minor schema change a breaking change for external users at the moment. This is subject to change, once the use of the transition pathways repository requires it, e.g. once it has external consumers.

## License

This project is licensed under the [MIT License](LICENSE.txt)
