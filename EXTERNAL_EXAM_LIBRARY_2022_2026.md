# External Algerian school assessment library (2022–2026)

Verified source landing pages are bundled for primary, middle and secondary resources. This is not a claim that every year/grade/document has been fetched.

Run in a network-enabled environment: `python tools/sync_external_exam_library.py`

The bounded discovery tool scans configured HTTPS pages and indexes links whose titles/URLs indicate 2022–2026 and assessment/solution terms. It does not download PDFs, bypass access controls, or republish third-party files. Each item starts with `rights_status=unknown_permission_required`. “Solution” in a title is not verification of correctness.

Sources include DzExams, Eddirasa and T-Onec.
