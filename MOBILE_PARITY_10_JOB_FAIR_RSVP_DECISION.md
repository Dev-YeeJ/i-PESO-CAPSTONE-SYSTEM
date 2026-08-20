# i-PESO Mobile — Job Fair RSVP / QR Pass Scope Decision

## Context
This is a decision memo, not a build prompt — don't paste this expecting code to come out the other end. It exists to get a scoping decision made with whoever owns backend prioritization before any mobile RSVP/QR work starts.

## Prompt — copy and paste this into a message to whoever owns backend/product prioritization for job fairs

```
We need a decision on job-fair RSVP / QR pass before any mobile work touches it.

The mobile app has react-native-qrcode-svg installed but unused, and job-fair listings currently say "walk-in only, no digital RSVP, QR pass, or app check-in." Investigation found the backend's RSVP route, JobFairController::rsvp(), exists as a controller method but is not wired to any route — there is no POST /job-fairs/{id}/rsvp reachable by anyone today.

Despite that, job objects returned by /seeker/nearby-jobs and /seeker/job-map already contain job_fair.has_rsvp, actions.can_rsvp_job_fair, and qr_pass_url fields, as if the feature exists. It doesn't, on the backend, today. This is a backend gap, not a mobile gap — no mobile screen should be built against an API that isn't reachable.

Two paths, pick one:
1. Get the backend route added. If RSVP/QR pass is still wanted, wire JobFairController::rsvp() to an actual route and confirm the response shape. Once that's done, this becomes a normal mobile build prompt — check whether web has any QR pass UI at all first (the original investigation didn't confirm one), since that would be the parity target.
2. Confirm it's intentionally descoped. If RSVP was deliberately cut, confirm that explicitly, and then remove the job_fair.has_rsvp/can_rsvp_job_fair/qr_pass_url fields from the API response too (or at minimum, have mobile code written to never key off them) so the response stops implying a feature that doesn't exist.

What's safe to build regardless of this decision: GET /job-fairs (auth required, any role), the read-only public/upcoming/ongoing fairs listing, which already works and isn't affected either way.

Please confirm which path we're taking before any mobile RSVP/QR code gets written.
```
