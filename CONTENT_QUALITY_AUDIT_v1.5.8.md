# SM SCHOOL AI v1.5.8 — Local learner backup and restore

## Scope
- Adds a local JSON backup/export and restore flow to the learner progress page.
- Includes learning progress, test history, remedial plans, revision plan, selected learner preferences, curriculum evidence review ledger, and exercise-mistake lists.
- Excludes API base URL, credentials, and server configuration.
- Backup is generated in the browser and is not uploaded.
- Restore validates application identifier, backup schema version, allowed keys, JSON structures, language values, and a 5 MB file limit before asking for confirmation.
- No account, cloud synchronization, or server endpoint was added.

## Limitations
- The backup contains only the explicitly whitelisted localStorage keys. Browser data outside this list is not included.
- The backup file is plain JSON; users should store it somewhere private.
- Restore requires a page reload to refresh all visible screens.
- This is a source/PWA update. No Android APK was built.
