# Analysis plan

Project: diabetes-definition-audit (phenotype specification version 1.0.0)
Plan written: 2026-10-07, completed and frozen at 2026-10-07T09:33Z (UTC), before any phenotype threshold, prevalence, cross-tabulation of biomarker classes, or survey estimate was computed from the data.
Status: internal, timestamped analysis plan. It was not registered with any external registry and is not a formal preregistration. Changes made after the freeze time are listed under "Amendments" at the end, with their dates and reasons.

## Prior exposure

Before writing this plan I had read:

- The NHANES August 2021-August 2023 documentation pages for DEMO_L, GHB_L, GLU_L, FASTQX_L, DIQ_L and RHQ_L. Their codebooks print unweighted frequency counts for every variable (for example, 1,081 "Yes" responses to DIQ010 across all ages, 6,750 positive values of WTPH2YR, 3,361 positive values of WTSAF2YR, and the range 3.2 to 17.1 for LBXGH). No codebook shows counts above or below a diagnostic threshold.
- Published national estimates of diagnosed, undiagnosed, and total diabetes for August 2021-August 2023 from the NCHS data brief, and general literature on HbA1c and fasting glucose discordance.

Before writing this plan I had computed only structural facts from the files: row counts, column names, that LBXGLU is integer-valued in mg/dL, and that LBXGH is reported to one decimal place. No threshold classification, weighted estimate, or cross-tabulation was computed.

## Research question

When analysts estimate diabetes-related prevalence from NHANES August 2021-August 2023, how much of the apparent difference between an HbA1c-based and a fasting plasma glucose-based estimate comes from the definition (the biomarker and its cutpoint), and how much comes from the different laboratory sample and survey weight that each biomarker is usually analyzed with?

## Unit, population, and data

- Unit of analysis: the survey participant (SEQN), one row per participant in the demographics file, with every design-relevant record retained in the survey design object. Domains are formed with survey subsetting, never by deleting records before the design is declared.
- Release: NHANES August 2021-August 2023 public-use files DEMO_L, GHB_L, GLU_L, FASTQX_L, DIQ_L, RHQ_L, read from the files linked on the official NCHS listing pages and recorded with SHA-256 checksums in source_manifest.json.
- Joins: every component is joined to DEMO_L on SEQN. The build stage fails unless SEQN is unique in every file and every component SEQN exists in DEMO_L.

## Adult analysis domain (A)

All of the following:

1. Interviewed and examined in the mobile examination center (RIDSTATR = 2).
2. Age 20 years or older at screening (RIDAGEYR >= 20; age 80 and older is top-coded at 80).
3. Not pregnant, resolved as follows. Excluded: RIDEXPRG = 1 (positive pregnancy test or self-reported pregnancy at the examination). Also excluded: RIDEXPRG = 3 (cannot ascertain) together with RHD143 = 1 ("Are you pregnant now?" answered yes at the interview). Retained and counted separately: RIDEXPRG = 3 without a yes to RHD143 ("pregnancy status not ascertained"). Males and females outside the 20 to 44 year universe of RIDEXPRG are recorded as "pregnancy item not applicable", which is not the same as a negative test.
4. A usable answer to DIQ010 (1 = yes, 2 = no, 3 = borderline). Refused, don't know, and missing answers are excluded from domain A and counted, so that every phenotype in a domain shares exactly the same denominator.

Gestational diabetes: DIQ010 is asked of women 20 and older with the lead-in "Other than during pregnancy", so a diagnosis given only during pregnancy is not coded as diagnosed diabetes. The separate gestational diabetes question (RHQ162) was dropped from the 2021-2023 cycle, so a history of gestational diabetes is unavailable and is not inferred.

## Laboratory domains and weights

| Domain | Definition | Weight |
|---|---|---|
| H, HbA1c laboratory domain | A, WTPH2YR > 0, LBXGH present | WTPH2YR (phlebotomy weight) |
| F, fasting glucose domain | A, WTSAF2YR > 0, LBXGLU present | WTSAF2YR (fasting subsample weight) |
| P, common paired domain | F and LBXGH present | WTSAF2YR |
| P-narrow (sensitivity 1) | P, plus the stricter fasting rule below | WTSAF2YR |

WTSAF2YR is zero for fasting-subsample members who gave no blood (n = 324 all ages per the documentation) and for those who did not fast 8 to less than 24 hours (n = 311); their glucose values are in the file but would need reweighting, which this study does not do. WTPH2YR is zero for examinees who gave no blood. The general examination weight WTMEC2YR is used only to describe who is missing laboratory data within domain A. The interview weight is not used.

Weight rule: any estimate that uses fasting glucose uses WTSAF2YR in domain F or P. HbA1c estimates use WTPH2YR in domain H or WTSAF2YR in domain P. A paired comparison of two phenotypes must use one domain and one weight. These rules are encoded in config/compatibility_rules.yaml and enforced by the configuration checker before any estimation runs.

## Phenotype definitions (specification 1.0.0)

Thresholds follow the American Diabetes Association Standards of Care diagnostic criteria (verified citation recorded in docs/phenotype_spec.md). Boundaries are inclusive.

| Phenotype | Definition | Requires |
|---|---|---|
| DX | Self-reported diagnosed diabetes: DIQ010 = 1. Borderline (3) and no (2) are not diagnosed. | DIQ010 in {1,2,3} |
| A1C65 | LBXGH >= 6.5 % (48 mmol/mol) | LBXGH |
| FPG126 | LBXGLU >= 126 mg/dL (7.0 mmol/L), fasting 8 to < 24 h | LBXGLU in domain F |
| BIO_EITHER | A1C65 or FPG126 | both measures (domain P) |
| TOTAL_A1C_FPG | DX or A1C65 or FPG126 (surveillance composite) | domain P |
| TOTAL_A1C | DX or A1C65 | domain H or P |

Derived contrasts, not separate definitions: undiagnosed biochemical positivity (TOTAL minus DX in the same domain) and diagnosed with both biomarkers below threshold (TOTAL_A1C_FPG minus BIO_EITHER in P). A single survey measurement is not a confirmed clinical diagnosis, and a positive result on either test is not a physician diagnosis. Results are reported as estimates under surveillance definitions.

## Analysis configurations (eight, all reported)

| ID | Phenotype | Domain | Weight | Role |
|---|---|---|---|---|
| K1 | A1C65 | P | WTSAF2YR | primary paired contrast |
| K2 | FPG126 | P | WTSAF2YR | primary paired contrast |
| K3 | A1C65 | H | WTPH2YR | secondary contrast (broader HbA1c domain) |
| K4 | FPG126 | F | WTSAF2YR | sensitivity 2 (single-biomarker glucose domain) |
| K5 | DX | P | WTSAF2YR | composite component |
| K6 | TOTAL_A1C_FPG | P | WTSAF2YR | surveillance composite |
| K7 | TOTAL_A1C | H | WTPH2YR | composite without fasting glucose |
| K8 | BIO_EITHER | P | WTSAF2YR | sensitivity 3 (biochemical only) |

Auxiliary estimate needed only for one declared decomposition: TOTAL_A1C in domain P with WTSAF2YR.

## Contrasts

- Primary: K1 minus K2, estimated jointly in domain P with the paired covariance (svymean of both indicators in one call, then svycontrast). Reported with a design-based t interval and Wald t test with the design degrees of freedom. No independent-samples test is used for paired classifications.
- Secondary: K3 minus K1, labeled a combined selection and weighting comparison, not a causal decomposition. Its variance comes from linearizing both weighted ratios as joint totals on the full design (each record contributes w_H y d_H, w_H d_H, w_P y d_P, w_P d_P; svytotal on a unit-weight design with the same strata and PSUs; delta method via svycontrast).
- Naive cross-domain difference: K3 minus K2, shown only to demonstrate that it equals (K3 minus K1) plus (K1 minus K2) exactly.
- Composite decomposition: K7 minus K6 = (K7 minus TOTAL_A1C in P) plus (TOTAL_A1C in P minus K6).
- Sensitivity contrasts: S1, K1 and K2 and their difference in P-narrow versus P; S2, K4 minus K2 and K3 minus K1; S3, K6 versus K8, and the share of DX in P with both biomarkers below threshold, by self-reported current treatment (DIQ050 insulin or DIQ070 pills).

## Agreement and overlap

In domain P: the weighted 2 x 2 table of A1C65 by FPG126 (cell percentages with intervals and unweighted counts), percent agreement, Cohen's kappa with a delta-method standard error, and the share of BIO_EITHER positives identified by HbA1c only, glucose only, and both. The weighted eight-cell overlap of DX, A1C65, and FPG126.

## Missingness by demographic group

Within domain A, with WTMEC2YR, the weighted and unweighted share in each laboratory status: not assigned to the fasting subsample (absent from GLU_L), assigned but no blood, blood but fasting criterion not met, valid fasting glucose; and no HbA1c (WTPH2YR = 0 or LBXGH missing). Groups: age (20-44, 45-64, 65+), sex, and race and Hispanic origin (RIDRETH3: Mexican American, Other Hispanic, non-Hispanic White, non-Hispanic Black, non-Hispanic Asian, other or multiracial). Race and Hispanic origin is a self-reported social classification and is not interpreted as a biological mechanism. Supplementary: K1, K2, and their paired difference by the same groups.

## Uncertainty, degrees of freedom, and small cells

- Taylor series linearization with strata SDMVSTRA and PSUs SDMVPSU (nest = TRUE), R survey package.
- Proportion intervals: Korn-Graubard (svyciprop, method "beta"). Logit intervals are computed alongside to check behavior near zero.
- Degrees of freedom: number of PSUs minus number of strata among PSUs containing domain members. Both the full-design and domain values are reported.
- Singleton PSUs: the design is checked for strata with one PSU overall and within each domain. If any occur, survey.lonely.psu = "adjust" is used and the event is recorded.
- Suppression follows the NCHS Data Presentation Standards for Proportions: suppress when the effective sample size is below 30, when the absolute Korn-Graubard interval width is 0.30 or more, or when the absolute width is above 0.05 and the relative width is above 130 percent; flag for review when degrees of freedom are below 8; flag estimates of exactly 0 or 1.

## Missing data

Complete measurement within each documented domain. Item nonresponse among examinees with a positive phlebotomy weight but no HbA1c result, and among fasting-domain members without HbA1c, is counted and described by group. The extent will be reported; no additional reweighting is planned unless item nonresponse exceeds 5 percent of a domain, in which case it is reported as a limitation rather than reweighted ad hoc. No value is imputed. Fasting glucose is never imputed from HbA1c.

## Sensitivity analyses (three)

1. Fasting definition. Inclusive: the NCHS fasting subsample rule (8 to less than 24 hours since last food or drink other than water, WTSAF2YR > 0). Narrow: additionally, no coffee or tea with cream or sugar, alcohol, gum or mints or lozenges, antacids or laxatives, or dietary supplements within 8 hours of the blood draw, using the FASTQX items the documentation asks analysts to consider (PHQ020 to PHQ060 with their hour and minute times). Participants with a missing answer to any of these items are excluded from the narrow domain and counted. The narrow domain keeps WTSAF2YR without reweighting and is described as a subdomain. The 311 participants outside the 8 to less than 24 hour window are not added to any domain because there is no official weight for them.
2. Complete paired measurement versus single-biomarker domain: K4 versus K2 for glucose, K3 versus K1 for HbA1c.
3. Known diagnosis kept separate versus the surveillance composite: K5, K8, and K6 side by side, and the share of DX with both biomarkers below threshold.

## Checks

- Join cardinality and row reconciliation against the documentation codebook counts (parsed from the stored documentation pages).
- Internal consistency: WTSAF2YR > 0 only with fasting time 8 to less than 24 hours; WTPH2YR > 0 for every LBXGH value used.
- Direct weighted cross-tabulations in Python versus the R survey estimates for the same domain and weight (point estimates must agree within 1e-9).
- A second implementation of the linearized standard error in Python for the primary estimates and contrast (agreement within 1e-6 relative). This is a software check, not independent scientific validation.
- External reconciliation with published NCHS aggregates where the definition can be matched exactly; differences are reported, not tuned away.
- Deterministic rerun from cached inputs with a declared numerical tolerance of 1e-9.

## Extended replication (secondary, separate)

If the documentation confirms compatible components, the same configurations will be run separately within the NHANES 2017-March 2020 pre-pandemic release using that release's own weights. That release will not be pooled with 2021-2023 or used for a trend claim, and its weights will not be divided or rescaled.

## What would count as a useful negative result

If K3 and K1 are nearly equal, then for this release the larger HbA1c laboratory sample does not shift the HbA1c estimate materially and the naive cross-domain difference is mostly definitional. That is a useful, reportable finding about the size of the denominator component.

## Amendments

All amendments were made on 2026-10-07 after the plan was frozen (09:33Z) and after the first estimation run. No amendment changed a phenotype definition, a threshold, a domain, a 2021-2023 weight, or one of the eight configurations; amendment 2 specified the 2017-March 2020 weights, which the plan left to that release's documentation. The frozen text is preserved unchanged in docs/analysis_plan_frozen_v1.md with its SHA-256 in docs/analysis_plan_frozen_v1.sha256.

1. Contrasts C11 and C12 (HbA1c and glucose each in the narrow fasting domain minus the paired domain) were added to config/analysis_configs.yaml after the first estimation run. They implement the comparison of the narrow and paired domains that sensitivity analysis 1 already describes.
2. The weight rules were rewritten so that each release maps its own weight variables to roles. This was needed to run the planned 2017-March 2020 replication, where no phlebotomy weight exists; HbA1c there uses the examination weight WTMECPRP, following the P_GHB documentation's instruction to use the sample weights in the demographics file.
3. The planned external reconciliation was implemented against NCHS Data Brief 516, Tables 1 and 2 (crude estimates overall, by sex, and by age 20-39, 40-59, and 60 and older). For this comparison only, undiagnosed diabetes was computed as a direct proportion (no reported diagnosis and either biomarker at or above threshold) and the brief's age groups were used. An interval variant without the cap on the effective sample size is computed only to explain one interval that differed from the publication; every reported interval uses the cap required by the NCHS standards. The plan named svyciprop(method = "beta") for Korn-Graubard intervals; every reported interval instead caps the effective sample size at the actual sample size, as the NCHS standards specify. This changes one presentation decision: in sensitivity analysis 3 for 2021-2023, the share of untreated diagnosed adults with both values below threshold (n = 53) is suppressed with the cap (interval width 0.32) and would have been presented without it (width 0.27).
4. Paired differences by group carry a note when one of the two component estimates is suppressed under the NCHS standards.
5. Sensitivity analysis 3 by treatment status reports a "treatment unknown" row (one adult in 2021-2023), which is suppressed by the sample size rule.
6. The 2017-March 2020 replication found that 451 of 8,451 adults in domain A (5.3% as an unweighted count share; 4.2% weighted with WTMECPRP) lacked an HbA1c result under an examination weight that does not adjust for that nonresponse. The plan's 5 percent of a domain rule was applied to the unweighted count share, so this is reported as a limitation and was not reweighted.
7. The prior-work search log (docs/literature_search_log.md) and docs/contribution_decision.md were finalized after the first estimation run, contrary to the planned order of work. The question, estimand, comparator, and configurations had already been fixed in the frozen plan, and no search or screening decision used an estimate.
8. After the planned analyses were complete, three analyses that were not prespecified were added and are reported as exploratory (results/tables/<release>/posthoc.csv; Additional file 1, Table S7): (a) the primary contrast split into its parts among adults without and with a reported diagnosis, each as a share of all adults in P, which sum to C1; (b) agreement (kappa, percent agreement, and the share above only one threshold) among adults in P without a reported diagnosis, the group studied by Carson and colleagues; and (c) the primary contrast with the HbA1c cut point at 6.4% and 6.6%, one reporting unit either side of 6.5%, to show sensitivity to small calibration differences such as the documented HbA1c instrument change. All three use domain P, WTSAF2YR, and the paired estimation of the primary contrast. They do not change any planned result.
