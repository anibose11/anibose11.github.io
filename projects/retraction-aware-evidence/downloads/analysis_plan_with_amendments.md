# Analysis plan

- Written: 2026-10-07T09:44Z to 2026-10-07T09:55Z (UTC), before the review corpus was retrieved, before any reference list was parsed, and before any reference was matched to a status source.
- Status: internal, timestamped plan kept with the project files. It is not a formal preregistration in a public registry.
- Later changes are recorded in the "Amendments" section at the end with their date and reason. Earlier text is not edited.

## Prior exposure

- Retraction Watch snapshot: the file was downloaded and validated (row count, column names, `RetractionNature` counts: 67,530 Retraction, 3,730 Expression of concern, 1,541 Correction, 162 Reinstatement; 72,963 records).
- PubMed frame: the frame query was run once with `retmax=0`; it returned a count of 7,993.
- Literature: the closest published studies were read (see `docs/prior_art.csv` and `docs/literature_search.md`). Their findings, for example that a large share of reviews citing retracted trials appeared after the retraction, are known in general terms.
- No review XML, no reference list and no linkage output had been seen.

## 1. Question

How do identifier coverage, status-source coverage and date precision change which cited studies in cardiometabolic systematic reviews and meta-analyses are flagged for status review, and how often is the timing of a flagged notice determinate relative to the review's first public online date?

## 2. Data sources (frozen)

| Source | Version pinned | Use |
|---|---|---|
| Crossref Retraction Watch CSV | GitLab `crossref/retraction-watch-data`, commit `fe345427b516f7d507d67db5e1119d738cc25455` ("Retraction Watch data for 2026-10-06"), SHA-256 `063df713...0db4e5` | Status claims (Retraction, Correction, Expression of concern, Reinstatement) with notice dates and identifiers |
| PubMed (E-utilities) | Responses retrieved 2026-10-07, cached and hashed | Frame query; review dates; cited-record metadata; `CommentsCorrections` relations; publication types |
| PMC Article Datasets (AWS, `pmc-oa-opendata`) | Per-article JSON and JATS XML retrieved 2026-10-07; MD5 from the JSON, SHA-256 computed locally | Review full text and genuine reference lists; license codes |
| PMC ID Converter API | Responses retrieved 2026-10-07, cached | PMID to PMCID mapping for the frame; PMCID to PMID for cited PMCIDs |

The status audit is current as of the snapshot. It does not claim that every notice was knowable when the review appeared.

## 3. Frame, selection and cohort

Frame query, PubMed, run 2026-10-07:

```
("Diabetes Mellitus"[MeSH Terms] OR "Obesity"[MeSH Terms] OR "Heart Failure"[MeSH Terms]
 OR diabet*[Title] OR obes*[Title] OR "heart failure"[Title])
AND ("Systematic Review"[Publication Type] OR "Meta-Analysis"[Publication Type])
AND ("2015/01/01"[Date - Publication] : "2025/12/31"[Date - Publication])
AND "pubmed pmc open access"[Filter]
```

- The publication window is 2015 through 2025, the last complete calendar year.
- The open-access rule is PubMed's "pubmed pmc open access" filter, which the PMC Open Access Subset page documents. Membership is confirmed per article with the `is_pmc_openaccess` field of the PMC cloud JSON.
- The full frame of PMIDs is saved as `data/interim/frame_manifest.csv` with its SHA-256 before any status lookup.
- Selection: sort the frame by `SHA-256("retraction-aware-evidence|2026-10-07|" + PMID)` ascending and take the first 1,000. This is deterministic, depends only on the identifier, and does not depend on any status information.
- Selected articles are not replaced. Articles that cannot be retrieved (no PMCID, no cloud version, not in the open-access subset, download error) and articles whose XML has no parseable reference list are reported by reason.
- Version rule when the cloud bucket has more than one version: prefer a version with `is_pmc_openaccess = true` and `is_manuscript = false`; among those, take the highest version number; if none, take the highest open-access version.
- This cohort is a sample of one indexing-defined frame. It is not a census of cardiometabolic reviews. Selection bias toward open-access journals and toward records with publication-type indexing is reported as a limitation.

## 4. Units

1. Review article (PMCID).
2. Reference occurrence: one `<ref>` element in a review's reference list. A `<ref>` holding several citations (`<citation-alternatives>` excluded) yields one occurrence per `element-citation`/`mixed-citation`/`nlm-citation` child.
3. Unique cited work: a connected component over identifiers (normalized DOI, PMID, PMCID), joined by co-occurrence within one reference and by verified NCBI crosswalk records.
4. Notice: one Retraction Watch record (`Record ID`) or one PubMed notice record (PMID of the notice in `CommentsCorrections`).

Several reviews can cite one work and one work can have several notices. Counts of notices are never reported as counts of studies.

## 5. Identifier handling

- Keep the original string of every identifier with its provenance: `pub-id` tag, `ext-link`/`uri` link, or free text in the reference.
- DOI normalization is conservative: trim whitespace; remove a leading `doi:`/`DOI:` label or a `https://doi.org/`, `http://dx.doi.org/` style prefix; percent-decode; lowercase (DOI names are case-insensitive); strip trailing `.`, `,`, `;`, `:` and a trailing `)` or `]` only when it is unbalanced. The result must match `^10\.\d{4,9}/\S+$`; otherwise the DOI is recorded as malformed and not used.
- PMIDs must be positive integers; PMCIDs must match `PMC\d+`.
- A DOI that equals a Retraction Watch `RetractionDOI` (or a PMID that equals a `RetractionPubMedID`), or a PubMed record whose publication type is "Retraction of Publication", "Published Erratum" or "Expression of Concern", is a cited notice. It is reported separately and is never treated as the retracted article.

## 6. Linkage arms

- Arm A, exact DOI only: normalized reference DOIs against normalized Retraction Watch `OriginalPaperDOI`. No other identifier.
- Arm B, verified expanded identifiers: all reference identifiers (DOI, PMID, PMCID) plus NCBI-verified crosswalks (PMCID to PMID via the ID Converter; PMID to DOI from the PubMed record's own `ArticleIdList`/`ELocationID`; DOI to PMID by a PubMed search verified by exact DOI equality in the returned record) against Retraction Watch `OriginalPaperDOI` and `OriginalPaperPubMedID`.
- Arm C: arm B plus PubMed relations on the cited record: `RetractionIn`, `RetractedandRepublishedIn` (retraction), `ExpressionOfConcernIn` (expression of concern), `ErratumIn`, `CorrectedandRepublishedIn` (correction), `UpdateIn` (update, reported separately), and the "Retracted Publication" publication type (retraction without a linked notice).
- Reinstatement exists only in Retraction Watch. No reinstatement value is created for PubMed.
- Conflicts are kept: each claim is stored with its source, notice identifier and date. No source is preferred and no "most severe label" is chosen silently. Summaries that need one row per occurrence use "any retraction claim", "any expression of concern claim", and so on, as separate indicators.
- A title/author/year fuzzy matcher (normalized title similarity of at least 90 on `rapidfuzz.fuzz.token_sort_ratio`, title length at least 30 characters, cited year within 1 of the Retraction Watch original-paper year) produces a separately labeled review queue for occurrences with no exact link. It is never counted as a confirmed match.

## 7. Coverage ledger (mutually exclusive, per occurrence, arm C)

1. `no_identifier`: no usable DOI, PMID or PMCID.
2. `malformed_identifier_only`: only malformed identifiers.
3. `endpoint_unavailable`: a required NCBI lookup failed after bounded retries. These are not counted as "no event".
4. `ambiguous`: identifiers point to more than one PubMed record (for example a tagged PMID and a DOI that resolves to a different PMID).
5. `pmid_not_found`: a PMID with no PubMed record and no usable DOI.
6. `doi_not_in_pubmed`: a DOI with no PubMed record; checked against Retraction Watch by DOI only.
7. `verified_pubmed_record`: one PubMed record; checked against both sources.

Within categories 6 and 7, status is `event_recorded` (with type) or `no_recorded_event_as_of_snapshot`. None of these categories says a study is sound.

## 8. Chronology

- Review first public online date: JATS `pub-date` with `pub-type="epub"` or `date-type="pub"` and `publication-format="electronic"`; else PubMed `ArticleDate DateType="Electronic"`; else PubMed journal-issue date. Issue date: JATS `ppub`/`collection` or PubMed issue date.
- Every date is an interval. A full date is one day; year-month spans the month; year only spans the year; a missing date is unknown.
- Notice dates: Retraction Watch `RetractionDate`; PubMed notice date from the notice record (electronic article date, else issue date). A PubMed relation without a notice PMID or a fetchable notice record has an unknown date.
- The acceptance date is not used as the date when references were finalized.
- Timing per claim: `before_review` when the notice interval ends before the review interval starts; `after_review` when the notice interval starts after the review interval ends; otherwise `indeterminate`.

## 9. Primary outputs

1. Reference-level identifier coverage: share of occurrences with any usable identifier, and by identifier type and provenance.
2. Uniquely resolved status matches: occurrences and unique works with at least one claim, by claim type, in arms A, B and C.
3. Newly linked matches from authoritative crosswalks (in B, not in A) and from PubMed relations (in C, not in B), with source overlap reported as overlap.
4. Share of flagged occurrences whose timing is determinate, and the split before/after.
5. The coverage ledger counts.

Proportions are reported with review-level cluster bootstrap 95% percentile intervals (2,000 resamples of reviews with replacement, seed 20261007). Counts that are small are reported as counts with no interval.

## 10. Sensitivity analyses (fixed set)

- S1: tagged identifiers only (drop identifiers mined from free text and links).
- S2: timing against the issue date instead of the first online date.
- S3: the six-month rule used by Brown et al. (2022): a claim counts as "before review" only if the notice is at least 183 days before the review's online date.
- S4: unique-work level instead of occurrence level.
- S5: excluding occurrences that cite a notice rather than an article.

## 11. Missing data and exclusions

No imputation. Unavailable, missing, not found, ambiguous and not evaluated are separate states. Failed requests are retried with backoff (up to 5 attempts, batch splitting down to single identifiers); identifiers that still fail are `endpoint_unavailable`.

## 12. Validation

- Software tests on controlled fixtures: DOI punctuation, URL prefixes, duplicated notices, notice DOI swaps, multiple PMID relationships, incomplete dates, failed requests. Fixtures are labeled and never mixed with study rows.
- Source reconciliation: every exact match is re-checked by a separate routine that re-reads the raw Retraction Watch CSV row and the raw cached PubMed XML and confirms identifier equality, claim type and date.
- Determinism: deterministic stages are re-run from cached inputs and substantive outputs are compared with tolerance 0 for counts and 1e-12 for proportions.
- Human review of flagged rows and a stratified sample of reference parses is described separately and is not part of the automated checks.

## 13. What will not be done

No inference about whether a review's pooled effect changes, no judgment about whether a citation endorses or criticizes a study, no misconduct attribution, no change of disease scope or date window after seeing results.

## Amendments

### A1 (2026-10-07T10:32Z, after the first build): exploratory notice dates from PubMed `RefSource`

- Observed: 784 PubMed status relations (783 `ErratumIn`, 1 `RetractionIn`) carry no notice PMID, so under section 8 their notice date is unknown and their timing is indeterminate. Each relation still has PubMed's `RefSource` citation string for the notice (for example "Diabetes Care. 2014 Mar;37(3):887"), which contains a year and usually a month.
- Change: an exploratory table parses the year, month and day in `RefSource` into a date interval with the same rules as section 8 and recomputes timing for those relations only. It is labeled post hoc everywhere it appears.
- Not changed: the primary timing results, which keep these relations as indeterminate exactly as planned.
- Reason: the result shows how much of the indeterminate share comes from a missing notice PMID rather than from overlapping dates. It was decided after seeing the count of undated relations and before looking at the reparsed timing.

### A3 (2026-10-07T10:36Z): current NLM name of the notice publication type

- Section 5 named the PubMed notice type "Retraction of Publication". The current NLM publication type list names it "Retraction Notice"; every retraction notice record retrieved here carries the new name, and none carries the old one. The implementation now recognizes both names. Found while reconciling the first run's cited-notice table: 3 references to "Retraction Notice" records had not been labeled as cited notices.
- Effect: only the cited-notice table and sensitivity analysis S5 can change. Status claims do not depend on the notice's own publication type.

### A2 (2026-10-07T10:32Z): source-disagreement rule made explicit

- Section 8 classifies each claim. For occurrence-level timing tables, an occurrence with several claims of the same type (for example one from each source) is called determinate only when all of those claims agree; otherwise it is indeterminate. This rule was applied in the first analysis run and is recorded here because section 8 did not state it.
