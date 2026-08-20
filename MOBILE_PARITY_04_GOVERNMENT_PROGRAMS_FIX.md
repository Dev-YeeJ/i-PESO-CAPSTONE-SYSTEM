# i-PESO Mobile — Government Programs Endpoint Fix Prompt

## Context
Highest-priority item in the whole parity effort — this is a breaking bug (dead endpoints), not a missing feature. If `MOBILE_PARITY_00_CODEBASE_AUDIT.md` has run, check its finding on whether this bug still exists and whether `i-peso-mobile/GOVERNMENT_PROGRAMS_MIGRATION.md` has already been applied before pasting this — no point re-running a fix that already landed.

## Prompt — copy and paste this into a fresh session with `i-peso-mobile` open

```
Fix a breaking bug in i-peso-mobile's Government Programs / Upskill Hub feature: services/seekerService.ts's getUpskillHub() and getRecommendedPrograms() call GET /seeker/upskill-hub and GET /seeker/upskill-hub/recommended, and these routes no longer exist on the backend.

First confirm the bug is still present (grep for /seeker/upskill-hub across the codebase) and check whether i-peso-mobile/GOVERNMENT_PROGRAMS_MIGRATION.md is still present at the mobile app's root — if so, apply it exactly as documented: service method renames, adding ProgramEligibility/EligibilityBadge components, renaming upskill-hub.tsx to government-programs.tsx, and dropping the now-nonexistent recommended/job_fairs response fields from anywhere that assumed the old shape.

The current, correct API contract to build against:
- GET /seeker/government-programs?search=&category=&status=&per_page=12 — a raw Laravel paginator under the key programs, plus categories: {name: count}.
- GET /seeker/government-programs/{id} — {program}.
- GET /seeker/government-programs/{id}/attachment — file download.
- GET /seeker/citizen-charter — {data: [...]}.
- POST /seeker/government-programs/{id}/apply — no request body, the server evaluates eligibility from the stored seeker profile. Returns 422 if already applied, not open, deadline passed, or no slots left.
- GET /seeker/government-program-applications — the seeker's own applications with nested program + documents.
- POST /seeker/government-program-applications/{id}/documents — multipart, {document_type: requirement|certificate, document_name, file} (pdf/jpg/jpeg/png/doc/docx, max 5120 KB). The certificate type is only allowed once application_status is 'completed'.
- GET /seeker/government-program-applications/{id}/documents/{docId} — file download.

Program objects include a server-computed eligibility object ({score, breakdown, ...}) and can_apply — render the eligibility breakdown directly from what the server returns, don't reimplement the scoring logic on the client.

Definition of done:
- Zero references to /seeker/upskill-hub or /seeker/upskill-hub/recommended remain anywhere in the codebase — confirm with a grep.
- The screen and service layer use only the endpoints listed above.
- Eligibility is rendered from the server-provided object, never recomputed client-side.
- Document upload correctly gates the certificate document type behind application_status === 'completed'.
```
