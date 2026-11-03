import React, { useRef } from "react";
import { Link } from "react-router";
import pathwayMetadataSchema from "../../schema/pathwayMetadata.v2.json" with { type: "json" };
import {
  dataAvailabilitySchema,
  metricSchema,
  sectorSchema,
} from "../../schema/common";
import { REGION_MAPPING_DISCLAIMER } from "../../utils/geographyUtils";
import { SECTORS_BY_KEY } from "../../utils/timeseriesTaxonomy";
import type { KeyFeatureKey } from "../../utils/keyFeatureRules";
import {
  GROUPS,
  type FeatureConfig,
  type KeyFeatureGroupId,
} from "../../components/KeyFeatures";
import {
  coreDriverLabel,
  type CoreDriverKey,
} from "../../components/CoreDrivers";
import {
  EvidenceBadge,
  type DependencyRow,
} from "../../components/DependenciesTable";
import InfoCallout from "../../components/InfoCallout";
import OnPageIndex from "../../components/OnPageIndex";
import PageHeader from "../../components/PageHeader";

type DependencyName = DependencyRow["dependency_name"];
type EvidenceType = DependencyRow["evidence_type"];

/*
  Every value list on this page is read from the lists the pathway pages
  themselves render (#1055), so the two cannot drift: key features from
  `GROUPS`, dependencies from the metadata schema, data availability, sectors
  and metrics from the common schemas, segments and technologies from the
  timeseries taxonomy. Only the descriptions are written here, keyed by the
  same types, so a new feature or category does not compile until it is
  described.
*/
const dependencyProperties =
  pathwayMetadataSchema.properties.dependencies.items.properties;
const DEPENDENCY_NAMES = dependencyProperties.dependency_name
  .enum as DependencyName[];
const EVIDENCE_TYPES = dependencyProperties.evidence_type
  .enum as EvidenceType[];

/** The values a common schema enumerates under one of its `$defs`. */
const definedValues = (
  schema: typeof sectorSchema,
  definition: string,
): string[] => {
  const defs = schema.$defs as
    Record<string, { enum?: string[] } | undefined> | undefined;
  return defs?.[definition]?.enum ?? [];
};

const SECTOR_NAMES = definedValues(sectorSchema, "displayName");
const BENCHMARK_METRICS = definedValues(metricSchema, "displayName");
const TIME_RESOLUTIONS = definedValues(
  dataAvailabilitySchema,
  "timeResolution",
);
const DATA_FORMATS = definedValues(dataAvailabilitySchema, "dataFormat");

/** Sectors the taxonomy describes in detail, in the order sectors are listed. */
const DETAILED_SECTORS = Object.values(SECTORS_BY_KEY);

/** A key feature's id on this page: the old v1 subsection ids, kept stable. */
const featureAnchor = (key: KeyFeatureKey): string =>
  key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** The page ids of the key feature groups. */
const GROUP_ANCHORS: Record<KeyFeatureGroupId, string> = {
  policies: "policies",
  emissions: "emissions",
  technology: "technology",
  investment: "investment",
  energy: "energy-system",
  other: "other-drivers",
};

const FEATURE_DESCRIPTIONS: Record<KeyFeatureKey, React.ReactNode> = {
  policyAmbition: (
    <>
      <p>
        How ambitious the policies modelled in the pathway are. This is a key
        differentiator between many pathways.
      </p>
      <p>
        From a risk angle, ambition closer to current/legislated policies is
        more likely to occur, but it is not the only plausible future.
        Higher-ambition pathways often come with remaining implementation gaps,
        which makes them a good basis for understanding bottlenecks in a
        sector’s transition. These can be opportunities in some cases, or
        indicators of where to intervene.
      </p>
    </>
  ),
  policyTypes: (
    <>
      <p>
        Which types of policy instrument the pathway models. This only refers to
        the instrument, not its level of ambition. “None” means the pathway
        models no policy instruments.
      </p>
      <p>
        This is particularly relevant when analyzing a company’s exposure to
        policies in the regions it operates in.
      </p>
    </>
  ),
  emissionsTrajectory: (
    <p>
      How the pathway’s absolute greenhouse gas emissions change between the
      start year and the end year of the model.
    </p>
  ),
  emissionsScope: (
    <>
      <p>
        Which greenhouse gases are counted in the pathway’s emissions results,
        for both absolute emissions and emissions intensity.
      </p>
      <p>
        Where this differs from the data the pathway is compared with (e.g., the
        emissions a company reports), the analyst may have to make additional
        calculations or assumptions, or use another pathway that matches the
        emissions scope.
      </p>
    </>
  ),
  technologyCostTrend: (
    <p>
      The direction of the unit costs assumed for low-carbon technologies in the
      sectors the pathway covers. This shows whether newer low-carbon
      technologies are assumed to keep getting cheaper compared to their
      high-carbon counterparts. Costs held constant count as “Low or no change.”
    </p>
  ),
  technologyCostsDetail: (
    <>
      <p>How finely the pathway breaks down technology unit costs.</p>
      <p>
        A more granular breakdown is useful when analyzing a company’s future
        profitability and competitiveness, especially in technologies whose
        costs are projected to fall over time.
      </p>
    </>
  ),
  newTechnologiesIncluded: (
    <>
      <p>
        The main new technologies the pathway includes that are not yet deployed
        at scale but are assumed to play a role in the future.
      </p>
      <p>
        This can serve as a proxy for how optimistic the pathway is about
        technological breakthroughs, both as a first step in technology risk
        analysis and in identifying opportunities.
      </p>
    </>
  ),
  investmentNeeds: (
    <>
      <p>
        Whether the pathway quantifies investment needs, and in how much detail.
      </p>
      <p>
        This can show whether a company’s investment pipeline keeps pace with
        what the pathway requires. Where more detail is provided, it can also
        highlight which part of the value chain needs most investment, and
        whether that is reflected in a company’s strategy.
      </p>
    </>
  ),
  energyDemand: (
    <p>
      How total final energy demand changes between the start year and the end
      year of the model.
    </p>
  ),
  electrification: (
    <>
      <p>
        How the share of electricity in final energy use changes between the
        start year and the end year of the model.
      </p>
      <p>
        This does not apply to the power sector, which generates the
        electricity, so a power-sector selection shows “Not applicable.”
      </p>
    </>
  ),
  energyEfficiency: (
    <p>
      How energy use per USD of GDP changes between the start year and the end
      year of the model. Less energy per unit of output is an improvement.
    </p>
  ),
};

const CORE_DRIVER_DESCRIPTIONS: Record<CoreDriverKey, React.ReactNode> = {
  policies:
    "How policies such as performance standards, carbon pricing, or subsidies shape the pathway’s main results.",
  emissionsTargets:
    "How emissions caps or targets, or a model that minimizes emissions, shape the pathway. Simply reporting emissions as an output does not count.",
  technologyCosts:
    "How assumptions about technology unit costs shape the pathway’s main results.",
  investmentChange:
    "How a modelled shift in investment towards low-carbon technologies shapes the pathway.",
  macroeconomicDrivers:
    "How macroeconomic or socio-economic assumptions, such as GDP or population growth, drive the pathway’s results.",
  behavioralShifts:
    "How shifting demand preferences, consumer choices, or behavior within a sector shape the results.",
  otherDrivers:
    "Any other strong assumption that shapes the pathway and is not covered by the drivers above.",
};

const DEPENDENCY_DESCRIPTIONS: Record<DependencyName, string> = {
  "Policy strategy":
    "Supportive policies need to be in place for the sector to transition.",
  "Regulatory framework":
    "Regulation or market structure, such as permitting requirements or price regulation, shapes how the sector can transition.",
  "Market and economics":
    "The economic environment, such as costs, prices, or access to finance, may constrain the sector’s transition.",
  "Public acceptance":
    "The transition may face significant public opposition or societal pushback.",
  "Consumer and client behavior":
    "The transition relies on customers paying a green premium or changing how much they consume.",
  "Infrastructure and logistics":
    "The transition depends on infrastructure such as grids, pipelines, or terminals being in place.",
  "Technology":
    "The transition relies on technologies or decarbonization levers that are not yet market ready.",
  "Resource availability":
    "The transition depends on raw materials, inputs, or land that are scarce locally or need to be imported.",
  "Environmental impacts and ecosystem services":
    "The transition may be affected by physical climate impacts or by its effects on ecosystems.",
  "Labor availability":
    "The transition may face a shortage of workers with the right skills, or displace jobs.",
};

const EVIDENCE_DESCRIPTIONS: Record<EvidenceType, string> = {
  "Quantitative":
    "The pathway provides quantitative information on the dependency, for example in tables.",
  "Qualitative":
    "The pathway describes in detail how its assumptions or results relate to the dependency.",
  "Anecdotal":
    "The pathway makes high-level notes on why the dependency is relevant.",
  "No evidence":
    "The pathway gives no evidence that the dependency matters for its results.",
};

/** One of the terms the page disambiguates up front. They share a single
 * `InfoCallout` rather than getting one each: they are one aside about
 * terminology, not separate notes, so they carry one ⓘ between them. */
const Definition: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
};

const DetailWithValues: React.FC<{
  description: React.ReactNode;
  values: React.ReactNode;
}> = ({ description, values }) => {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-3 text-rmigray-700 leading-7">{description}</div>
      <div className="rounded-lg border border-rmiblue-200 bg-white p-5 text-rmigray-700">
        <div className="[&>p]:leading-7 [&>ul]:mt-3 [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:pl-5 [&>ul+p]:mt-5">
          {values}
        </div>
      </div>
    </div>
  );
};

const ValueList: React.FC<{ intro: string; values: readonly string[] }> = ({
  intro,
  values,
}) => (
  <>
    <p>{intro}</p>
    <ul>
      {values.map((value) => (
        <li key={value}>{value}</li>
      ))}
    </ul>
  </>
);

/** How a feature's values read, by how the pathway page shows them. */
const valuesIntro = (feature: FeatureConfig): string => {
  switch (feature.type) {
    case "single-select":
      return "One of:";
    case "multi-select":
      return "One or more of:";
    default:
      return "Values, in order:";
  }
};

const featureValues = (feature: FeatureConfig): string[] =>
  feature.type === "single-select" || feature.type === "multi-select"
    ? feature.options
    : feature.scaleValues;

/**
 * A top-level section: its `h2` is an entry in the on-page index, and the
 * `h3`s of the subsections inside it nest under that entry.
 */
const Section: React.FC<{
  id: string;
  title: string;
  intro?: React.ReactNode;
  last?: boolean;
  children?: React.ReactNode;
}> = ({ id, title, intro, last = false, children }) => {
  return (
    <section className={`${last ? "" : "border-b border-neutral-300"} py-10`}>
      <div className="max-w-3xl">
        <h2
          id={id}
          className="scroll-mt-8 text-2xl font-semibold text-rmigray-800"
        >
          {title}
        </h2>
        {intro ? (
          <div className="mt-3 space-y-3 text-rmigray-700 leading-7">
            {intro}
          </div>
        ) : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
};

/**
 * A classification sub-section. Always visible — these used to be collapsed
 * behind disclosure buttons, which hid most of the page's substance behind a
 * click and kept every one of them out of the on-page index (#955). The `id`
 * is what makes it appear in that index, nested under the section it
 * belongs to, so keep it stable: it is also the deep link.
 *
 * The hairline above each one is what keeps a long run readable — they are
 * siblings within their section's wrapper, so `first:` correctly drops the
 * rule on the one that opens a section. It stays lighter than the section's
 * own `border-neutral-300` rule so the two levels don't compete.
 */
const Subsection: React.FC<{
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ id, title, subtitle, children }) => {
  return (
    <div className="mt-10 border-t border-neutral-200 pt-10 first:mt-0 first:border-t-0 first:pt-0">
      <h3
        id={id}
        className="scroll-mt-8 text-xl font-semibold text-rmigray-800"
      >
        {title}
      </h3>
      {subtitle ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-rmigray-600">
          {subtitle}
        </p>
      ) : null}

      <div className="mt-4">{children}</div>
    </div>
  );
};

/**
 * One key feature or core driver within a group. An `h4`, so it stays out of
 * the on-page index, but it keeps an `id` so links to the v1 subsections of
 * the same name still land on it.
 */
const Item: React.FC<{
  id?: string;
  title: string;
  children: React.ReactNode;
}> = ({ id, title, children }) => (
  <div className="mt-8 first:mt-0">
    <h4
      id={id}
      className="scroll-mt-8 text-base font-semibold text-rmigray-800"
    >
      {title}
    </h4>
    <div className="mt-3">{children}</div>
  </div>
);

const ResourcesMethodologyPage: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-gray-50">
      <PageHeader
        title="Methodology"
        subtitle="How the Transition Pathways Repository (TPR) classifies pathways and how to interpret those classifications"
      >
        <p>
          The TPR uses a structured classification approach to help analysts
          compare pathways in a consistent manner. This page explains the
          rationale behind these classifications and how they can be
          interpreted.
        </p>
        <p>
          These classifications are designed to support pathway selection and
          interpretation for use cases such as transition assessments, risk
          analysis, and opportunity identification. They do not determine a
          single best pathway for a task; users must still understand the
          underlying pathway and how it meets their needs.
        </p>
      </PageHeader>

      <div className="container mx-auto px-4 pt-6 pb-12">
        <div className="grid gap-8 xl:grid-cols-[16rem_1fr]">
          <OnPageIndex containerRef={contentRef} />

          <div
            ref={contentRef}
            className="min-w-0 max-w-5xl"
          >
            <Section
              id="key-definitions"
              title="Key definitions"
              intro={
                <p>
                  Throughout the TPR, you will see the use of closely related
                  terminology when describing pathways and their content. These
                  are the definitions used in the context of the TPR.
                </p>
              }
            >
              <InfoCallout>
                <div className="grid gap-6 md:grid-cols-2 md:gap-8">
                  <Definition title="Transition pathway">
                    <p>
                      A forward-looking view of how a sector, region, or economy
                      could change over time.
                    </p>
                    <p className="mt-3">
                      This covers anything from detailed models to simple policy
                      objectives.
                    </p>
                  </Definition>
                  <Definition title="Scenario">
                    <p>
                      A subset of pathways based on systematic modeling.
                      Scenarios often provide a structured set of assumptions.
                    </p>
                  </Definition>
                  <Definition title="Benchmark">
                    <p>
                      A data point from a pathway that can be compared with
                      company data. Pathways often provide multiple relevant
                      benchmarks.
                    </p>
                  </Definition>
                  <Definition title="Edition">
                    <p>
                      Some pathways are re-published with updated data, for
                      example in a yearly outlook. Each release is an edition of
                      the same pathway, with its own classifications and data.
                      Search shows one card per pathway and lists its other
                      editions on that card.
                    </p>
                  </Definition>
                </div>
              </InfoCallout>
            </Section>

            <Section
              id="values-by-scope"
              title="Values by sector and geography"
              intro={
                <>
                  <p>
                    Many classifications can differ between the sectors and
                    geographies a pathway covers. For example, a pathway may
                    report a different emissions trajectory for one country than
                    for its wider region. On a pathway’s page, the Sector and
                    Geography selectors at the top choose which values are
                    shown.
                  </p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>
                      Where the pathway reports no value for the selected sector
                      and geography, the TPR shows the value for the closest
                      broader scope it does report, labeled with that scope, for
                      example “Across sectors · Global.”
                    </li>
                    <li>
                      “No information” means the pathway does not report the
                      value.
                    </li>
                    <li>
                      “Not applicable” means the classification does not apply
                      to the selected sector, such as electrification for the
                      power sector.
                    </li>
                  </ul>
                  <p>
                    Dependencies are filtered by sector only. Data availability
                    is filtered by both sector and geography.
                  </p>
                </>
              }
            />

            <Section
              id="pathway-overview"
              title="Pathway overview"
              intro={
                <p>
                  These classifications describe the overarching idea behind a
                  pathway and the broad implications of the modeled changes.
                  Most of them are shown in the header of each pathway’s page.
                </p>
              }
            >
              <Subsection
                id="pathway-type"
                title="Pathway type"
                subtitle="Is the pathway predictive, exploratory, or normative? Shown as “Type” in the pathway’s header."
              >
                <div className="grid grid-cols-1 gap-6 text-rmigray-700 lg:grid-cols-3">
                  <div className="rounded-lg border border-rmiblue-200 bg-white p-5">
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
                  <div className="rounded-lg border border-rmiblue-200 bg-white p-5">
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
                  <div className="rounded-lg border border-rmiblue-200 bg-white p-5">
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
              </Subsection>

              <Subsection
                id="temperature-outcome"
                title="Warming by 2100"
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
              </Subsection>

              <Subsection
                id="net-zero-reached"
                title="Net zero by"
                subtitle="When does the pathway reach net-zero emissions?"
              >
                <div className="space-y-3 text-rmigray-700 leading-7">
                  <p>
                    The year in which the pathway reaches net-zero emissions.
                    Not all pathways reach net-zero emissions, so this value
                    will not always be provided.
                  </p>
                  <p>
                    It refers to the widest scope of sectors and geographies the
                    pathway covers.
                  </p>
                </div>
              </Subsection>

              <Subsection
                id="start-year-of-model"
                title="Start year of model"
                subtitle="What is the first year modeled?"
              >
                <div className="space-y-3 text-rmigray-700 leading-7">
                  <p>
                    The last year before any forward-looking modeling: the final
                    year of the historical baseline used in the calculations of
                    the pathway.
                  </p>
                  <p>
                    It is not shown on a pathway’s page, but it is where the
                    trends under Assumptions & trends start.
                  </p>
                </div>
              </Subsection>

              <Subsection
                id="end-year-of-model"
                title="End year of model"
                subtitle="What is the last year modeled?"
              >
                <div className="space-y-3 text-rmigray-700 leading-7">
                  <p>
                    The final year of the forward-looking output generated by
                    the model, focusing on the available pathway metrics as a
                    reference. For example, if the pathway metrics are available
                    until 2050, but there is a temperature outcome for 2100,
                    then the end year is 2050.
                  </p>
                  <p>
                    Like the start year, it is not shown on a pathway’s page,
                    but it is where the trends under Assumptions & trends end.
                  </p>
                </div>
              </Subsection>

              <Subsection
                id="pathway-description"
                title="Pathway description"
                subtitle="What is the pathway about?"
              >
                <div className="space-y-3 text-rmigray-700 leading-7">
                  <p>
                    A short narrative of the pathway: who developed it, its main
                    storyline, its main assumptions, and examples of what it can
                    be used for. It opens the At a glance tab of each pathway’s
                    page.
                  </p>
                </div>
              </Subsection>
            </Section>

            <Section
              id="assumptions-and-trends"
              title="Assumptions & trends"
              intro={
                <>
                  <p>
                    The key assumptions the pathway makes to drive changes over
                    time, and the resulting trends in the output variables.
                    Parameters which are “assumptions” in one pathway may be
                    “trends” in another, depending on the design of the pathway.
                    Different types of transition assessment usually work with
                    different types of narratives, so a good grasp of these is
                    crucial when selecting pathways for an analysis.
                  </p>
                  <p>
                    The groups below follow the Assumptions & Trends panel of a
                    pathway’s page. Each group opens with its core drivers: the
                    main inputs that shape the pathway’s results. Where a driver
                    does not apply, the pathway’s page says “Not a core driver
                    for this pathway.”
                  </p>
                  <p>
                    Trends such as emissions trajectory, energy demand,
                    electrification, and energy efficiency are based on the
                    compound annual growth rate between the start year and the
                    end year of the model, up to 2050 at the latest. An annual
                    rate keeps pathways with different time spans comparable,
                    and the thresholds between the categories are the same for
                    every pathway.
                  </p>
                </>
              }
            >
              {GROUPS.map((group) => (
                <Subsection
                  key={group.id}
                  id={GROUP_ANCHORS[group.id]}
                  title={group.label}
                >
                  {(group.drivers ?? []).map((driver) => (
                    <Item
                      key={driver}
                      title={coreDriverLabel(driver)}
                    >
                      <p className="max-w-3xl text-rmigray-700 leading-7">
                        {CORE_DRIVER_DESCRIPTIONS[driver]}
                      </p>
                    </Item>
                  ))}
                  {group.features.map((feature) => (
                    <Item
                      key={feature.key}
                      id={featureAnchor(feature.key)}
                      title={feature.label}
                    >
                      <DetailWithValues
                        description={FEATURE_DESCRIPTIONS[feature.key]}
                        values={
                          <ValueList
                            intro={valuesIntro(feature)}
                            values={featureValues(feature)}
                          />
                        }
                      />
                    </Item>
                  ))}
                </Subsection>
              ))}
            </Section>

            <Section
              id="dependencies"
              title="Dependencies"
              intro={
                <>
                  <p>
                    The conditions a pathway’s outcomes depend on. They can be
                    bottlenecks or enabling factors for a sector’s
                    transformation, so they point to where a company’s plan may
                    be exposed. Each dependency is recorded for a sector, with a
                    description and the strength of the evidence in the pathway.
                  </p>
                </>
              }
            >
              <Subsection
                id="dependency-categories"
                title="Categories"
                subtitle="What kind of condition is it?"
              >
                <dl className="max-w-3xl space-y-4 text-rmigray-700 leading-7">
                  {DEPENDENCY_NAMES.map((name) => (
                    <div key={name}>
                      <dt className="font-semibold text-rmigray-800">{name}</dt>
                      <dd>{DEPENDENCY_DESCRIPTIONS[name]}</dd>
                    </div>
                  ))}
                </dl>
              </Subsection>

              <Subsection
                id="evidence-types"
                title="Evidence types"
                subtitle="How strongly does the pathway support the dependency?"
              >
                <dl className="max-w-3xl space-y-4 text-rmigray-700 leading-7">
                  {EVIDENCE_TYPES.map((type) => (
                    <div key={type}>
                      <dt>
                        <EvidenceBadge value={type} />
                      </dt>
                      <dd className="mt-1">{EVIDENCE_DESCRIPTIONS[type]}</dd>
                    </div>
                  ))}
                </dl>
              </Subsection>
            </Section>

            <Section
              id="data-availability"
              title="Data availability"
              intro={
                <>
                  <p>
                    For each metric, the Data Availability table on a pathway’s
                    page shows where and how its data can be obtained, so you
                    can judge what kind of analysis the pathway can support.
                    Each row covers one metric for one sector segment and set of
                    geographies.
                  </p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>
                      “Not covered” means the pathway gives no quantitative
                      information on the metric. It then applies to the whole
                      row.
                    </li>
                    <li>
                      “Unspecified” means the metric is covered, but the pathway
                      does not state that property.
                    </li>
                  </ul>
                </>
              }
            >
              <Subsection
                id="data-availability-metric"
                title="Metric"
                subtitle="Which metric does the row describe?"
              >
                <DetailWithValues
                  description={
                    <p>
                      The list is longer than the benchmark metrics: it also
                      includes data the pathway reports but the TPR does not
                      plot, such as technology costs or investment requirements.
                    </p>
                  }
                  values={
                    <>
                      {DETAILED_SECTORS.map((sector) => (
                        <ValueList
                          key={sector.key}
                          intro={`${sector.displayName}:`}
                          values={Object.values(
                            sector.availabilityMetrics ?? {},
                          ).map((metric) => metric.displayName)}
                        />
                      ))}
                    </>
                  }
                />
              </Subsection>

              <Subsection
                id="granularity"
                title="Granularity"
                subtitle="How finely is the metric broken down?"
              >
                <div className="max-w-3xl text-rmigray-700 leading-7">
                  <p>
                    The breakdown the pathway provides for the metric, for
                    example by technology or by cost component. The possible
                    values depend on the metric.
                  </p>
                </div>
              </Subsection>

              <Subsection
                id="scope-limitations"
                title="Scope limitations"
                subtitle="What is in and out of scope?"
              >
                <div className="max-w-3xl text-rmigray-700 leading-7">
                  <p>
                    What the pathway’s model includes and leaves out for the
                    metric, and how that affects the data.
                  </p>
                </div>
              </Subsection>

              <Subsection
                id="geography-coverage"
                title="Geography coverage"
                subtitle="Which geographies does the metric cover?"
              >
                <div className="max-w-3xl text-rmigray-700 leading-7">
                  <p>
                    The geographies the metric is available for, out of all the
                    geographies the pathway covers.
                  </p>
                </div>
              </Subsection>

              <Subsection
                id="time-resolution"
                title="Time resolution"
                subtitle="How finely is the data resolved over time?"
              >
                <DetailWithValues
                  description={
                    <p>
                      Where the resolution differs between geographies, the most
                      detailed one is shown.
                    </p>
                  }
                  values={
                    <ValueList
                      intro="One of:"
                      values={TIME_RESOLUTIONS}
                    />
                  }
                />
              </Subsection>

              <Subsection
                id="data-format"
                title="Data format"
                subtitle="In what form does the publication provide the values?"
              >
                <DetailWithValues
                  description={
                    <p>
                      Where values appear in more than one form, the easiest to
                      extract is recorded: tables before text before figures.
                    </p>
                  }
                  values={
                    <ValueList
                      intro="One of:"
                      values={DATA_FORMATS}
                    />
                  }
                />
              </Subsection>
            </Section>

            <Section
              id="coverage"
              title="Coverage"
              intro={
                <>
                  <p>
                    In transition assessments, company metrics are compared with
                    benchmarks from pathways. To ensure this is a fair
                    comparison, it is important that the scope and granularity
                    of the benchmark data in the pathway match those of the
                    company (or that any deviations can be approximated
                    transparently).
                  </p>
                  <p>
                    On a pathway’s page, filled badges mark what is available
                    for visualization and download in the TPR. Outlined badges
                    mark what the source publication covers but the TPR does not
                    hold data for yet.
                  </p>
                </>
              }
            >
              <Subsection
                id="regions"
                title="Regions"
                subtitle="Which regions and countries are covered?"
              >
                <div className="space-y-4 text-rmigray-700 leading-7">
                  <p>
                    The regions and countries the pathway covers. Countries
                    follow ISO 3166 definitions. Regions keep the names used in
                    the source publication and list the member countries the
                    publication assigns to them. A region always has at least
                    two members; a single country is listed as a country.
                  </p>
                  {/* Kept as a single italic block: #917 replaced the
                      earlier two-sentence note with the policy wording alone,
                      and the test suite asserts exactly one italic run carries
                      it. */}
                  <InfoCallout>
                    <p>
                      <i>Note: {REGION_MAPPING_DISCLAIMER}</i>
                    </p>
                  </InfoCallout>
                </div>
              </Subsection>

              <Subsection
                id="sectors"
                title="Sectors"
                subtitle="Which sectors are covered?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        The sectors the pathway covers, where coverage means
                        that the pathway provides at least one relevant output
                        metric for each of them.
                      </p>
                      <p>
                        The TPR currently provides detailed information,
                        including benchmark data, for the power sector only.
                        Additional sectors will be added in the future.
                      </p>
                    </>
                  }
                  values={
                    <ValueList
                      intro="One or more of:"
                      values={SECTOR_NAMES}
                    />
                  }
                />
              </Subsection>

              <Subsection
                id="sector-segments"
                title="Sector segments"
                subtitle="Which parts of the sector are covered?"
              >
                <DetailWithValues
                  description={
                    <>
                      <p>
                        The main parts of a sector’s value chain, such as power
                        generation or transmission and distribution.
                        Decarbonization levers tend to differ between segments,
                        and a metric may cover only some of them.
                      </p>
                      <p>
                        Segments are shown in the Data Availability table and
                        under each benchmark plot. They are defined for the
                        sectors the TPR describes in detail.
                      </p>
                    </>
                  }
                  values={
                    <>
                      {DETAILED_SECTORS.map((sector) => (
                        <ValueList
                          key={sector.key}
                          intro={`${sector.displayName}:`}
                          values={Object.values(sector.segments ?? {}).map(
                            (segment) => segment.displayName,
                          )}
                        />
                      ))}
                    </>
                  }
                />
              </Subsection>

              <Subsection
                id="technologies"
                title="Technologies"
                subtitle="What is the technological granularity?"
              >
                <DetailWithValues
                  description={
                    <p>
                      The technologies a pathway provides output for within the
                      sectors it covers, such as the generation technologies in
                      the power sector’s technology mix. As the sector coverage
                      of the TPR expands, the sectors that we show technologies
                      for will also expand.
                    </p>
                  }
                  values={
                    <>
                      {DETAILED_SECTORS.filter(
                        (sector) => sector.technologies,
                      ).map((sector) => (
                        <ValueList
                          key={sector.key}
                          intro={`${sector.displayName}:`}
                          values={Object.values(sector.technologies ?? {}).map(
                            (technology) => technology.displayName,
                          )}
                        />
                      ))}
                    </>
                  }
                />
              </Subsection>

              <Subsection
                id="metrics"
                title="Benchmark metrics"
                subtitle="Which sector-specific metrics are provided?"
              >
                <DetailWithValues
                  description={
                    <p>
                      The sector-specific benchmark metrics the pathway reports
                      outcomes for, which the TPR plots and offers for download.
                      Currently, these are only defined for the power sector,
                      but they will be expanded to each additional sector that
                      we fully cover in the repository.
                    </p>
                  }
                  values={
                    <ValueList
                      intro="One or more of:"
                      values={BENCHMARK_METRICS}
                    />
                  }
                />
              </Subsection>
            </Section>

            <Section
              id="what-to-do-next"
              title="What to do next"
              last
              intro={
                <p>
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
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcesMethodologyPage;
