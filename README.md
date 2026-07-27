# Pathways-based transition assessment repository (pbtar)

|                   |                                                                                                                                                             Production |                                                                                                                                 Development (`main`) |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------: |
| **Link**          |                                                                                                **[Production](https://proud-glacier-0f640931e.2.azurestaticapps.net)** |                                                               **[Development](https://proud-glacier-0f640931e-main.westus2.2.azurestaticapps.net/)** |
| **`node` checks** | [![Node Package Checks](https://github.com/RMI/pbtar/actions/workflows/node.yml/badge.svg?branch=production)](https://github.com/RMI/pbtar/actions/workflows/node.yml) | [![Node Package Checks](https://github.com/RMI/pbtar/actions/workflows/node.yml/badge.svg)](https://github.com/RMI/pbtar/actions/workflows/node.yml) |

## Running the application

1. Clone the Repo

```sh
git clone https://github.com/RMI/pbtar
cd pbtar
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

## Development

### Set-Up

This project uses Node.js and npm for dependency management.

To install Node.js, follow the [official installation guide](https://nodejs.org/en/download/).

1. Install Dependencies

```bash
cd pbtar
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

## Documentation

### JSON Schema

To render JSON Schema documentation (available in-app at `/schema.html` route), run `npm run docs:json:schema`, which invokes the `scripts/generate-schema-docs.sh`. This script creates and activates a python virtual environment, and renders the `public/schema.html` file, which will be picked up by the build process.

There is a GitHub workflow (`schema-docs` in `.github/workflows/node-json-schema.yml`) to check that the documentation and the schema do not diverge.

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
