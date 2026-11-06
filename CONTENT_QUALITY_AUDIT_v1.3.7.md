# Content and assessment audit — v1.3.7

## Assessment feature
- The term-test builder draws exclusively from the existing 852-record platform exercise bank.
- Filters: grade (12 grades), subject, term (1/2/3/all), and requested count (5/10/15/20).
- Randomized selection is performed locally for each attempt.
- Supported answer types: 840 multiple-choice and 12 typed numeric records.
- Numeric answers use the existing normalization helper for Arabic-Indic and Persian digits.
- Mark is calculated on a 20-point scale. Topic-level summary identifies stronger and weaker topics from the current attempt.
- Up to 30 attempt summaries are stored in localStorage on the current device.

## Content limitations
- No new questions were added in this release.
- All 852 questions remain platform-authored practice, not official Ministry papers or answer keys.
- Question wording is currently Arabic; the UI labels are multilingual but the question bank is not fully translated.
- Detailed official annual-progression verification remains 0 verified grade/subject pairs.
- Secondary pathway subject matrices remain provisional and unverified.

## Privacy and compatibility
- No login, cloud synchronization, or new backend route was introduced.
- Existing API routes and server behavior are retained.
- Weak-topic recommendations are only emitted for topics below 75% accuracy; a perfect topic is not incorrectly labelled as a weakness.
