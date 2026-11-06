# SM SCHOOL AI v1.5.3 — Question understanding assistant audit

- Added per-candidate question analysis in Arabic, French and English.
- PDF question analysis uses a cautious heuristic draft; live tutoring is handled by the direct in-app Groq client.
- Without a key, an explicitly labelled heuristic fallback detects likely numeric givens and request lines and supplies a generic subject-aware solution workflow; it does not claim to solve the question.
- Analysis is persisted separately from question candidates.
- Every analysis remains a draft requiring teacher review; no auto-approval, auto-publication or exercise-bank insertion.
- No provider key is stored on the server for the in-app tutor.
- Existing exam library rights gate and all previous learning data remain unchanged.
- Exercise bank: 1,167; term exams: 315; integrative situations: 315.
- Official curriculum alignment remains unverified for imported content.
- APK not built.
