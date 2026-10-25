# Amendment 4: run record (post hoc)

Project: trial-results-audit
Written (UTC): 2026-10-24T16:44Z (writing started; the save time and SHA-256 are in `docs/amendment_ledger.jsonl`, line 9).
Written by: Claude Code running Claude Opus 5.5 (claude-opus-5-5), at the author's request. Animesh Bose has not yet reviewed it.

This file records what was done under `docs/amendment_A4_2026-10-24.md` (SHA-256 e1d9d5d19f3b932b6d6700c3dc804c7f87672f528b1c0f7227fc80cc576c3a07, ledger line 7, saved 2026-10-24T15:53:25Z). It changes nothing in amendment 4, the locked plan, the frozen rules or the freeze record (hashes re-checked at 16:43Z: 82e22a43…, b60cb840…, 6c00cbca…, unchanged). Everything below is post hoc.

## 1. Section 4, arm-differential consequence analysis: run

- **Code.** `src/tra/a4_consequence.py` (new; SHA-256 d929dd3ea31391753013039f3a5a9937c42a38c245c1afad426724605e5a1f6b; saved 2026-10-24T16:37:09Z). Standard library only. It reads the four inputs pinned in amendment 4, section 1, item 5, and stops if any hash differs. None of the 18 frozen files was edited.
- **Run.** Once, 2026-10-24T16:37:18Z to 16:37:19Z, after amendment 4 was hashed. Before computing anything, it reproduced the published post hoc counts (22,505 of 97,756 measurements; 385 studies; 8,450 in the ten largest contributors; NCT02443155 3,009; the same ten studies in the same order).
- **Outputs.** `results/tables/heldout_posthoc_A4/consequence/` (hashes in `SHA256SUMS.txt` there):
  - `consequence_run.json` afc8f0a87504093b1f4e167a5ff2ee45aec23b8899ef7ae9b29fe97142b85001
  - `consequence_summary.csv` ee2dfdfeeeadd8b0414c92c5e065cb3eded538ad060dcaa429b15971b5ddea1b
  - `consequence_flow.csv` cfc27b67ec5bcbc2c544bf0e1389947c3110243970b93805d5f9f7065680ccc8
  - `consequence_cells_count_of_participants.csv` 70f400f3bbd00965bdd4f725fa9d3721ead0fa118d85999a13b46c60dd4e9c4c

### 1.1 Choices the amendment left open

Amendment 4 fixes the design but not every operational detail. These were set when the module was written, before it was run, and are listed in the module and in `consequence_run.json`:
1. A group's outcome-level participant count is the smallest usable count among the outcome-level denominators in participant units, as in `src/tra/posthoc.py`.
2. A comparison cell is one class index and one category index, taken from the measurement's JSON pointer. The number of groups comes from the outcome's group list.
3. A risk ratio "changes by 10% or more" when |RR under the export / RR under the row-level count − 1| ≥ 0.10.
4. An interval's relation to 0 has three states (wholly below, containing, wholly above). An end exactly at 0 counts as containing it.
5. The denominator of the main share is the affected count-of-participants cells in which both counts give a proportion in each arm. Cells with a denominator of 0 in either arm are counted and excluded.

### 1.2 What the run found

Affected cells: 9,706, holding all 22,505 differing measurements. Of these:
- 1,214 cells were in one-group outcomes;
- 3,952 cells (13,307 measurements) were in outcomes with three or more groups;
- 518 cells in two-group outcomes had a value for only one group;
- 26 were in outcomes analyzed in another unit;
- 4 had a value that was not a plain number;
- 8 count-of-participants cells had a denominator of 0;
- 11 mean-type cells had a dispersion that was not a plain number;
- 637 had other parameter or dispersion types.

None was excluded for tier C or D or for a missing outcome-level count. No count exceeded the outcome-level count, so no cell lost its proportion under the export.

**Per value (4.4).** Among the 22,505 measurements, the row-level count divided by the outcome-level count had a median of 0.84 (interquartile range 0.66–0.92). It was below 0.5 for 3,442 (15.3%) and never above 1. A one-count-per-arm export therefore always attached a count at least as large as the row's own.

**Count-of-participants comparisons (4.2), primary.** 1,052 two-arm cells in 62 studies.
- Absolute change in the risk difference: median 0.37 percentage points (interquartile range 0.03–1.45). It exceeded 1 point in 358 cells (34.0%) and 5 points in 98 (9.3%).
- The 95% Newcombe interval changed its relation to 0 in 21 cells (2.0%), in 14 studies:
  - 11 excluded 0 under the row-level counts and included it under the export;
  - 9 went the other way;
  - 1 excluded 0 on opposite sides.
- Whole-study bootstrap (2,000 replicates, seed 20261024): 1.1% to 3.7%.
- Risk ratio (714 cells with both counts above 0): changed by 10% or more in 141 (19.7%). With 0.5 added to the 338 cells with a zero count, 94 more changed by that much.
- The ratio of row-level to outcome-level count differed between the arms by more than 5% in 446 cells (42.4%).

**Primary outcomes.** 149 cells in 12 studies: median change 0.09 points; above 1 point in 58 (38.9%); interval changed in 1 (0.7%).

**Sensitivity.** Without NCT02443155: 21 of 1,034 cells (2.0%). Without the ten largest contributors: 18 of 849 (2.1%). Medians 0.36 and 0.35 points.

**Mean-type comparisons (4.3).**
- Standard deviation given: 2,088 cells in 155 studies. The 95% interval of the mean difference changed its relation to 0 in 81 (3.9%). Under the export, the inverse-variance weight of the difference was a median 1.12 times its weight under the row-level counts (interquartile range 1.05–1.31), and more than 10% off for 1,157 of 2,087 cells (55.4%; one cell had zero standard deviations).
- Standard error given: 196 cells. A standard deviation derived as SE·√n would be a median 1.04 times too large (interquartile range 1.01–1.09).

**Description fixed in 4.6.** 2.0% is below the 5% threshold and 0.37 points is below 1 point, so the consequence is called **small** and reported as a bound on the harm. The other figures above are reported with it, as 4.6 requires.

### 1.3 AI-agent recomputation (4.7)

The module was written by Claude Code (claude-opus-5-5). Separately written R code (base R and jsonlite) came from a separate request to the same model through the Anthropic API, at 2026-10-24T16:39:30Z. That request held only a written specification: amendment 4, section 4, the frozen tier rules and the operational definitions in 1.1. It did not hold the module or its output.

The R code reads the raw registry pages, not the exports, and applies the tier rules itself. Claude Code ran it unchanged. All 120 compared items agreed, including the cell flow, every count and quantile in 4.2, 4.3 and 4.4, and the sensitivity analyses. The bootstrap ranges agreed within 0.1 percentage point; different random number generators were used.

Record: `deep/S2/validation/ai_check_consequence_2026-10-24.json`, with the specification, request, response, code and output in `deep/S2/validation/consequence_2026-10-24/`.

Both programs are AI-written, and both follow the same written definitions. A shared misreading of amendment 4 would therefore not be detected. Animesh Bose has not yet reviewed this check.

## 2. Section 3, live AACT comparison: not run

Amendment 4, section 3, needs the author's AACT account. On 2026-10-24 between 16:39Z and 16:41Z, an AI agent checked whether any route avoids one. All fetches are logged in `deep/downloads.log`, and the pages are saved in `deep/S2/evidence_2026-10-24/aact_access_check/`.
- The home page says an account is needed "to connect to the cloud database with your own credentials, download full snapshots".
- `/snapshots` and `/schema` show the sign-in form.
- `/download`, `/downloads`, `/pipe_files`, `/data_dictionary` and `/documentation` return 404.
- The storage host used for past snapshot files returns AccessDenied.
- A web search found no other public route.

No account was created, and nothing was queried or downloaded. The manuscript describes AACT from its archived source code (Software Heritage, revision 16ec282c of 20 October 2025, read 24 October 2026). The prepared queries remain in `deep/S2/revision_package/AACT queries/`, for the author to run with their own account if they choose.
