# Phenotype specification, version 1.0.0

Machine-readable form: `config/phenotypes.yaml` (definitions and thresholds), `config/compatibility_rules.yaml` (domains and weights), `sql/03_phenotypes.sql` (implementation). The build stage records the rendered SQL for each run under `results/provenance/<release>/`.

## Threshold source

American Diabetes Association Professional Practice Committee for Diabetes. 2. Diagnosis and classification of diabetes: Standards of Care in Diabetes—2026. Diabetes Care. 2026;49(Suppl 1):S27–S49. doi:10.2337/dc26-S002 (title punctuation kept as published). Table 2.1 lists A1C at or above 6.5% (48 mmol/mol) and fasting plasma glucose at or above 126 mg/dL (7.0 mmol/L), with fasting defined as no caloric intake for at least 8 hours, and requires confirmation in the absence of unequivocal hyperglycemia. A single survey measurement therefore gives threshold positivity under a surveillance definition, not a clinical diagnosis.

## Measures

| Measure | Source variable | Unit and precision | Rule | Boundary |
|---|---|---|---|---|
| HbA1c | GHB_L LBXGH (P_GHB in 2017-2020) | percent, one decimal | at or above 6.5 | inclusive |
| Fasting plasma glucose | GLU_L LBXGLU (P_GLU) | mg/dL, whole numbers | at or above 126, only when the fasting subsample weight is positive (8 to less than 24 hour fast and blood given) | inclusive |
| Diagnosed diabetes | DIQ_L DIQ010 (P_DIQ) | code | 1 = yes; 2 = no and 3 = borderline are not diagnosed; 7, 9, missing are unknown | not applicable |
| Current treatment (sensitivity 3 only) | DIQ050 insulin, DIQ070 pills | code | 1 on either = treated; 2 on both = not treated; otherwise unknown | not applicable |

Values are read from the SAS transport files and rounded to their published precision; the build fails if rounding changes any value by more than 1e-6. No calibration is applied: the GHB_L documentation reports that its bridging study between the Tosoh G8 and Bio-Rad D-100 instruments did not require adjustment, and NCHS publishes no adjustment for fasting glucose from 2015-2016 onward.

## Phenotypes

| Code | Label | Definition | Requires |
|---|---|---|---|
| DX | Self-reported diagnosed diabetes | DIQ010 = 1 | DIQ010 in 1, 2, 3 |
| A1C65 | HbA1c at or above 6.5% | LBXGH >= 6.5 | HbA1c result with positive HbA1c laboratory weight |
| FPG126 | Fasting glucose at or above 126 mg/dL | LBXGLU >= 126 | glucose result with positive fasting weight |
| BIO_EITHER | Either biomarker at or above threshold | A1C65 = 1 or FPG126 = 1 | both measures |
| TOTAL_A1C_FPG | Surveillance composite | DX = 1 or A1C65 = 1 or FPG126 = 1 | all three |
| TOTAL_A1C | Composite without glucose | DX = 1 or A1C65 = 1 | DX and HbA1c |

A phenotype is undefined (missing), not negative, for anyone who lacks a required measure. Domains guarantee every required measure, so no phenotype is missing inside its domain; the build checks this.

## Status variables

Each participant carries explicit status codes so that different kinds of absence are not collapsed to zero:

- `a1c_status`: measured; weight_but_no_result; result_but_zero_weight; no_blood_zero_weight; absent_from_file.
- `fast_status`: valid; weight_but_no_result; fasting_criterion_not_met (glucose present, zero weight); subsample_no_blood; not_in_fasting_subsample (absent from GLU file).
- `preg_status`: pregnant_at_exam; pregnant_reported_at_interview (RIDEXPRG = 3 and RHD143 = 1); not_ascertained; not_pregnant_at_exam; item_not_applicable (outside the 20 to 44 universe or male).
- `dx_status`: yes; no; borderline; refused; dont_know; missing; absent_from_file.
- `narrow_status`: meets_narrow_rule; intake_within_window; unknown.

## Domains

| Domain | Definition | Weight 2021-2023 | Weight 2017-2020 |
|---|---|---|---|
| A | examined, age 20+, not pregnant (as above), DIQ010 in 1, 2, 3 | WTMEC2YR (description only) | WTMECPRP |
| H | A with a positive HbA1c laboratory weight and an HbA1c result | WTPH2YR | WTMECPRP |
| F | A with a positive fasting weight and a glucose result | WTSAF2YR | WTSAFPRP |
| P | F with an HbA1c result | WTSAF2YR | WTSAFPRP |
| P_NARROW | P with no listed intake within 8 hours of the draw | WTSAF2YR | WTSAFPRP |

## Change log

- 1.0.0 (2026-10-07): first version, frozen with the analysis plan.
- 2026-10-07, after the plan freeze: added the 2017-March 2020 source files and release-specific weights for the planned replication (analysis plan amendment 2); no definition, threshold, or domain rule changed.
