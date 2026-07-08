# QA Batch 05 — Employer Vacancies, ATS, Interviews, Calendar, Job Fairs, and Reports

## Goal

Validate the complete approved-employer workflow from vacancy creation through placement and official reporting, including tenant isolation and legal state transitions.

## Preconditions

- Approved Employer A and Employer B.
- Completed seekers with varied qualifications.
- Google Calendar configured and an unconfigured/failure scenario.
- Published job fair invitation and report-period data.

## Flow

`Approved employer -> Vacancy -> Seeker application -> ATS -> Interview -> Outcome -> Placement/reporting`

## Test cases

| ID | Scenario / action | Expected result |
|---|---|---|
| EMR-001 | Open vacancy list as approved employer | Only own vacancies appear with correct counts/statuses |
| EMR-002 | Create valid local vacancy through wizard | All required DOLE-oriented fields persist and vacancy appears once |
| EMR-003 | Save incomplete wizard step | Visible field errors; entered valid data is retained |
| EMR-004 | Select occupation, skills and mandatory certification | Canonical IDs/labels persist and drive matching eligibility |
| EMR-005 | Enter salary range with minimum above maximum | Rejected at relevant fields |
| EMR-006 | Enter deadline in past or invalid vacancy dates | Rejected; no active expired posting created |
| EMR-007 | Enter PSGC location and coordinates | Address displays accurately in seeker map/detail |
| EMR-008 | Edit vacancy | Changes persist and do not alter another employer's posting |
| EMR-009 | Close/delete vacancy with existing applications | Defined safe behavior preserves application/audit history |
| EMR-010 | List vacancies when active deadline has expired | Vacancy automatically closes and cannot receive applications |
| EMR-011 | Employer A requests Employer B vacancy ID | Denied for view/update/delete |
| EMR-012 | Open ATS with no applicants | Useful empty state, no fake cards |
| EMR-013 | Open ATS after seeker application | Candidate appears once in correct initial stage |
| EMR-014 | Search/filter/sort ATS | Results and counts remain accurate |
| EMR-015 | Open candidate detail | Authorized profile/application data is complete and privacy-scoped |
| EMR-016 | Move application through valid stages | Status, timestamp, actor, timeline and notifications update atomically |
| EMR-017 | Attempt invalid backward/terminal transition | Backend rejects without corrupting timeline |
| EMR-018 | Bulk-update valid selected applications | Only selected own applications change; results report partial failures |
| EMR-019 | Bulk-update mixed foreign/invalid IDs | Foreign records remain untouched and safe errors return |
| EMR-020 | Schedule interview without required date/time/location | Validation blocks transition |
| EMR-021 | Schedule valid onsite interview | Interview record and both-party notifications are created once |
| EMR-022 | Schedule valid online interview with Meet link | Link is generated/stored only for authorized participants |
| EMR-023 | Reschedule/cancel interview | Calendar/timeline/notifications reflect latest state without duplicate active event |
| EMR-024 | Calendar integration unavailable or token expired | Core ATS remains usable and gives reconnect/fallback guidance |
| EMR-025 | Load interview calendar date range | Only own relevant events load at correct timezone/date |
| EMR-026 | Mark candidate hired without placement fields | Backend requires start date and salary/required placement data |
| EMR-027 | Mark candidate hired with valid placement | Seeker/employer/admin/report views synchronize |
| EMR-028 | Try to reprocess withdrawn application | Rejected with no new interview or status history |
| EMR-029 | Open employer Job Fairs | Invited/published relevant fairs show correct participation state |
| EMR-030 | Express interest/respond to invitation | State changes once and admin sees response |
| EMR-031 | Upload fair requirement and replace rejected submission | Private file/review status/version behavior is correct |
| EMR-032 | Submit confirmation slip | Attendance/confirmation data persists and is visible to admin |
| EMR-033 | Submit job fair result entries and mismatch tally | Totals validate and report state persists |
| EMR-034 | Download employer ROI Form 3 | PDF/file opens and contains the employer's actual fair results only |
| EMR-035 | Preview establishment report | Only Employer A applicant/placement data appears |
| EMR-036 | Filter report by date/status | Preview totals and detail rows match source applications |
| EMR-037 | Export establishment report to PDF and CSV | Files open, filters match preview, headers/totals are correct |
| EMR-038 | Open notifications under pagination | Bounded history, unread count and read state are consistent |
| EMR-039 | Run main actions on narrow and desktop layouts | Wizard, ATS board/grid, modals and calendar remain usable |
| EMR-040 | Refresh/network-retry after mutations | No duplicate vacancy, status history, interview, fair submission or export record |

## Batch exit criteria

- Tenant isolation holds for every vacancy, application, calendar event, job-fair file and report.
- All ATS transitions are validated server-side and auditable.
- The current undefined `updateEmployerApplicationStatus` runtime risk in `EmployerATSGrid.jsx` is resolved and tested.

