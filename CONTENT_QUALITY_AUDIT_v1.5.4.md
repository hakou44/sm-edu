# SM SCHOOL AI v1.5.4 — Curriculum-guarded exam builder

## What changed
- Added an assessment builder that returns two separate versions: student paper and teacher copy.
- Teacher copy includes answer key, existing explanations/solution steps and a 20-point marking scheme.
- Student copy excludes answer keys.
- Uses only existing platform-authored practice questions; it does not generate new questions or add records to the bank.
- Strict matching on grade + subject + term + source question language. No cross-grade, cross-term or cross-language substitution.
- Question language is auto-selected from the exact matching source content; it is shown on the generated paper.
- Available paper size is constrained by actual matching content: 3–6 questions per grade/subject/term/language group. The total is scaled to 20 without inventing questions.
- Primary language policy guard: English is unavailable before grade 3 and French before grade 4, following Ministry 2026–2027 policy.
- Secondary stream-specific generation is blocked until official stream/subject/lesson mappings are verified. Grade-level secondary practice remains clearly non-stream-specific.
- No assumptions are made about secondary timetables or coefficients; Ministry Decision No. 36 (2026-09-09) rescinded Decision No. 20 on those matters.

## Curriculum integrity limits
- The Ministry's 2026–2027 notice confirms primary English from grade 3 and French from grade 4, preserves the middle-school general structure, and describes secondary content reorganization and continued common trunks.
- That notice does not establish exact lesson-by-lesson or competency-by-competency coverage for every generated item.
- Existing exercise alignment labels remain provisional. The generated paper reports `platform_mapping_pending_official_2026_2027_annual_progression` and `official_ministry_exam=false`.
- Every paper requires teacher review. It must not be represented as a Ministry examination or officially approved paper.

## Preserved content
- 1,167 practice exercises; 315 prepared term papers; 315 integrative situations.
- 12 grade levels, 105 grade/subject groups, three UI languages.
- No account system, no cloud synchronization, no automatic publishing.

## Tests performed
- `npm test`: PASS.
- `node --check web/app.js`: PASS.
- `python -m py_compile backend/app/main.py`: PASS.
- FastAPI TestClient: 11 existing GET endpoints returned HTTP 200; new `/api/v1/learning/exam-builder` POST returned valid student/teacher copies.
- Builder QA: exact grade/subject/term/language match; 20-point rubric; source language auto-selection; primary English start-year guard; unverified secondary stream guard.
- ZIP integrity: verified with `unzip -t`.
- APK: not built.
