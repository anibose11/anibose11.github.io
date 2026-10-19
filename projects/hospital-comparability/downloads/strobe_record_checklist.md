# STROBE checklist with applicable RECORD items

Manuscript: "When hospital quality comparisons are not comparable: a release-aware audit of CMS heart-failure outcome measures and their published intervals". Section names refer to the manuscript headings. The unit of observation is a hospital-measure-release record built from published hospital-level aggregates; items written for individual-level data are marked as not applicable with the reason.

| Item | Recommendation (short form) | Where addressed |
|---|---|---|
| 1a | Design in title or abstract | Abstract, Methods ("cross-sectional study of US hospital records"); Title ("release-aware audit") |
| 1b | Informative, balanced abstract | Abstract |
| RECORD 1.1 | Type of data used | Abstract, Methods; Methods, Data sources and releases (public CMS Provider Data Catalog hospital files) |
| RECORD 1.2 | Geographic region and time frame | Abstract, Methods (US hospitals; data from July 2021 to June 2024); Methods, Data sources and releases; Table 1 |
| RECORD 1.3 | Linkage between databases | Methods, Data sources and releases (hospital attributes joined only within the same release by Facility ID); no linkage across releases or to other databases |
| 2 | Scientific background and rationale | Background |
| 3 | Objectives | Background, final paragraph |
| 4 | Study design | Methods, Design |
| 5 | Setting, locations, periods | Methods, Data sources and releases; Table 1 |
| 6a | Eligibility criteria and sources | Methods, Records, availability states and gates |
| RECORD 6.1 | Methods of population selection (codes, algorithms) | Methods, Records, availability states and gates; Measures (CMS cohort definitions cited); source code archive (config/measures.toml, sql/02_gates.sql) |
| RECORD 6.2 | Validation of codes or algorithms | Not applicable to CMS cohort codes, which are defined by CMS; the study's own gate logic was validated by software tests, raw reconstruction and an R reimplementation (Methods, Validation and reproducibility) |
| RECORD 6.3 | Linkage flow | Not applicable (no record linkage) |
| 6b | Matching | Not applicable |
| 7 | Outcomes, exposures, predictors | Methods, Measures; Pairwise separation; Rank ranges |
| RECORD 7.1 | Codes and algorithms for outcomes | Methods, Measures; source code archive |
| 8 | Data sources and measurement | Methods, Data sources and releases; Measures |
| 9 | Efforts to address bias | Methods, Design (locked plan); Amendments; Sensitivity analyses; state- and hospital-weighted summaries |
| 10 | Study size | Results, Eligibility and comparability; Table 2; Table 3 (all eligible records used, no sampling) |
| 11 | Quantitative variables | Methods, Pairwise separation (integer comparison at published precision); Rank ranges |
| 12a | Statistical methods | Methods, Pairwise separation; Rank ranges |
| 12b | Subgroups and interactions | Methods, Sensitivity analyses (S3 secondary condition) |
| 12c | Missing data | Methods, Records, availability states and gates (availability states; no imputation) |
| 12d | Sampling strategy | Not applicable (complete files) |
| 12e | Sensitivity analyses | Methods, Sensitivity analyses |
| RECORD 12.1 | Extent of access to the database | Methods, Data sources and releases (public files, full access); Declarations, Availability of data and materials |
| RECORD 12.2 | Data cleaning methods | Methods, Data sources and releases; Records, availability states and gates; Validation and reproducibility; source code archive (docs/data_dictionary.md) |
| RECORD 12.3 | Linkage methods | Not applicable |
| 13a | Numbers at each stage | Results, Eligibility and comparability; Figure 1; Table 2; Additional file 6, Tables S1 and S2 |
| 13b | Reasons for non-participation | Results, Eligibility and comparability; Additional file 6, Table S2 |
| 13c | Flow diagram | Figure 1 |
| RECORD 13.1 | Selection of the study population | Figure 1; Table 2 |
| 14 | Descriptive data (characteristics of the records and hospitals) | Results, Eligibility and comparability (compatible records by hospital type); Table 1; Table 2; Additional file 6, Table S11 |
| 15 | Outcome data | Table 3 |
| 16 | Main results | Results, Pairwise separation; Rank ranges; Table 3; Figures 4 and 5 |
| 17 | Other analyses | Results, Sensitivity analyses; Definitional and release comparisons |
| 18 | Key results | Discussion, Principal findings |
| 19 | Limitations | Discussion, Limitations |
| RECORD 19.1 | Limitations of data not created for the research question | Discussion, Limitations; Sampling uncertainty and definitional incompatibility are different problems |
| 20 | Interpretation | Discussion, Relation to prior work; Implications for analysts |
| 21 | Generalisability | Discussion, Implications for analysts; Limitations |
| 22 | Funding | Declarations, Funding |
| RECORD 22.1 | Access to protocol, raw data and code | Declarations, Availability of data and materials; Additional file 1 (analysis plan), Additional file 2 (evidence and source manifest), Additional file 4 (source code) |
