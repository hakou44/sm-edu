# ST-1AS support pack — الأولى ثانوي جذع مشترك علوم وتكنولوجيا

## What was added
- **100 new exercises with worked solutions** in `web/data/exercise-bank-2026-2027.json` (ids `ST1AS-MATH-01…`, `ST1AS-PHYS-01…`, `ST1AS-SVT-01…`, `ST1AS-INFO-01…`).
  - الرياضيات: 28 · العلوم الفيزيائية: 28 · العلوم الطبيعية: 24 · الإعلام الآلي: 20.
  - Spread over the three terms (T1/T2/T3) in every subject; difficulty mix مبتدئ / متوسط / متقدم.
  - 77 multiple-choice (3 choices) + 23 typed numeric answers (`accepted_answers`).
  - Every item has `solution`, `explanation` and ≥ 2 `solution_steps`.
- **12 new term papers (variant B)** in `web/data/term-exams-2026-2027.json`: one per subject × term, marked out of 20 with a full answer key.
  - Mathematics / Physics / Natural sciences: 8 questions × 2.5 pts, 60 min.
  - Computer science: 5 questions × 4 pts, 45 min.
- The prepared-paper launcher in `web/app.js` now picks randomly between the existing paper and the new variant for the same grade/subject/term (never the same one twice in a row).
- Service-worker cache renamed to `sm-school-ai-v1.6.4-st1as` so installed copies fetch the new data.
- Re-runnable generator: `python tools/build_st_1as_support.py` (content in `tools/st_1as_content_part1.py` and `part2.py`; replaces the pack instead of duplicating it).

## Limits (read before publishing)
- Platform-authored practice content, **not** official Ministry material, and not verified against the 2026–2027 annual progressions. Term placement is a provisional platform mapping.
- Arithmetic in the items was re-checked by script and by hand; language and pedagogy still need teacher review (`language_review: requires_teacher_editorial_review`).
- "التكنولوجيا" is listed as a specialization candidate for this common core but is not a subject in the exercise bank, so it is not covered by this pack. Adding it requires a new indexed subject (105 → 106 grade/subject pairs) and matching catalog/coverage updates.
- Python API tests were not run here (FastAPI is not installed in this environment); `node tests/smoke_test.js` passes.
