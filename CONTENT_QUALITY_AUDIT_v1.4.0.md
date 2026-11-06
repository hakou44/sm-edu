# Feature and content audit — v1.4.0

## New AI tutor workflows
- Lesson teaching: learning objective, prerequisite, stepwise explanation, worked example, misconception, recap and self-check questions.
- Practice generation: exactly five original practice questions with a separated answer key and explanations.
- Written-answer feedback: strengths, missing ideas, misconceptions, a model answer and a next step.
- UI controls are available in Arabic, French and English. The response language follows the selected interface language.

## Safety, limits and provenance
- No provider key is embedded in the browser bundle; v2.1.1 accepts a user-entered key in the app.
- The new tutor endpoint uses the existing per-IP daily free quota.
- Without a key in the app, the platform uses its labelled local fallback and does not pretend to generate AI content.
- AI-generated exercises are supplemental platform practice, not official Ministry questions or verified curriculum alignment.
- Written feedback is formative and must not be treated as an official grade.
- No account, cloud sync, or new personal-data storage was introduced.

## Preserved content and APIs
- Exercise bank remains 852 records (840 multiple-choice and 12 numeric).
- The 12 grade levels and 105 grade/subject index pairs remain unchanged.
- Legacy `/api/v1/ai/chat` and all existing catalog, coverage and pathway endpoints remain available.
- Official annual progression and secondary pathway matrix verification remain unconfirmed.

## Verification performed
- `npm test` — PASS.
- `node --check web/app.js` — PASS.
- `python -m py_compile backend/app/main.py` — PASS.
- FastAPI TestClient: `/health`, `/api/v1/catalog`, `/api/v1/learning/structure`, `/api/v1/learning/coverage`, `/api/v1/curriculum/secondary-pathways` — HTTP 200.
- FastAPI TestClient: `/api/v1/ai/tutor` demo-mode request — HTTP 200.
- FastAPI TestClient: legacy `/api/v1/ai/chat` demo-mode request — HTTP 200.
