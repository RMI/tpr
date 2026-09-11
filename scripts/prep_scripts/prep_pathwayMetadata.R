raw <- readr::read_csv("~/Downloads/PBTAR Data Model(Pathway MetaData).csv", show_col_types = FALSE)

parsed <- raw |>
  dplyr::rowwise() |>
  dplyr::mutate(
    pathway_list = list(
      list(
        "$schema" = "http://pathways.rmi.org/schema/pathwayMetadata.v1.json",
        id = "TKTK",
        publication = list(
          title = list(full = `Name of publication`),
          publisher = list(full = "TKTK", short = `Name of Publisher`),
          year = as.integer(`Year of Publication`),
          links = list(
            list(
              url = "TKTK",
              description = `Data Source`
            )
          )
        ),
        name = `Name of Pathway`,
        description = `Description`,
        geography = stringr::str_split(`Regions`, pattern = ",\\s*"),
        pathwayType =  `Pathway Type`,
        carbonBudget = `Carbon Budget`,
        modelTempIncrease = `Modeled Temperature Increase`,
        modelYearStart =  `Start Year of Model`,
        modelYearEnd =  `End Year of Model`,
        modelYearNetzero =  `Net Zero Reached`,
        ssp = `SSP`,
        sectors =  list(
          list(
            name = "Power",
            technologies = stringr::str_split(
              string = stringr::str_extract(
                string =  `Technology coverage (high-level)`,
                pattern = "\\[(.*)\\]",
                group = 1L
              ),
              pattern = ",\\s*"
            )
          )
        ),
        pathwayOverview = `Overview`,
        expertOverview = `Expert Overview`,
        metric = stringr::str_split(
          string = stringr::str_extract(
            string = `Metric`,
            pattern = "\\[(.*)\\]",
            group = 1L
          ),
          pattern = ",\\s*"
        ),
        keyFeatures = list(
          emissionsTrajectory = `Emissions trajectory`,
          energyEfficiency = `Energy efficiency`,
          energyDemand = `Energy demand`,
          electrification = `Electrification`,
          policyTypes = stringr::str_split(`Policy types`, pattern = ",\\s*"),
          technologyCostTrend = `Technology cost trend`,
          technologyDeploymentTrend = `Technology deployment trend`,
          emissionsScope = `Emissions scope`,
          policyAmbition = `Policy ambition`,
          technologyCostsDetail = `Technology costs detail`,
          newTechnologiesIncluded = I(`New technologies included`),
          supplyChain = `Supply chain`,
          investmentNeeds = `Investment needs`,
          infrastructureRequirements = `Infrastructure requirements`
        )
      )
    )
  ) |>
  dplyr::select(pathway_list)

for (n in seq_along(parsed$pathway_list)) {
  jsonlite::write_json(
    parsed$pathway_list[[n]],
    path = paste0("src/data/", n, ".json"),
    auto_unbox = TRUE,
    pretty = TRUE
  )
}
