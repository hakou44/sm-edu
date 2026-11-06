# Content and pathway audit — v1.3.5

Academic year: 2026–2027  
Country: Algeria  

## Scope
- Added 16 candidate subject-planning records: 2 first-year common cores and 7 streams represented for both second and third year.
- Each record separates candidate common subjects from candidate specialization subject areas.
- Arabic, French and English labels are provided.
- The interface presents the selected pathway/grade guide in the subject index and exercise-bank landing page.
- A read-only API endpoint exposes the catalogue.

## Verification status
- Officially verified pathway/grade matrices: **0 / 16**.
- Verified exercise assignments to a specific stream: **0**.
- Subject inclusion, naming, hours, coefficients and detailed annual progression remain pending comparison with current Ministry documents for 2026–2027.
- Candidate lists are a navigation/planning aid only, not an official timetable or claim of exact curriculum coverage.

## Existing exercise bank retained
- Total exercises: **852**.
- Grade/subject index pairs: **105**.
- No new questions were added in v1.3.5.
- All exercises remain platform-authored practice content, not official ministry papers.

## QA performed
- Frontend smoke tests and JavaScript syntax validation.
- Python bytecode compilation.
- FastAPI health, catalog, learning-structure and secondary-pathway endpoint checks.
- Matrix schema, uniqueness, translation and provisional-status checks.
- ZIP integrity check.
