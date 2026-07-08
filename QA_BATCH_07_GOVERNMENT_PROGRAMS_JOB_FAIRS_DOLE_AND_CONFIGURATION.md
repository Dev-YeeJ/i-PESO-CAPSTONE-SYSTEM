# QA Batch 07 — Government Programs, Job Fairs, DOLE Reporting, and Configuration Maturity

## Goal

Validate the PESO public-service ecosystem and official outputs, then inventory configuration screens honestly according to their persistence and authorization state.

## Preconditions

- Administrator, approved employer and completed seeker.
- Programs in draft/open/full/closed/expired states.
- Job fairs in draft/published/ongoing/completed/cancelled states.
- Applications, placements, invitation records, requirements and result entries.

## Flow

`Admin creates/publishes service -> Seeker/employer participates -> Admin reviews -> Outcome -> Official export/report`

## Test cases

| ID | Scenario / action | Expected result |
|---|---|---|
| GOV-001 | Open government-program list | Backend-backed rows, analytics and statuses load correctly |
| GOV-002 | Create valid program with dates, capacity, eligibility and skills | One program persists with correct initial status |
| GOV-003 | Submit missing/invalid dates or negative capacity | Field validation prevents creation |
| GOV-004 | Upload/replace program attachment | Valid private/public access policy is enforced; old file handled safely |
| GOV-005 | Edit program | Changes appear to eligible seeker/employer views |
| GOV-006 | Archive/delete program with applications | Historical applications remain coherent and program is no longer applyable |
| GOV-007 | Compare program analytics to applications/statuses | Totals and distributions reconcile |
| GOV-008 | Open applicants list with search/status filters | Correct pagination and current status |
| GOV-009 | Review applicant with notes | Status, actor/time, notes and seeker notification persist |
| GOV-010 | Attempt invalid/repeated applicant status transition | Rejected or idempotent without duplicate history/notification |
| GOV-011 | Download applicant document as admin | Authorized file opens; no storage path leaked |
| GOV-012 | Non-owner/non-admin requests applicant document | Access denied |
| GOV-013 | Manage Citizen Charter service record | CRUD persists where exposed and archived item disappears appropriately |
| GOV-014 | Review employer skill demand | Decision and notes persist and become visible to employer |
| GOV-015 | Open job-fair list with filters | Backend-backed fair states and counts load correctly |
| GOV-016 | Create valid fair with venue, schedule and capacity | Fair persists once in draft |
| GOV-017 | Create fair with invalid chronology/capacity | Validation blocks save |
| GOV-018 | Edit and publish fair | Published fair becomes visible to intended participants |
| GOV-019 | Publish incomplete fair | Backend blocks with outstanding requirements |
| GOV-020 | Invite eligible employer | Invitation is unique and employer notification/state appears |
| GOV-021 | Invite same employer twice | No duplicate participation/invitation |
| GOV-022 | Update participation state | Admin and employer see the same legal state |
| GOV-023 | Review employer requirement submission | Status/notes/version synchronize with employer |
| GOV-024 | Admin views requirement file | Authorized private response with safe headers |
| GOV-025 | Submit proxy confirmation/results for assisted employer | Actor/source is auditable and totals validate |
| GOV-026 | Compare direct employer and admin-proxy results | Same reporting contract; no duplicate report |
| GOV-027 | Download ROI Form 3 | Correct fair/employer/result totals and readable document |
| GOV-028 | Export SPRS for fair | Export opens and reconciles to fair participation/results |
| GOV-029 | Generate invitation letter | Correct fair/employer details and no unrelated private data |
| GOV-030 | Cancel/delete fair with participants | Defined status behavior preserves history and sends controlled notices |
| GOV-031 | Generate DOLE SPRS for chosen month/year | Report uses source records in exact coverage period |
| GOV-032 | Compare SPRS vacancy/applicant/referred/placed counts | Values reconcile with filters and application states |
| GOV-033 | Open historical SPRS detail/print view | Stored summary renders consistently and prints readably |
| GOV-034 | Preview admin establishment report for one employer | Correct isolation and date/status filters |
| GOV-035 | Export admin establishment PDF/CSV | Files open and equal preview totals/rows |
| GOV-036 | Open PEIS Export screen | Record `NOT IMPLEMENTED`; hardcoded/random rows are not accepted as real export |
| GOV-037 | Open Staff Management and click actions | Record `NOT IMPLEMENTED`; alerts/empty local state are not CRUD |
| GOV-038 | Open Roles and Permissions and click actions | Record `NOT IMPLEMENTED`; only built-in coarse roles are currently enforced |
| GOV-039 | Open Announcements and Content Modules | Record `NOT IMPLEMENTED`; no fake publish/save pass |
| GOV-040 | Change System Settings, refresh and re-login | Record `NOT IMPLEMENTED` if values are only local and not persisted |
| GOV-041 | Open SMS Templates | Confirm read-only documentation; do not claim editable template administration |
| GOV-042 | Test report/program/fair failures and retries | No duplicate official record, raw exception, stale success or orphan file |

## Batch exit criteria

- Program and job-fair participant states agree across admin, employer and seeker.
- Every official export opens and reconciles to source records.
- Prototype configuration/PEIS screens remain explicitly excluded from release claims.

