# Tableau import and interaction specification

No Tableau workbook is supplied, and none was built or tested. This file specifies how to use the precomputed CSV files in `outputs/tableau/` (also in the site downloads, with a `tableau_` prefix on each file name) so that a dashboard never recomputes survey statistics.

## Files

| File | Grain (one row per) | Key fields | Measures |
|---|---|---|---|
| `estimates_long.csv` | data year x table x population group x measure x statistic | `data_year`, `table`, `population_group`, `measure`, `statistic` | `estimate`, `se`, `ci_low`, `ci_high`, `kg_low`, `kg_high`, `n_unweighted`, `numerator_unweighted`, `weighted_denominator`, `design_df` |
| `monthly_transitions.csv` | data year x from_state x to_state (primary domain) | `data_year`, `from_state`, `to_state` | `share`, `se`, `unweighted_transitions`, `unweighted_persons_with_from_state`, `weighted_transitions` |
| `cohort_flow.csv` | data year x cumulative step | `data_year`, `step` | `n_unweighted`, `weighted_population` |

## Units

- `statistic = proportion`: 0 to 1. Format as a percentage with one decimal.
- Spending measures: US dollars, nominal for the data year. No deflator is applied, so 2023 and 2024 dollars are not directly comparable.
- Fills: fills and refills per person per year.
- Confidence intervals: `ci_low` and `ci_high` are 95% intervals (logit for proportions, t with design degrees of freedom for means, Woodruff for quantiles). `kg_low` and `kg_high` are Korn-Graubard intervals used for the NCHS reliability flags.

## Required display rules

1. Hide rows where `suppress` is TRUE, or show them grayed with the label "does not meet NCHS presentation standard".
2. Mark rows where `imprecise_flag` is TRUE (relative standard error above 30% or fewer than 30 people) and rows where `review_flag` is TRUE (fewer than 8 design degrees of freedom, or the complementary proportion would not meet the NCHS standard).
3. Always show the confidence interval with the estimate, and show `n_unweighted` in the tooltip.
4. Show the denominator: primary-domain groups (prefix C) share one denominator; frame Y groups (prefix Y) use a classification-specific denominator; groups with prefix R2 use the alternative gap definition.

## Permitted interactions

- Row filters on `data_year`, `table`, `population_group`, `measure`, and `statistic` (the same list appears in the `permitted_filters` column).
- Switching between years shows separate estimates. It is not a trend and has no significance test.

## Not permitted

- SUM, AVG, or any other aggregation of `estimate` across rows.
- Computing new percentages or differences from these rows (design-based differences are already in the results workbook, sheet `Rx_contrasts_2024`).
- Re-weighting, pooling years, or treating `weighted_denominator` as a count to divide by.
