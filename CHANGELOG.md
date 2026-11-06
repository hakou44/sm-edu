## v2.1.6 — start the Tasnim fetch script from the app
- New in-app panel «🔄 تشغيل سكريبت جلب تسنيم (للمشرف)» inside the Tasnim library: start the fetch for every grade or only the open grade, follow the run status (polled every 45 s) and refresh the index automatically when the run succeeds.
- The script still runs in GitHub Actions (it needs a server with internet; the browser/WebView cannot scrape Tasnim because of CORS). The app calls `workflow_dispatch` on `publish-learning-content.yml` with the owner's own fine-grained token, stored in the device's localStorage only and sent only to `api.github.com`.
- Workflow: `workflow_dispatch` now takes `grades` and `content` inputs, passed through environment variables (no shell interpolation); scheduled and push runs behave exactly as before.
- Service worker never intercepts `api.github.com`; cache key `sm-school-ai-v2.1.6-sm-education-r1`.
- No second run is started while one is queued or running. Metadata synchronised at 2.1.6; new test `tests/v2_1_6_tasnim_sync_test.js`.

## v2.1.5 — full content fetch
- Publishing workflow now fetches exams, homework, lessons, exercise series and their solutions as PDF and Word (`--include-word`), up to 400 files per grade per category and 25 MB per file (was 120 / 15 MB, PDF only).
- Fetch stops cleanly after 300 minutes; index, files and resume state are always committed (`if: always()`); job timeout is 330 minutes; the 900 MB size guard now runs after the commit so it blocks publishing only, not saving progress.
- Deployment guide documents size limits, multi-run first sync and the `examsBase` option for hosting files elsewhere.

## v2.1.4 — full project audit and fixes
- Security: lesson titles and icons coming from the remote AI-course feed (or its cached copy in localStorage) were inserted into the page without HTML escaping; they are now escaped, and the feed validator rejects non-string/oversized titles and icons.
- Lesson updates: the status message no longer claims "updated N lessons" on every check when the feed version has not changed; the feed URL shown by `SM_AI_COURSE_SYNC.feedUrl()` now matches the URL actually fetched (it honours the saved `smContentBase`).
- Branding: the exit dialog, shared/printed family and learner reports now say "SM éducation" instead of "SM SCHOOL AI" (the local-backup file marker is unchanged so older backups still restore).
- Level switcher: label and group names are translated (Arabic/French/English) and follow the app language.
- Service worker: removed the duplicated `styles.css` entry, pre-caches `curriculum-2026-2027.json` (best effort) so curriculum views work offline after first install; new cache key `sm-school-ai-v2.1.4-sm-education-r1`.
- Packaging: removed the bundled (empty) `backend/data/parents.sqlite3` — it is git-ignored and is re-created on first use.
- Docs: Android build guide now requires JDK 21 (as the CI workflow and Capacitor 7 do); deployment guide now matches the workflow limit of 120 files per level.
- Metadata synchronised at 2.1.4 (package, FastAPI, README, footer, service worker, tests).

## v2.1.3 — content publishing and live library sync
- Single public HTTPS content base (`publicContentBase`) for the AI lesson feed, the Tasnim index and licensed files; manual in-app Tasnim index refresh with cached fallback.
- Two validated lesson updates (effective AI prompts, safe robotics prototyping); GitHub Actions pipeline for GitHub Pages and a weekly, permission-gated Tasnim refresh. See V2.1.3_RELEASE_REPORT.md.

## v2.1.1 — Groq direct migration
- Groq is the only live generative-AI provider, called directly from the app with a user-entered key; the server endpoints are offline fallbacks. See V2.1.1_RELEASE_REPORT.md.

## v2.1.0 — modern platform and stability pass
- Unified active version metadata at 2.1.0 across package, FastAPI, health/catalog responses, PWA manifest, service-worker cache and tests.
- Added responsive connection status, skip-to-content accessibility, touch-friendly controls, focus visibility and reduced-motion support.
- Service worker now falls back to index.html only for navigation requests; API/data/script requests fail transparently when offline instead of receiving HTML.
- Updated release-integrity tests and PDF API test to validate the current release.

## v2.0.0 — addendum: Tasnim library inside the app
- New `web/tasnim-library.js`: the Tasnim card (test-bank page and grade pages) becomes an in-app library — filters (subject, term, "with solution", search), per-paper download with progress, "download all shown" with cancel, on-device storage in IndexedDB (kept across app updates), an in-app viewer (PDF) and 💾 save/share. No browser tab or external site is opened; the source is credited as text.
- The phone's back button / browser back closes the viewer first. Papers are read from the app itself or from the optional `examsBase` in `web/config.js` (host the `exams/` folder elsewhere to keep the APK small; that host must allow CORS).
- `web/sw.js`: caches only successful responses (a 404 could be cached forever before), leaves `/exams/` to the library, new cache key `sm-school-ai-v2.0.0-tasnim-library`. `v2-pro.js` now calls `window.tasnimPanel` so the library replaces its simple list.
- `tests/tasnim_library_test.js` added to `npm test`.

## v2.0.0 — addendum: Tasnim fetch tool rewritten
- `tools/fetch_tasnim.py` now follows the real site layout (grade page → `dz-exams-<grade>-<subject>` pages → paper posts → Google Drive "download pdf" links). The previous version looked for direct `.pdf` links on the grade page and would have found nothing.
- Same CLI contract (`--confirm-permission`, `web/exams/`, `web/data/tasnim-index.json`) plus `--subjects`, `--discover-only`, `--refresh`, `--max-mb`; resumable (`imports/tasnim_state.json`), SHA-256 de-duplication, robots.txt, polite delay, stops after 3 consecutive 403/429, failures listed in `imports/review/tasnim-fetch-failures.json`.
- Index entries gain `season`, `source_url`, `sha256`, `bytes`; `term`, `solution`, `file`, `grade`, `subject`, `title` are unchanged, so the app needs no change.
- New `tests/tasnim_fetch_test.py` (offline, local fake site) added to `npm test`.

## v1.19.0
- Back button: guard history entry + in-app exit dialog; Capacitor back listener uses the same handler.
- Tasnim: fixed mistyped domain (h-onec.com → t-onec.com), one compact card per grade.
- Test bank page simplified (archive/PDF/admin/server panels removed from the student view).
- Exercise bank: cross-grade repeated questions shown only in the lowest grade (1,581 → 756 shown, data files untouched).
- AI: 3-step Groq setup card, clear no-key/no-server message, smart teacher waits for bank.
- Navigation reduced to 5 entries + "More".

## v1.18.1
- Added a five-stage competency-oriented pedagogical cycle to each weekly revision session, with independently checkable stages and persisted progress.
- Fixed generated weekly plans so five sessions share the configured daily time budget instead of each receiving the full budget.
- Preserved v1.18.0 local plans and storage key; updated PWA cache and version metadata.

## v1.13.0
- Added local-first Home Learning Centre with homework, revision goal, flashcards and interactive maths/physics starters.
- Added explicit curriculum verification governance; unverified content remains labelled as platform practice.
- Added study-centre data to backup and service-worker cache.

## v1.12.0
- Quality pass: answer positions rebalanced, cross-grade repeats flagged (worklist CSV), four-criteria rubric on situations, admin-token guard on review routes, Groq key in header, shared bank loader and SW pre-cache. See V1.12.0_RELEASE_REPORT.md.

## v1.11.1 — Generic question cleanup
- Replaced the four generic "organised learning" questions (14-0067, 14-0148, 14-0226, 14-0304) with subject-specific questions on mass and units; ids preserved, answer keys of 4 term-exam papers and 4 integrative situations synchronized.
- `tools/build_v1_11_dedupe.py` now also applies `GENERIC_REPLACEMENTS`; bank `coverage.generic_question_cleanup_v1_11_1` and report total `generic_questions_replaced_v1_11_1` added.
- Open finding: many questions repeat identically across grades (12 questions appear in all 12 grades); not changed here.

## v1.11.0 — Legacy duplicate cleanup
- Replaced the 20 redundant exercises (16 duplicate groups) listed in the v1.10.0 release report with new platform-authored multiple-choice questions; ids, grade, subject, term, topic and lesson are preserved.
- Synchronized the embedded answer keys of 19 term-exam papers and 19 integrative situations; added a guard that no paper or situation contains two equivalent questions.
- Replaced records carry `content_revision` (`replaces_duplicate_of`); `content_origin` is unchanged. Coverage report version 1.11.0 with `legacy_duplicates_replaced_v1_11`; bank `coverage.dedupe_v1_11` block added.
- Added `tools/build_v1_11_dedupe.py` (idempotent, `--check` mode), `tests/dedupe_test.js` and `tests/dedupe_tool_test.py`; PWA cache key `sm-school-ai-v1.11.0-dedupe`.
- Still open: generic questions in the 4 middle-school physics/technology pairs (term 1 item) and typed numeric answer keys are unchanged.

## v1.10.0 — Content depth pack
- Added 192 platform-authored multiple-choice exercises (one per term, three per pair) for the 64 grade/subject pairs that had only 11 items; the minimum per indexed pair is now 12.
- Exercise bank 1,389 → 1,581; coverage report regenerated (version 1.10.0) with a `depth_pack_v1_10_exercises` total and a `depth_pack_v1_10` coverage block.
- Items carry `content_origin: platform_authored_depth_pack_v1.10.0`, are marked not official, make no official-sequence claim and assign no secondary pathway.
- Added `tools/build_v1_10_depth_pack.py` (deterministic, idempotent, duplicate- and integrity-checking) and `tests/depth_pack_test.js` / `tests/depth_pack_tool_test.py`.
- Known legacy issue (not changed here): 16 groups / 20 extra records in earlier packs repeat a question within the same grade/subject pair; listed in the v1.10.0 release report.

## v1.9.0 — Long-term learner memory
- Added a learner-scoped longitudinal memory summary derived from saved progress, recurring recorded mistakes and reasoning-entry counts.
- Subject summaries show sample-size evidence bands; recurring mistakes are surfaced only after at least two recorded occurrences.
- Added optional dated memory snapshots, capped at 52 per learner and 520 overall; repeated saves on the same day replace that learner's daily snapshot.
- Memory remains local, is included in the existing local backup managed-key set, and is removed with the learner profile.
- No predictive diagnosis or automatic external AI transmission is performed; conclusions remain descriptive and require adult review.
- Added regression tests for learner isolation, minimum evidence, snapshots, and rendering.

## v1.8.9 — Smart teacher reasoning coach
- Added optional per-question reasoning notes to Smart Teacher sessions; no additional text is transmitted automatically.
- Saved learner reasoning, selected answer, correctness and verified explanation in a learner-scoped local journal (bounded to the latest 500 records).
- Added an explicit user action to request formative reasoning analysis through the existing AI tutor endpoint. Demo-mode responses are clearly labelled and are not represented as AI analysis.
- Added learner deletion and local backup/restore lifecycle support for the reasoning journal.
- Preserved existing exercise banks, curriculum data, adaptive learning and parent account workflows.

## v1.8.8 — Adaptive learning trends and spaced review
- Added a 7-day vs preceding 7-day performance comparison per subject, requiring at least three scored answers in each window before showing a trend.
- Added improving, declining, stable and insufficient-evidence states without changing the existing overall mastery thresholds.
- Adaptive weekly plans now select differentiated tasks for support, improving, mastered and low-evidence subjects; each session records its strategy, trend, reason and review interval.
- Expanded the progress dashboard with recent-period comparison and retained local-only learner data.
- Preserved all v1.8.7 features and existing backup compatibility.

## v1.8.6 — Transaction-safe backup restore
- Added a shared transactional restore helper for local JSON backups and parent-authorized encrypted device transfers.
- Snapshots all managed learning-data keys and rolls them back if a browser storage write fails.
- Preserves unrelated local settings and removes stale learner-specific histories only within the managed backup scope.
- Added regression coverage for successful replacement, unrelated-key preservation and rollback after simulated quota failure.
- Updated API/PWA/package release metadata; no APK build included.

## v1.8.5 — Parent account protection
- Added persistent sign-in throttling by hashed account-email and client-IP buckets.
- Five failed attempts in a rolling 15-minute window trigger HTTP 429 with `Retry-After`.
- Successful sign-in clears the matching failure buckets; expired attempts are pruned.
- Preserved parent-only roles, local learner data, encrypted one-time device transfer and existing learning APIs.

## v1.7.5 — Parent weekly learning review
- Added a seven-day parent summary with activity and accuracy totals, per-subject breakdown, and conservative support/strength indicators.
- Recommendations require a minimum answer count and are explicitly labelled as guidance, not official assessment.
- Added Arabic, French, and English presentation and dedicated regression tests.

## v1.7.4 — Lessons for Grade 4 Middle (BEM year)
- Added 34 supplemental lessons for Grade 4 Middle across all 10 subjects (Arabic 3, Mathematics 6, French 3, English 3, Natural sciences 3, Physical sciences 4, History-Geography 3, Islamic education 3, Civics 3, Informatics 3). Total extra lessons: 113 across 36 grade/subject pairs.
- The Home school lesson step and the lesson library use them automatically for Grade 4 Middle learners.
- Numeric examples machine-checked; `tests/lessons_extra_test.js` now requires the Grade 4 Middle coverage.
- Platform practice content pending teacher review; not mapped to verified Ministry units.

## v1.7.3 — More lessons for the Home school lesson step
- Added `web/lessons-extra.js`: 79 supplemental lessons (26 grade/subject pairs, at least 2 each) for Grade 3 Primary (7 subjects), Grade 2 Middle (10 subjects) and Grade 1 Secondary common core (9 subjects). Lessons are grade-specific; language-subject lessons are written in the target language. Numeric examples were machine-checked.
- Lesson library lists the lessons of the selected grade first (stage-level starter lessons remain available); lesson pages fall back to the Arabic text when a translation is missing.
- Home school: the lesson step picks a lesson of the child's grade and subject and advances to the next one as lessons are completed; other learners' completions do not affect the rotation.
- Added `tests/lessons_extra_test.js` and extended the home school and release integrity tests.
- Content is platform practice material pending teacher review, not official Ministry content.

## v1.7.2 — Home school: guided school day and weekly timetable
- New "Home school" (المدرسة المنزلية) page in the main navigation, one card per learner profile.
- Suggested weekly timetable generated from the subjects of the child's grade (English from primary year 3, French from year 4): sessions per subject are spread over the chosen study days (default Sunday–Thursday), never twice the same subject on one day, with a balanced daily load. Weekly load per subject is shown.
- Guided school day: each session has three ordered steps — lesson (starter lesson library), exercises (exercise bank for the grade/subject) and review (the child's saved mistakes) — with per-step completion, recorded activities of the day, and a subject needing support placed first.
- Settings per child: start time and study days. Data is stored locally (`smSchoolHomeSchool`), included in backup/restore, and removed with the learner profile.
- The timetable and load are a suggested home routine; official hours and coefficients remain unverified (see CURRICULUM_GOVERNANCE_2026-2027.md). No new server calls or personal data.
- Added `tests/home_school_test.js` and integrated it into the test script; release integrity test extended.

## v1.7.1 — Study streak tracking
- Added a study-consistency panel to the learner progress dashboard: current consecutive-day streak, best streak and total active study days.
- Streaks are calculated from the active learner's existing local activity records; duplicate activities on one date count as one study day.
- A streak remains current when the learner has studied today or yesterday, so it does not reset at midnight before the next study session.
- Added deterministic tests for empty history, duplicate dates, consecutive days and broken streaks.
- No new personal data collection, server calls or backup fields; the feature derives from existing local progress.

## v1.7.0 — Speed, offline tutor and mobile comfort
- Startup no longer downloads/parses ~6 MB of exercise/exam JSON: heavy data now loads only when opening exercises, tests, certificates, library or subject pages (home, progress, tutor, parents, computing, translator stay light).
- Service-worker install precache reduced to core files; large data files are cached on first use.
- AI tutor: offline fallback answers from the local exercise bank (lesson, practice with answers) when no server is reachable; new in-app tutor-server setting (HTTPS address + health test). The Groq key stays on the server and is never placed in the app.
- Mobile: bottom navigation (Home, Exercises, Tests, Tutor, Progress), larger text and 44px touch targets, reduced-motion support.
- Added tests: offline tutor; lazy-load aware smoke tests.

## v1.6.9 — Informatics and AI practice pack
- Added 60 platform-authored Informatics (الإعلام الآلي) exercises: 10 each for Middle 1–4 and Secondary 2–3 (24 typed numeric, 36 multiple-choice) covering binary/hex numbering, algorithms, Python tracing, spreadsheets, databases/SQL, networks, digital safety, AI/ML concepts and data ethics.
- Exercise bank 1,329 → 1,389; typed-answer items 35 → 59; Informatics per grade now 21–24 items for Middle 1–4.
- All numeric answer keys were machine-verified; coverage report and tests updated.
- Content is practice material pending teacher review; not official Ministry material.

## v1.6.8 — Family daily planner and parent report
- Added a per-child daily study schedule on the parents page: start time, session length (20–60 min), 1–4 sessions per day and selectable study days.
- Sessions rotate through the child's grade subjects; the first session of each day goes to a subject with at least three scored activities and accuracy below 50%.
- Per-day completion checkboxes; completion is stored per learner on this device.
- Seven-day parent report per child (sessions done vs planned, activities, accuracy, subjects needing support) with share/copy and CSV export.
- Family schedules are included in local JSON backup/restore and removed with the learner profile.
- The schedule is a suggested home routine, not an official Ministry timetable. No server, account or Groq transfer was introduced.

## v1.6.5 — Family learner profiles
- Added up to 20 independent local learner profiles with name and current grade.
- Added profile switching and profile-specific progress, accuracy, test history and CSV reports.
- Tagged new activity, test history and remediation records with the active learner ID.
- Added confirmed profile deletion with cleanup of that learner’s tagged progress and test records.
- Included learner profiles and active profile selection in validated local backup/restore.
- Kept learner data on-device; no accounts or cloud sync were introduced.
- Preserved existing educational content, exercise bank, tests, AI tutor and API contracts.

## v1.6.4 + ST-1AS support pack
- Added 100 platform-authored exercises with worked solutions for Grade 1 Secondary common core Science & Technology (mathematics 28, physical sciences 28, natural sciences 24, computer science 20), balanced across the three terms.
- Added 12 variant term papers (one per subject and term) with 20-point answer keys; the paper launcher rotates between the original and the new variant.
- Exercise bank 1,229 → 1,329 items; term papers 315 → 327; Grade 1 Secondary bank 131 → 231.
- Content is practice material pending teacher review; see `ST_1AS_SUPPORT_PACK_NOTES.md`.

## v1.6.3 — UI, learning content and integration fixes
- Modernized visual system and added persistent light/dark mode.
- Expanded offline academic glossary (Arabic, French, English, Spanish, German).
- Added six AI/computing lessons covering data literacy, Python, networks, databases, cybersecurity and AI ethics.
- Added targeted applied exercises and integrative situations for Grade 3 Primary, Grade 2 Middle and Grade 1 Secondary across indexed subjects.
- Improved external resource fallback so source links remain visible when no individual PDF records have synced.
- Earlier server-side AI configuration was retired in v2.1.1; the app now connects directly to Groq.
- All newly authored educational content is clearly marked as platform practice, not official Ministry material; teacher review remains required.

## v1.6.1 — Larger dictionary + French/English lessons
- Offline lexicon grown from ~110 to ~410 entries (common words, body, food, animals, nature, home, transport, jobs, places, weekdays/seasons, more verbs/adjectives, school subjects, tech and science terms, 40+ phrases). New dictionary categories.
- All 8 AI & computing lessons (summary, key points, activity, code sample, quiz questions and explanations) now available in Arabic, French and English (`web/ai-course-i18n.js`); glossary grown to 22 terms with trilingual definitions.
- Service-worker cache bumped to v1.6.1.

## v1.6.0 — Offline translator + AI & computing learning path
- New "Smart translator" page (offline): built-in lexicon (`web/lexicon.js`, ~110 words/phrases in Arabic, French, English, Spanish, German), language auto-detection, Arabic/diacritic-insensitive matching, greedy phrase matching, typo tolerance, coverage report, text-to-speech when the device supports it, and local history. Sentence translation is approximate word-by-word, not full machine translation.
- "AI & computing" page is now a real learning path (`web/ai-course.js`): 8 short lessons in 4 modules with activities and self-check quizzes recorded in the progress dashboard, a trilingual glossary and a binary converter. Lesson text is Arabic; titles and terms are trilingual.
- New local keys `smSchoolTranslateHistory` and `smSchoolAiLearn` are included in the local backup. Service-worker cache bumped to v1.6.0.

## v1.5.7 — Local evidence intake for official curriculum review
- Added a multilingual curriculum evidence intake area to the governance panel.
- Imports the existing CSV review template, validates grade/subject/term metadata and strict evidence requirements for reviewer-marked verified rows.
- Ministry evidence must use HTTPS on `education.gov.dz` or a subdomain and include a page number, unit, lesson, competency, publication date, reviewer identity/role and verification date.
- Stores the review ledger in browser local storage only; provides validation feedback and CSV export.
- No imported row is automatically promoted to the official curriculum registry or used to relabel exercises/exams.
- Added `GET /api/v1/curriculum/evidence-policy`; preserved existing API contracts and content counts.

# Changelog

## v1.5.1 — Local multilingual OCR for scanned exam PDFs
- Added optional on-device/server-local Tesseract OCR for scanned/image-only PDF pages.
- Supports Arabic, French and English, including mixed-language OCR.
- Added OCR language selector and action to the PDF review workspace.
- OCR runs only on pages without extractable text, with optional API page selection.
- OCR output is saved into the private review text and remains editable; no auto-publication.
- Added explicit missing-engine/language-pack errors and setup instructions.
- Preserved existing exercise bank, exam library, review gates and API behavior.


## v1.4.8 — PDF review workspace
- Added local PDF upload API (raw `application/pdf`, 50 MB maximum, PDF signature validation).
- Added private review queue with SHA-256 duplicate detection, page-by-page text extraction when PyMuPDF is installed, and OCR-required status for image-only PDFs.
- Added PDF preview, extracted-text editing, reviewer notes, and explicit review-status controls in the tests/archive screen.
- Added list, file-preview, and update endpoints under `/api/v1/archive/pdf-review`.
- Imported documents remain private and are never automatically published to the exercise bank. Rights status is a reviewer record, not a legal determination.
- Existing exercise bank, term exams, integrative situations, AI tutor and prior archive APIs remain unchanged.

# Changelog

## v1.0.7
- Added a timed BEM/BAC mock-exam simulator with shuffled question and answer order, automatic timeout submission, explanations, score calculation, and local progress recording.
- Added subject selection to the AI tutor and sends the selected subject with the existing chat request.
- Improved the server-side tutor instructions for grade-aware, step-by-step explanations, examples, and curriculum/source integrity.
- Preserved the existing API routes and three-language interface. Demo questions are clearly labelled as non-official.

# Changelog

## 1.0.1 — 2026-10-30
- Added interactive sample mathematics exercises with answer checking and proposed solutions.
- Added sample mock tests with automatic score calculation and local score persistence.
- Added copy and retry actions to AI tutor responses.
- Made the AI API base configurable for web and Android deployments; removed the hard-coded localhost URL.
- Persisted the selected language and school grade between sessions.
- Added `/api/v1/catalog` for the Algerian school-year catalog.
- Added per-client in-memory AI request quota and configurable CORS origins.
- Updated PWA cache version and Android Capacitor scripts.

## 1.0.0
- Initial multilingual platform shell, school levels, sections, PWA shell and FastAPI Groq proxy starter.


## 1.0.2 — 2026-10-30
- Added a multilingual learning-progress page with completed activities, accuracy, completed tests and a daily goal.
- Persisted exercise and test activity locally, with duplicate-submission protection for each attempt.
- Added recent activity history and a user-controlled clear-history action.
- Added progress summary to the home dashboard and updated the PWA cache version.

## v1.0.3 — Algerian curriculum alignment
- Added 2026-2027 academic-year metadata to the app and catalog API.
- Corrected primary foreign-language availability: English from Year 3, French from Year 4.
- Added Arabic/French/English curriculum reference notices and explicitly avoided claiming unverified lesson-by-lesson alignment.
- Bumped PWA cache and package version. Backend endpoints and request/response contracts are preserved.


## v1.0.4 — Curriculum content foundation
- Added a structured Algeria 2026-2027 curriculum index covering all 12 school years and subject entries.
- Added three-term content scaffolding in the subject view in Arabic, French and English.
- Added explicit pending-verification labels; no unverified lesson titles are presented as official.
- Added `GET /api/v1/learning/structure` without changing existing API contracts.
- Updated PWA cache and package/API version to 1.0.4.

## v1.0.5 — 2026-10-30
- Expanded supplementary practice packs for mathematics, Arabic, natural sciences, and physics across applicable school stages.
- Added explicit non-official labelling to generated practice activities and grade/subject-aware routing.
- Added an official-source register distinguishing current ministry notices from historical 2018 annual-plan references that require 2026-2027 confirmation.
- Localized exercise controls and feedback in Arabic, French, and English.
- Preserved existing AI chat route and API request contract.


## v1.0.6 — 2026-10-30
- Added an interactive seven-day revision planner for BEM and BAC preparation.
- Prioritizes subjects using locally saved practice performance, with a safe neutral fallback when there is no history.
- Saves plan progress locally and allows each session to be marked complete or the plan rebuilt.
- Clearly labels all planner tasks as platform-generated practice, not official ministry exam papers.
- Preserved existing AI chat and API contracts; bumped app, backend, and service-worker cache versions.

## v1.0.8
- Added a starter lesson library with nine short, level-grouped supplemental lessons, learning goals, explanations, self-check activities and suggested answers in Arabic, French and English.
- Added lesson completion tracking to the local learning history.
- Replaced the basic parent portal landing card with a local progress snapshot: totals, accuracy, activity counts by subject and recent activity.
- Added CSV export of the locally stored progress history. The dashboard explicitly states that this information remains on the device and is not automatically shared.
- Preserved the official parents portal link and existing API contracts. Lesson content is clearly labelled supplemental and is not represented as ministry-approved curriculum content.


## v1.1.0 — Exercise bank
- Added a bundled, offline-capable exercise bank with 72 original multiple-choice exercises and worked explanations.
- Covered all 12 grades across primary, middle and secondary school, with mathematics, Arabic and age-appropriate science subjects.
- Added grade selection, subject grouping, answer checking, and reveal-solution actions; practice attempts are recorded in local progress.
- Clearly labels the bank as platform-created practice, not official ministry exam papers.
- Updated service-worker cache and app/API version to 1.1.0.


## v1.1.0 — Expanded Exercise Bank
- Replaced the small 72-question starter set with 420 platform-authored exercises covering all 105 grade/subject pairs listed in the current curriculum index and all 12 school years.
- Added four exercises for each indexed grade/subject pair, each with a suggested answer, explanation and numbered solution steps.
- Added 117 multi-step applied problems.
- Added term, topic, difficulty and text-search filters to the exercise-bank interface.
- Added explicit metadata for term, lesson, topic, difficulty and exercise type.
- Updated the service-worker cache, app version and backend version to 1.1.0.
- Clearly labels all questions as supplemental platform practice, not official Ministry papers or answer keys; detailed alignment with official annual progressions remains to be verified.


## v1.1.1 — Focused practice and mistake review
- Added randomized practice sessions with up to 10 exercises from the current grade/subject/filter selection.
- Added a locally persisted mistake list per grade and subject, with a dedicated review session.
- Correct answers clear saved mistakes; incorrect answers are retained for targeted revision.
- Added session completion summary and responsive controls.
- Preserved the existing 420 authored exercises and all backend/API contracts.


## v1.2.0 — Typed-answer practice

- Added 12 original numeric-answer exercises, one for each grade, to the existing exercise bank (432 total).
- Added typed-answer UI with Arabic/Persian digit normalization and exact accepted-answer matching (including equivalent accepted fraction/number forms where listed).
- Typed-answer questions use the same progress tracking and persistent mistake-review flow as multiple-choice questions.
- Existing API routes and server behavior are preserved; no accounts or cloud sync were introduced.
- All new questions are marked `platform_practice_not_official`; they are practice content, not official ministry exam material.


## v1.3.0 — Expanded Algerian curriculum-indexed practice bank

- Expanded the exercise bank from 432 to 747 items (+315 new practice exercises).
- Added three new subject-specific exercises to each of the 105 indexed grade/subject pairs, across all 12 school years.
- Distributed new exercises across terms 1–3 and supplied an answer, explanation and solution steps.
- Added clear provenance and alignment metadata: new items are platform-authored practice, not official ministry questions; detailed lesson-level alignment remains pending verification.
- Preserved the existing 12 typed numeric exercises, 117 multi-step exercises, local mistake review, progress tracking and backend API contracts.
- Bumped package, backend, UI footer and PWA cache version to v1.3.0.


## v1.3.1 — Provisional lesson and competency mapping

- Added structured grade/stage/term/topic/lesson/competency-target metadata to all 747 existing exercises.
- Added term-based platform learning maps for all 105 grade/subject pairs, derived from the platform's exercise content.
- Explicitly marked all detailed lesson mappings as provisional and not officially verified; zero grade/subject pairs are claimed as confirmed against current 2026-2027 annual progressions.
- Recorded current Ministry policy constraints for primary English (year 3) and French (year 4) without extrapolating those notices into detailed lesson sequences.
- Updated learning-structure API metadata to disclose mapping status; preserved API routes and server behavior.
- Bumped package, backend, UI footer and PWA cache version to v1.3.1.


## v1.3.2 — Practice quality and cognitive-skill metadata

- Normalized difficulty values across Arabic, French and English records to one stable Arabic filter vocabulary, fixing inconsistent difficulty filtering for non-Arabic exercises.
- Added provisional cognitive-process labels (recall, understand, apply, analyze, reason), estimated practice time, and answer-mode metadata to all 747 exercises.
- Added a cognitive-skill filter and displayed skill/time guidance in exercise cards.
- Added per-exercise content-review flags to distinguish answer-key checks, pending human language review, and unverified official curriculum alignment.
- Preserved the existing 747 questions, 105 grade/subject pairs, backend routes, API contracts, local progress and mistake review. No new questions were counted in this patch; content growth remains gated by subject-level quality review.
- Bumped package, backend, footer and PWA cache to v1.3.2.


## v1.3.3 — Full subject coverage extension

- Added 105 original practice exercises: one extension exercise for every one of the 105 grade/subject pairs in the existing Algerian curriculum index.
- Exercise bank now contains 852 exercises: 840 multiple-choice and 12 typed numeric exercises.
- Every grade/subject pair now has at least 8 exercises (93 pairs) or 9 exercises (12 pairs).
- Added practical checks across Arabic, French, English, mathematics, history/geography, Islamic education, civics, primary science, natural sciences, physical sciences, computing and philosophy, wherever those subjects occur in the existing grade index.
- Kept the 2026–2027 official lesson-sequence verification count at zero; this is platform-authored practice, not official ministry examination content.
- Preserved backend routes, AI chat contract, local progress and mistake-review behavior.
- Documented that secondary coverage is currently stage-level and still needs a branch-specific matrix validated against current Ministry documents.


## v1.3.4 — Secondary pathways foundation
- Added two first-year common-trunk labels and seven second-/third-year stream labels.
- Added a multilingual pathway selector with local persistence.
- Added explicit metadata: zero secondary subject matrices verified and zero exercises assigned to a verified stream.
- Preserved the 852-exercise bank, backend API contracts, local progress and mistake review.
- This is a navigation foundation, not a claim of complete branch-specific coverage.


## v1.3.5 — Secondary pathway subject planning matrix

- Added 16 candidate subject matrices covering both first-year common cores and all seven second/third-year streams.
- Added trilingual subject-area labels and a visible provisional-status warning.
- Added a read-only secondary pathway catalogue API endpoint.
- Officially verified pathway matrices: 0; verified exercise-to-stream assignments: 0.
- No new exercises; retained 852 exercises across the 105 existing grade/subject pairs.


## v1.3.6 — Transparent subject coverage audit
- Added a generated coverage report for the 105 grade/subject index pairs.
- Added a three-stage and per-grade coverage panel to the exercise bank.
- Added `GET /api/v1/learning/coverage`.
- No new exercises; no official alignment claims added.

## v1.3.7 — Subject-based term tests
- Replaced the generic tests landing page with a test builder using the existing 852-question exercise bank.
- Students can select any of the 12 grades, a subject, one term or all terms, and 5/10/15/20 questions.
- Questions are randomized per attempt; multiple-choice and typed numeric answers are both supported.
- Added automatic correction, mark calculation out of 20, topic-level strengths and review recommendations.
- Saved the latest 30 test summaries locally on the device; no account or cloud sync was added.
- Preserved the exercise bank and backend API contracts; no new questions were added.
- Test content remains platform-authored practice and is not represented as official Ministry exams. The question text itself is currently Arabic; UI controls are available in Arabic, French and English.

## v1.3.9 — Guided correction and focused retry
- Added a detailed post-test review for every question, showing the student's submitted answer and the correct answer.
- Added per-question explanations and expandable solution steps when those fields exist in the source exercise.
- Added a focused retry action that rebuilds a new attempt from incorrect answers only.
- Kept the review local to the device and preserved the existing 30-result history limit, scoring, exercise bank and backend routes.
- Escaped question and answer text before inserting the review markup.
- No new exercises were added; the bank remains 852 platform-authored practice exercises, not official Ministry exam papers.


## v1.3.9 — Personalized local remediation
- Added a post-test improvement plan that groups incorrect answers by topic and prioritizes topics with the most errors.
- Each topic shows the number of matching practice exercises and provides a direct action to open that topic's exercises for the same grade and subject.
- Added local history for the latest 20 remediation plans; no account, cloud synchronization, or external AI call is required for this feature.
- Added a no-error encouragement state and localized Arabic/French/English remediation labels.
- Kept the existing AI chat endpoint and exercise bank contents unchanged; recommendations are rule-based study suggestions, not an AI diagnosis.


## v1.4.0 — AI tutor learning workflows
- Added AI lesson explanation, original practice-question generation and written-answer feedback tasks.
- Added a multilingual tutor workflow selector and optional written-answer editor.
- The tutor endpoint originally used server-side credentials; v2.1.1 replaces this with direct in-app Groq access.
- Added explicit demo responses when no AI provider key is configured.
- Preserved the legacy chat route, existing API routes, local-only student progress, and all 852 exercise records.

## v1.4.1 — Term-balanced practice library

- Added 315 original platform-authored practice questions: one new question per term for each of the 105 indexed grade-subject pairs.
- Expanded the bank from 852 to 1,167 items: 1,155 multiple-choice and 12 typed numeric questions.
- Every indexed grade-subject pair now has at least one question tagged for each of the three terms; each pair has at least 11 questions overall.
- New items include keyed answers, explanations, and step-by-step solution notes, and are automatically available to the existing exercise and test builders.
- Updated transparent coverage report and PWA cache version.
- All new items remain labelled platform practice, not official Ministry questions. Annual progression and official lesson sequence remain unverified (0 verified pairs); human editorial review remains pending.
- Preserved existing APIs, local progress, test history, and no-account/no-sync design.


## v1.4.2 — Ready-to-use term examination papers
- Added 315 prepared term papers: one for each of 105 grade/subject pairs in each of three terms.
- Each paper references the existing bank questions, includes a complete answer key, explanations, solution steps and a 20-point marking scheme.
- Papers include grade-appropriate suggested duration (primary 25 min, middle 35 min, secondary 45 min); this is a platform suggestion, not an official duration.
- Added a prepared-paper action to the test builder and `/api/v1/learning/term-exams` endpoint.
- No duplicate questions were generated and the exercise bank remains at 1,167 records.
- All papers remain platform practice content; official annual progression alignment is not verified.


## v1.4.3 — Integrative situations and model solutions
- Added 315 structured integrative situations covering all 12 grades, 105 indexed grade/subject pairs and three terms.
- Each situation combines a contextual case, objective questions from the exact matching term, a written reasoning extension, self-review rubric and model solution outline.
- Added a dedicated test-builder action and a read-only API endpoint for the new library.
- Written extensions are not auto-graded; objective questions retain the existing correction and local progress behavior.
- Suggested durations are non-official. All content remains platform-authored practice; official progression alignment is pending verification.
- Preserved the 1,167 exercise bank and existing server/API contracts.


## v1.4.4 — Previous national exam archive index

- Added 38 catalogue entries: BEM and BAC for each year from 2008 through 2026.
- Added external source links and certificate/year navigation in the Tests page.
- Added `/api/v1/archive/exams` and offline cache support for the archive index.
- No external exam papers were imported or republished; rights review and solution provenance checks are required before local inclusion.
- No changes to the 1,167-exercise bank, 315 term papers, or 315 integrative situations.


## v1.4.5
- Added a 2017–2026 school-assessment source-discovery index for all 12 grades and three terms (360 indexed acquisition slots).
- Added primary, middle and secondary source directories and UI filters by stage, grade, year and term.
- Added API `/api/v1/archive/school-assessments` and offline cache support.
- No third-party PDF or answer key is represented as imported; current imported/extracted counts remain zero pending rights and content review.


## v1.4.6 — Direct PDF acquisition workflow
- Added two direct PDF URLs verified from source Download controls: BEM 2025 French and BAC 2025 Mathematics.
- Added three verified grade/subject/term listing pages (primary, middle and secondary).
- Added direct PDF links and truthful download/extraction status in the library UI.
- Added `/api/v1/archive/pdf-acquisition` and `tools/import_pdfs.py` for private PDF download, SHA-256 and PyMuPDF text extraction on a network-enabled host.
- Rights and human-review gates retained; no unverified content is published.
- No PDF binary could be downloaded in this build environment; 0 questions/solutions extracted.
- Preserved the existing exercise bank and server APIs.

## v1.4.8 — Offline PDF inbox and review queue
- Added `tools/process_pdf_inbox.py` for local/offline PDF intake.
- Added 50 MiB size limit, PDF signature validation, SHA-256 duplicate detection and page-by-page text extraction.
- Added OCR-required flags for image-only pages and per-file review metadata.
- Preserved pending-rights separation; no automatic publishing or exercise-bank changes.
- Updated PWA cache version and application version.


## v1.4.9
- Added heuristic question-candidate segmentation from reviewer-corrected PDF text.
- Added private candidate records with editable question/answer, grade, subject, term, topic and reviewer notes.
- Added rights-gated transition to `approved_for_manual_entry`; this is not publication and never modifies the exercise bank.
- Added candidate listing/extraction/update API routes and multilingual review controls.
- Enabled CORS PUT for the existing review-save flow.
- No new exercise-bank records; no accounts, cloud sync or APK build.


## v1.5.0
- Added a searchable local exam-excerpt catalogue for question candidates that have both human approval and a recorded reuse-rights clearance on their source document.
- Added metadata fields for exam year and exam type (BEM, BAC, term test, homework, practice, other).
- Added filters for text query, grade, subject, term, year and exam type through `GET /api/v1/archive/exam-library`.
- Added a multilingual search interface in the Tests area.
- Catalogue records expose source filename/page and proposed answer while explicitly retaining `official_alignment=not_verified` and `answer_verification=human_review_recorded_not_independently_certified`.
- Original PDFs are not served by the catalogue and excerpts are not inserted into the exercise bank automatically.
- Existing exercise bank remains 1,167 exercises, 315 term papers and 315 integrative situations.
- No new official exam PDFs were downloaded in this build; library records remain empty until the user imports, reviews, classifies and rights-clears source documents.
- No accounts, cloud sync or APK build.


## v1.5.2
- Added PDF page-structure analysis hints for math expressions, tables, embedded images and vector drawings.
- Added stored per-page analysis results, summary metrics and review UI.
- Added heuristic limitations and human visual-review requirements; no auto-publication.


## v1.5.3
- Added a multilingual question-understanding assistant for imported exam candidates.
- Produces givens, requested tasks, relevant concepts, a solution plan, and verification checks.
- This legacy server-side draft workflow is now heuristic-only; live tutor AI uses the direct in-app Groq client.
- Persists analysis separately and requires teacher review; never auto-publishes or inserts into the exercise bank.

## v1.5.4
- Added a curriculum-guarded exam builder with separate student and teacher copies.
- Strict grade/subject/term matching and a 20-point marking scheme.
- Enforced primary English/French start grades from current Ministry policy.
- Blocked stream-specific secondary generation until official mappings are verified.
- Preserved platform-practice disclaimers and teacher-review requirement.


## v1.5.5 — Algerian curriculum governance and verification workflow
- Added Ministry source registry with claim scopes and historical-source safeguards.
- Added governance registry for 105 grade/subject pairs and 16 candidate secondary pathway matrices.
- Added 7 scoped, source-attributed policy facts; no detailed annual progression is falsely marked verified.
- Added curriculum governance and coverage-audit APIs plus a CSV verification template.
- Added UI dashboard for confirmed policy facts, grade/subject records, secondary pathways and review status.
- Exam generation now balances platform cognitive-process tags where possible and labels them as non-official taxonomy.
- Preserved exact grade/subject/term/language matching and secondary stream safeguard.

## v1.5.7 — Page-anchored curriculum evidence review
- Added page-aware extraction of curriculum evidence candidates from locally imported PDFs after text extraction/OCR.
- Candidate excerpts retain source filename, page number, and a heuristic suggested field (unit/lesson/competency/unclassified).
- Added local API to list, extract, and annotate candidates with grade, subject, term, unit, lesson, competency, and reviewer notes.
- Candidate statuses remain pending/reviewed-candidate/rejected; official alignment remains `not_verified` and automatic verification/publication/registry updates are disabled.
- Added a review interface in the PDF workspace with editable candidate metadata and source-page excerpts.
- No new curriculum facts are asserted and no exercise-bank or exam counts were changed.

## v1.5.8 — Local learner backup and restore
- Added a local JSON backup and restore panel to the progress page.
- Included progress, test history, remedial/revision plans, selected learner settings, curriculum evidence review records, and exercise mistake lists.
- Added strict allowlist/schema checks, a 5 MB import limit, confirmation before replacement, and clear success/error feedback.
- Excluded API connection settings and credentials. No cloud upload, account, or new server API.
- No APK build.


## v1.5.9 — External Algerian exam resource library
- Added a unified directory of public source pages for primary, middle and secondary education.
- Added 2022–2026 filters for stage, year and document type.
- Added polite, bounded discovery tool for dated resource links; it does not download or republish third-party PDFs.
- Added API `/api/v1/archive/external-library` and integrated the library into the tests page.
- Rights remain unknown until explicitly cleared; solution labels are candidates, not correctness verification.
- Network DNS unavailable in build environment; no individual PDFs fetched or mirrored. No APK built.

## v1.6.6 — learner-aware AI tutor
- Personalize tutor requests with the active learner name and a compact summary of recorded subject performance; the tutor is instructed to use this context supportively and avoid shaming labels.
- Save the last 30 tutor exchanges separately for each learner on the device, restore them when that learner is selected, and provide a clear-history action.
- Include learner-specific tutor histories in local backup/restore and remove a learner's tutor history when their profile is deleted.
- Preserve the existing Groq server integration and demo-mode behavior; no cloud conversation storage is introduced.


## v1.6.7 — adaptive learning and weekly study plan
- Added local per-learner performance analysis by subject and cautious mastery states.
- Added automatically prioritized seven-day revision plan with completion tracking.
- Added direct practice shortcuts and adaptive CSV report export.
- Added adaptive plan backup/restore and deletion with learner profile.

## v1.7.7 — Learner diagnosis and targeted support
- Added per-learner 30-day subject performance diagnostics.
- Added evidence thresholds to avoid premature weakness labels.
- Added a multilingual seven-day remediation plan and integrated it into the home-school page.
- Kept analysis local to the device and clearly advisory.

## v1.7.8 — Smart Teacher & Adaptive Assessment
- Added a dedicated Smart Teacher workspace for the active learner profile.
- Guided lesson cards are shown only when an existing lesson matches the selected subject and grade.
- Practice questions are drawn from the existing subject/grade bank; the app explicitly reports when no suitable questions are available rather than fabricating curriculum content.
- Practice selection adapts conservatively to the learner's recorded accuracy.
- Assessment results are stored locally and scoped to the active learner; duplicate submissions are prevented.
- Added bilingual/English interface strings for key teacher workflow messages.
- Added automated smart-teacher regression tests.

## v1.7.9 — Integrated Educational Intelligence
- Added learner-scoped initial diagnostic assessments using existing grade/subject question banks.
- Captured incorrect responses for targeted remedial lesson generation through the existing Groq tutor endpoint.
- Added detailed written-answer feedback UI and expanded the server-side evaluation rubric prompt.
- Added quarterly mock-exam generation using the existing curriculum-guarded exam builder, with student and teacher versions.
- Included educational error records in local backup/restore and learner deletion lifecycle.
- Preserved existing server routes, curriculum safeguards and offline assets; APK build not performed.


## v1.8.0 — AI Student Profile
- Added a longitudinal learner profile isolated by learner ID.
- Added 90-day and 30-day summaries, four-week trends, subject performance, and recorded-topic mastery indicators.
- Added adjustable personal target, weekly/monthly reports, and CSV export.
- Added conservative advisory indicators and explicit insufficient-data handling.
- Included profile goals in local backup/restore and learner deletion cleanup.

## v1.8.1 — Exam Readiness & Personalized Revision
- Added a conservative exam-readiness indicator that remains unavailable until at least 30 answers across three recorded activities exist.
- Added a learner-specific five-day revision plan prioritized by recorded topic and subject performance relative to the learner's own target.
- Added multilingual revision-plan presentation and copy/share-ready plan text.
- Kept all analysis local, advisory, and isolated by learner ID; no backend routes or server behavior changed.

## v1.8.2 — Family & teacher overview
- Added a multi-learner family/class overview for the last 30 days.
- Added per-learner activity, accuracy, support-focus and evidence-gated readiness summaries.
- Added all-learner CSV report export and direct navigation to each learner profile.
- Kept analytics local-only; no backend routes or network data sharing added.

## v1.8.3 — Parent-only accounts
- Added parent-only account registration and sign-in endpoints; account roles are constrained to `parent` in SQLite.
- Added PBKDF2-SHA256 password hashing (310,000 rounds), random opaque bearer sessions stored as SHA-256 hashes, 30-day expiry, sign-out and password change with session revocation.
- Added a multilingual parent account interface (Arabic/French/English) to the Parents Portal; parent dashboard and family planner are gated behind a valid parent session.
- Student learning records remain local to the device and are not uploaded or synchronized by this release. No student or teacher account type is provided.
- Added authentication validation and API regression tests; existing learning, server and content features are retained.
- Production note: deploy the API over HTTPS, configure a persistent `PARENT_AUTH_DB` volume, and arrange verified email/password recovery before public rollout.


## v1.8.4 — Parent-authorized encrypted device transfer
- Added one-time transfer codes for moving a family backup between devices signed in to the same parent account.
- Encrypts backup contents client-side with AES-256-GCM and PBKDF2-SHA256 (310,000 iterations); the server stores opaque ciphertext and a SHA-256 code fingerprint only.
- Transfer codes are 128-bit random, expire after 20 minutes, are scoped to the same parent account, and are consumed atomically once.
- Added strict backup validation and explicit confirmation before replacing receiving-device data.
- No student/teacher accounts, background sync, or bidirectional live sync were added.


## v1.8.7 — Family weekly learning plan
- Added a weekly focus recommender using learner-specific recorded subject outcomes, avoiding unsupported claims when evidence is insufficient.
- Added a printable weekly parent report with activity summary, support subjects and suggested review sessions.
- Preserved local-only data handling and existing planner/export behavior.

## v1.15.0 — Curriculum progress tracking
- Added a learner-specific progress map for recording lessons actually taught at school.
- Added grade, subject, term, progress state, optional source/page reference, status updates and removal.
- Added local JSON export and included the new store in backup, restore validation and learner deletion lifecycle.
- Added service-worker precaching and cache version update.
- Explicitly keeps user-entered lesson records separate from officially verified curriculum content.

## v1.16.0
- Added four offline interactive calculation labs: percentages, average speed, Ohm's law, and density.
- Integrated the lab hub into the home study centre without replacing existing features.
- Added input validation, step-by-step explanations, and accessible result announcements.
- Added a dedicated regression test and updated app metadata/cache version.
- No official curriculum alignment is claimed for these simulations; each activity must be mapped to a verified lesson.


## v1.17.0
- Added a timed practice-exam clock to the existing exam workflow.
- Uses the prepared paper duration when available; otherwise estimates two minutes per question with a 10-minute minimum.
- Shows a low-time warning and automatically submits when time expires.
- Timer is cleared when the learner submits or rerenders an exam.
- Existing question bank, scoring, and answer-key logic remain unchanged.


## v1.18.0
- Added learner-specific weekly home study planner.
- Added configurable minutes, subject/day/priority selection, starter schedule generation, completion tracking and planned-time summary.
- Updated service-worker cache version and offline precache.
- Added planner regression test.

## v2.1.2 — SM éducation
- توحيد اسم التطبيق والأيقونات/بيانات التثبيت إلى SM éducation.
- مركز تنزيل داخل التطبيق لإنشاء وحفظ أوراق التمارين والاختبارات مع التصحيح وفتحها دون اتصال.
- توسيع مسار الذكاء الاصطناعي والحوسبة بإضافة الروبوتيك لجميع المستويات.
- آلية تحديث محتوى دورية قابلة للضبط عبر تغذية JSON موثوقة.

## v2.1.3 — نشر المحتوى ومزامنة المكتبة
- إضافة إعداد `publicContentBase` لتوحيد عنوان HTTPS العام لمحتوى الدروس وفهرس تسنيم والملفات.
- تحسين مزامنة فهرس تسنيم: تحديث يدوي من داخل التطبيق، حفظ آخر فهرس ناجح، والرجوع إليه عند انقطاع الشبكة.
- إضافة درس هندسة الأوامر للمساعد الذكي ودرس السلامة في النماذج الروبوتية إلى موجز التحديثات.
- إضافة GitHub Actions لنشر المحتوى على GitHub Pages وإعادة فهرسة مكتبة تسنيم أسبوعياً ضمن حدود الطلبات والملفات.
- إضافة دليل إعداد النشر وتوضيح ما يتطلب تفعيل GitHub Pages في مستودع المستخدم.
