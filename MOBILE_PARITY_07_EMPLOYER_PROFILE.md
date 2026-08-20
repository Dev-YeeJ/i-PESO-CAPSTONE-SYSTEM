# i-PESO Mobile — Employer Profile Screen Prompt

## Context
A small, single-screen addition — an employer's public profile with their other open postings. Parity target: `i-peso-frontend/src/pages/seeker/EmployerProfile.jsx`.

## Prompt — copy and paste this into a fresh session with `i-peso-mobile` open

```
Build an Employer Profile screen for i-peso-mobile, reachable from a job card or job detail screen's employer name/logo (this navigation entry point doesn't exist yet — add it as part of this work).

Endpoint: GET /seeker/employers/{id} returns {employer: {employer_id, company_name, trade_name, industry, company_size, company_logo_url, full_address, company_description, verification_status, created_at}, vacancies: [...]}. It 404s unless the employer is verified.

Important: the vacancies array here is a raw JobVacancy model dump — not the enriched, match-scored shape used by job search or the job map. There's no match percentage, no saved/applied state, and no actions object on these. Design the screen as a simple list of the employer's other open postings (title, type, location, posted date), where tapping one routes to the normal job detail screen — that's where the enriched version gets fetched via the existing job detail flow. Don't try to render match badges or apply/save buttons directly in this employer-profile list.

Definition of done:
- The screen renders every field in the employer object.
- The vacancies list does not attempt to show match percentage, saved/applied state, or apply/save buttons — tapping a vacancy routes to the standard job detail screen instead.
- The screen is reachable via a tap target on the employer name in at least one existing job card or job detail screen.
- A 404 (unverified employer) is handled with a clear "not available" state, not a crash.
```
