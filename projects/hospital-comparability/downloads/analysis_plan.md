# Analysis plan

First draft written 2026-10-07T09:34Z (UTC). Revised before locking at 2026-10-07T09:57Z, after source checks showed that the current release no longer publishes interval estimates for the study measures (see "Release selection"). The revision changed which release the pairwise analysis uses and added a release gate; it was made before any score, interval, pair, rank or gate pass fraction for any release had been computed.

The plan is locked by SHA-256 in `docs/analysis_plan.lock.json`. The `analyze` stage refuses to run if this file no longer matches the lock, so any later change has to be added as a dated amendment at the end of this file and re-locked. This is an internal timestamped plan, not a formal preregistration in a public registry.

## Prior exposure

Before locking I had:

- read the CMS Provider Data Catalog metadata, downloaded the current files and the official archive releases dated 2026-05-13 and 2026-08-13, and read the data dictionary, Footnote Crosswalk, Measure Dates tables, the FY 2026 IPPS final rule sections on the readmission measures, CMS listserve 2026-89-IP and the QualityNet methodology reports;
- inspected file headers, Measure IDs and names, observation windows, distinct footnote codes, distinct non-numeric strings, distinct "Compared to National" labels, Facility ID formats, duplicate keys and hospital counts by file and hospital type;
- seen, as part of release checks, how many records per measure carry numeric scores and numeric interval limits in each release (for example 3,253 numeric HF readmission scores and zero numeric limits in the current release, and 3,151 records with numeric limits in the 2026-05-13 release), and that the current national and state files report "Not Available" for counts of hospitals by category;
- read research notes that quoted CMS category counts for the 2026-08-13 release (for example 21 Better and 38 Worse among scored HF readmission records).

I had not computed or viewed any hospital's score in relation to another's, any interval overlap, rank, rank range, pairwise statistic or gate pass fraction. I have general familiarity with published work showing that CMS classifies most hospitals as no different from the national rate on these measures.

## Question

For heart-failure 30-day readmission and mortality in public CMS hospital files:

1. What fraction of hospital-measure records requested for a within-state, same-measure comparison pass each applicability and comparability gate, in the latest complete compatible release and in the newer releases?
2. Within the compatible subset of the latest complete compatible release, what fraction of point-estimate orderings between two hospitals in the same state are not separated by the published interval estimates?
3. How wide are interval-compatible rank ranges compared with the single point-estimate rank?
4. Between releases, does the same Measure ID keep the same observation window and documented definition?

## Release selection

Three releases are loaded, each with its own hospital list, footnote crosswalk, Measure Dates table and reference aggregates (`config/releases.toml`):

| Release | Role | Interval status | Basis |
|---|---|---|---|
| 2026-05-13 (official archive snapshot, April 2026 refresh) | primary | published | latest release with published intervals not covered by a CMS correction or suppression notice |
| 2026-08-13 (official archive, July 2026 refresh) | flagged | published, then flagged | CMS listserve 2026-89-IP (2026-09-18) reported issues affecting the publicly reported national compare values and confidence intervals for 18 claims-based outcome measures, including all six study measures |
| 2026-09-30 (current catalogue files) | current | suppressed | same notice; intervals and categories are shown as "Not Available" until the July 2027 release, while hospital rates are still published |

The primary release is the latest complete compatible release for an interval-based comparison. The flagged and current releases are run through the same gates so the report can show what a release-aware check does with them. No interval from the flagged release is used in any comparison.

## Units and data

- Record unit: one hospital-measure-release record (release key x dataset x Facility ID x Measure ID).
- Pair unit: one unordered pair of distinct compatible hospitals in the same release, state and Measure ID.

## Measures

| Role | Measure ID | Source dataset | Quantity | Favorable |
|---|---|---|---|---|
| Primary | READM_30_HF | Unplanned Hospital Visits (632h-zaca) | risk-standardized readmission rate, percent | lower |
| Primary | MORT_30_HF | Complications and Deaths (ynj2-r877) | risk-standardized mortality rate, percent | lower |
| Supporting | EDAC_30_HF | Unplanned Hospital Visits | excess days in acute care per 100 discharges | lower |
| Secondary (S3) | READM_30_AMI, MORT_30_AMI, EDAC_30_AMI | as above | as above | lower |
| Look-alike check only | READM-30-HF-HRRP, READM-30-AMI-HRRP | HRRP (9n3s-kdb3) | excess readmission ratio | lower |

Each measure is analyzed on its own. No average, sum or composite across mortality, readmission and excess days is computed. A look-alike measure is never substituted for a study measure.

## Comparison universe

Same release, same CMS `State` code (all codes present, including DC and territories) and exact Measure ID. Universes with fewer than two compatible hospitals contribute records but no pairs.

## Record states

Each record receives one availability state: `reported` (numeric score), or, for a non-numeric score, a state assigned by footnote precedence 19, 12, 7, 1, 4, 13, 5: `not_eligible_program` (19), `not_applicable_to_hospital` (12), `no_eligible_cases` (7), `too_few_cases` (1), `suppressed_by_cms` (4), `cannot_be_calculated` (13), `not_available_this_period` (5), otherwise `missing_unspecified`. Hospitals listed in the same release's General Information file with no row in the measure file are counted as absent from the measure file in the broader denominator.

## Gates (applied in order; the first failure is recorded, and each gate's independent pass count is also reported)

- G0 release: the release's documented interval status is `published` (not flagged or suppressed by a CMS notice).
- G1 identity: valid six-character Facility ID, valid state code, unique (Facility ID, Measure ID) within the file.
- G2 measure definition: exact Measure ID present in the study dictionary (`config/measures.toml`) with a documented quantity, unit and direction, and a single source Measure Name for that ID within the file. A requested comparison between two different Measure IDs fails here.
- G2b population: records of a hospital type are not compared with other types if official CMS documentation states that the type's results for the measure are computed from a different patient population or data source. Resolution before lock: no such documentation was found (the 2026 readmission report lists VA data among the measure's data sources and describes no separate population), so `config/population_exclusions.csv` is empty, G2b excludes no records, and hospital type is reported descriptively.
- G3 observation window: record start and end dates equal the same release's official Measure Dates window for that Measure ID (cross-checked against the modal record window). A record carrying footnote 29 (partial performance period) or 3 (shorter period than required) fails.
- G4 numeric score: the score parses as a finite number.
- G5 usable interval: both limits are numeric, lower <= score <= upper, lower < upper, and all three lie within the unit bounds.
- G6 residual footnotes: any availability footnote (1, 4, 5, 7, 12, 13, 19) on an otherwise numeric record fails. Caution footnotes (11, 23, 28) pass with a flag.

Records passing all gates form the compatible subset.

## Denominators

- Requested records: all rows for the Measure ID in the release file (by state and nationally).
- Broader availability denominator: all hospitals in the same release's General Information file for the state, including those with no row in the measure file.
- Pairs: all unordered pairs of compatible hospitals within a universe.

Both record-level and pair-level denominators are reported with every fraction.

## Pair metrics (primary release)

For hospitals a and b with reported scores s, lower limits L and upper limits U, all compared as integers in units of the last reported decimal:

- point-ordered: s_a != s_b as published; equal published scores are ties and are counted separately;
- separated (rule R1, primary): U_a < L_b or U_b < L_a. Touching endpoints are not separated.

Primary pair metric: among point-ordered pairs, the proportion not separated under R1, pooled across states. Because large states contribute many more pairs, the same metric is also reported (a) per state, summarized by the median and range across states with each state weighted equally, and (b) per hospital: for each compatible hospital, the proportion of its point-ordered same-state comparisons that are separated, summarized by median and interquartile range across hospitals, plus the share of hospitals separated from none of their same-state peers.

## Partial order and rank ranges

Within a universe of n compatible hospitals and a lower-is-better measure, hospital j is interval-better than i when U_j < L_i. The interval-compatible rank range of i is

- best rank = 1 + #{j : U_j < L_i}
- worst rank = n - #{j : L_j > U_i}

This is the counting rule of Klein, Wright and Wieczorek (2020) applied to the published marginal intervals: the set of ranks i could take if each hospital's true value lay anywhere inside its own published interval. It is a deterministic sensitivity calculation. It is not a simultaneous confidence set for ranks, it has no stated coverage, and it is not a significance test. Each published interval is a marginal 95% bootstrap interval for one hospital; the chance that all n true values lie inside their intervals at once is lower than 95% and cannot be computed from the public files because no covariance is published. No Gaussian or bootstrap simulation of ranks from rounded limits is performed.

The naive comparator is the point-estimate-only ordering within the same release, state and Measure ID (competition ranking, ties share the best rank). It never mixes endpoints.

Summaries: median rank-range width as a share of n, the share of hospitals whose range covers more than half of the possible ranks, and, for the point-estimate first-ranked hospital in each universe with at least 10 hospitals, its worst compatible rank.

## Prespecified examples (primary release)

- Lead example: for READM_30_HF, among states with at least 10 compatible hospitals, the state with the median compatible count (lower median; ties broken alphabetically). Show every compatible hospital's score and interval, the point-estimate first-ranked hospital (lowest score; ties broken by Facility ID) and its rank range.
- Passing example: in the same state and measure, the R1-separated pair with the largest gap between intervals (ties broken by Facility IDs), shown with all gate decisions.

## Definitional and release comparisons

- Within each release, for every pair among the eight dictionary measures: whether Measure ID, quantity, unit, observation window, condition and source program agree, and the first reason a cross-measure comparison fails.
- Across releases, for each study measure: the observation window in each release, months of overlap with the primary release, and documented definition changes with their sources (`config/releases.toml`).
- Facility IDs present in one release and not another are counted and listed. No record is linked across a changed identifier by name, and no merger, closure or identifier change is inferred.

## Sensitivity analyses (exactly three, primary release)

- S1 denominators and completeness: (i) primary compatible subset; (ii) strict complete-valid subset that also excludes caution footnotes 11, 23 and 28; (iii) record coverage against the broader General Information denominator.
- S2 alternative separation presentations: R1 (primary); R2 rounding-robust non-overlap, requiring the gap between intervals to exceed one unit in the last reported decimal place; R3 point-outside, where each point estimate lies outside the other hospital's interval (a lenient bound). As a separate reference row that is not a rule of this study, the share of point-ordered pairs that CMS's own categories place on opposite sides of the national rate (or of zero for EDAC).
- S3 secondary condition: all primary metrics computed separately for READM_30_AMI, MORT_30_AMI and EDAC_30_AMI.

## Checks

- Software tests: interval ties, missing limits, reversed bounds, exactly equal scores, low-volume footnotes, higher-is-better direction handling, rank-range arithmetic, footnote parsing, Facility ID normalization and agreement between the SQL and an independent Python statement of the rules. Fixtures are synthetic, labeled as such and stored under `tests/fixtures/`; they never enter study tables.
- Source reconciliation: in each release where the CMS national and state files publish counts of hospitals by category, compare them with counts from hospital rows and report differences without forcing agreement. Observation windows are also compared across the hospital, state and national files of each release.
- Raw reconstruction: for each of the six study measures in the primary release, the first, middle and last compatible record by Facility ID and the first `too_few_cases` record (24 records) are re-read from the raw CSV bytes with an independent parser and compared field by field.
- Second implementation: an R script recomputes pair counts and R1 separation counts from the exported compatible-record table. This is a software cross-check, not independent scientific validation.
- Rerun: all deterministic stages are rerun from cached inputs and every output table is compared with the first run (floats: absolute tolerance 1e-12; integers and strings: exact).

## Missing data

No imputation. Missing, suppressed, too-few and not-eligible records are counted in their own states and excluded from pairs.

## What counts as a useful negative result

If most point-ordered same-state pairs are separated by the published intervals, the public intervals support most within-state orderings for these measures, and the case for the tool rests on the definitional and release gates. That result would be reported as found. No minimum effect, count or proportion is expected or promised.

## Cross-release limits

Repeated releases are not treated as independent annual outcomes, and score differences between releases are not analyzed or attributed to hospital actions. The cross-release comparison is limited to windows, overlaps, documented definitions and identifier presence.

## Amendments

### Amendment 1 (2026-10-07T10:01Z, after the first analysis run)

The prespecified passing-pair rule returned no pair: in the lead-example state (Alabama, READM_30_HF, 54 compatible hospitals) none of the 1,385 point-ordered pairs is separated under R1. This rule failure is reported as a result. So that the report can still show a pair that passes the checks and is separated, the passing example is taken from the other primary measure, MORT_30_HF, in the same state, using the same largest-gap rule (ties broken by Facility IDs); if no MORT_30_HF pair in that state is separated, from EDAC_30_HF in the same state. The fallback order was fixed before any MORT_30_HF or EDAC_30_HF pair in Alabama was inspected. No other part of the plan changed.

### Amendment 2 (2026-10-07T10:02Z, after the first analysis run)

The pre-lock resolution of gate G2b ("no such documentation was found") was wrong. While checking the hospital in the Amendment 1 passing example, which is a VA medical center, I read the cohort sections of the QualityNet methodology reports more fully. They state that the Medicare enrollment criteria are not applicable to VA hospitalizations and that VA administrative data are a data source for VA beneficiaries (2026 readmission report, PDF p. 8; 2025 mortality report, section 2.2.4, PDF p. 16; 2025 EDAC report, PDF p. 75). That is a documented difference in cohort definition and data source, which is what G2b was written to catch. This amendment applies G2b as written: records with hospital type "Acute Care - Veterans Administration" are not compared with other hospital types for the six study measures (`config/population_exclusions.csv`). No other gate, rule or summary changed. The outputs of the first run, in which G2b excluded nothing, are kept in `outputs/archive/run1_before_amendment2/` and their headline values are reported next to the amended values.

Consequence for the examples, noted at the same time: with VA records excluded, the unchanged lead-example rule selects Arizona instead of Alabama. In Arizona the prespecified passing-pair rule again returns no READM_30_HF pair, so the Amendment 1 fallback order (MORT_30_HF, then EDAC_30_HF, same state) applies there. No Arizona pair had been inspected before this note.

### Amendment 3 (2026-10-07T10:44Z, wording correction only)

The release-selection table above describes CMS listserve 2026-89-IP as covering "18 claims-based outcome measures". The notice lists 18 outcome measures, two of which (Hybrid HWM and Hybrid HWR) combine claims with electronic health record data, and it does not use the phrase "claims-based". The release status note in `config/releases.toml` was corrected to "18 outcome measures". No gate, rule, measure, release status or summary changed, and the full pipeline was rerun from the corrected configuration.

### Note on the record (2026-10-07T11:27Z, corrections to the account above; no change to the general comparison)

This note corrects statements above that an independent review of the package found inaccurate. It changes no gate, rule or summary of the general comparison.

1. The lock at 2026-10-07T10:03:33Z belongs to the paragraph under Amendment 2 headed "Consequence for the examples". That paragraph was added about one minute after Amendment 2, after a run under the Amendment 2 lock showed that the lead-example rule now selected Arizona and that Arizona had no separated READM_30_HF pair. The words "noted at the same time" and "No Arizona pair had been inspected before this note" are therefore inaccurate. What was fixed in advance was the fallback order in Amendment 1, which was set before any Arizona pair was inspected.
2. The archive `outputs/archive/run1_before_amendment2/` holds the run made after Amendment 1 and before Amendment 2. Its headline values equal those of the first run, because Amendment 1 changed only the passing example.
3. The opening paragraph and the end of "Prior exposure" say that no gate pass fraction had been computed or viewed. They refer to pass fractions computed by the pipeline. Counts of numeric scores and of numeric interval limits per release, which equal the independent G4 and G5 pass counts, had been seen during release checks, as listed under "Prior exposure".
4. The lead-example rule is implemented as follows: order eligible states by compatible count and then by state code, and take the state at position floor((k - 1) / 2), where k is the number of eligible states. In the amended run four states (Alabama, Arizona, Massachusetts and Mississippi) tie at the median count; this positional rule selects Arizona, while taking the alphabetically first tied state would select Alabama.
5. Gate G2b as written says records of the excluded type are not compared with other types. The pipeline excluded them from the general comparison and, to implement the rule fully, now also reports comparisons among records of the excluded type within the same state as a separate descriptive output (`sql/04_population_groups.sql`, `outputs/tables/separate_group_summary.csv`).


### Note on the record (2026-10-07T20:49Z, source added; no change to any rule or result)

Amendment 2 cited the 2026 readmission specifications report, which documents the newer readmission measure version. The 2025 Condition-Specific Readmission Measures Updates and Specifications Report, which matches the readmission measure version in the primary release, was later saved from the QualityNet archived measure methodology package (`2025_Rdmsn_MeasureMethodology.zip`). It contains the same cohort statements: Medicare Fee-for-Service enrollment criteria are not applicable to VA hospitalizations (PDF p. 10), and risk-adjustment variables are obtained from VA administrative data for VA beneficiaries (PDF p. 15). The readmission rows of `config/population_exclusions.csv` now cite the 2025 report. No gate, rule, record or summary changed.

### Note on the record (2026-10-07T21:31Z, records added and wording corrected; no change to any gate, rule or result)

1. The text of the first lock (2026-10-07T09:59:40Z, SHA-256 f2e5460d607537494eec46e181e10bc900cb4b121af7ab9bb2e3674bdd3959cb) is kept as `docs/analysis_plan_first_lock.md`, whose checksum equals that lock. It is identical to the sections of this plan above "Amendments", and its Amendments section reads "None at lock time."
2. In the note of 11:27Z, "an independent review of the package" means a re-check of this plan against the run records carried out within the project. No external reviewer was involved.
3. Page references for the VA cohort statements are corrected: in the 2025 mortality report the statement that Medicare enrollment criteria do not apply to VA hospitalizations is on PDF p. 11 (section 2.2.1), and p. 16 (section 2.2.4) names VA administrative data as a data source; in the 2025 EDAC report the statement is on PDF p. 10 for all three measures and in Appendices D.1 (p. 75, AMI) and D.2 (p. 77, heart failure). `config/population_exclusions.csv` cites these pages.
4. Definition changes for the newer releases were completed from the CMS answers to frequently asked questions for Summer 2026 public reporting, which apply to the July 2026 refresh (archived 2026-08-13) and give measurement periods that match the windows in the newer files, and from 90 FR 37014. For all six study measures CMS included COVID-19 admissions, removed the history of COVID-19 risk variable and updated code sets and risk-adjustment data; for excess days, COVID-19 readmissions, emergency department visits and observation stays now count in the outcome. `config/releases.toml` records these changes; they affect only the cross-release description.
5. "Bottom half" in the rank-range summaries means a worst rank greater than n/2, which for an odd number of hospitals includes the middle rank.
