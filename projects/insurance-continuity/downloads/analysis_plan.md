# Analysis plan

Insurance continuity and prescription spending among adults with diabetes, MEPS 2024

- Plan written: 2026-10-07T09:30:25Z (05:30 EDT)
- Status: internal, timestamped analysis plan. This is not a formal preregistration. Later changes are recorded in the amendments section at the end with their own timestamps.
- Data release: MEPS HC-256, 2024 Full Year Consolidated Data File (AHRQ, released August 2026). Prior-year replication: MEPS HC-251, 2023 Full Year Consolidated Data File (released August 2025). Supporting file: MEPS HC-254A, 2024 Prescribed Medicines File (released July 2026).

## Prior exposure

Before this plan was written, the HC-256 codebook and documentation PDFs were read, including the published one-way weighted and unweighted frequencies that AHRQ prints for each variable over the full file (for example `INS24X`, `INSJA24X`, `DIABDX_M18`, `RXTOT24`, `RXSLF24`). The HC-254A codebook was read for imputation flags. No data file had been loaded into analysis software, and no cross-tabulation, domain estimate, or association involving coverage continuity, diabetes, and prescription outcomes had been computed.

## Unit of analysis and population

The unit is the person-year. Inference is to the 2024 US civilian noninstitutionalized population represented by MEPS. Persons outside that population (institutionalized, active-duty military, abroad) are only represented for the months they were in scope, and they are never counted as uninsured for out-of-scope months.

## Primary question and estimand

Among adults aged 18 to 64 on 12/31/2024 with self-reported ever-diagnosed diabetes, who were in scope and alive for all 12 months of 2024 and insured on 12/31/2024, what weighted proportion had at least one calendar month in 2024 with no hospital/physician coverage from any source?

- Numerator: persons in the primary domain with `INS24X = 1` and at least one month with `INSmm24X = 2`.
- Denominator: persons in the primary domain with `INS24X = 1`.
- If any person in that denominator has indeterminate continuity (defined below), the primary estimate is reported both as a complete-information proportion and as lower and upper bounds that assign all indeterminate persons to no gap or to a gap. The plan expects this class to be empty in the primary domain because AHRQ edits the monthly indicators, but this is checked rather than assumed.
- Estimate: weighted proportion with a design-based 95% confidence interval (Taylor linearization, logit-transformed interval via `svyciprop(method = "logit")`), plus the unweighted denominator and numerator.

## Secondary questions

How do annual prescription use and out-of-pocket (OOP) spending summaries differ when coverage is represented by year-end status (`INS24X`) versus the monthly continuity classification?

Outcomes (all prescribed medicines and any other items recorded in the MEPS prescribed medicines component, not only glucose-lowering drugs):

1. Any recorded prescription fill in 2024: `RXTOT24 > 0`.
2. Number of fills including refills: `RXTOT24`.
3. Annual OOP prescription spending, self or family: `RXSLF24`, nominal 2024 US dollars, mean including zeros.
4. Mean OOP among persons with at least one fill.
5. Median and 90th percentile OOP among persons with at least one fill (survey quantiles with Woodruff-type intervals from `svyquantile`).
6. Share of users with zero OOP spending.
7. Context: mean total prescription expenditure from all payers (`RXEXP24`) and the OOP share.

Three states are kept distinct: no recorded fill (`RXTOT24 = 0`), recorded fills with zero OOP (`RXTOT24 > 0` and `RXSLF24 = 0`), and missing expenditure (any negative reserved code or null, expected to be absent because AHRQ imputes expenditures). Imputation information is retained from HC-254A at the fill level (`IMPFLAG`: 2 complete pharmacy component data, 4 fully imputed, 5 partially imputed) and summarized per person.

## Eligibility, frames, and domains

All persons on HC-256 (expected 19,140) stay in the survey design object. Domains are applied with `subset()` on the design so variance estimation uses the full set of strata and PSUs.

Common conditions for analytic frames: positive person weight (`PERWT24F > 0`), age 18 to 64 on 12/31/2024 (`AGE24X`), and diabetes `DIABDX_M18 = 1`. `DIABDX_M18` records whether the person was ever told they had diabetes, excluding gestational diabetes. Codes -7 (refused), -8 (don't know), and -1 (inapplicable) are not treated as "no"; persons with those codes are counted in the cohort flow and excluded from the diabetes cohort.

Year-end frame (Y): common conditions plus in scope on 12/31/2024 (`INSC1231 = 1`) and a substantive year-end coverage value (`INS24X` in {1, 2}).

Primary domain (C): frame Y plus in scope for all 12 months of 2024. A month is in scope when the monthly any-coverage indicator `INSmm24X` holds a substantive value (1 or 2); AHRQ codes months outside the person's in-scope period as -1. The rule also requires the 2024 reference period to end in December (`ENDRFM24 = 12`). Agreement between this rule and the round-level scope variables (`INSCOP31`, `INSCOP42`, `INSCOP24`) is reported in an audit table rather than used as a filter.

Persons in frame Y but outside domain C (part-year in scope) are described in a supplementary table with their own classification, where months outside scope are labeled "not in scope".

## Coverage construction

One person-month table is built with 12 rows per person, carrying for each month: any coverage (`INSmm24X`), any private (`PRImm24`), any public (`PUBmm24X`), and the component public sources Medicare (`MCRmm24X`), Medicaid/CHIP (`MCDmm24X`), TRICARE/CHAMPVA (`TRImm24X`), VA (`VAPmm24`), other public hospital/physician coverage (`GVAmm24`), and Indian Health Service (`IHSmm24`, which AHRQ does not count as coverage). Each month gets a coverage state: private only, public only, private and public in the same month, uninsured, not in scope, or missing.

Before use, the person-month table is reconciled with AHRQ's annual indicators on their documented definitions:

- `UNINS24 = 1` exactly when every in-scope month has `INSmm24X = 2`.
- `INSCOV24 = 3` exactly when `UNINS24 = 1`; `INSCOV24 = 1` exactly when any in-scope month has private or TRICARE/CHAMPVA coverage; otherwise `INSCOV24 = 2`.
- `INSmm24X = 1` exactly when `PRImm24 = 1` or `PUBmm24X = 1` in that month.
- `INS24X = 1` implies `INSDE24X = 1` (covered on 12/31 implies covered at some time in December). Persons with `INSDE24X = 1` and `INS24X = 2` (coverage ended during December) are counted.
- Weighted totals of `PERWT24F` and the weighted frequencies of `INS24X`, `INSCOV24`, `UNINS24`, and `INSJA24X` match the values printed in the AHRQ codebook.

Any mismatch is reported with counts. No mismatch is silently recoded.

A change of insurer or source without a fully uninsured month is not a gap. Simultaneous coverage from more than one source counts once.

## Primary classification (person-year)

1. Insured at year end, no uninsured month (`INS24X = 1`, all 12 months `INSmm24X = 1`).
2. Insured at year end, at least one uninsured month (`INS24X = 1`, at least one `INSmm24X = 2`).
3. Uninsured at year end (`INS24X = 2`).
4. Continuity indeterminate: required coverage information unavailable (a non-substantive year-end value, or any month in the primary domain lacking a substantive monthly value). Missing months never become uninsured.

The classification is implemented once as a reusable audit function that takes documented monthly indicators and returns continuity classes plus an audit table of rule hits.

## Gap durations

The primary gap definition is at least one fully uninsured calendar month. The prespecified alternative definition (robustness check 2) is at least three consecutive uninsured months. The three-month threshold follows the Affordable Care Act's short coverage gap concept (a gap of less than three consecutive months), which predates and does not depend on these data. Descriptive duration bands among the year-end insured with a gap are 1 to 2 months and 3 to 11 total uninsured months; they are shown only if each band has at least 30 unweighted persons, otherwise only the combined group is shown. No cutpoint is chosen after looking at spending.

## Monthly measurement caveat

AHRQ codes a month as covered if coverage was in effect at any time during that month. A gap shorter than a calendar month, or one that falls inside a month in which the person was covered on some day, is invisible in these data. The omitted-gap proportion is therefore a lower bound on the share with any uninsured day.

## Coverage-transition outputs

- Year-end status by continuity cross-tab (weighted and unweighted), the lead exhibit.
- Month-to-month transition matrix of coverage states (private only, public only, both, uninsured), weighted person-month transitions in domain C.
- Among the year-end insured with a gap: timing pattern (uninsured at the start of the year and insured later; a gap after an insured period; more than one gap) and the year-end source.
- Count of persons with a change in coverage source and no uninsured month.

## Covariates and adjusted analysis

Prespecified descriptive adjustment set: age group on 12/31/2024 (18 to 44, 45 to 64), sex, race and ethnicity (`RACETHX`: Hispanic; non-Hispanic White; non-Hispanic Black; non-Hispanic Asian, other, or multiple race), and family income relative to poverty (`POVCAT24`: below 200% versus 200% or more). Purpose: to ask whether OOP differences across continuity groups persist after standardizing for a few composition differences. This is not a causal model, and no stepwise selection is used.

Two-part model, fit only if the support rule below is met:

- Part 1: survey-weighted logistic model (`svyglm`, quasibinomial) for any fill.
- Part 2: survey-weighted gamma model with log link for OOP among persons with positive OOP.
- Standardized (predictive margin) mean OOP for each continuity group: set every domain member to that group, compute P(OOP > 0) times E(OOP | OOP > 0), and take the weighted mean over the domain. Part 1 for the two-part model is modeled as P(OOP > 0), not P(fill > 0).
- Uncertainty: jackknife replicate weights built from the design (`as.svrepdesign(type = "JKn")`), refitting both parts in every replicate, so the uncertainty of both parts propagates to the margins. This resamples PSUs within strata; it is not an ordinary bootstrap across persons.

Support rule (8 non-intercept parameters: 2 coverage contrasts plus 6 covariate terms): the less common outcome of part 1 has at least 80 unweighted persons; at least 80 persons have positive OOP overall; each continuity group has at least 25 persons with positive OOP; the domain has at least 30 design degrees of freedom. If part 1 fails and part 2 passes, the two-part model is not fit and part 2 is reported alone as a conditional comparison among persons with positive OOP. If both fail, only descriptive comparisons are reported, with the reason.

## Comparisons and denominators

- Common-denominator comparison in domain C: summaries for all year-end insured (classes 1 and 2 pooled), class 1 alone, class 2 alone, and class 3.
- Classification-specific summaries: year-end status in frame Y (which includes part-year in-scope persons) and continuity classes in domain C, labeled with their own denominators so that differences in scope or missingness are not read as coverage effects.

## Robustness checks (exactly three)

1. Common complete-information domain: year-end summaries recomputed in the domain where both classifications are determinate, compared with the frame Y summaries.
2. Alternative gap duration: at least three consecutive uninsured months.
3. Prior-year replication with HC-251 (2023), only after its monthly coverage, diabetes, spending, scope, and design variables are verified from its own documentation. Reported separately. Years are not pooled, because MEPS panels contribute to adjacent years (Panel 28 appears in both 2023 and 2024), and no cross-year significance test is made.

## Uncertainty and reliability

- Design: `svydesign(ids = ~VARPSU, strata = ~VARSTR, weights = ~PERWT24F, nest = TRUE)`, with-replacement Taylor linearization. Singleton strata are counted in the full frame and in each domain; `options(survey.lonely.psu = "adjust")` is set as a safeguard and its use is reported.
- Proportions are flagged as unreliable using the NCHS data presentation standards for proportions (Parker et al., 2017): effective sample size below 30, absolute CI width of 0.30 or more, relative CI width above 130% when absolute width exceeds 0.05, or fewer than 8 design degrees of freedom. Means and quantiles are flagged when the relative standard error exceeds 30% or the unweighted denominator is below 30.
- No ordinary bootstrap across persons. No significance testing beyond the confidence intervals already described, except design-based Wald contrasts between continuity groups for mean OOP, which are reported as descriptive differences.

## Validation

- Unit tests: person-month reshaping, multi-source coverage in the same month, missing months, out-of-scope months, December insured but uninsured earlier (must classify as a gap), insurer switch without a gap (must not be a gap), annual expenditure states, and unchanged person counts through every join.
- Source reconciliation: weighted totals against the AHRQ codebook; HC-254A fill counts and OOP sums per person against `RXTOT24` and `RXSLF24`.
- Software cross-check: the primary point estimate and its Taylor standard error recomputed in Python with an independent implementation of the with-replacement stratified cluster variance formula. This is a software check, not external scientific validation.
- Rerun check: the deterministic pipeline is rerun from cached raw files and substantive outputs are compared with an absolute tolerance of 1e-9 on estimates.

## What would count as a useful negative result

If the omitted-gap proportion is small (for example under 3%) with a tight interval, the useful conclusion is that the year-end indicator loses little information for this population in 2024, and the spending comparison will show whether that small group still differs. Either outcome is reported.

## Amendments

All four amendments were made on 2026-10-07 between the contribution decision (09:47Z) and this record, and are written down here at 2026-10-07T09:54:29Z. They are listed in the order they were made, and each says whether it came before or after estimates were seen. None changes the estimand, eligibility, classification rules, gap definitions, adjustment set, or robustness checks.

1. After the first build, before any survey estimate. The reconciliation check "INS(12/31) = 1 implies INSDE = 1" flagged 36 records in 2024 and 41 in 2023. All had December coded out of scope (-1). AHRQ documents that for persons who left the household before December 31, the 12/31 variable records coverage on the date they left. The check was restricted to persons in scope in December, and the departures are reported as an informational count. None of these records is in an analytic frame.
2. After the first model run. In the first run, the part-1 logistic model failed to converge in 257 of 264 jackknife replicates because R's binomial starting values break down with weights in the thousands, which inflated the replicate standard errors about eightfold. Weights inside each replicate fit are now divided by their mean, which leaves point estimates unchanged (the full-sample fit then reproduces the `svyglm` coefficients exactly). All replicate fits converge, and the count of non-converged fits is written to the output table. Only the corrected results are reported.
3. After estimates were seen. The month-by-month uninsured shares in the gap group (n = 70) do not meet the NCHS presentation standard for proportions, so that figure was moved from the main text to the supplement, with the caveat printed on it.
4. After estimates were seen (post hoc, descriptive). Because the 2024 class A mean had a relative standard error near 30%, a diagnostic of spending concentration was added: the weighted share of out-of-pocket dollars from the top 1% and 5% of persons, and the maximum annual out-of-pocket amount in each class. It is reported as a diagnostic with no inference and was not used to trim or recode any value.

Amendments 5 to 7 were written down at 2026-10-07T10:40:43Z, after an internal review of the completed analysis.

5. Before the first analysis run, with no estimates seen. Design-based contrasts between classes for any fill and for mean fills were added to the analysis code alongside the prespecified contrasts for mean out-of-pocket spending. They are reported as descriptive differences.
6. Clarification, no change to the analysis. The plan described part 1 of the two-part model as "any fill" in one sentence and as P(OOP > 0) in another. The analysis used P(OOP > 0), consistent with modeling out-of-pocket spending, and the support rule was evaluated on that outcome.
7. After estimates were seen. The reliability flags were completed to match this plan and the NCHS standard: quantiles are now flagged by the 30% relative standard error rule (the first implementation checked only n < 30), and proportions whose complementary proportion would fail the relative width rule are marked for review. This changes footnotes only; no estimate changed.

Amendment 8 was written down at 2026-10-07T21:16:55Z, after a final review of the completed analysis.

8. After estimates were seen. (a) The plan listed fewer than 8 design degrees of freedom among the criteria for flagging a proportion as unreliable; following the NCHS standard, such proportions are marked for review rather than suppressed, and means and quantiles whose standard error cannot be estimated are also flagged. (b) The code now computes the primary proportion on the complete-information denominator whenever anyone in it is indeterminate, as this plan specified; no one was indeterminate, so no estimate changed. (c) The post hoc spending diagnostic (amendment 4) also reports class means excluding the top 1% of the domain. These changes affect footnotes and descriptive diagnostics only.
