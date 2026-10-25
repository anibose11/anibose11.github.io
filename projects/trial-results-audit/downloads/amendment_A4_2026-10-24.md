# Amendment 4 (post hoc): corrections to the record, a live AACT comparison and an arm-differential consequence analysis

Project: Clinical trial results warehouse and denominator audit (trial-results-audit)
Author: Animesh Bose
Created (UTC): 2026-10-24T15:52Z (writing started; the save time and SHA-256 are in `docs/amendment_ledger.jsonl`, because a file cannot carry its own hash).
Drafted by: Claude Code running Claude Opus 5.5 (claude-opus-5-5), at the author's request. Animesh Bose has not yet reviewed this text.

This is a new, separate file. The locked analysis plan (`docs/analysis_plan.md`, SHA-256 82e22a43512366dc6cff9ea090341445ab905402056e9f6df2844a3ef52170c9), the frozen rules (`docs/rules.md`, b60cb84059ebbfc47500d88aacda9e9b3ac98a934341a189ef67dcd740d9a07b) and the freeze record (`evidence/parser_freeze.json`, 6c00cbca998a407edca61e65f79699328561f5860a85fa4dad49edd38bcf3a09) are unchanged; those hashes were taken when this file was written. If anything here needs to change before an analysis is run, the change goes into a new file (`amendment_A4.1_<date>.md`) with its own ledger line. This file is never edited.

**Everything in this amendment is post hoc.** It was written after every prespecified and post hoc result of the held-out run was known, and after AI agents had looked at rough consequence figures (section 1). Nothing in sections 3 and 4 has been run.

**Earlier draft.** An earlier, interrupted attempt of the same deep pass wrote `amendment_A4_2026-10-20.md` (ledger line 2; SHA-256 21ccf6acce51caf50f4e74494c61e9d29a1244867785b14f2f0b147b703d54ea). It was never reviewed or run. It is kept unchanged in `docs/_superseded/interrupted_2026-10-20/`, and this file replaces it. The design below was rewritten from the inputs, not copied.

## 1. What existed when this amendment was written

1. **The held-out run of 7 October 2026.** Run `heldout-run-20261007T110334Z`, made with the code frozen at 2026-10-07T10:53:24Z (combined SHA-256 5bd267b67dc1f28e51dd67fa58a9c28467695e07ea0d68e9777f18b2eb789f21). Every prespecified table was known, and so were the post hoc tables in `results/tables/heldout_posthoc/` (written 2026-10-07T21:19:17Z). Among them:
   - 22,505 of 97,756 measurements whose row reports its own number analyzed, different from the outcome-level count that a one-count-per-arm export attaches;
   - these measurements come from 385 of 1,911 studies with posted values and 2,084 of 18,110 outcomes with values, and make up 2,260 of 20,271 measurements of primary outcomes;
   - the ten studies contributing most hold 8,450 of them, and NCT02443155 alone holds 3,009;
   - 4,795 of the 5,578 outcome groups that use row-level counts have at least one row whose count differs from the outcome-level count.
2. **Exploratory looks by AI agents on 20 October 2026.** During planning, AI research agents (Claude Code) ran short scripts on the exported tables and raw pages between about 13:33Z and 13:50Z. The scripts are kept, with hashes, in the deep-pass records (`deep/S2/evidence_2026-10-24/20oct_planning_scripts/`); they are not project code. Their printed output was not saved as files.
   - `magnitude.py` looked at the ratio of row-level to outcome-level counts among the differing measurements, the shift in a per-arm percentage for count-of-participants values, and the standard-error factor for mean-type values.
   - `magnitude2.py` counted primary outcomes affected and paired count-of-participants cells across two groups in a crude way. The planning notes kept two figures from it: 308 paired rows whose risk ratio moved by 10% or more, and 148 whose point estimate moved to the other side of 1. The same notes judged both unreliable, because the pairing did not restrict outcomes to two groups or check value types. They are not results of this study and are not reported anywhere.
   - `units.py` counted how often `typeUnitsAnalyzed` and `denomUnitsSelected` appear; `ae_started.py` compared adverse event participants at risk with participants who started, matched by group title. Neither is part of this amendment.
   So the consequence analysis in section 4 was designed after rough magnitudes had been seen by AI agents. It was not designed by browsing results cell by cell, and its thresholds (section 4.6) are set here before the analysis code exists.
3. **A recount on 24 October 2026.** An AI agent (Claude Opus 5.5) recounted the post hoc figures in item 1 from the raw registry pages with code written for the purpose (`deep/S2/validation/`). It computed no consequence figure.
4. **The archived AACT source code.** AI agents read it on 7 October (`.local/research/warehouses_and_critic.txt`) and again on 20 and 24 October from Software Heritage (revision 16ec282cdf2225939be7bf8060ef8bd1b4797c3e of 20 October 2025). In `app/models/outcome.rb` (SHA-256 91752696386491d8168aac299185c2f26d771cb5c778f4be8cdd0b147fd14c85):
   - line 20 maps `units_analyzed` from `typeUnitsAnalyzed`;
   - lines 63–75 load the outcome-level `denoms` into `outcome_counts`, each with its units and the scope fixed to `'Measure'`;
   - the measurement mapping (lines 35–62) reads values, class and category titles but no denominator, and two commented-out lines (59–60) that would have copied the outcome-level count to each measurement carry the note "TODO: how do we navigate to that value in the JSON??";
   - nothing in the outcome loader reads the counts that rows report (`classes[].denoms`).
   `db/ctgov_v2.sql` types `outcome_counts.count` as an integer. For baseline measures, `app/models/baseline_measurement.rb` (lines 56–83) does take the number analyzed from the row, then the measure, then the overall count. The live AACT database has never been queried in this project.
5. **Inputs pinned for sections 3 and 4** (SHA-256 on 2026-10-24):
   - `results/exports/evidence_table.csv.gz`: f5df29d2488c14d90f24f66f6f608a2a6ad61bdc7fd7395ecb36fa4273a47753
   - `results/exports/denominator_provenance.csv.gz`: 7d868a300e3f60074c81fc775b5a2ced16b49f5ce75c22ab4a535e0d0c7865df
   - `data/frozen/ctgov-20261007T093305Z/manifest.csv`: 7e73e9c1b6da259035aec6f58deea3a44cb0f39f235dde278be3bdf7a2f3196c
   - `source_manifest.json` (hashes of every raw page): 9c7ac70909f913d178c1d60bdddb568d6c7c8188426fc38c9965bf0cf549231c

## 2. Corrections to how the record describes the work

These corrections change no rule, code, timestamp or result. They exist because several locked texts use words that the records do not support: amendment 3 ("after an independent code review", "separate reviewers", "each reported defect was independently re-checked"), note 1 added after the held-out run, the plan heading "Independent reference for transformation fidelity", and the opening of `docs/rules.md` ("an independent code review", "the independent R reference").

1. **The pre-freeze code review was done by AI agents.** It was a Claude Code workflow (`pre-freeze-review`, script saved 2026-10-07T10:06Z) with six reviewer agents, each covering one part of the code (SQL tiers, the R reference, loading fidelity, flat-export fairness, the checks, the analysis tables), and one verifier agent per reported defect that tried to refute it on development data. The findings file saved while the review ran (`.local/review_findings_partial.txt`, 10:18:04Z) lists 35 findings: 16 reproduced, 2 refuted and 17 not yet re-checked when the file was saved. No later findings file exists, so the record does not show that every reported defect was re-checked before it was accepted. Exact model versions were not recorded. No other person reviewed the code.
2. **The R reference is not independent of the warehouse code.** `R/reference_enumerator.R` is a second implementation of `docs/rules.md` in another language. It was written with the same AI coding assistants, in the same project and on the same day, as the Python and SQL code. Where the locked texts say "independent", read "a separate code path". The review found one omission the two implementations shared (finding sql-tiers#2: an outcome analyzed in another unit with no count in that unit), which was corrected before the freeze as amendment 3, item 1. The same kind of shared misreading could remain elsewhere undetected.
3. **Amendment 2 was finished a minute after its label.** It is labelled 10:16Z, but its K12 figure (685 of 685 combinations) first appears in `development-run-20261007T101655Z`, whose checks table was written at 10:17:01Z. The text was completed at or after 10:17:01Z, still before the freeze (10:53:24Z) and before any held-out study was loaded.
4. **How the plan is dated.** "Plan version 1 written: 2026-10-07T09:30Z" is a time written inside the plan. The plan file was not hashed before the held-out run; the notes and post hoc additions were written into it after that run, and the file last changed at 2026-10-07T21:40:46Z. The cohort settings the plan fixes are hash-backed: `config/cohort.yaml` was saved at 09:30:20Z and is part of the freeze, and retrieval began at 09:33:06Z (`source_manifest.json`).
5. **The checks reported by the author.** Checks A1 to A5 rest on one summary confirmation recorded on 7 October 2026 (`review/author_review.json`); the item-level worksheets (`review/sample_outcome_groups.csv`, `review/flagged_items.csv`) were not filled in. The logged clean-extraction run (`evidence/clean_extract_check.json`, 21:41:31Z) covers archive 76e23edc…, not the later archive submitted as Additional file 3 (5ce020a4…).

## 3. Live AACT comparison (needs the author's free AACT account)

**Question.** What does AACT, the database most analysts would use instead of the declared flat export, attach to each held-out measurement? This is the question Figure 2 answers for the flat export.

**Who runs what.** AACT now requires a free account both for its cloud database and for snapshot downloads (aact.ctti-clinicaltrials.org, read 2026-10-24). Animesh Bose creates the account and runs the prepared queries with their own credentials, saving the results as CSV files. AI agents do not sign in, see the password or query AACT. Everything after the export runs offline on the saved files.

### 3.1 Schema check (about one hour; run first)

1. Record the UTC date and time, the result of `select version();` and `select now();`, and the host and database names shown on the AACT account page.
2. List the columns of `outcomes`, `outcome_counts`, `outcome_measurements` and `result_groups` from `information_schema.columns` (schema `ctgov`; also `ctgov_v2` if it exists).
3. List every column in those schemas whose name contains `denom`, `count`, `analyzed` or `number`.
4. Run `select scope, units, count(*) from ctgov.outcome_counts group by 1, 2 order by 3 desc;`.
5. For NCT02443155, list the `outcomes`, `outcome_counts` and `outcome_measurements` rows of the outcome titled "Occurrence of Anti-NNC0114-0006 Antibodies".

**Decision rule, fixed now.** AACT "carries row-level numbers analyzed" if any of these holds:
- step 4 shows a scope other than `Measure`;
- step 3 or step 5 shows a column at measurement, class or category level holding a row's own number analyzed (for NCT02443155, values such as 9 and 14 for the week 0 cross-reactivity rows, where the outcome-level count is 77).

If AACT carries them, the manuscript's sentence on AACT is rewritten before anything else, and section 3.2 classifies with those counts.

### 3.2 Full comparison on the 1,961 held-out studies

1. **Export.** In one session on one day, export for the held-out NCT IDs (`split = heldout`, `cohort_status = confirmed` in the frozen manifest; 1,961 studies) the rows of `studies` (`nct_id`, `last_update_posted_date`, `results_first_posted_date`), `outcomes`, `result_groups` (result type `Outcome`), `outcome_measurements` and `outcome_counts`. Save each CSV with its SHA-256 and the export time.
2. **Same-date option.** If AACT offers a snapshot dated 2026-10-06 or 2026-10-07 and the author agrees to download it (a large file), restore it locally and repeat step 1 against it. That comparison removes record changes since our snapshot and becomes the primary one; the live export is then reported as a sensitivity analysis.
3. **Changed records.** Otherwise a study counts as changed when AACT's last update posted date differs from `last_update_post_date` in the frozen manifest. The primary comparison uses unchanged studies; changed studies are counted and reported separately and not classified.
4. **Matching outcomes.** Match an AACT outcome to a snapshot outcome by NCT ID, outcome type, title and time frame, comparing exact text after collapsing runs of whitespace. When that is not unique, match by order within the study. Report unmatched outcomes.
5. **Matching measurements.** Match by outcome, `ctgov_group_code`, `classification` (row title) and `category`, against `class_title`, `category_title` and `group_id` in `evidence_table.csv.gz`. Report unmatched and ambiguous measurements.
6. **The count an AACT user would attach.** The `outcome_counts` row for the outcome and group whose units are Participants (case-insensitive, trimmed). Record separately whether AACT also holds a count in the outcome's `units_analyzed`.
7. **Categories.** Classify every matched measurement against the frozen reference denominator, using the Figure 2 categories: the applicable count; the outcome-level count where the row reports a different number analyzed; the outcome-level count where the row's own count happens to be equal; a participant count on values reported per another unit, with or without the unit count present in AACT; no safe count; not located.
8. **Primary AACT figure.** Among measurements in unchanged studies whose row reports a different number analyzed, the share for which AACT holds that row-level number anywhere. If the archived code still describes the deployed loader, the expected value is 0.
9. **Tools table.** One table for AACT, ctrdata, EXACT, Shi and Du's knowledge graph, CTG-DB and this warehouse, saying for each whether it keeps outcome-level counts, row-level counts and unit counts. Every cell says how it is known (a run, reading code, or documentation) and when.
10. **Code and outputs.** A new module, `src/tra/a4_aact.py`; the frozen modules are not edited. Exports go to `data/aact_<YYYYMMDD>/` with their hashes; tables go to `results/tables/heldout_posthoc_A4/aact/`.

## 4. Arm-differential consequence analysis (no account needed; runs offline)

**Question.** When an automated pipeline replaces a row's own number analyzed with the outcome-level count, how much does a two-arm comparison change? A per-value rescaling is a fixed function of the ratio of the two counts, so the analysis concentrates on comparisons between arms, where the effect depends on whether the ratio differs between the arms.

**Who is affected, stated in advance.** A person reading the registry's web table sees the row's count. The harm falls on automated pipelines that keep one count per arm and outcome.

### 4.1 Unit and eligibility

- **Comparison cell:** one study, one outcome, one row (class) and one category, in an outcome with exactly two outcome groups. The group with the lower `group_id` is arm 1.
- **Affected cell:** at least one of its two measurements is B1 and its row-level count differs from that group's outcome-level participant count.
- **Excluded, each reported with its count:** outcomes with three or more groups; tier C or D measurements; outcomes analyzed in another unit; values that are not plain numbers; a missing outcome-level participant count for either group.

### 4.2 Count-of-participants outcomes (primary)

1. Eligible: parameter type COUNT_OF_PARTICIPANTS and both values integers x with 0 ≤ x ≤ row-level n.
2. Cells where x exceeds the outcome-level n in either arm cannot form a proportion under the export. They are counted and reported as a consequence of their own, and excluded from the interval calculations.
3. Under each denominator (row-level n, the reference; outcome-level n, the export), compute the risk in each arm, the risk difference (arm 2 minus arm 1) with a 95% Newcombe hybrid score interval (Wilson intervals per arm, no continuity correction), and the risk ratio with a 95% log interval when both counts are above 0.
4. Metrics: the absolute change in the risk difference in percentage points (median, interquartile range, and the shares above 1 and above 5 points); the share of affected cells whose risk-difference interval changes its relation to 0 (excludes 0 under one denominator and not the other), in each direction; the share whose risk ratio changes by 10% or more; and the share whose ratio of row-level to outcome-level n differs between the two arms by more than 5%.
5. Zero counts: the risk-difference interval needs no correction. For the risk ratio, cells with a zero count are left out of the primary figures; a sensitivity analysis adds 0.5 to all four cells of each such comparison.

### 4.3 Mean-type outcomes (secondary)

1. Eligible: parameter type MEAN or LEAST_SQUARES_MEAN, dispersion "Standard Deviation" or "Standard Error", all values plain numbers.
2. Dispersion given as a standard deviation: take SE = SD/√n under each n; report the mean difference with a normal 95% interval, the share whose interval changes its relation to 0, and the ratio of inverse-variance weights.
3. Dispersion given as a standard error: the interval does not depend on n. Report, in one line, how the standard deviation derived as SE·√n changes, since that value feeds standardized mean differences.

### 4.4 Per-value summary (one line)

The distribution of row-level n divided by outcome-level n among the 22,505 measurements: median, interquartile range, and the shares below 0.5 and above 1.

### 4.5 Study level, subsets and sensitivity

- Studies with at least one affected count-of-participants cell whose interval changes its relation to 0.
- Primary outcomes reported separately.
- An exploratory whole-trial bootstrap (2,000 replicates, seed 20261024) gives a percentile range for the main share in 4.2; it is not a confidence interval for any population.
- Repeat without NCT02443155, and without the ten studies contributing most.

### 4.6 How the result will be described (fixed now)

The consequence is called **material** if either of these holds; otherwise it is called **small** and reported as a bound on the harm:
- at least 5% of affected count-of-participants cells change the relation of their risk-difference interval to 0;
- the median absolute change in the risk difference is at least 1 percentage point.

Both outcomes are reported, whichever occurs.

### 4.7 Code, outputs and checking

- A new module, `src/tra/a4_consequence.py`, reading only the pinned inputs. Tables go to `results/tables/heldout_posthoc_A4/consequence/`, and every table and sentence that uses them is labelled "post hoc (amendment 4)".
- A separate AI agent recomputes the headline numbers of 4.2 and 4.3 with separately written code and a different route (from the raw registry pages, or in R or SQL instead of the Python module). The result goes to `deep/S2/validation/ai_check_consequence_<UTC date>.json` with the model, date, inputs, outputs and agreement, and is described as an AI-agent recomputation. Animesh Bose reviews any disagreement.

## 5. What this amendment does not do

It changes no rule, code, timestamp or prespecified result, and it re-runs nothing. It adds new modules and new output folders only. Other ideas raised during planning, such as a second person re-checking a sample of outcome groups, a rerun on the whole registry or a run of CTG-DB's own pipeline, are not part of it; each would need its own amendment.
