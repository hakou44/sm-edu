# Acquisition audit — v1.4.7

- Continues from v1.4.6 without changing the learning bank or server API.
- Adds an offline local PDF inbox processor for user-provided PDFs.
- Validates PDF signatures and a 50 MiB file-size limit; computes SHA-256 and skips duplicate content.
- Copies files to a private pending-rights queue and extracts selectable text page-by-page.
- Flags image-only/empty pages for OCR; no OCR is claimed or performed.
- Creates per-document review metadata. Rights, source authenticity, curriculum alignment and solution verification remain unverified by default.
- No automatic question creation, publication, or exercise-bank changes.
- External PDF download remains blocked in this build environment by DNS resolution failure; 0 remote PDFs downloaded.
- Existing content remains: 1,167 exercises, 315 term exams, 315 integrative situations.
- APK not built.
