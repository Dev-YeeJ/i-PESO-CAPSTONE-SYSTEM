# Reviews pages: real photos, logos and profile links — design

Date: 2026-11-25 · Size: small change (short design)

## Intent
The employer "Feedback on your hires" tab and the seeker "Reviews" page show people and
companies as initials and generic building icons, with no way to open who you're looking
at. Show the real 2x2 photo / company logo, let a click open the profile, and tidy the UX
problems found in the review of both screens.

## Goals
- Every hire card shows the worker's 2x2 photo when they have one (initials otherwise).
- Every company on the seeker page shows its logo (building icon otherwise).
- Clicking a hire's name opens their applicant profile; clicking a company opens
  `/seeker/employers/:id`.
- Fix the UX issues listed below.

## Non-goals / anti-goals
- No profile access for hires who never applied to the employer (placement-report hires):
  photo yes, profile no. Giving employers profile data the worker never sent them is the
  failure to avoid.
- No change to who can read feedback, review moderation, or the 3-review threshold.
- Mobile app untouched (API changes are additive only).

## Approaches (chosen: A)
- **A. Photo for every hire, profile link only for application hires** — chosen. Keeps
  today's rule (full profile only for people who applied to you).
- B. New hire-profile page for every hire — bigger, and a PESO privacy decision.
- C. Photo + link only for application hires — inconsistent cards.

## Backend
1. `EmployerFeedbackController::hireView` adds `has_photo` (seeker has `profile_image`)
   and `application_id` (set for `source: application`, null for placements).
2. New route `GET /employer/hires/{seeker}/photo`: streams the seeker's photo only if this
   employer hired them (a `hired` application on one of their vacancies, or a linked row in
   an APPROVED placement report); 404 otherwise. Same headers as `seekerProfileImage`
   (inline, nosniff, private no-store).
3. Seeker payloads add the employer's `logo` (raw `company_logo` path, resolved in the
   frontend with `companyLogoUrl`): `FeedbackEligibility::opportunitiesFor`,
   `WorkerFeedbackVisibility::forWorker`, and the seeker's own review list
   (`SeekerReviewController`).

## Employer — Feedback on your hires
- `HireAvatar`: fetches the photo from the new route as a blob when `has_photo`, initials
  gradient otherwise (same pattern as `ApplicantAvatar`).
- Name links to `/employer/ats/applicant/:application_id` for application hires.
  Placement hires show a small "From placement report" tag, no link.
- Order: waiting for feedback first, then not-yet-open (future start date), then rated.
- Rated cards: "Show details" reveals the four aspect scores and the private comment, so
  the employer doesn't have to open Edit to see what they gave. Shows the last-updated date.
- Privacy banner shrinks to one line ("Comments are private — only PESO and the worker read
  them") with a "How this works" toggle for the full text.

## Seeker — Reviews
- `CompanyLogo` (logo or building fallback) used in all three sections.
- **Ready to review**: grouped by company — one row per company (logo + linked name), each
  job listed under it with its own "Review" button. First 4 companies shown, then
  "Show all (n)". Lighter styling: white card with a gold left accent instead of the full
  cream box.
- **Feedback from employers**: header with logo, linked company name, job title and date;
  overall score (average of the four) and a coloured would-rehire pill (Yes green, Maybe
  amber, No slate); compact aspect grid; comment as a quote. The "think this is unfair?"
  note appears once at the bottom of the section.
- **Your reviews**: logo + linked company name.

## Testing
- Backend feature tests: photo route allowed for application hire and approved-placement
  hire; 404 for a seeker the employer never hired and for an unapproved placement; new
  payload fields present.
- Frontend tests: hire sort order, profile link only for application hires, ready-to-review
  grouping + "Show all", logo fallback.

## Left to the builder
Exact spacing/colours within the existing navy/gold design language; copy wording beyond
what's quoted above.
