# Stage 1 — Stability and release integrity (v1.6.4)

## Changes
- Corrected stale README release heading (1.6.3 → 1.6.4).
- Corrected the PDF candidate API test to expect the actual backend version (1.6.4, not 1.5.1).
- Added `tests/release_integrity_test.py` to check package, FastAPI, API response, README and PWA cache versions.
- Expanded `npm test` to run smoke, curriculum API, PDF candidate API and release-integrity tests.

## Verification performed
- `node --check web/app.js`: PASS
- `node tests/smoke_test.js`: PASS
- `python tests/curriculum_api_test.py`: 5 tests PASS
- `python tests/pdf_candidate_api_test.py`: PASS (PDF upload/extraction, rights gate, manual review, non-publication, OCR and API routes)
- `python tests/release_integrity_test.py`: PASS
- Python compilation of backend modules: PASS

## Environment limitations
- Android APK compilation was not run: this environment does not provide a configured Android SDK/Gradle project.
- The Python runtime emitted an unrelated spreadsheet warmup warning during startup; it did not affect test results.
- This stage does not yet implement production authentication or PDF endpoint authorization. Those are Stage 2 requirements; do not expose the review/import endpoints publicly before they are implemented.
