# i-PESO Mobile — Onboarding (7-Step NSRP) Parity Prompt

## Context
The largest and most detail-sensitive prompt in this set — the 7-step NSRP onboarding flow a newly-verified seeker goes through before reaching the dashboard, plus its re-entrant editing path. Follows `MOBILE_PARITY_02_REGISTRATION_OTP.md` (OTP verification routes here on success). The old `MOBILE_SEEKER_PARITY_PROMPT.md` claimed all 7 steps were "working end to end" — that claim was part of what turned out inaccurate, so don't paste this assuming it's a rebuild-from-scratch OR a no-op; it tells the executor to actually diff current behavior against every field rule below.

## Prompt — copy and paste this into a fresh session with `i-peso-mobile` open

```
Bring i-peso-mobile's 7-step NSRP onboarding flow into exact field-by-field parity with the backend contract below. Same stack as the rest of the app — Expo Router, TanStack Query, Zustand, Axios, expo-secure-store, hand-rolled StyleSheet forms, no new form library. No global response envelope; standard Laravel 422 {message, errors: {field: [msg]}}; 60/min baseline throttle.

First check what's actually implemented for each of the 7 steps today, then fix whatever doesn't match the spec below rather than rebuilding steps that are already correct.

Behavioral rule that applies to all 7 steps: each step saves to the backend immediately on submit — there's no local-only draft. This is what gives save-and-resume at the account level: a seeker who abandons onboarding and logs back in is routed straight back into onboarding by the profile_completed route guard. However, the client always restarts at step 1 — it does NOT fetch the seeker's furthest-completed step and resume there. Match this exactly; don't add resume-at-last-step logic as a unilateral mobile improvement, since that would silently diverge from web's behavior for a seeker using both platforms. Re-entrant editing after onboarding is complete happens via (seeker)/profile/edit.tsx, which should reuse the same step components rather than duplicating form logic.

Step 1 — Personal Information & Address. POST /seeker/step-1.
Fields: first_name, last_name (required), middle_name (optional), suffix (optional, one of Jr.|Sr.|II|III|IV|V), date_of_birth (required, must be at least 15 years ago), sex (required, male|female), civil_status (required, single|married|widowed|separated), religion (required enum, includes an "other" option — confirm the current list against the backend), religion_other (required if religion is "other"), height_ft (required, 2.5-8.5 — collect via a feet/inches picker in the UI and convert to decimal feet before sending), tin (optional), address_province / address_municipality_city / address_barangay / address_house_street (all required, plus their PSGC *_code companion fields), latitude / longitude / location_accuracy / google_place_id (best-effort — geocode the composed address client-side if not already resolved via the address picker, and swallow geocoding failures rather than blocking submission), disabilities[] (required, minimum 1 item; if the array contains "none" that must be the ONLY entry — enforce this client-side, e.g. selecting "none" clears other selections and vice versa, to match a real backend 422 rule), disability_specification (required if "others" is among the selected disabilities).

Step 2 — Employment Status. POST /seeker/step-2.
employment_status is employed|unemployed and branches the rest of the form: if employed, employment_type is wage_employed|self_employed, and if self-employed, self_employed_type is required (enum plus an "others" free-text field). If unemployed, unemployment_months (0-999) and unemployment_reason (enum including terminated_abroad, which requires a country field, and others, which requires free text) are required. Regardless of branch, always present: is_ofw (boolean, requires ofw_country if true), is_former_ofw (boolean, requires former_ofw_country and former_ofw_return_date - not in the future - if true), is_4ps_beneficiary (boolean, requires household_id_4ps matching \d{2}-\d{2}-\d{2}-\d{3}-\d{5} if true — auto-format the dashes as the user types rather than making them type them manually).

Step 3 — Job Preference. POST /seeker/step-3.
preferred_occupations[] (1-3 items, chosen via a searchable occupation combobox backed by POST /seeker/classify-occupation — a 3-layer catalog-then-dictionary-then-AI classification), work_type_preference (part_time|full_time), preferred_work_location (local|overseas), preferred_locations_details[] (1-3 items — local ones picked via a province-to-city cascading picker, overseas ones as free-text country). Business rule: each occupation preference item must supply exactly one of a catalog occupation_id OR free-text general_term/raw_job_title — never both, never neither. The actual payload key is occupation_preferences, an array shaped {occupation_id?, general_term?, broad_field?, role_function?, confidence?, raw_job_title?, source} — not a flat array of strings. Field-error special case: a 422 on occupation_ids or any occupation_preferences.* sub-field should surface on the single preferred_occupations field in the UI (collapse nested/array error keys onto one visible error under the occupation picker) — don't render per-index nested errors here.

Step 4 — Language/Dialect Proficiency. POST /seeker/step-4.
Per-language checkboxes for four proficiencies (read/write/speak/understand) across a fixed language list: English, Filipino, Cebuano, Ilocano, Hiligaynon, Bikol, Waray, Pangasinan, Kapampangan, Maranao, Maguindanao, Tausug, Mandarin, Spanish, Japanese, Korean, Arabic, French, German, Others (plus a free-text name field when Others is selected). At least one language must have at least one proficiency checked. Rows where all four booleans are false must be dropped from the payload before submit — don't send empty rows for languages the user touched but didn't actually check anything for.

Step 5 — Education & Skills. POST /seeker/step-5.
educations[], minimum 1 entry. Each entry needs: level (enum elementary/secondary_non_k12/secondary_k12/senior_high_strand/vocational/tertiary/graduate_studies), institution_name (required), course_strand (required only for vocational, senior_high_strand, tertiary, graduate_studies), completion_status (graduated|undergraduate|currently_studying), with status-specific required fields — graduated needs year_graduated >= year_started, undergraduate needs undergrad_level_reached + undergrad_year_last_attended, currently_studying needs expected_year_graduated — and year_started (required, range 1950 to the current year). Reject duplicate rows client-side (same institution + level + course + years combination). Skills submitted alongside educations in this same step: dole_skills[] + technical_skills[] combined are capped at 20 total (enforce the cap across both lists combined, not 20 each), and soft_skills[] is capped at 10.

Step 6 — Trainings & Eligibilities. POST /seeker/step-6.
Both lists are optional overall — a seeker can submit this step with neither — but any row that IS added must be complete. Trainings need course (required) plus hours, institution, skills-acquired, and certificates-received fields. Eligibilities need type (civil_service|professional_license) and name if a row exists at all, date_taken must not be in the future, and valid_until must be >= date_taken.

Step 7 — Work Experience (terminal step). POST /seeker/step-7.
Entirely optional — copy should read something like "Optional for first-time jobseekers." Any row that is added needs company_name + position at minimum, start_date must not be in the future, and end_date must be >= start_date and not in the future UNLESS currently_employed is true for that row (in which case no end date is required or sent). This is the exit point from onboarding: on success, set profile_completed: true in local state and route to the dashboard.

Definition of done:
- Every field, enum value, and cross-field validation rule above has a mobile equivalent producing an identical payload shape — spot-check by logging or capturing a real request body per step and diffing it against this spec.
- Step 3's occupation_preferences items never send both a catalog ID and free-text fields together.
- Step 4 drops fully-unchecked language rows before submit.
- Step 5 enforces the 20-combined / 10-soft skill caps client-side.
- Step 7 success sets profile_completed: true and routes to the dashboard — confirm this is the only step that does so.
- Onboarding always restarts at step 1 on re-entry, with no resume-at-last-step logic.
- (seeker)/profile/edit.tsx reuses the same step components rather than a parallel implementation.
- 422 field errors render inline per field, including the occupation_ids/occupation_preferences.* -> preferred_occupations collapsing rule on step 3.
```
