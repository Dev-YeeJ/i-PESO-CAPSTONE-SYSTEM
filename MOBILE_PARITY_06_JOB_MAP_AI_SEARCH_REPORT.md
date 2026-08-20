# i-PESO Mobile — Job Map AI Search & Report Employer Prompt

## Context
Two additive pieces on top of the Job Map screen built in `MOBILE_PARITY_05_JOB_MAP_CORE.md` — build these after the core map works, since neither blocks the other. Bundled together here because both are small, self-contained modal/input additions rather than core screen work.

## Prompt — copy and paste this into a fresh session with `i-peso-mobile`'s Job Map screen already built

```
Add two features to i-peso-mobile's existing Job Map screen: AI natural-language search, and a report-employer modal.

AI natural-language search: add a text input on the map screen that calls POST /seeker/nearby-jobs/ai-parse (10/min) with {query}, which returns parsed map-search filters. Apply those parsed filters to the same filter state the core map screen already manages — don't create a separate filter state for this. This call can fail or return a 503 (the underlying Gemini/Vertex service can be over quota — this is expected, not a bug). Build a client-side regex fallback parser for exactly this case, mirroring web's parseRuleBasedMapQuery function (check i-peso-frontend/src/services/jobMapService.js for the actual patterns it matches — radius phrases, job-type keywords, salary figures, etc.). On a 503 specifically, degrade silently to the regex parser rather than showing an error — the user typed a query and should still get some result back.

Report employer modal: POST /seeker/employers/{id}/report (10/min) with body {reason, description}, where reason is one of fake_job|misleading|abusive|discrimination|illegal_fees|other and description is 10-2000 characters. Make this reachable from a job card or job detail's employer info. The endpoint returns 422 if the seeker already has a pending or investigating report against that employer — surface that 422's actual message directly rather than a generic failure, since it's telling the user something true and specific.

Definition of done:
- The AI search box degrades to the regex fallback on any failure or 503, without surfacing an error to the user.
- Parsed filters, whether from the AI call or the regex fallback, apply to the same filter state the core map screen manages.
- The report modal enforces the reason enum and the 10-2000 character description length client-side before submit.
- The "already reported" 422 renders its actual server message rather than a generic error.
```
