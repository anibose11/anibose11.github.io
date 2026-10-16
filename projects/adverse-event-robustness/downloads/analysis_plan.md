# Analysis plan

**Study:** Sensitivity of spontaneous-report associations to case construction and drug identification choices in the FDA quarterly adverse-event extracts (2024Q3 to 2026Q2)

**Plan written:** 2026-10-07T09:38Z (internal timestamp; this is not a registered protocol)

**Status of the data when this plan was written.** The quarterly archives were being downloaded. Before writing the plan I had inspected: the FDA documentation shipped in the 2024Q3 archive (README, ASC_NTS, FAQs, per-file statistics reports); the 2024Q3 file headers and record counts; the distribution of 2024Q3 DRUG strings mentioning the study drug classes (drug file only, no reactions joined); and RxClass/RxNav class membership responses. No reaction counts by drug, no two-by-two table, and no association measure had been computed. Any later change to this plan is recorded under *Amendments* with a date and reason.

## 1. Question

How much do reporting odds ratios for five prespecified, previously communicated drug-class and reaction pairs change when the same quarterly FAERS/AEMS extract files are processed under different defensible rules for (a) the counting unit, (b) the reporter-designated drug role, and (c) drug-name to ingredient matching, and which cells of the two-by-two table move when they change?

The study measures processing sensitivity of a reporting association. It does not estimate incidence, risk, or causal effects, and it does not rank drugs.

## 2. Data

- Source: FDA quarterly data extract ASCII files, eight consecutive quarters 2024Q3 to 2026Q2, downloaded from the FDA extract index linked from the AEMS (formerly FAERS) quarterly data page. Files are noncumulative; each covers reports received in one quarter.
- Tables used: DEMO, DRUG, REAC, OUTC and the deleted-case list (`Deleted/DELETEyyQq.txt`). THER, INDI and RPSR are not used.
- Freeze: the archives and their SHA-256 checksums in `source_manifest.json` define the snapshot. "Latest version" always means latest within these eight files, not the latest version that exists at FDA.
- Compatibility: each release's README, ASC_NTS revision date, file header, and member layout are compared in `docs/transition_table.csv`. A release with an incompatible schema is not silently dropped: it is either harmonized by a documented rule or the analysis is marked incomplete.

## 3. Units and case construction

1. **Report version** = one PRIMARYID. If the same PRIMARYID appears in more than one extract, the record from the later extract is kept with that extract's DRUG and REAC rows (FDA FAQ 29).
2. **Case version number** = CASEVERSION when numeric; otherwise the numeric suffix of PRIMARYID after CASEID (ASC_NTS defines PRIMARYID as CASEID concatenated with CASEVERSION); otherwise ranked lowest. Counts of each source and of conflicts are reported.
3. **Case** = CASEID. The case is represented by its latest available version: highest case version number, then latest FDA_DT, then later extract, then larger PRIMARYID. The number of cases where ordering by FDA_DT first would select a different version is reported.
4. **Deletions**: a CASEID listed in any acquired deletion file is removed (primary). Cases with a version received after their deletion listing are counted and reported. Sensitivity S1 keeps them.
5. Content of a case (drugs, reactions) comes from its selected version only. Earlier versions are not unioned in.
6. Voluntary (direct) reports are not linked to manufacturer cases by FDA (FAQ 31). Cross-case duplicates are therefore not resolved by CASEID deduplication; this is a stated limitation, and no probabilistic duplicate detection is attempted.

## 4. Exposure (drug class)

- Classes: SGLT2 inhibitors and DPP-4 inhibitors. Members are the RxNorm ingredients returned by RxClass for the FDA Established Pharmacologic Class (DailyMed SPL, `has_epc`) or the MED-RT mechanism of action (`has_moa`) for each class, with precise ingredients mapped to ingredients. The responses are frozen with checksums.
- **Strict mapping**: a backslash-delimited PROD_AI component equals an RxNorm ingredient (IN) name.
- **Expanded mapping**: strict, plus PROD_AI components equal to an RxNorm precise-ingredient (PIN) name of a member, plus DRUGNAME strings containing a member's IN, PIN or RxNav-related brand name (BN) as whole words after punctuation is replaced with spaces. Strings without a verified match stay unmapped and are listed in `outputs/mapping/unmapped_stem_strings.csv`.
- **Role**: `ps` = ROLE_COD PS, with the FDA FAQ 30 rule (lowest DRUG_SEQ treated as PS when a report has no PS); `suspect` = PS or SS. Concomitant (C) and interacting (I) listings never count as exposure.
- A unit is exposed to a class if at least one of its drug rows meets the mapping and role rule for any member. A combination product counts toward each class it contains.
- Exposure means "listed in the report with the stated role". It is not evidence of use, adherence, dose, or person-time.

## 5. Events

Exact, case-insensitive match of the REAC PT string to the prespecified list in `config/associations.yaml`. Provenance for every string is in `docs/term_provenance.csv`. No MedDRA hierarchy, SMQ, or licensed dictionary is used. A unit has the event if any of its PT rows matches. If a prespecified string never occurs in the data, it stays in the definition and contributes zero; it is not replaced.

| Association | Class | PT strings |
|---|---|---|
| SGLT2I_DKA | SGLT2 inhibitors | Diabetic ketoacidosis; Euglycaemic diabetic ketoacidosis; Ketoacidosis |
| SGLT2I_FOURNIER | SGLT2 inhibitors | Fournier's gangrene |
| DPP4I_PEMPHIGOID | DPP-4 inhibitors | Pemphigoid |
| DPP4I_ARTHRALGIA | DPP-4 inhibitors | Arthralgia |
| DPP4I_PANCREATITIS | DPP-4 inhibitors | Pancreatitis; Pancreatitis acute; Pancreatitis haemorrhagic; Pancreatitis necrotising |

The list is fixed. Small, null, or unexpected results are reported as they are; terms are not added or removed after results are seen.

## 6. Two-by-two tables and background

For each association and configuration, every retained unit falls in exactly one cell:

| | Event | No event |
|---|---|---|
| Exposed to class | a | b |
| Not exposed | c | d |

The background (c, d) is every other retained unit in the whole extract, all products, built before any restriction to the drug class. Units listing a class member only in a non-qualifying role (for example SS under `ps`, or C under any rule) stay in the background; their number in each cell is reported. A unit can contribute to several associations; overlaps between associations are reported.

## 7. Measure, zero cells, minimum support

- ROR = (a/b)/(c/d), 95% interval by the Woolf log method.
- If any cell is zero, no ROR or interval is computed; counts are still shown. No continuity correction.
- Minimum support: a >= 3 for an estimate to be reported.
- An interval excluding 1 is described as a reporting association under the stated assumptions. It is not a safety verdict, and an interval including 1 is not evidence of safety.

## 8. Configurations

Principal factorial (eight): unit {case, version} x role {ps, suspect} x mapping {strict, expanded}. **Primary = V1: case, suspect, expanded.** The four report-version variants (V5 to V8) are diagnostic comparators that show the inflation from counting follow-up versions as separate units; they are not equally valid patient-level analyses.

Secondary analyses, each one change from V1:

- S1: deletion lists not applied.
- S2: restricted to cases whose INIT_FDA_DT is a complete date within 2024-07-01 to 2026-06-30 (cases first received in the window). Cases updated in the window but first received earlier are excluded. This is a receipt-date cohort, not an event-onset cohort.
- S3: active comparator. Target class cases (V1 exposure, and no member of the other class in any role) versus other-class cases (V1 exposure to the other class, and no target-class member in any role). Cases reporting both classes in any role are excluded and counted.
- S4: background excludes units with any drug string carrying the -gliflozin or -gliptin stem that is not a verified member (for example vildagliptin, teneligliptin, ipragliflozin, or variant spellings).

## 9. Primary result and robustness summary

For each association: the ROR, interval, and cells under each principal configuration; the range (minimum and maximum ROR) across the four case-level configurations; the ratio of maximum to minimum; whether the direction (point estimate above or below 1) and the side of 1 of the lower interval bound agree across configurations; and a decomposition naming which cells changed between adjacent configurations and the reason (role, mapping basis, version multiplicity). Precision (interval width within a configuration) and robustness (spread across configurations) are reported separately. Agreement across configurations is described as processing robustness only.

## 10. Validation

- Software tests on small synthetic fixtures (version ordering, ties, deletions, PS fallback, many-to-many drug and reaction rows, cell exclusivity, ROR arithmetic). Fixtures are labeled and never mixed with study data.
- Source reconciliation: delivered row counts per file against physical line counts and against the record totals printed in FDA's per-file statistics reports, where present.
- Second implementation: the primary-configuration cells recomputed with a separate pandas/pyarrow path that does not use the SQL tables, compared for exact equality.
- Structural checks: one selected version per CASEID; a + b + c + d equals the retained unit count; no unit in two cells; event and exposure indicators built at unit level, so a unit with several drug and reaction rows is counted once.
- Rerun: the analysis stage is repeated from cached inputs; counts must match exactly and RORs within 1e-12 relative difference.
- These are software and source checks, not external clinical validation of any association.

## 11. Missing data and codes

Missing ROLE_COD, PROD_AI, DRUGNAME, PT or date values are counted by field. A missing value never becomes an exposure or event. Zero (counted, none present), absent (field or file not present in a release), unavailable (not acquired), and not evaluated (below minimum support) are reported as distinct states.

## 12. Resources and runtime

Python 3.13 with DuckDB SQL over Parquet; columns limited at ingestion; full eight-quarter input. Wall time and peak memory per stage are recorded in `outputs/runtime/`.

## Amendments

None at the time of writing.

### Amendment 1 (2026-10-07T09:40Z, before any association count was computed)

Clarification of section 4: the FDA FAQ 30 designation (lowest DRUG_SEQ treated as primary suspect when a report has no PS row) applies wherever "primary suspect" is used, so it also applies inside the `suspect` rule (PS, including a designated PS, or SS). The number of exposed units that depend on this designation is reported. Reason: the plan text could be read as applying the rule only to the `ps` configurations; applying it to one rule and not the other would make the PS-to-suspect comparison mix two changes.

### Amendment 2 (2026-10-07T09:42Z, before any association count was computed)

The compatibility review found that the ASC_NTS file shipped from the 2024Q4 extract onward (revised January 2025) documents a new ROLE_COD value, DN (Drug Not Administered), which the 2024Q3 documentation does not list. Handling: DN rows never count as exposure under any rule (they were already outside PS and SS), and the FAQ 30 designation of a primary suspect skips DN rows, choosing the lowest DRUG_SEQ among the remaining rows. The DN frequency by quarter is reported in the release transition table. Reason: a drug documented as not administered cannot be the primary suspect.

### Amendment 3 (2026-10-07T09:46Z, after the first full set of association counts)

Added post hoc descriptive profiles to explain cell changes already observed: for units in cell a under V1, the number of drug and reaction rows per report, the share with a literature reference (LIT_REF, now retained at ingestion), report type, and reporter occupation, split by whether the unit qualifies under the `ps` rule or only through a secondary-suspect listing; and, for the mapping comparison, the event proportion and ingredient mix among exposed units matched by the strict rule versus only by the expanded rule. These profiles are descriptive. They do not add estimates, change any prespecified configuration, event list, or measure, and are reported as post hoc. Reason: the first results showed large role and mapping effects for some associations (for example, the DPP-4 inhibitor and arthralgia estimate changes direction between the suspect and primary-suspect rules), and the prespecified decomposition counts how many units move but not what kind of reports they are.
