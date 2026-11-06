# Content and coverage audit — v1.3.6

## Scope
- Added a data-derived coverage report for all 105 indexed grade/subject pairs.
- Added an in-app coverage panel with stage totals and a per-grade breakdown.
- Added `GET /api/v1/learning/coverage` for the same report.
- No new exercises were authored; the bank remains at 852.

## Measured coverage
- Grades: 12
- Distinct indexed subjects: 14
- Grade/subject pairs: 105
- Pairs with exercises: 105
- Pairs meeting the eight-exercise target: 105
- Official lesson-sequence verified pairs: 0
- Secondary pathway matrices verified: 0

## Interpretation
This report measures whether the platform's own subject index has exercise records. It does not establish that every indexed subject is officially taught in that grade, nor that questions match the Ministry's 2026–2027 annual progression. Exercise content remains platform-authored practice. The secondary subject lists remain provisional.

## Quality safeguards
- Counts are generated from the curriculum index and exercise records, not manually asserted.
- Each grade/subject pair is reported separately.
- Minimum count is shown independently from official alignment.
- No new subject, pathway, coefficient, timetable, or official lesson claim was inferred.
