# Contribution decision

Written 2026-10-07, after the analysis plan was frozen (09:33Z, SHA-256 recorded in docs/analysis_plan_frozen_v1.sha256) and after the first estimation run. The research question, estimand, comparator, configurations, and the definition of a useful negative result were already fixed in the frozen plan. This document adds the prior-work comparison and the intended users; it did not change the question or the analysis.

## Who could use the output

- Analysts who estimate diabetes-related prevalence from NHANES August 2021-August 2023 and must choose a laboratory domain and weight (survey epidemiologists, surveillance staff, graduate students).
- Reviewers and editors who need to check whether a reported HbA1c-versus-glucose difference compares like with like.
- Teams building reusable NHANES pipelines who want a check that refuses incompatible phenotype, domain, and weight combinations before estimation.

## Decision it supports

Whether an observed difference between an HbA1c-based and a fasting glucose-based estimate can be attributed to the definitions, and which denominator and weight a given phenotype requires. The output gives the size of each component for this release and a tool that encodes the documented weight rules.

## Narrow unresolved question

The 2021-2023 release supplies a separate phlebotomy weight (WTPH2YR) for blood analytes and a fasting subsample weight (WTSAF2YR) for fasting glucose. Published analyses of this release that compare or combine HbA1c and fasting glucose restrict HbA1c to the fasting subsample (NCHS Data Brief 516; Harding et al. 2025) or describe their weights only generally. None of the items located in the prior-art search reports, for this release, (a) HbA1c-only and glucose-only prevalence in one paired domain with a design-based paired difference, together with (b) the change in the HbA1c estimate between its phlebotomy domain and the paired fasting domain, with uncertainty for that change. Cowie et al. (2010) noted that HbA1c estimates from the examined sample and from an OGTT subsample "may differ slightly" but did not quantify the difference.

## Comparator

1. The official composite for the same release (NCHS Data Brief 516: total, diagnosed, and undiagnosed diabetes in adults 20 and older using fasting sample weights, n = 2,938).
2. The naive cross-domain comparison an analyst can produce by taking HbA1c from its larger laboratory sample and glucose from the fasting subsample.

## Estimand

Finite-population proportions for the U.S. civilian noninstitutionalized population aged 20 and older, not pregnant, during August 2021 to August 2023, under each phenotype definition and laboratory domain, and the differences between them:

- definition component: HbA1c-only minus glucose-only threshold prevalence in the common paired domain, with one weight;
- selection and weighting component: HbA1c-only prevalence in the HbA1c laboratory domain (WTPH2YR) minus the same in the paired domain (WTSAF2YR). This is a descriptive comparison of two estimators of nominally the same population quantity, not a causal effect.

## What counts as a useful negative result

A small and imprecise selection and weighting component would mean that, for this release, the larger HbA1c sample does not materially change the HbA1c estimate, so a naive cross-domain difference is mostly definitional, while the paired analysis still gives a much more precise contrast. That is reportable and useful for analysts deciding whether to restrict to the fasting subsample.

## Framing decision

This work is not presented as the first comparison of HbA1c and fasting glucose definitions in NHANES. Davidson and Pan (2014), Carson et al. (2010), Menke et al. (2015), Fang et al. (2022), and others compared definitions; NCHS publishes the composite for this release. The contribution is framed as an independent, reproducible update for the 2021-2023 release that separates the definition and the laboratory sample and weight components with design-based uncertainty, plus a reusable configuration checker. The study is a methods and surveillance-practice audit, and its conclusions refer to estimates under surveillance definitions, not to diagnoses of individual people.

The 2017 to March 2020 replication is reported in the same paper as a secondary replication in a separate release, not as a separate manuscript.
