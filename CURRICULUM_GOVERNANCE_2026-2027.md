# Curriculum governance — 2026–2027

This registry distinguishes confirmed Ministry policy facts from platform-authored practice mappings. It is not itself an official curriculum document.

## Confirmed policy facts
- English begins in primary year 3; French begins in primary year 4.
- The general middle-school structure is maintained in the announced arrangements.
- First-year secondary common trunks continue in 2026–2027.
- Some secondary subject content is redistributed across the three years; no subject is removed entirely from the pathway.
- Ministry notice states that BAC subjects are those programmed in third-year secondary.
- Computer science is added in some second- and third-year streams; the accessible August notice does not identify all those streams. A separate July 30 Ministry clarification specifically names third-year Mathematics and Engineering streams. The app does not infer the exact equivalence between the Ministry wording and every internal stream label.
- Decision No. 36 rescinds Decision No. 20 on secondary timetables and coefficients; the rescinded decision is not treated as current.

## What is not verified
- Exact lesson/unit/competency sequence for all 12 grades and 105 grade-subject pairs.
- Exact current-year subject matrix for the 2 common trunks and 7 secondary streams.
- Current hours and coefficients.
- Full official annual progressions for 2026–2027.

## Review workflow
Use `web/data/curriculum-verification-template-2026-2027.csv`. For each grade/subject/term, enter the current Ministry document title, URL, page number, unit, lesson, competency, publication date and reviewer. A record remains pending until source and page are present and a qualified reviewer confirms the exact match. Historical PDFs are discovery references only.

## Assessment rules
- Exam builder uses exact grade/subject/term/language matching; no cross-grade or cross-term substitution.
- Secondary stream-specific generation remains blocked until the stream subject matrix and exercise mapping are verified.
- Cognitive-process tags are platform practice taxonomy, not official Ministry competencies.
- Generated exams are practice material, not official Ministry papers, and require teacher review.


## Future-year separation
The Ministry announced the transition to a fully stream-based secondary structure and a new Informatics stream for 2027-2028. These changes are recorded as future policy and are not applied to the 2026-2027 school-year model.


## v1.5.7 local evidence intake
The Tests → Curriculum Governance panel accepts the filled CSV template and stores the review ledger in the current browser only. Rows marked `verified` must include a Ministry HTTPS source, exact page number, unit, lesson, competency, source publication date and reviewer details. The UI and `tools/validate_curriculum_evidence.py` perform format/provenance pre-checks only. They cannot authenticate a Ministry document or prove that a progression applies to a specific grade/term. No imported row automatically changes official verification totals, exercise metadata, or exam generation.


## v1.7.2 home school routine
The Home school page proposes a weekly routine (sessions per subject, session length by stage). These values are platform-authored suggestions for a home routine. They are not the official weekly hours or coefficients, which remain unverified (see "What is not verified"), and they do not model stream-specific secondary subject matrices. Replace them only with values taken from verified Ministry documents.
