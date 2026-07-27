# Pathway metadata for the pbtar repo

The `src/data` directory in the [pbtar](https://github.com/RMI/pbtar) repo contains all of the data shown on the Pathways-based transition assessment repository site.
Each JSON file in this directory contains one or more pathway definitions.

## Schema and Validation

The JSON files have a strict, specific format that needs to be followed, which is defined by the JSON schema file in this repo at [pbtar_schema.json](https://github.com/RMI/pbtar/blob/main/src/schema/schema.json).

The schema file defines a number of mandatory fields which must be included.
Additionally, the structure, the data types, and in some cases the allowed values for a given key must be correct for things to work as expected.
This repo has CI/CD setup to validate any new JSON added in a PR against the schema.
Therefore, any new JSON added through a PR on main must pass all of the tests before being merged.

After preparing a JSON file, you can run `npm run json:check`, which will trigger validation (locally) against all JSON files in this directory.
You can preview a JSON file as it will appear in the UI with `npm run dev`.
To add a new Pathway, a new JSON file in the correct format needs to be added to this repo in a pull request on `main`.

## Examples

To see example files, look in this directory, or `testdata/valid/`.

## Creating new pathway files

To facilitate creating a new JSON file in the appropriate format using R, we have created the following two functions to validate a `<list>` object against the schema in this repo, and to write a valid nested `<list>` to a JSON file.
These functions can be copy-pasted to your R console and then they're available to use on any `<list>` you have in your environment.
These functions require the following R packages to be installed in your environment: `jsonvalidate`, `jsonlite`, `dplyr`, `tidyr`, `stringr`, and `purrr`.

```r
# if schema_url is not provided, it will validate against the current PROD schema.

validate_json <- function(json_obj, schema_url = NULL) {
  if (is.null(schema_url)) {
    schema_url <- "https://raw.githubusercontent.com/RMI/pbtar/refs/heads/main/pbtar_schema.json"
  }
  json_schema <- readr::read_file(file = schema_url)
  validation <-
    jsonvalidate::json_validate(
      json = jsonlite::toJSON(json_obj, auto_unbox = TRUE),
      schema = json_schema,
      verbose = TRUE,
      greedy = TRUE,
      engine = "ajv"
    )
  if (!validation) {
    errors <-
      attr(validation, "errors") |>
      dplyr::mutate(key = stringr::str_extract(instancePath, "[a-z]+")) |>
      tidyr::unnest(params) |>
      dplyr::rename(input = data) |>
      dplyr::select(dplyr::any_of(c("input", "key", "message", "allowedValues")))
    return(errors)
  }
}

write_json <- function(json_obj, file) {
  validation <- validate_json(json_obj)
  if (!is.data.frame(validation)) {
    jsonlite::write_json(
      x = json_obj,
      path = file,
      auto_unbox = TRUE,
      pretty = TRUE
    )
    return(invisible())
  }
  validation
}
```

Once the above functions have been loaded in your R environment, a new `<list>` can be created, and then validated and exported as a JSON file using these functions like so...

```r
# Note that single-element arrays must be wrapped with I(), the identity function, to ensure that `jsonlite` processes them as arrays, rather than length-1 vectors (everything is a vector in R).

new_pathway_metadata <-
  list(
    list(
      id = "R-import-example",
      name = "R Import Pathway",
      description = "Pathway Imported from R",
      pathwayType =  "Normative",
      modelYearEnd = 2050,
      modelTempIncrease = 1.5,
      geography = list("Global", "US", "Europe"),
      sectors = list(
        list(name = "Power", technologies = c("Coal", "Wind")),
        list(name = "Steel", technologies = I(c("Other")))
        ),
      publisher = "Example Publisher",
      publicationYear = 2021,
      metric = I(c("Capacity")), # `I()` is necessary so that jsonlite parses it as a length 1 array
      expertOverview = "Text based expert recommendation long.",
      dataSource = list(
        description = "Data source description.",
        url = "https://www.example.com/",
        downloadAvailable = FALSE
      )
    )
  )

validate_json(new_pathway_metadata)

write_json(new_pathway_metadata, "test.json")
```

If the `<list>` is not valid, the functions will return a data frame with information about what was invalid.

This README should be the definitive source of information about these JSON files and how to add them or modify them.
As this repo is currently under heavy development, such details may change rapidly, and this README should be kept up to date with those changes as they happen.
If you're developing in this repo, please remember to make appropriate changes to this README when relevant changes are made to the underlying code.
If you're maintaining/modifying/adding the pathway data, please refer to the [live version of this README](https://github.com/RMI/pbtar/blob/main/src/data/README.md) on `main` for the most up-to-date details.
