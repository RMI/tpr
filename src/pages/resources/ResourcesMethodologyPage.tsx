import React, { useId, useState } from "react";
import { Link } from "react-router-dom";

const DefinitionCard: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => {
  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-rmigray-800">{title}</h3>
      <div className="mt-4 text-rmigray-700 leading-7">{children}</div>
    </article>
  );
};

const DetailWithValues: React.FC<{
  description: React.ReactNode;
  values: React.ReactNode;
}> = ({ description, values }) => {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
      <div className="space-y-3 text-rmigray-700 leading-7">{description}</div>
      <div className="rounded-xl border border-neutral-200 bg-white p-5 text-rmigray-700">
        <div className="[&>p]:leading-7 [&>ul]:mt-3 [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:pl-5">
          {values}
        </div>
      </div>
    </div>
  );
};

const CollapsibleSubsection: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <div className="px-6 py-5 md:px-7">
      <h3>
        <button
          type="button"
          className="group w-full text-left"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => setIsOpen((v) => !v)}
        >
          <div className="flex items-start justify-between gap-4">
            <span className="flex flex-col">
              <span className="text-lg font-semibold text-rmigray-800 transition-colors group-hover:text-rmiblue-800">
                {title}
              </span>
              {subtitle ? (
                <span className="mt-2 text-sm leading-6 text-rmigray-600">
                  {subtitle}
                </span>
              ) : null}
            </span>
            <span
              className={
                "mt-1 text-rmigray-500 transition-transform " +
                (isOpen ? "rotate-180" : "rotate-0")
              }
              aria-hidden="true"
            >
              ▾
            </span>
          </div>
        </button>
      </h3>

      {isOpen ? (
        <div
          id={contentId}
          className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 md:p-6"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
};

const ResourcesMethodologyPage: React.FC = () => {
  return (
    <div className="bg-gray-50">
      <div className="container mx-auto px-4 py-8 md:py-10">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-rmiblue-800 px-6 py-8 text-white shadow-lg md:px-10 md:py-11">
          <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-energy-700/10" />
          <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-white/7 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-energy-500/8 blur-2xl" />

          <div className="relative">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Methodology
            </h1>

            <h2 className="mt-6 text-xl font-semibold leading-8 text-white/95 md:text-2xl">
              How the Transition Pathways Repository (TPR) classifies pathways
              and how to interpret those classifications
            </h2>

            <div className="mt-8 space-y-4 text-sm leading-7 text-white/85 md:text-base">
              <p>
                The TPR uses a structured classification approach to help
                analysts compare pathways in a consistent manner. This page
                explains the rationale behind these classifications and how they
                can be interpreted.
              </p>
              <p>
                These classifications are designed to support pathway selection
                and interpretation for use cases such as transition assessments,
                risk analysis, and opportunity identification. They do not
                determine a single best pathway for a task; users must still
                understand the underlying pathway and how it meets their needs.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-5xl rounded-2xl border border-energy-200 bg-neutral-100 p-7 shadow-sm">
          <h2 className="text-2xl font-semibold text-rmigray-800">
            Key definitions
          </h2>
          <p className="mt-4 text-rmigray-700 leading-7">
            Throughout the TPR, you will see the use of closely related
            terminology when describing pathways and their content. These are
            the definitions used in the context of the TPR.
          </p>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <DefinitionCard title="Transition pathway">
              <p>
                A forward-looking view of how a sector, region, or economy could
                change over time.
              </p>
              <p className="mt-3">
                This covers anything from detailed models to simple policy
                objectives.
              </p>
            </DefinitionCard>

            <DefinitionCard title="Scenario">
              <p>
                A subset of pathways based on systematic modeling. Scenarios
                often provide a structured set of assumptions.
              </p>
            </DefinitionCard>

            <DefinitionCard title="Benchmark">
              <p>
                A data point from a pathway that can be compared with company
                data. Pathways often provide multiple relevant benchmarks.
              </p>
            </DefinitionCard>
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-5xl rounded-[2rem] border border-rmiblue-100 bg-rmiblue-50/60 px-6 py-8 shadow-sm md:px-8 md:py-10">
          <div className="max-w-5xl">
            <h2 className="text-2xl font-semibold text-rmigray-800">
              Expert overview
            </h2>
            <div className="mt-6">
              <p className="text-rmigray-700 leading-7">
                Each pathway in the TPR has an Expert Overview that provides a
                brief summary explaining who developed the pathway, its main
                narrative, and its core drivers. It highlights the main
                assumptions, key trends, and external dependencies behind the
                transition. It helps users understand what types of assessments
                the pathway is best suited for and where it might be less
                suitable.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-5xl rounded-[2rem] border border-rmiblue-100 bg-rmiblue-50/60 px-6 py-8 shadow-sm md:px-8 md:py-10">
          <div className="max-w-5xl">
            <h2 className="text-2xl font-semibold text-rmigray-800">
              Classification group 1: Pathway meta data
            </h2>
            <p className="mt-3 text-rmigray-700 leading-7">
              This meta data is useful to understand the overarching idea behind
              a pathway or scenario and the broad implications of the modeled
              changes.
            </p>
          </div>

          <div className="mt-8 max-w-5xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="divide-y divide-neutral-200/80">
              <CollapsibleSubsection
                title="Pathway type"
                subtitle="Is the pathway predictive, exploratory, or normative?"
              >
                <div className="grid grid-cols-1 gap-6 text-rmigray-700 md:grid-cols-2">
                  <div className="rounded-xl border border-neutral-200 bg-white p-5">
                    <h4 className="text-base font-semibold text-rmigray-800">
                      Predictive
                    </h4>
                    <p className="mt-3 leading-7">
                      All outcomes are modeled based on existing trends without
                      any additional assumptions. No new policies are introduced
                      or changed. No major technological breakthroughs are
                      achieved.
                    </p>
                    <p className="mt-3 leading-7">
                      These pathways often describe business-as-usual
                      trajectories and can be useful as baseline benchmarks,
                      especially in risk applications.
                    </p>
                  </div>

                  <div className="rounded-xl border border-neutral-200 bg-white p-5">
                    <h4 className="text-base font-semibold text-rmigray-800">
                      Exploratory
                    </h4>
                    <p className="mt-3 leading-7">
                      Exploratory pathways test the impact of different
                      assumptions that are plausible but not necessarily
                      predicted. They will differ from a mere continuation of
                      existing trends in policies, technology costs, or demand.
                    </p>
                    <p className="mt-3 leading-7">
                      These are often useful for assessing risks and
                      opportunities under alternative policy, market, or
                      technology conditions. Typical cases are pathways that
                      consider announced policies, such as NDCs.
                    </p>
                  </div>

                  <div className="rounded-xl border border-neutral-200 bg-white p-5 md:col-span-2">
                    <h4 className="text-base font-semibold text-rmigray-800">
                      Normative
                    </h4>
                    <p className="mt-3 leading-7">
                      Normative pathways begin with a target end state, often a
                      climate outcome such as 1.5°C, and work backward to
                      produce a pathway consistent with that goal. They often
                      use optimization models.
                    </p>
                    <p className="mt-3 leading-7">
                      These pathways are often useful for questions of ambition.
                    </p>
                  </div>
                </div>
              </CollapsibleSubsection>

              <CollapsibleSubsection
                title="Temperature outcome"
                subtitle="What is the temperature rise by the end of the century?"
              >
                <div className="space-y-3 text-rmigray-700 leading-7">
                  <p>
                    Where available, the temperature outcome of a pathway can be
                    used as a proxy for pathway ambition. It refers to the
                    global average temperature rise above pre-industrial levels
                    by the end of the century.
                  </p>
                  <p>
                    Global pathways often provide a temperature outcome as they
                    can be linked to a carbon budget. Region- or sector-specific
                    pathways usually do not have a clear temperature outcome
                    because a global economy-wide model is required to calculate
                    it.
                  </p>
                </div>
              </CollapsibleSubsection>

              <CollapsibleSubsection
                title="Start year of model"
                subtitle="What is the first year modeled?"
              >
                <div className="text-rmigray-700 leading-7">
                  <p>
                    The start year of the model refers to the last year before
                    any forward-looking modeling. It is the final year of the
                    historical baseline used in the calculations of the pathway.
                  </p>
                </div>
              </CollapsibleSubsection>

              <CollapsibleSubsection
                title="End year of model"
                subtitle="What is the last year modeled?"
              >
                <div className="space-y-3 text-rmigray-700 leading-7">
                  <p>
                    The end year of the model refers to the final year of the
                    forward-looking output generated by the model, focusing on
                    the available pathway metrics as a reference.
                  </p>
                  <p>
                    For example, if the pathway metrics are available until
                    2050, but there is a temperature outcome for 2100, then the
                    end year is 2050.
                  </p>
                </div>
              </CollapsibleSubsection>

              <CollapsibleSubsection
                title="Net zero reached"
                subtitle="When does the pathway reach net-zero emissions?"
              >
                <div className="space-y-3 text-rmigray-700 leading-7">
                  <p>
                    The year in which the pathway reaches net-zero emissions.
                    Not all pathways reach net-zero emissions, so this value
                    will not always be provided.
                  </p>
                  <p>
                    In some cases, net zero will refer to a specific region or
                    (set of) sector(s). Where this is the case, the scope is
                    indicated accordingly.
                  </p>
                </div>
              </CollapsibleSubsection>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-5xl rounded-[2rem] border border-rmiblue-100 bg-rmiblue-50/60 px-6 py-8 shadow-sm md:px-8 md:py-10">
          <div className="max-w-5xl">
            <h2 className="text-2xl font-semibold text-rmigray-800">
              Classification group 2: Scope, Granularity, Availability
            </h2>
            <p className="mt-3 text-rmigray-700 leading-7">
              In transition assessments, company metrics are compared with
              benchmarks from pathways. To ensure this is a fair comparison, it
              is important that the scope, granularity, and data availability of
              the benchmark data in the pathway matches those of the company (or
              that any deviations can be approximated transparently).
            </p>
          </div>

          <div className="mt-8 max-w-5xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="divide-y divide-neutral-200/80">
              <CollapsibleSubsection
                title="Regions"
                subtitle="Which regions and countries are covered?"
              >
                <div className="space-y-3 text-rmigray-700 leading-7">
                  <p>
                    The list of regions and countries covered by the pathway.
                    This will only list countries or regions that the pathway
                    provides benchmark metrics for. All individual countries are
                    allowed, based on ISO2 (3166) definitions. Regions are
                    provided as defined in the pathway.
                  </p>
                  <p>
                    <i>
                      Note: RMI does not make any statements on country
                      delineations and/or conflicting territorial claims.
                    </i>
                  </p>
                </div>
              </CollapsibleSubsection>

              <CollapsibleSubsection
                title="Sectors"
                subtitle="Which sectors are covered?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        List of sectors that the pathway covers, where coverage
                        means that the pathway provides at least one relevant
                        output metric for each of the sectors assigned here.
                      </p>
                      <p>
                        The repository is currently limited to providing
                        detailed information on the power sector. Additional
                        sectors will be added in the near future. This variable
                        also clarifies which other sectors a pathway models.
                      </p>
                    </>
                  }
                  values={
                    <>
                      <p>The list of allowed values is:</p>
                      <ul>
                        <li>Power</li>
                      </ul>
                    </>
                  }
                />
              </CollapsibleSubsection>

              {/* <CollapsibleSubsection
                title="Sector segments"
                subtitle="Which parts of the sector supply chain are covered?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        List of segments of sectors that the pathway covers.
                        Segments are the main individual parts of the sector’s
                        value chain and/or market segments. The sector segments
                        listed for a pathway are the segments used in modeling
                        the pathway results. Sector-specific metrics
                        additionally clarify the segments they cover, which may
                        be a subset of the sector segments used in the model.
                      </p>
                      <p>
                        For example, a pathway may describe which input fuels
                        are used in the power sector and as such it covers
                        “upstream input fuels and materials.” However, for the
                        “emissions intensity” benchmark metric, it will only
                        cover the “power generation (on-grid)” segment of the
                        sector.
                      </p>
                    </>
                  }
                  values={
                    <>
                      <p>
                        Sector segments are only defined for the sectors that
                        are covered in detail, and the allowed values are listed
                        below.
                      </p>
                      <ul>
                        <li>
                          Power: Upstream input fuels and materials, power
                          generation (on-grid), captive power generation
                          (behind-the-meter), power storage, power grid
                          (transmission and distribution, grid connection)
                        </li>
                        <li>
                          Aviation: Fuel production, fuel system logistics,
                          fleet transition, fleet operation (passenger), fleet
                          operation (freight), airport and airspace system
                        </li>
                        <li>
                          Steel: Iron mining, fuel procurement, iron reduction,
                          steelmaking and casting, steel product shaping,
                          finished product manufacturing
                        </li>
                      </ul>
                    </>
                  }
                />
              </CollapsibleSubsection> */}

              <CollapsibleSubsection
                title="Technologies"
                subtitle="What is the technological granularity?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        This field shows the technologies that a pathway
                        provides output for within the sector(s) that it covers.
                        It is returned for any sector that is identified as
                        in-scope in the “sectors” variable and that has
                        specified allowed values here. As the sector coverage of
                        the TPR expands, sectors that we show technologies for
                        will also expand.
                      </p>
                    </>
                  }
                  values={
                    <ul>
                      <li>
                        Power: Coal, oil, gas, nuclear, hydro, wind, solar,
                        biomass, renewables, other
                      </li>
                      {/* <li>
                        Steel: BOF, DRI-BOF, BF-BOF, EAF, DRI-EAF, scrap-EAF,
                        electrolyzer/electrowinning, other
                      </li>
                      <li>
                        Aviation: JET A, SAF, electricity (for
                        battery-electric aircraft), hydrogen (for hydrogen
                        aircraft), HEFA (biofuels, including FT with biomass),
                        PtL (incl. G/FT), AtJ, other
                      </li> */}
                    </ul>
                  }
                />
              </CollapsibleSubsection>

              <CollapsibleSubsection
                title="Metrics"
                subtitle="What sector-specific metrics are provided?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        List of sector-specific benchmark metrics that the
                        pathway reports outcomes for. Currently, this is only
                        defined for the power sector, but it will be expanded to
                        each additional sector that we fully cover in the
                        repository.
                      </p>
                    </>
                  }
                  values={
                    <ul>
                      <li>
                        Power: Emissions intensity, Absolute emissions,
                        Capacity, Generation, Technology mix.
                      </li>
                      {/* <li>
                        Aviation: Emissions intensity (passenger), Emissions
                        intensity (freight), Absolute emissions well-to-wheel
                        (passenger), Absolute emissions well-to-wheel
                        (freight), Total demand (passenger), Total demand
                        (freight), Demand by propulsion technology
                        (passenger), Demand by propulsion technology
                        (freight), Demand share by propulsion technology
                        (passenger), Demand share by propulsion technology
                        (freight),
                      </li>
                      <li>
                        Steel: Emissions intensity (total), Emissions intensity
                        (primary), Emissions intensity (secondary), Absolute
                        emissions, Emissions intensity by production route,
                        Technology mix (production by route), Steel production
                        by technology (production route), Scrap share.
                      </li> */}
                    </ul>
                  }
                />
              </CollapsibleSubsection>

              <CollapsibleSubsection
                title="Emissions scope"
                subtitle="Which GHGs are modeled?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        Describes which GHGs are considered in scope in the
                        pathway’s emissions results. This means that this refers
                        to absolute emissions and emissions intensity metrics.
                      </p>
                      <p>
                        Where the scope of GHGs covered differs from the entity
                        the benchmark data is supposed to be compared to (e.g.,
                        the emissions reported by a company), the analyst may
                        have to consider making additional calculations or
                        assumptions to be able to use the pathway, or use
                        another pathway that matches the emissions scope.
                      </p>
                    </>
                  }
                  values={
                    <>
                      <p>The list of allowed values is:</p>
                      <ul>
                        <li>CO2</li>
                        <li>CO2e (Kyoto)</li>
                        <li>CO2e (CO2, methane)</li>
                        <li>CO2e (unspecified GHGs)</li>
                        <li>Other emissions scope</li>
                        <li>No information</li>
                      </ul>
                    </>
                  }
                />
              </CollapsibleSubsection>

              <CollapsibleSubsection
                title="Policy types"
                subtitle="Which policy types are modeled?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        Lists which types of policies the pathway models. This
                        only refers to the policy instrument, not its level of
                        ambition.
                      </p>
                      <p>
                        This information is particularly relevant when analyzing
                        the potential impacts of a company’s exposure to
                        policies in the region they operate in.
                      </p>
                    </>
                  }
                  values={
                    <>
                      <p>The list of allowed values is:</p>
                      <ul>
                        <li>Carbon price</li>
                        <li>Phaseout dates</li>
                        <li>Subsidies</li>
                        <li>Target technology shares</li>
                        <li>Feed-in tariffs</li>
                        <li>Performance standards</li>
                        <li>Other</li>
                      </ul>
                    </>
                  }
                />
              </CollapsibleSubsection>

              <CollapsibleSubsection
                title="New technologies included"
                subtitle="Which new technologies play a role?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        A list of the main new technologies covered by the
                        pathway that are not necessarily deployed at scale yet
                        but that will play a role in the future.
                      </p>
                      <p>
                        Analysts can use this as a proxy for how optimistic the
                        pathway is regarding technological breakthroughs. This
                        can be useful both as a first step in technology risk
                        analysis as well as in opportunity identification.
                      </p>
                    </>
                  }
                  values={
                    <>
                      <p>The list of allowed values is:</p>
                      <ul>
                        <li>No new technologies</li>
                        <li>CCUS</li>
                        <li>DAC</li>
                        <li>Green H2/ammonia</li>
                        <li>SAF</li>
                        <li>Battery storage</li>
                        <li>EGS/AGS</li>
                        <li>Other new technologies</li>
                        <li>No information</li>
                      </ul>
                    </>
                  }
                />
              </CollapsibleSubsection>

              <CollapsibleSubsection
                title="Technology costs detail"
                subtitle="How are technology unit costs broken down?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        Describes the level of granularity that is available for
                        technology unit cost data.
                      </p>
                      <p>
                        A more granular breakdown can be useful when a company’s
                        future profitability and competitiveness is to be
                        analyzed, especially in technologies whose costs are
                        projected to decrease over time.
                      </p>
                    </>
                  }
                  values={
                    <>
                      <p>The list of allowed values is:</p>
                      <ul>
                        <li>Total costs</li>
                        <li>Capital costs, O&amp;M, etc.</li>
                        <li>Other cost breakdown</li>
                        <li>No information</li>
                      </ul>
                    </>
                  }
                />
              </CollapsibleSubsection>

              <CollapsibleSubsection
                title="Investment needs"
                subtitle="In what level of detail are investment needs described?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        Describes the availability and granularity of the
                        investment needs data provided by the pathway.
                      </p>
                      <p>
                        This can indicate if the investment pipeline of a
                        company is on pace with assumed requirements of the
                        pathway. Where more detail is provided, it can also
                        highlight what part of the value chain needs most
                        investment and if that is reflected in a company’s
                        strategy.
                      </p>
                    </>
                  }
                  values={
                    <>
                      <p>The list of allowed values is:</p>
                      <ul>
                        <li>Total investment</li>
                        <li>By sector</li>
                        <li>By sector and value chain segment</li>
                        <li>By technology</li>
                        <li>By technology and value chain segment</li>
                        <li>No information</li>
                      </ul>
                    </>
                  }
                />
              </CollapsibleSubsection>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-5xl rounded-[2rem] border border-rmiblue-100 bg-rmiblue-50/60 px-6 py-8 shadow-sm md:px-8 md:py-10">
          <div className="max-w-5xl">
            <h2 className="text-2xl font-semibold text-rmigray-800">
              Classification group 3: Trends, Assumptions, Narrative
            </h2>
            <p className="mt-3 text-rmigray-700 leading-7">
              Each pathway describes trends that are built on assumptions of how
              the future will unfold. Together, these paint a picture of the
              pathway narrative. Different types of corporate transition
              assessment use cases usually work with different types of
              narratives, which is why it is crucial to have a good grasp of the
              pathway’s assumptions and trends when selecting pathways for an
              analysis.
            </p>
          </div>

          <div className="mt-8 max-w-5xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="divide-y divide-neutral-200/80">
              <CollapsibleSubsection
                title="Emissions trajectory"
                subtitle="What is the direction of the GHG emissions trend?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        Summarizes how GHG emissions change in the pathway
                        between the start year of the model and the end year of
                        the model.
                      </p>
                      <p>
                        The underlying calculation is made using the compound
                        annual growth rate.
                      </p>
                      {/* <p>
                        Comes with an indication of regional and sectoral
                        scope.
                      </p> */}
                    </>
                  }
                  values={
                    <>
                      <p>The list of allowed values is:</p>
                      <ul>
                        <li>Significant increase</li>
                        <li>Moderate increase</li>
                        <li>Minor increase</li>
                        <li>Low or no change</li>
                        <li>Minor decrease</li>
                        <li>Moderate decrease</li>
                        <li>Significant decrease</li>
                        <li>No information</li>
                      </ul>
                    </>
                  }
                />
              </CollapsibleSubsection>

              <CollapsibleSubsection
                title="Energy efficiency"
                subtitle="What is the direction of the energy efficiency trend?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        Summarizes how energy efficiency, defined as energy use
                        per USD GDP output, changes in the pathway between the
                        start year of the model and the end year of the model.
                      </p>
                      <p>
                        The underlying calculation is made using the compound
                        annual growth rate.
                      </p>
                      {/* <p>
                        Comes with an indication of regional and sectoral
                        scope.
                      </p> */}
                    </>
                  }
                  values={
                    <>
                      <p>The list of allowed values is:</p>
                      <ul>
                        <li>Significant deterioration</li>
                        <li>Moderate deterioration</li>
                        <li>Minor deterioration</li>
                        <li>Low or no change</li>
                        <li>Minor improvement</li>
                        <li>Moderate improvement</li>
                        <li>Significant improvement</li>
                        <li>No information</li>
                      </ul>
                    </>
                  }
                />
              </CollapsibleSubsection>

              <CollapsibleSubsection
                title="Energy demand"
                subtitle="What is the direction of the energy demand trend?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        Summarizes how energy demand changes in the pathway
                        between the start year of the model and the end year of
                        the model.
                      </p>
                      <p>
                        The underlying calculation is made using the compound
                        annual growth rate.
                      </p>
                      {/* <p>
                        Comes with an indication of regional and sectoral
                        scope.
                      </p> */}
                    </>
                  }
                  values={
                    <>
                      <p>The list of allowed values is:</p>
                      <ul>
                        <li>Significant increase</li>
                        <li>Moderate increase</li>
                        <li>Minor increase</li>
                        <li>Low or no change</li>
                        <li>Minor decrease</li>
                        <li>Moderate decrease</li>
                        <li>Significant decrease</li>
                        <li>No information</li>
                      </ul>
                    </>
                  }
                />
              </CollapsibleSubsection>

              <CollapsibleSubsection
                title="Electrification"
                subtitle="What is the direction of the electrification trend?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        Summarizes how the share of electricity in energy end
                        use changes in the pathway between the start year of the
                        model and the end year of the model.
                      </p>
                      <p>
                        The underlying calculation is made using the compound
                        annual growth rate.
                      </p>
                      {/* <p>
                        Comes with an indication of regional and sectoral
                        scope.
                      </p> */}
                    </>
                  }
                  values={
                    <>
                      <p>The list of allowed values is:</p>
                      <ul>
                        <li>Significant increase</li>
                        <li>Moderate increase</li>
                        <li>Minor increase</li>
                        <li>Low or no change</li>
                        <li>Minor decrease</li>
                        <li>Moderate decrease</li>
                        <li>Significant decrease</li>
                        <li>No information</li>
                      </ul>
                    </>
                  }
                />
              </CollapsibleSubsection>

              <CollapsibleSubsection
                title="Policy ambition"
                subtitle="How ambitious are transition-related policies?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        Describes the level of ambition of the policies modelled
                        in the pathway. This is a key differentiator for many
                        pathways.
                      </p>
                      <p>
                        From a risk angle, ambition closer to
                        “current/legislated” is more likely to occur, but not
                        the only plausible future outcome. Higher ambition
                        pathways often come with remaining implementation gaps,
                        which means they can be a good basis to understand
                        bottlenecks for the transition of a sector. These, in
                        turn, can be opportunities in some cases, or indicators
                        of where to intervene.
                      </p>
                    </>
                  }
                  values={
                    <>
                      <p>The list of allowed values is:</p>
                      <ul>
                        <li>No policies included</li>
                        <li>Current/legislated policies</li>
                        <li>Current and drafted policies</li>
                        <li>NDCs, unconditional only</li>
                        <li>NDCs including conditional targets</li>
                        <li>High-ambition policies</li>
                        <li>Other policy ambition</li>
                        <li>No information</li>
                      </ul>
                    </>
                  }
                />
              </CollapsibleSubsection>

              <CollapsibleSubsection
                title="Technology cost trend"
                subtitle="What is the cost trend for low-carbon technologies?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        Describes the direction of unit costs of the low-carbon
                        technologies of in-scope sectors. This shows if/when
                        newer low-carbon technologies are assumed to become more
                        competitive compared to their high-carbon counterparts.
                      </p>
                    </>
                  }
                  values={
                    <>
                      <p>The list of allowed values is:</p>
                      <ul>
                        <li>Increase</li>
                        <li>Low or no change</li>
                        <li>Decrease</li>
                        <li>No information</li>
                      </ul>
                    </>
                  }
                />
              </CollapsibleSubsection>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-5xl rounded-[2rem] border border-neutral-200 bg-neutral-100/80 px-6 py-8 shadow-sm md:px-8 md:py-10">
          <div className="max-w-5xl rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-semibold text-rmigray-800">
              Looking for practical guidance?
            </h2>
            <p className="mt-4 text-rmigray-700 leading-7">
              Visit the{" "}
              <Link
                to="/resources/how-to-choose-a-pathway"
                className="text-energy-700 underline underline-offset-2 font-semibold hover:text-energy-800"
              >
                How to Choose a Pathway page
              </Link>{" "}
              for a simpler, step-by-step guide to applying these
              classifications in the TPR.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ResourcesMethodologyPage;
