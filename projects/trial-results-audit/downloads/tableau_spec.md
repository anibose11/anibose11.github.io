# Tableau import and interaction specification

No Tableau workbook was built or tested for this project. This document specifies how the verified aggregate tables can be imported and which interactions are valid. Every table below is produced by `python -m tra analyze --split heldout` and is included in `results/tables/heldout/` and in the Excel workbook `trial_results_audit_tables.xlsx`.

## General rules

- Each table has a `unit` column. Never combine rows with different units in one measure.
- Percentages in the tables are already computed against the stated denominator. Do not average percentages across rows. To aggregate, sum the count columns and divide by the summed denominator column of the same unit.
- Tier D (not applicable) is not part of any percentage denominator. Show it as a separate count.
- The data describe a finite corpus (the held-out portion of a full registry frame). Do not add confidence bands. The only interval-like output is `exploratory_trial_bootstrap.csv`, which is labeled exploratory and must keep that label.
- There is no suppression: all counts are aggregate counts of registry objects, not people. No cell represents individual participants.

## Tables, grain and permitted interactions

| File | Grain (one row per) | Unit | Measures | Permitted filters and interactions |
|---|---|---|---|---|
| `primary_outcome_group_tiers_long.csv` | tier | outcome group | `n`, `denominator`, `pct` | Bar or stacked bar by tier. No filters. |
| `tiers_by_structure.csv` | outcome structure | outcome group | `n_applicable`, `n_A`, `n_B`, `n_C`, `n_D_not_applicable`, `pct_*` | Filter by structure. Recompute shares only as `n_X / n_applicable` within a row. |
| `tiers_by_condition_group.csv` | condition group | outcome group | as above | Studies belong to more than one condition group, so rows overlap. Never sum across rows. |
| `tiers_by_results_first_posted_year.csv` | results-first-posted year | outcome group | as above | Year filter allowed. 2026 covers January to September only; label it. Sums across years are valid (years do not overlap). |
| `tiers_by_analysis_unit.csv`, `tiers_by_param_type.csv`, `tiers_by_outcome_type.csv`, `tiers_by_row_specific_denominators.csv` | category | outcome group | as above | Category filter allowed; categories do not overlap within one file. |
| `measurement_rules.csv` | rule | measurement | `n`, `pct_of_measurements` | Bar by rule; color by tier letter. |
| `outcome_status_and_population_description.csv` | category | outcome | `n`, `denominator` | Show the two population-description rows with their own denominators. |
| `flat_denominator_comparison.csv` | comparison category | measurement | `n`, `pct_of_measurements` | Bar by category. No filters. |
| `retention_flat_vs_warehouse.csv` | field family | source scalar | `warehouse_exact`, `flat_recoverable`, the status breakdown, `n_scalars_in_scope` | Dot plot of `warehouse_pct` and `flat_pct` per family. Do not sum the two TOTAL rows with family rows. |
| `checks_summary.csv` | check | applicable check | `n_applicable`, `n_pass`, `n_fail`, `n_not_evaluable`, `n_studies_with_a_failure` | Filter by check. Failure share uses pass plus fail as the denominator. |
| `cross_module_label_identity.csv` | category | outcome group | `n`, `pct_of_outcome_groups` | Nested categories; show as a table, not a stacked bar. |
| `sensitivity_analyses.csv` | analysis | outcome group | tier counts and percentages | Side-by-side bars; each row has its own denominator. |
| `issue_ledger_summary.csv` | issue class and rule | ledger row | `n`, `n_studies` | Filter by issue class. |
| `results/exports/denominator_provenance.csv.gz` | outcome group | outcome group | tier, rule list, denominators as JSON text | Detail view only. Filter by NCT ID or tier. Link `registry_url`. Do not compute statistics from the JSON columns in Tableau. |
| `results/exports/evidence_table.csv.gz` | outcome measurement | measurement | `value_text` (text), `participant_denominator`, `unit_denominator` | Detail view only. Values are text; do not aggregate them. Always show `caution`, `denominator_scope` and `analysis_unit` next to a value. |

## Suggested views

1. Tier composition by outcome structure (stacked bars of `n_A`, `n_B`, `n_C` per structure, with `n_applicable` labels).
2. Flat-export denominator comparison (single-color bar chart, with the categories where the attached count is not the applicable one highlighted).
3. Retention by field family (dot plot, two marks per family).
4. Detail drill-through from a tier bar to `denominator_provenance` rows of that tier, opening the registry record from `registry_url`.
