# Content and feature audit — v1.3.9

- Exercise bank retained: 852 records, 105 grade/subject pairs, 12 grades.
- No new exercise records were added.
- New remediation plans are generated locally from incorrect answers in a completed test.
- Topics are ranked by count of incorrect answers; each card reports the number of matching exercises for the same grade and subject.
- The action opens the existing exercise bank with the exact grade, subject and topic filter selected.
- The latest 20 plan summaries are stored in localStorage under `smSchoolRemedialPlans`.
- Arabic, French and English UI labels are supported; exercise question language remains dependent on existing source data.
- Remediation suggestions are deterministic study guidance, not AI-generated diagnoses and not official Ministry recommendations.
- Official curriculum mapping remains unverified as documented in prior audits.
