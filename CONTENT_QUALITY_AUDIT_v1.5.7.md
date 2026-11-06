# Content quality and evidence workflow audit — v1.5.7

## Scope
This release adds a local, page-anchored candidate extraction and human review workflow for uploaded curriculum progression PDFs. It does not import or claim to possess any Ministry PDF.

## Candidate extraction
- Uses extracted PDF text, including text produced by the existing optional OCR workflow.
- Splits candidates by page and paragraph; preserves the source page and a bounded excerpt.
- Suggested field classification is heuristic only (`unit`, `lesson`, `competency`, `unclassified`).
- Reviewer can annotate grade, subject, term, unit, lesson, competency, and notes.

## Governance safeguards
- Every new candidate starts as `pending_review`.
- Saving a candidate changes only its review workflow status to `reviewed_candidate`; it does not mean officially verified.
- `official_alignment` remains `not_verified`; `auto_verified=false`; `auto_published=false`.
- No automatic update to the 105-group curriculum map, 16 provisional secondary matrices, or CSV evidence register.
- Source reuse rights remain a separate review from curriculum alignment.

## Existing content preserved
- 1,167 exercises (1,155 multiple-choice + 12 numeric).
- 315 prepared term exams.
- 315 integrative assessments.
- No new exercises or official Ministry mappings were added.

## Limitations
- Extraction is text/paragraph heuristic, not semantic curriculum understanding.
- Scanned pages require the existing OCR dependencies and installed language data.
- Human reviewers must compare each excerpt with the original page and validate the exact grade, subject, term, and wording.
- No Ministry PDF was downloaded as part of this release; no claim is made that any extracted candidate is official.
