# Analysis plan

Written 2026-10-07 before any detail-versus-aggregate sum, gap or retained fraction was computed. This is an internal, timestamped plan kept with the code. It is not a formal preregistration. Changes after this point are recorded at the end as numbered amendments with their reason and date.

## Prior exposure

Before writing this plan I had:

- read the CMS methodology, April 2026 (`MUP_DPR_RY26_20260421_Methodology_508.pdf`);
- read the header rows of every file listed in `config/sources.toml`;
- inspected the structure of the 2024 Geography and Drug file: geography levels (`National`, `State`), the 60 state-level codes and their labels, key uniqueness on (level, code, brand name, generic name), blank counts per column, suppression flag values, and the smallest published `Tot_Clms` (11);
- inspected the first 4.1 million rows of the 2024 Provider and Drug file while it downloaded: state abbreviation and FIPS pairs, `Prscrbr_Type_Src` values, suppression flag values, blank beneficiary counts, the smallest `Tot_Clms` (11), and key uniqueness on (NPI, brand name, generic name);
- printed the national Geography and Drug rows whose generic name contains "metformin", to see how combination labels are written.

I had not summed any detail rows, compared any detail sum with a published total, or looked at any state or drug contrast.

## Question

For a fixed set of cardiometabolic medicines, how much of each published Medicare Part D claim total is represented by summing the public Provider and Drug rows, and do drug and state comparisons built from those sums agree with the same comparisons built from the published totals?

## Data

- Primary: data year 2024 (2026 release). Medicare Part D Prescribers by Provider and Drug (detail) and Medicare Part D Prescribers by Geography and Drug (reference).
- Replications: data years 2023 and 2022, each analyzed on its own with its own label mapping.
- Supplementary, 2024 only: Medicare Part D Prescribers by Provider, used for a documented provider-level reconciliation of all drugs together. It is not used as a denominator for any drug-level fraction.

Exact URLs, catalogue identifiers, sizes and SHA-256 checksums are in `data/manifest/source_manifest.json`.

## Why the Geography and Drug file is a valid reference

CMS states that the summary tables "are not restricted to the redacted data" in the detail file and are aggregated from all Part D prescription drug event records (methodology section 4.2). The analysis also checks this empirically: if the reference were a copy of the detail, every retained fraction would equal 1 and `Tot_Prscrbrs` would equal the number of detail rows. Both are reported.

## Units and keys

- Drug label: the published pair (`Brnd_Name`, `Gnrc_Name`), kept exactly as printed in each year's file. Labels are joined across files on the exact strings after trimming leading and trailing spaces. A label that matches only after case or whitespace normalization is reported as an exception and is not merged in the primary analysis.
- Geography: `National`, or a state-level code. The detail file's `Prscrbr_State_FIPS` and the reference file's `Prscrbr_Geo_Cd` use the same code list (50 states, DC, 66 Guam, 69 Northern Mariana Islands, 72 Puerto Rico, 78 Virgin Islands, 9A to 9C Armed Forces, 9D Unknown, 9E Foreign Country). The join is on that code. Geography here is the prescriber's NPPES address, not where the beneficiary lives.
- Analysis cell: (data year, geography, drug label).

Key uniqueness is asserted for (level, code, brand, generic) in the reference and (NPI, brand, generic) in the detail before any join. Every join is checked for cardinality; a many-to-many join stops the run.

## Drug scope (fixed before outcomes)

Scope is the three ATC level-2/3 groups commonly grouped as cardiometabolic medicines:

- A10 Drugs used in diabetes
- C09 Agents acting on the renin-angiotensin system
- C10 Lipid modifying agents

The ingredient list comes from the NLM RxClass API (ATC source, `classMembers` for A10, C09 and C10), saved with its retrieval date, RxNav version and SHA-256. A published generic label is in scope when at least one of its components maps to an in-scope ingredient. Components are split on "/", lower-cased, and stripped of salt and release-form words; a component matches an ingredient exactly or as an unambiguous prefix of at least five letters, because CMS truncates long generic names (for example "Dapaglifloz Propaned"). Any component containing the word "insulin" maps to A10A, the ATC group for all insulins. Labels that need a manual decision are listed in `config/scope_overrides.csv` with a reason, decided from the label text alone. Device and supply labels (pen needles, test strips) are out of scope because they are not ATC drugs.

A combination product is one label with one claim total. It is never split into two ingredient totals. Grouping for contrasts uses the ATC level-4 group of single-ingredient labels; combination labels form their own group within each class.

All eligible labels in scope are analyzed. No label is added or removed after seeing its retained fraction.

## Primary estimand

For each in-scope cell with a published reference total:

- A = `Tot_Clms` in the Geography and Drug file for that geography and label.
- D = sum of `Tot_Clms` over Provider and Drug rows with that label (and, for a state, that `Prscrbr_State_FIPS`). For `National`, D sums every detail row of the label, whatever its state code.
- Retained fraction R = D / A, and absolute gap G = A minus D, always reported together.

Handling:

- A present and D = 0: R = 0, G = A. Recorded as "no public detail".
- A absent and D = 0: not a cell.
- A absent and D > 0: not evaluable, recorded in the exception ledger as "detail without reference" with source keys. This would indicate a scope or attribution mismatch.
- A = 0 cannot occur under the published rules (the smallest value is 11). If it occurs, R is undefined and the cell is an exception.
- G < 0: kept as observed, never truncated, flagged "negative gap" for investigation of scope mismatch or revision.

Claims, 30-day fills and gross drug cost are additive and may be summed. Unique beneficiary counts (`Tot_Benes`, `GE65_Tot_Benes`) are never summed across providers or drugs and no patient count is derived from claims. Blank cells are never replaced with zero, five, or any other value, and no suppressed individual cell is inferred.

Summaries of R: the claim-weighted overall fraction (sum of D over sum of A) and the unweighted distribution across labels (median, quartiles, minimum, maximum), nationally and across states. R is described against published claim volume A.

## Secondary outputs

1. Group shares. For each state and nationally, the share of class claims in each ATC level-4 group (and the combination group), computed once from published totals and once from detail sums, using the same labels and the same denominator definition in both. Reported as percentage-point differences.
2. Rank shifts. For each group, rank the 50 states and DC by group share using published totals and using detail sums. Report Spearman correlation, the largest absolute rank change, and the number of jurisdictions moving five or more places. Ranks are descriptive sensitivity measures only.
3. Gross drug cost retained fraction, reported beside the claim fraction. Gross cost is not net of rebates, is not out-of-pocket cost, and is not a quality measure.
4. Prescriber coverage: number of detail rows (one per NPI per label) divided by the published `Tot_Prscrbrs` for the same cell.

No result is turned into a statement that any drug should be prescribed more or less.

## Prespecified checks

1. Exact-scope national reconciliation: national A against D summed over all detail rows of each label. Also national A against the sum of published state rows, which measures suppression on the reference side.
2. State comparisons restricted to well-matched geography: the 50 states and DC; a state is well matched when none of its in-scope cells has a negative gap or detail without reference. States that fail are listed with the reason; they are not silently dropped. Territories, Armed Forces codes, Unknown and Foreign are reported separately.
3. Adjacent-year replication: 2023 and 2022 are run separately through the same code with year-specific label mappings. Labels that appear, disappear or change between years are reported. No pooled series is built.

Supplementary, 2024 only: per-NPI claims in the By Provider file against the sum of that NPI's detail rows (all drugs), and the national sum of the By Provider file against the national sum of the Geography and Drug file (all drugs).

## Uncertainty

The files are administrative totals for the stated Medicare Part D population, not a random sample of U.S. prescriptions. The gap between a published total and a detail sum is deterministic, so no sampling confidence intervals are attached. Uncertainty is described as coverage (Part D enrollees only), suppression (detail rows of 10 or fewer claims and reference rows below 11), attribution (prescriber NPI and NPPES state, organizational versus individual NPIs), and definition (label changes across years, over-the-counter and unmatched NDC exclusions that apply to both files).

## Software checks

- A second implementation (Python standard-library CSV streaming, no DuckDB) recomputes the national and state detail sums for all in-scope labels from the raw detail file and re-reads the published totals from the raw reference file. Results must match exactly (integer claims) or within 0.01 for decimal fields.
- Regression tests cover duplicate reference dimension rows, zero totals, missing cells, combination drug names, unknown states, and non-additive beneficiary fields.
- A clean rerun from cached inputs must reproduce every result table within an absolute and relative tolerance of 1e-9.

These are software and source reconciliation checks. They are not independent clinical or expert validation.

## What would count as a useful negative result

All retained fractions near 1 with no rank changes would mean that, for this scope, summed detail is a safe substitute for published totals. That would still be reported, with the measured margin.

## Amendments

None yet.

### Amendment 1 (2026-10-07, before any outcome was computed): suppression bound check

Reason: the literature review and the journal-fit review both raised that a gap between a published total and a detail sum could come from causes other than the 10-claim rule (attribution, scope, label differences). The Geography and Drug file publishes the number of prescribers for each cell, and the detail file has one row per prescriber per label, so the number of prescribers whose rows are missing is m = `Tot_Prscrbrs` minus the number of detail rows. If the 10-claim rule is the only cause, each missing row holds 1 to 10 claims, so m <= G <= 10m (and G = 0 when m = 0). Every evaluable cell is tested against this bound. Cells outside it are written to the exception ledger with the reason "outside suppression bounds". The check uses only cell totals and does not infer any individual row.

### Amendment 2 (2026-10-07, before any outcome was computed): public output rule

Reason: when a cell is missing only one or two prescriber rows, its gap would reveal the value, or nearly the value, of suppressed rows. Public tables (website downloads, workbook, report) therefore withhold the detail sum, gap and retained fraction of any cell with 1 <= m <= 2 or 1 <= G <= 10, and never publish per-cell missing-prescriber counts. Totals, medians and other summaries are computed on all cells before this rule is applied. The full cell-level results stay in the local project and can be regenerated by anyone from the public files.

### Amendment 3 (2026-10-07, before any outcome was computed): Kendall's tau-b

Kendall's tau-b is reported beside Spearman's correlation for state orderings, because reviewers in this area expect it. Both are descriptive.

### Amendment 4 (2026-10-07, before any outcome was computed): reference rows without a geography code

The 2024 and 2023 Geography and Drug files each contain one state-level row with no geography code (an out-of-scope drug). Such rows are kept under the code BLANK and reported with the other non-state geographies. They are never assigned to a state.

### Amendment 5 (2026-10-07, after the primary results were seen): post hoc exploratory analysis

Added after the results showed that completeness rises with claim volume. The published claims per published prescriber (Tot_Clms / Tot_Prscrbrs) of each national label is compared with its retained fraction by Spearman's correlation, at the label and group level. It is labeled exploratory and post hoc wherever it is reported, and no primary or secondary result depends on it.

### Amendment 6 (2026-10-07, after the primary results, before any release): output rule for aggregate rows

While checking the public tables, a state's therapeutic group can contain a single drug label, so a group-level detail sum would repeat a cell-level value that amendment 2 withholds. The public output rule is therefore applied to every row of the aggregate tables as well (group shares, state summaries, other geographies, national group and volume-band tables), using that row's own count of missing prescriber rows and its own residual. No analysis result changes; only what is printed in public tables.

### Amendment 7 (2026-10-07, after the primary results, found in review): device label excluded

Review found that one reusable insulin pen, "Novopen Echo" (generic name "Insulin Admin. Supplies"), had been mapped to insulins. The plan places device and supply labels out of scope, so the device words "admin", "supplies" and "supply" were added to the insulin rule's device list and all three years were rerun. This corrects a mapping error; it does not change the scope definition.

### Amendment 8 (2026-10-07, after the primary results, found in review): public output rule revised

Review showed that the rule in amendments 2 and 6 could be defeated by subtraction between published tables, and that a gap equal to the smallest or largest value the 10-claim rule allows fixes the value of every unpublished row. The public rule is therefore revised. Label-by-state cells are published with their status, the published total and a banded retained fraction only (no exact detail sum or gap). The band is withheld when the residual involves 1 or 2 unpublished rows, 1 to 10 claims, or a gap equal to the number of unpublished rows or ten times that number. Aggregate tables keep exact values under the same row-level rule, and when a parent total would let a single withheld row be recovered by subtraction, a second row is withheld as well (complementary suppression). Cells with no public detail are not withheld, because their residual equals the published total. No analysis result changes.

### Amendment 9 (2026-10-07, after the primary results, found in review): two implementation details recorded

Two details were in the code before any outcome was computed but were not described in this plan: a generic-name component may match an ingredient by its first word (in 2024, 10 component matches were made this way), and the overlap of the two top-10 state lists is reported as a descriptive agreement measure. Neither changes a result; they are recorded here so that the plan describes the code that ran.

### Amendment 10 (2026-10-07, after the primary results, found in the final review): public output rule revised again

The final review showed that, with exact published sums and the 10-claim floor (every published detail row holds at least 11 claims), withheld values could still be narrowed, and that choosing the smallest neighbor as a complement made this easier. The public rule is therefore: detail sums in every public table are rounded to the nearest 10 claims, with fractions and gaps recomputed from the rounded sums; label-by-state cells are published only as bands; rows whose own residual is sensitive are withheld; and an interval audit of every published sum, band and floor, run both on the full data and on the public files alone, must show that no withheld value can be pinned to a single claim count. If it could be, a further value would be withheld; none was needed. The national total of all in-scope detail claims is published exactly. No analysis result changes.
