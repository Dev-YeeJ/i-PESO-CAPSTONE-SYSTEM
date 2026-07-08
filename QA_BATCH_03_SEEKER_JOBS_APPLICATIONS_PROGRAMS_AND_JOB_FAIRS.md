# QA Batch 03 — Seeker Dashboard, Job Discovery, Applications, Programs, and Job Fairs

## Goal

Validate the seeker's day-to-day employment journey and prove that ranking, distance, vacancy eligibility, applications, notifications, programs, and job fairs stay synchronized.

## Preconditions

- Completed Seeker A with coordinates, occupations, skills and education.
- Completed Seeker B without coordinates for fallback testing.
- Approved employers with active, expired, closed, distant and certification-required vacancies.
- Published/closed/full government programs and published job fairs.

## Flow

`Dashboard -> Discover job/program/fair -> Inspect eligibility -> Apply/save -> Track status -> Receive notification`

## Test cases

| ID | Scenario / action | Expected result |
|---|---|---|
| SEJ-001 | Open dashboard with complete profile | Lightweight summary renders first without loading the full profile payload |
| SEJ-002 | Dashboard with sparse/no recommendation data | Honest empty state, no fake jobs or invented metrics |
| SEJ-003 | Verify profile strength after changing profile fields | Score/items update consistently after refresh |
| SEJ-004 | Load unread notification badge | Count endpoint is used and badge matches unread history |
| SEJ-005 | Open, read one, and mark all notifications read | Counts and row state synchronize without duplicate requests |
| SEJ-006 | Open Job Map with saved coordinates | Compact active-vacancy pins/cards load within configured radius |
| SEJ-007 | Open Job Map without saved coordinates | Controlled location-required/fallback state; latest feed still works where designed |
| SEJ-008 | Select a map marker/card | Detailed matching is fetched only for selected vacancy |
| SEJ-009 | Search by title, company and general term | Relevant results appear; clear search restores list |
| SEJ-010 | Use radius, sort and advanced filters | List, pins, active chips and result count stay synchronized |
| SEJ-011 | AI-parse a natural-language map query | Parsed filters are visible/editable; fallback parser works if AI fails |
| SEJ-012 | Compare exact occupation/skill match to unrelated vacancy | Match reasoning and ordering reflect the profile, not random rank |
| SEJ-013 | Vacancy requires missing mandatory certification | Seeker is marked ineligible or clearly warned |
| SEJ-014 | Expired/closed vacancy exists in database | It is not offered as active or applyable |
| SEJ-015 | Toggle saved job from card/detail | Saved state persists after reload and cannot duplicate |
| SEJ-016 | Apply to eligible vacancy | One application is created and visible to seeker/employer/admin |
| SEJ-017 | Double-click Apply or retry request | Idempotent behavior; no duplicate application |
| SEJ-018 | Apply with incomplete profile | Blocked before creation with completion guidance |
| SEJ-019 | Apply to closed/expired/foreign employer vacancy ID | Rejected with safe message and no application |
| SEJ-020 | Open My Applications | Correct employer/job/status/current stage and dates are shown |
| SEJ-021 | Open application detail/timeline after employer updates | Timeline order and status metadata are accurate |
| SEJ-022 | Withdraw eligible active application | Status changes once and employer sees withdrawn state |
| SEJ-023 | Withdraw already hired/rejected/withdrawn application | Invalid transition rejected without history corruption |
| SEJ-024 | Receive interview/application status update | In-app notification and configured SMS are created once |
| SEJ-025 | Open Upskill Hub and use filters | Backend results, counts and filters remain consistent |
| SEJ-026 | Open recommended programs | Reasons relate to actual skill gaps/profile inputs |
| SEJ-027 | View program attachment | Authorized readable file; missing file handled safely |
| SEJ-028 | Apply to eligible open program | One application created with correct initial status |
| SEJ-029 | Apply twice or to closed/full/expired/ineligible program | Rejected without duplicate or capacity error |
| SEJ-030 | Upload required program application document | Valid file persists privately and appears to admin review |
| SEJ-031 | Upload invalid/oversized program document | Rejected without orphan file |
| SEJ-032 | View My Program Applications | Program status, requirements and outstanding actions are accurate |
| SEJ-033 | Open published job fair feed | Only visible relevant fairs and correct event state appear |
| SEJ-034 | Open draft/cancelled/expired fair via guessed ID | Hidden or safely unavailable |
| SEJ-035 | Confirm fair details, venue/date/employers/vacancies | Data matches admin/employer records |
| SEJ-036 | Test empty/loading/error states for each seeker module | No raw exception, SQL message or indefinite spinner |
| SEJ-037 | Navigate dashboard -> map -> applications -> back | Filters/selection behave predictably and no duplicate submission occurs |
| SEJ-038 | Test 360px, tablet and desktop layouts | Primary actions, map overlays, tables/cards and dialogs remain usable |

## Batch exit criteria

- Job availability and application status are consistent across seeker and employer views.
- No duplicate apply/withdraw/program records.
- No fake recommendations or hidden raw backend errors.

