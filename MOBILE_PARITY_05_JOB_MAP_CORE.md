# i-PESO Mobile — Job Map (Core) Parity Prompt

## Context
The single biggest feature gap versus web — mobile currently only has a flat list (`(seeker)/jobs.tsx`); web has a full map+list dual experience. This prompt covers the core screen only (map, clustering, filters, data fetching). AI natural-language search and the report-employer modal are their own prompt, `MOBILE_PARITY_06_JOB_MAP_AI_SEARCH_REPORT.md`, meant to be built after this one works. Parity target on web: `i-peso-frontend/src/pages/seeker/JobMapPage.jsx` + `src/services/jobMapService.js`.

Check whether `react-native-maps`/`expo-location` are already installed and whether a partial map screen already exists before starting from scratch — see `MOBILE_PARITY_00_CODEBASE_AUDIT.md` if it's been run.

## Prompt — copy and paste this into a fresh session with `i-peso-mobile` open, with `i-peso-frontend/src/pages/seeker/JobMapPage.jsx` and `src/services/jobMapService.js` available for reference

```
Build a Job Map screen for i-peso-mobile matching web's JobMapPage.jsx + jobMapService.js. This is a new screen in a React Native / Expo app (Expo Router, TanStack Query v5, Zustand, Axios, StyleSheet against theme/ tokens) — stay in that stack for everything except the two new libraries this specifically needs: react-native-maps (the standard RN mapping library, with marker clustering via react-native-map-clustering or equivalent) and expo-location (for "use current location"). Don't introduce a new state library, form library, or UI kit alongside these.

Data source: GET /seeker/job-map (functionally identical to GET /seeker/nearby-jobs — same controller, same response shape; the two URLs exist for the map vs. list UI split). Throttled 60/min.

Query params, all optional unless noted: radius_km (1-500, default 15), min_match (0-100), keyword (max 100), location_keyword (max 100), sort (distance|match|newest|salary), feed_mode (nearby|recommended|latest, default nearby), job_type (max 60), salary_min/salary_max, boolean toggles hide_low_match/hide_applied/coordinates_only/include_no_coordinates/saved_only/job_fair_only/upskill_recommended_only/certificate_match_only/can_apply_only/compact (send these as the literal strings "true"/"false"), max_missing_skills (0-50), lat/lng (defaults to the seeker's stored profile location if omitted), limit (1-150, default 100), job_id (single-vacancy lookup).

Build a filter panel matching web's JobMapFilters exactly: radius_km as preset options 5/10/15/25/50, min_match as preset options 0/50/70/80, sort (distance/match/newest/salary), job_type, salary_min/salary_max, plus toggle switches for every boolean listed above, plus max_missing_skills and location_keyword as inputs. Debounce filter changes ~400ms before refetching — without this the screen fires a request per keystroke or toggle.

Location handling via expo-location: request foreground permission, get the current position, feed it into the lat/lng query params for a "use current location" action.

If feed_mode=nearby and no coordinates are available anywhere — not in the profile, not in the query — the backend returns a 422 shaped {message, code: "location_required", seeker, seeker_location, jobs: []}. Handle this as a "set your location" prompt, not a generic error, and fall back to a feed_mode: "latest" call so the screen still shows something, exactly as web does. Don't hard-fail the screen on this response.

Response shape: {seeker, summary: {total_found, high_match_count, nearest_distance_km, applied_count, saved_count, job_fair_count, upskill_recommendation_count}, radius_km, feed_mode, location_available, origin, seeker_location, filters_applied, count, jobs: [...]}.

Job objects come in two shapes depending on the compact param. Full (compact=false, the default) includes a large match object (total_score, percentage, eligible, eligibility_reasons, missing_critical_skills, skill_gaps, recommendations, ...), full location fields, has_applied/is_saved/application_id/application_status, certificate_match, job_fair, upskill, and actions: {can_apply, can_save, can_rsvp_job_fair, can_download_resume}. Compact (compact=true) strips the match internals to {match: null, match_deferred: true} and stubs certificate_match/job_fair/upskill as {deferred: true}. Use compact mode for map pins — you may be rendering hundreds of markers, don't pull full match payloads for all of them — and full mode for the list view and job detail panel.

Job detail: GET /seeker/job-map/{id} returns {job: <one full job object>, seeker}. For a compact/match_deferred pin the user taps, lazily fetch full detail via this endpoint rather than requesting full data for every pin up front. It 404s if the job isn't active or its deadline has passed — there's no "closed" status returned, just a 404.

Apply and save must reuse the exact mutations that already exist for the flat-list jobs.tsx screen (POST /seeker/jobs/{id}/apply, POST /seeker/saved-jobs/{id}) — do not duplicate this logic in the map screen. If those mutations already live in a shared hook or service, import it; if they're currently inlined directly in jobs.tsx, extract them into something shared first rather than copy-pasting the logic. Apply is throttled 20/min, takes no body, and re-applying to a job the seeker already applied to is NOT an error — it returns 200 with the existing application and the message "You already applied to this job." — don't treat that as a failure state in the UI.

Definition of done:
- Map renders with clustering and tap-to-callout, using compact job data for pins.
- Every filter listed above is present and wired to the query params, debounced ~400ms.
- "Use current location" requests permission and feeds real coordinates into the query.
- The location_required 422 triggers a location-missing notice plus a feed_mode:"latest" fallback, not a hard error.
- Tapping a compact pin lazily fetches full detail via /seeker/job-map/{id}.
- Apply/save on this screen call the exact same mutation functions as jobs.tsx — verify this by checking they're the same imported function, not a re-implementation.
```
