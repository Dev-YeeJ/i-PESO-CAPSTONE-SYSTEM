# i-PESO Mobile — My Program Applications Prompt

## Context
Mostly a verification task, not a build task — the old parity doc claims `(seeker)/program-applications.tsx` already exists and works on mobile. Confirm that (via `MOBILE_PARITY_00_CODEBASE_AUDIT.md` or directly) before assuming it needs building from scratch. There's also a web-side issue worth knowing about, described below.

## Prompt — copy and paste this into a fresh session with `i-peso-mobile` open

```
Verify whether i-peso-mobile's Program Applications screen, (seeker)/program-applications.tsx, already exists and works end to end (list view plus document upload). Do not assume it needs to be built from scratch — check the actual current code first.

Context worth knowing: on web, the equivalent screen (src/pages/seeker/MyProgramApplications.jsx, list + document upload) is fully built but has no route in the web router and isn't linked from anywhere — it's unreachable by web seekers today despite complete code. That's a pre-existing web-side bug, not something to replicate on mobile.

If the mobile screen needs building or fixing, use this API contract:
- GET /seeker/government-program-applications — the seeker's own applications with nested program + documents.
- POST /seeker/government-program-applications/{id}/documents — multipart, {document_type: requirement|certificate, document_name, file} (pdf/jpg/jpeg/png/doc/docx, max 5120 KB). The certificate type is only allowed once application_status is 'completed'.
- GET /seeker/government-program-applications/{id}/documents/{docId} — file download.

Separately from the mobile work itself, flag to whoever owns the web app's routing that MyProgramApplications.jsx needs a route and a nav link added — don't silently let the web app stay unreachable while only fixing mobile. This is a call-out to make, not something to fix as part of this prompt.

Definition of done:
- Confirmed, not assumed, whether the mobile screen already exists and works.
- If it's missing or broken: list view, document upload, and document download all work against the endpoints above.
- The certificate document type is gated behind application_status === 'completed' client-side, matching the backend rule.
- The web team has been notified separately about the missing route on MyProgramApplications.jsx.
```
