# Analysis plan

Project: Clinical trial results warehouse and denominator audit (slug `trial-results-audit`)
Author: Animesh Bose
Plan version 1 written: 2026-10-07T09:30Z (UTC), before any full study record or posted result value was retrieved.

This is an internal, timestamped analysis plan kept with the project files. It is not a formal preregistration in a public registry. Later changes are recorded in the amendments section at the end with their own timestamps and reasons.

## Prior exposure at the time of writing

- Count-only API queries were run on 2026-10-07 for the three condition queries with the interventional and results-first-posted filters (diabetes mellitus 1,511 studies, heart failure 468, obesity 842). No study records, outcome values, denominators or population descriptions had been retrieved.
- The API field catalogue (`/studies/metadata`), search areas and enumerations were downloaded and read. They show the structure of the results section (module-level groups, outcome-level and class-level denominators, units analyzed, measurement value/spread/limits, statistical analyses, adverse event counts).
- From general familiarity with ClinicalTrials.gov, I expected that some outcome tables report row-specific (class-level) numbers analyzed and that some outcomes use analysis units other than participants. No counts of how often this happens in this cohort were known.

## Question and estimand

Primary question: among a frozen cardiometabolic interventional trial cohort with posted results, how often can a documented participant denominator be preserved and mechanically associated with the corresponding reported outcome result without unsupported inference?

Primary unit: the outcome group, meaning one reporting group (`OG…` identifier) within one outcome measure of one study. Group identifiers are scoped to their outcome measure; the same identifier in another outcome, in baseline, or in participant flow is not assumed to be the same population.

Primary estimand: in the held-out portion of the confirmed cohort, the distribution of applicable outcome groups across three coverage tiers, with the not-applicable tier reported separately and excluded from the percentage denominators.

| Tier | Name | Meaning |
|---|---|---|
| A | Directly structured and applicable | The participant denominator for the group is given once, as an integer, at the outcome level in participant units, the measurement rows carry no row-specific denominators, and the measure is analyzed in participants. |
| B | Requires an explicitly reproducible transformation | A participant denominator can be associated with every measurement of the group by a written, deterministic rule (for example, row-specific class-level denominators take precedence over the outcome-level one; or the outcome is analyzed in non-participant units and the participant count is held separately from the unit count). Each rule is named in the output. |
| C | Ambiguous and not safely resolvable | At least one measurement of the group cannot be given a participant denominator by the written rules without inference (for example, the group has no count, the count is not an integer, two entries claim the same unit, the selected unit is not among the reported units, or row-specific denominators exist only in non-participant units). |
| D | Not applicable | The outcome was not posted (reporting status `NOT_POSTED`), or the group has no measurement rows. |

The outcome-group tier is the least favourable tier among its measurement rows (C over B over A). Exact rule wording is finalized on the development portion and frozen before the held-out run (see "Development and held-out procedure").

Co-primary descriptive component, unit outcome measure: whether the outcome's analysis population description is present (non-empty after trimming whitespace). An absent description is reported as absent. It is not an error, because the description is a free-text field whose requirement depends on the situation it explains.

## Cohort and eligibility

- Source: ClinicalTrials.gov API v2, retrieved once, with the API version and data timestamp recorded before and after retrieval.
- Condition queries (`query.cond`): "diabetes mellitus", "heart failure", "obesity", resolved by the registry's own condition search.
- Filters: `AREA[StudyType]INTERVENTIONAL AND AREA[ResultsFirstPostDate]RANGE[2020-01-01,2026-09-30]`. The window is results first posted, chosen before retrieval as 2020 through the last complete calendar month. It is not study completion.
- Each retrieved record must also have `hasResults = true`, a results section, study type `INTERVENTIONAL`, and a results first posted date inside the window. Failures are recorded with reason codes.
- Pagination continues until the API returns no next-page token. The retrieved identifier count must equal the API's reported total for each query.
- Resource ceiling: 5,000 studies. If the union of the three queries exceeds it, a deterministic condition-by-year stratified sample is drawn from the full identifier manifest before any outcome is parsed, and the sampling frame and achieved sample are reported separately. If the union is at or below the ceiling, all qualifying studies are retained and percentages are finite-corpus descriptions.
- Ambiguous condition matches: deterministic rule in `config/cohort.yaml`. Confirmed if the condition MeSH or ancestor MeSH terms contain the group's descriptor, or a free-text condition entry matches the group's pattern. Studies returned only through titles, keywords or unrelated ancestor terms are ambiguous matches, excluded from the primary cohort, and kept for sensitivity analysis SA1. This is a vocabulary rule and not clinical adjudication.
- A study may belong to more than one condition group. Condition-level tables count it in each group it belongs to and say so.

## Development and held-out procedure

- Identifier clusters are formed before any results content is parsed, by linking studies that share an NCT alias, an organization study identifier within the same organization, a secondary identifier, or an identical normalized official title. Near-duplicate brief titles (token Jaccard similarity of at least 0.9) are reported and also linked.
- Each cluster is assigned to development or held-out by SHA-256 of `tra-split-v1:` plus the cluster's smallest NCT identifier. Clusters whose hash fraction is below 0.20 go to development.
- All parser mappings, tier rules and check applicability conditions are developed using the development portion and synthetic fixtures only. The parser source files and rule catalogue are then hashed and frozen.
- The held-out audit is executed once with the frozen code. Any later repair is run separately and reported as a post-hoc result. Exposed held-out cases do not become fresh validation.
- Deterministic reruns of the frozen code from cached inputs are reproducibility checks and are not new analyses.

## Representations compared

1. Relational warehouse: native PostgreSQL 17, typed normalized tables for studies, modules, module-scoped groups, participant flow periods/milestones/drop reasons, baseline denominators/measures/classes/categories/measurements, outcome measures, outcome groups, outcome-level and class-level denominators, classes, categories, measurements, statistical analyses and their group lists, adverse event groups/events/statistics. Every value is stored as the exact source text, with a parsed numeric column where the text is a plain decimal number. Every row stores its JSON pointer into the source record.
2. Flat baseline, declared before it is run: an ordinary analyst export that follows the shape produced by `pandas.json_normalize` along each module's deepest list. One CSV row per outcome measurement value with these columns copied down: NCT ID, outcome type, title, description, population description, time frame, parameter type, dispersion type, unit of measure, group ID, group title, group description, class title, category title, value, spread, lower limit, upper limit, measurement comment, and the outcome-level "Participants" count for the group as `n_analyzed`. A second CSV holds one row per statistical analysis with the group IDs joined by `|`. A third holds one row per baseline measurement value with the overall baseline participant count for the group. A fourth holds one row per participant flow milestone count. All values are kept as source text with no numeric coercion, so text preservation is not handicapped. Lists that are not on a record path (outcome-level denominators other than participants, class-level denominators, units analyzed, analysis group objects, outcomes with no measurement rows) are not represented, which is what this kind of export ordinarily does. This baseline is a single-file analyst export. It is not AACT, and the report describes what AACT already preserves from its documentation.

## Independent reference for transformation fidelity

An R program (jsonlite) separate from the Python/SQL warehouse code reads the same raw API pages and enumerates every scalar under the results modules with its JSON pointer, plus counts of each object type. A separate R implementation of the written denominator rules gives a reference tier and denominator for each measurement. Agreement with the warehouse measures transformation fidelity. It is not clinical truth and is not expert validation.

## Outcomes

Primary: tier distribution for applicable held-out outcome groups (unit: outcome group).

Secondary, each with its unit stated:
- S1 Tier distribution at the measurement level (unit: measurement).
- S2 Population description present (unit: outcome measure).
- S3 Coverage and unresolvable fractions by result structure (single row, categorical, multiple classes, row-specific denominators, non-participant units, parameter type), by condition group and by results-first-posted year, with actual denominators.
- S4 Information retention, flat baseline against warehouse: proportion of in-scope source scalars recoverable with exact text and unambiguous context (unit: source scalar), by scalar family; measurements whose attached denominator differs from the most specific structured denominator or is in a different unit (unit: measurement); outcomes lost entirely (unit: outcome); context keys that are not unique (unit: measurement).
- S5 Warehouse fidelity: scalar coverage and exact-text agreement against the reference (unit: source scalar); object count agreement by type; tier and denominator agreement with the R reference (unit: measurement); duplicate rows produced by the evidence view (unit: measurement); round-trip reconstruction of each results module (unit: study module).
- S6 Applicable checks for possible source inconsistencies (unit: applicable check), each with its applicability rule. Planned rules: participant counts above the applicable participant denominator; unit counts above the applicable unit denominator; interval order (lower limit not above upper limit, and the point value inside the interval) for confidence intervals, interquartile ranges and full ranges; percentage-of-participants values outside 0 to 100; adverse event participants affected above participants at risk; adverse event participants affected above number of events when both are given; baseline participant counts above the applicable baseline denominator; statistical analysis estimates outside their two-sided confidence interval. A check runs only where its units and population definitions permit it. Missing, ambiguous and not-applicable cases are counted separately from failed checks.
- S7 Cross-module label identity (unit: outcome group): how often an outcome group's title exactly matches a baseline group title in the same study, and how often matching titles carry different participant counts. This is descriptive evidence about why label matching across modules is unsafe. It does not produce flags.
- S8 Runtime and storage, measured on this machine only.

## Missing data and value states

Zero, absent field, empty text, reported "NA" with or without a comment, not applicable (tier D or a check whose conditions are not met), and not evaluated are stored and counted as distinct states. Missing posted results or absent fields are not treated as evidence of a reporting violation.

## Uncertainty

The held-out corpus is a deterministic hash partition of a complete registry frame, not a probability sample of all trials. Percentages are finite-corpus descriptions and carry no sampling confidence intervals. An exploratory bootstrap that resamples whole trials (not result rows) may be shown in a supplement to describe how much the proportions depend on a few large trials; it is labelled exploratory.

## Sensitivity analyses (fixed set)

- SA1 Include ambiguous condition matches.
- SA2 Primary outcomes only.
- SA3 Composite definition: an outcome group counts as resolvable only if its tier is A or B and its outcome has a population description.
- SA4 Development and held-out portions combined.

## Issue ledger

Every flag goes to one of three classes: transformation defect (warehouse disagrees with the source or the reference), possible source inconsistency (an applicable check failed), or unresolved interpretation (tier C cases and similar). Each row carries the NCT ID, JSON pointers, the exact source values, the rule identifier and the applicability conditions that were met.

## What this study does not do

It does not detect fraud, judge treatment efficacy, pool treatment effects, adjudicate conditions clinically, or claim accuracy against an external gold standard. Synthetic fixtures are software tests only and are never mixed with registry observations.

## Amendments

### Amendment 1 (2026-10-07T09:40Z, before any results section was parsed)

The first freeze of the split linked 123 studies from many unrelated sponsors into one identifier cluster. The cause was a bare value, "2017", entered as an NIH secondary identifier in 47 records (and similar year values). Clustering now ignores identifiers with fewer than 5 alphanumeric characters and purely numeric identifiers of 4 or fewer digits. After the change the largest cluster has 7 studies from one organization. Final split of the confirmed cohort: 508 development and 1,961 held-out studies (unit: study). The split was regenerated from identifiers only; no outcome, denominator or population field had been read.

### Amendment 2 (2026-10-07T10:16Z, development portion only, before the parser freeze and before any held-out result was computed)

Exposure at this point: the development portion (508 confirmed and 19 ambiguous-match studies) was loaded, profiled and analyzed. No held-out study had been loaded into the database, parsed by the warehouse, enumerated by the R reference or analyzed.

1. Rule wording. The tier rules were written out in `docs/rules.md` with named rule identifiers (A_OUTCOME_LEVEL, B1_ROW_SPECIFIC_DENOMINATOR, B2_NON_PARTICIPANT_UNITS, C1 to C5, D_NOT_POSTED, D_NO_MEASUREMENTS) after profiling development data. Development profiling showed that outcomes either give row-level numbers analyzed for every row or for none, that non-participant analysis units appear as a second outcome-level denominator entry with `denomUnitsSelected` set, and that "NA" occurs as a denominator value.
2. Check K12 added. The registry's results definitions reserve category titles for mutually exclusive and exhaustive categories, so counts of participants across two or more titled categories of one row should add up to the participants analyzed for that row and group. K12 tests this where units and the denominator permit it. In the development portion all 685 applicable row-group combinations in the confirmed cohort (693 including ambiguous-match studies) added up exactly.
3. Dispersion vocabularies. Outcome dispersion types arrive as display text and baseline dispersion types as enumeration codes. Both are stored verbatim and mapped to interval kinds by a lookup used only for checks K3 and K4.
4. Flat comparison operationalized. A source scalar counts as recoverable from the flat export only when exactly one flat row matches its full context (every outcome-level column the export carries, plus class title, category title and group ID) and holds identical text. Statistical analysis rows are matched by position within an outcome only when the outcome's type, title and time frame are unique in the study.
5. Cross-module label identity (S7) is computed against the baseline module's overall participant count for the same-titled group, and the group-identifier scope description counts studies in which OG000 has different titles in different outcomes.
6. The worked example shown in the report is chosen by a fixed rule written in the code (the held-out outcome with three to eight rows and two or three groups whose row-level participant counts spread most widely relative to the outcome-level count), not by browsing.
7. Runtime and storage are reported from timings recorded by the build and analyze stages on this machine.

### Amendment 3 (2026-10-07T10:27Z, after an independent code review of the development-portion work, before the parser freeze)

The code and rules written under amendment 2 were reviewed against this plan and `docs/rules.md` by separate reviewers working only on development data, and each reported defect was independently re-checked before it was accepted. The following changes were made before the freeze. None was chosen by looking at held-out data.

1. Tier C now includes the case this plan already listed and the first rule text had omitted: an outcome analyzed in a unit other than participants with no single usable count in that unit for the group (`C6_SELECTED_UNIT_NOT_REPORTED`). It did not occur in the development portion.
2. Measurements of outcomes whose reporting status is not `POSTED` are tier D at the measurement level as well as the group level.
3. Unit names and blank tests trim spaces, tabs, carriage returns and line feeds and fold ASCII case identically in SQL and R; usable counts and plain numbers must consist of ASCII digits only (a trailing line break or non-ASCII digits are not accepted), and counts above 2,147,483,647 are not usable. No development value was affected.
4. Outcome structure (S3) counts rows from the class list rather than only rows that hold categories. Five development outcomes with empty leading rows had been labelled "single row".
5. S7 counts a title match only for exactly equal titles, as this plan states, with one row per baseline group.
6. K4 is not evaluated when the interval limits are out of order (K3 reports that case), so one source problem produces one flag. The K8 pointer now names a real source field. Applicability wording for K1 to K12 says "present" where the code already counted non-numeric text as not evaluable. Ledger rows for tier C groups carry only the C rules and the denominators involved.
7. The flat comparator is widened, making it more generous than first declared: every scalar of every ancestor (module, measure or outcome, group, class, category) is copied down in all four files, and the context key used for matching includes group titles and descriptions. The units label of the attached participant count is scored "no column" because no cell stores it. Statuses distinguish rows that are absent from rows that are ambiguous.
8. Operational fixes that change no development number: the stored raw record omits the point-of-contact and certain-agreement blocks; the round trip rebuilds groups in source order and reports quarantined studies separately; reload bookkeeping distinguishes identical from changed reloads; the SQL-versus-R agreement applies the cohort filter on both sides; every attempt that touches held-out data is logged before tables are computed, and the held-out run cannot be repeated or bypassed through other options; measured timings are kept out of the reproducibility comparison.

## Notes added after the held-out run (2026-10-07)

These notes clarify wording and record later additions. They change no rule, code, timestamp or prespecified result.

1. Review wording. "Independent code review" in the heading of amendment 3 and in the opening paragraph of `docs/rules.md` (Part B of Additional file 1), and "separate reviewers" in the first paragraph of amendment 3, mean separate review passes over the development-portion code, each working only from this plan, `docs/rules.md` and development data. The study has one author; no other person reviewed the code. The review, the defects and the changes listed in amendment 3 are as recorded.
2. Checks K8 and K11, and the final form of K4 and K10. Check K8 (adverse event group totals: participants affected above participants at risk) extends the planned at-risk rule from single events to group totals, and check K11 (non-zero value with zero participants analyzed) was added. K4 tests an interquartile range only around a median, and K10 also fails when an analysis's confidence limits are reversed. All four were defined on the development portion before the parser freeze and are in `docs/rules.md`, whose hash is recorded in the freeze.
3. Flat matching of statistical analyses. Amendment 2, item 4, names the outcome type, title and time frame; the code requires all 13 outcome-level fields the flat export carries to be unique in the study before it matches analysis rows by order. In the held-out portion, 27 outcomes with analyses, in 6 studies, share type, title and time frame with another outcome but differ in other outcome-level fields; they were matched by order.

## Post hoc additions (after the held-out run, 2026-10-07)

The following descriptive tables were added after the single held-out run. They describe the held-out results further, change no prespecified result, and are labeled post hoc wherever they are reported (`python -m tra posthoc`, written to `results/tables/heldout_posthoc/`):

1. How the flat-export measurements whose row reports a different number analyzed are spread: by study, by outcome, in the ten largest contributing studies, and among measurements of primary outcomes.
2. The number of outcome groups with row-level counts in which at least one row's count differs from the outcome-level count.
3. The number of statistical-analysis values in outcomes with two or more analyses. The flat comparison matches analysis rows by their order within an outcome whose descriptive fields are unique in the study (amendment 2, item 4); where an outcome has only one analysis, order does not decide the match.
