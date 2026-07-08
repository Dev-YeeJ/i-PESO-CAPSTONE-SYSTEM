# QA Batch 06 — Admin Dashboard, CRM, Verification, Analytics, and Employment Hub

## Goal

Validate PESO staff oversight of constituents and labor-market activity while clearly distinguishing operational modules from incomplete shells.

## Preconditions

- Administrator account plus non-admin tokens.
- Diverse seeker/employer/job/application records from Batches 02–05.
- Pending/rejected/verified employers and mapped/unmapped occupation titles.

## Flow

`Admin dashboard -> Queue/directory -> Detail/review -> Corrective action -> Analytics/report visibility -> Audit trail`

## Test cases

| ID | Scenario / action | Expected result |
|---|---|---|
| ADM-001 | Open admin dashboard | Real aggregate counts load; no hardcoded production metrics |
| ADM-002 | Compare dashboard counts to seeded/source records | Counts reconcile or document exact filter differences |
| ADM-003 | Load dashboard with empty database | Valid zero state, no divide-by-zero/undefined chart |
| ADM-004 | Non-admin calls any `/admin/*` endpoint | Backend returns 403 independent of frontend guard |
| ADM-005 | Open seeker directory | Paginated rows and single aggregate summary load correctly |
| ADM-006 | Search seeker by name/email/mobile | Normalized matching and result count are correct |
| ADM-007 | Filter seeker by status, education/location/profile readiness | Combined filters, reset and pagination remain correct |
| ADM-008 | Rapidly change directory filters | Stale response does not overwrite latest result |
| ADM-009 | Open seeker case profile | Personal, employment, education, training, eligibility, skills, language, work and certificate metadata are organized/read-only |
| ADM-010 | Inspect seeker detail payload | Sensitive internal/storage/auth data is absent |
| ADM-011 | Download official NSRP PDF | Correct seeker, two-page readable form, no other seeker's data |
| ADM-012 | Guess nonexistent/foreign seeker ID | Safe 404; no raw exception or data leak |
| ADM-013 | Open employer directory and summary | Pagination/counts/statuses reconcile |
| ADM-014 | Search/filter employer directory | Correct combined results and reset behavior |
| ADM-015 | Open employer detail | Company, representative, verification and operational data are accurate |
| ADM-016 | Open verification queue | Only actionable pending/submitted employers appear once |
| ADM-017 | Review/approve/reject documents and employer | Rules match Batch 04 and create audit/notification evidence |
| ADM-018 | Open occupation mapping pending list | Custom/unreviewed preferences include enough context to decide |
| ADM-019 | Map custom title to canonical occupation | Mapping and alias persist; seeker preference resolves afterward |
| ADM-020 | Reject/map data-lake title candidate | State transitions once and duplicate alias is prevented |
| ADM-021 | Search title candidates | Ranking and filters are stable with punctuation/case variants |
| ADM-022 | Open labor analytics with default period | Summary, trend, distribution and top lists use real backend data |
| ADM-023 | Change analytics date/location/segment filters | All cards/charts/tables share the same filter scope |
| ADM-024 | Analytics period has insufficient history | Forecast says insufficient data instead of inventing demand |
| ADM-025 | Analytics with valid history | Forecast is reproducible from real historical series and labeled experimental |
| ADM-026 | Open analytics detail route | Selected metric/dimension context is retained and values reconcile |
| ADM-027 | Open location data quality metrics | Missing/invalid coordinates and coverage percentages reconcile with records |
| ADM-028 | Drill/filter location analytics | Counts and percentages remain mathematically valid |
| ADM-029 | Open activity logs | Paginated newest-first records contain actor/action/time without secrets |
| ADM-030 | Filter activity logs | Actor/action/date filters return only matching events |
| ADM-031 | Open SMS log | Phone numbers are masked; provider secrets and full message-sensitive data are absent |
| ADM-032 | Filter SMS logs and pagination | Status/purpose/provider/date filters match backend contract |
| ADM-033 | Trigger verified workflow notification | One corresponding SMS log row exists; no duplicate interview status SMS |
| ADM-034 | Open Admin Job Postings | Record current state as read-only shell; do not claim monitoring functionality |
| ADM-035 | Open Admin Smart Matches | Record `NOT IMPLEMENTED`; no fake successful matching run |
| ADM-036 | Open Smart Match result guessed ID | No fabricated results; safe incomplete-state handling |
| ADM-037 | Force backend 401/403/422/500 on admin pages | No raw SQL/stack trace; actionable and non-destructive feedback |
| ADM-038 | Test tables/charts on laptop/tablet widths | Filters, pagination, tooltips and primary actions stay usable |

## Batch exit criteria

- Admin authorization, payload sanitization and aggregate correctness pass.
- Smart Matches and Job Postings are reported as incomplete until backend contracts exist.
- No analytics number is hardcoded or presented without a reproducible source/filter.
