# Denominator association rules and check catalogue

Finalized on the development portion (508 confirmed plus 19 ambiguous-match studies) on 2026-10-07, revised after an independent code review of the development-portion work (amendment 3 of the analysis plan), and frozen with the parser before the held-out run. Both the warehouse SQL (`sql/02_audit_views.sql`) and the independent R reference (`R/reference_enumerator.R`) implement this text separately.

## Terms

- Analysis unit `U` of an outcome: the outcome's `denomUnitsSelected` when present and non-blank, otherwise `Participants`. Unit names are compared after trimming spaces, tabs, carriage returns and line feeds at both ends and folding ASCII letters to lower case (the same in SQL and R). Blank means empty after that trimming.
- Outcome-level denominators: the outcome's `denoms` list. Row-specific denominators: a class's `denoms` list.
- A count "covers" a group when its `groupId` equals the group's identifier. A count is usable when its text consists only of the ASCII digits 0 to 9 and its value is at most 2,147,483,647 (the integer column limit; no count in the snapshot comes near it). Any other text, including "NA", is not usable.
- An outcome is in row-specific mode when any of its classes has a `denoms` list.

## Tier of one measurement

Evaluated in this order. The first matching line decides.

0. The outcome's reporting status is not `POSTED` → D, `D_NOT_POSTED` (in this snapshot such outcomes carry no measurements).

Row-specific mode:
1. The measurement's class has no row-specific denominators → C, `C4_PARTIAL_ROW_DENOMINATORS`.
2. The class has no row-specific denominator in participant units → C, `C5_ROW_DENOMINATORS_NOT_IN_PARTICIPANTS`.
3. No participant-unit row count covers the group → C, `C1_NO_PARTICIPANT_COUNT`.
4. More than one participant-unit row count covers the group → C, `C3_DUPLICATE_UNIT_ENTRIES`.
5. The covering count is not usable → C, `C2_NON_INTEGER_COUNT`.
6. `U` is not Participants and the row has no single usable count in units `U` for the group → C, `C6_SELECTED_UNIT_NOT_REPORTED`.
7. Otherwise → B, `B1_ROW_SPECIFIC_DENOMINATOR`. The participant denominator is the row count.

Otherwise (no row-specific denominators anywhere in the outcome):
1. No outcome-level participant-unit count covers the group → C, `C1_NO_PARTICIPANT_COUNT`.
2. More than one covers the group → C, `C3_DUPLICATE_UNIT_ENTRIES`.
3. The covering count is not usable → C, `C2_NON_INTEGER_COUNT`.
4. `U` is not Participants and the outcome has no single usable count in units `U` for the group → C, `C6_SELECTED_UNIT_NOT_REPORTED`.
5. `U` is Participants → A, `A_OUTCOME_LEVEL`.
6. `U` is another unit → B, `B2_NON_PARTICIPANT_UNITS`. The participant denominator is the outcome-level participant count; the measurement's own unit denominator (step 4 guarantees one exists) is held separately.

Unit denominator (used only by check K2): the usable count in units `U` covering the group, taken from the class when the outcome is in row-specific mode and otherwise from the outcome. It is recorded as absent when no single usable count exists.

## Tier of one outcome group

- D, `D_NOT_POSTED`: the outcome's reporting status is not `POSTED`. (In the development portion such outcomes carry no groups, so they are counted at the outcome level.)
- D, `D_NO_MEASUREMENTS`: the group has no measurement rows in its outcome. In development data this mostly means zero participants analyzed.
- Otherwise the least favourable tier among its measurements (C over B over A).

## Checks for possible source inconsistencies

A check is applicable only when every condition in its applicability column holds. "Present" means the source field has text. Applicable cases whose values are present but are not plain numbers (for example "NA" or "1,169.62") are counted as "not evaluable", separately from passes and failures. A failure is a possible source inconsistency, not a confirmed error.

| ID | Rule | Applicability | Fails when |
|---|---|---|---|
| K1 | Participant count above its participant denominator | Outcome parameter type `COUNT_OF_PARTICIPANTS`; `U` is Participants; measurement tier A or B; value present | value > participant denominator |
| K2 | Unit count above its unit denominator | Parameter type `COUNT_OF_UNITS`; a unit denominator exists; value present | value > unit denominator |
| K3 | Interval limits out of order | Dispersion is a confidence interval, inter-quartile range or full range (either vocabulary); both limits present | lower limit > upper limit |
| K4 | Point value outside its interval | Dispersion is a confidence interval or full range, or an inter-quartile range around a median; value and both limits present | value < lower or value > upper (not evaluable when the limits are out of order, which K3 already reports) |
| K5 | Percentage of participants outside 0 to 100 | Unit of measure begins with "percentage/percent/% (of) participants"; parameter type `NUMBER`; value present | value < 0 or value > 100 |
| K6 | Adverse event participants affected above participants at risk | Both counts present for the event and group | affected > at risk |
| K7 | Adverse event participants affected above number of events | Both present | affected > events |
| K8 | Adverse event group totals: affected above at risk | Both present for deaths, serious or other | affected > at risk |
| K9 | Baseline participant count above its baseline denominator | Baseline parameter type `COUNT_OF_PARTICIPANTS`; units selected absent or Participants; exactly one usable participant-unit denominator for the group, taken from the class, else the measure, else the module; value present | value > denominator |
| K10 | Analysis estimate outside its two-sided confidence interval | `ciNumSides` is `TWO_SIDED`; estimate and both limits present | limits out of order, or estimate outside them |
| K11 | Non-zero value with zero participants analyzed | `U` is Participants; tier A or B; participant denominator is 0; value present | value ≠ 0 |
| K12 | Category counts do not add up to participants analyzed | Outcome parameter type `COUNT_OF_PARTICIPANTS`; `U` is Participants; tier A or B; the row has two or more categories, all titled; evaluated per row and group | sum of category counts ≠ participant denominator (not evaluable if any count is not a non-negative plain integer) |

K12 rests on the results data element definitions, which reserve category titles for "mutually exclusive and exhaustive" categories of a count of participants or units. Rows with a single category are not checked, because one category cannot show whether the reporter meant it to be exhaustive.

## Deliberately not checked

- Sums across rows (classes) or across untitled categories, and any sum for measures other than counts of participants.
- Outcome participants analyzed against participant flow or baseline counts (groups are module-scoped; matching labels are not evidence of the same population).
- Whether a mean, median or survival estimate "should" have a binary event denominator.
- Adverse event events against participants as if they were the same unit.

## Note on C4

The registry definitions describe row-level numbers analyzed as reported "if different from the overall" number. A row without its own count while other rows of the same outcome have one could therefore be read as using the overall count. The rules treat that pattern as ambiguous (C4) rather than apply the overall count, because in the development portion every outcome that used row-level counts gave them for every row, including rows whose count equalled the overall count, so a missing row count is not the documented way of saying "same as overall". C4 did not occur in the development portion.

## Dispersion vocabulary

Outcome measures report dispersion as display text ("95% Confidence Interval", "Inter-Quartile Range"). Baseline measures use enumeration codes (`INTER_QUARTILE_RANGE`, `FULL_RANGE`). Both are stored verbatim. The function `audit.interval_kind` (sql/02_audit_views.sql) maps both vocabularies to an interval kind by pattern, for checks K3 and K4 only: any "N% Confidence Interval" text or `CONFIDENCE_*` code is a confidence interval; "Inter-Quartile Range" or `INTER_QUARTILE_RANGE` is an inter-quartile range; "Full Range" or `FULL_RANGE` is a full range.

## Cross-module label identity (S7, descriptive only)

An outcome group and a baseline group are counted as having "the same title" only when the two title strings are exactly equal. The baseline participant count used for comparison is the group's single usable count in the baseline module's participant-unit denominator.
