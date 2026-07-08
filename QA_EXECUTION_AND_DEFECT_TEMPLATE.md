# i-PESO QA Execution and Defect Template

## Test environment

| Field | Value |
|---|---|
| Build/commit | |
| Tester | |
| Date and time | |
| Web URL | `http://localhost:5173` |
| API URL | `http://localhost:8000/api` |
| Browser/device | |
| Database/seed | |
| Mail/SMS mode | |
| Maps/AI/calendar configuration | |

## Test accounts

| Role | Account | State |
|---|---|---|
| Seeker A | | Verified, profile complete |
| Seeker B | | Verified, separate owner for privacy tests |
| Employer A | | Verified/approved |
| Employer B | | Separate tenant |
| Pending employer | | Verified email, admin approval pending |
| Administrator | | Active |

Never place real passwords, OTPs, API keys, tokens, or private document contents in this file.

## Execution sheet

| Case ID | Status | Actual result | Evidence | Defect ID | Tester/date |
|---|---|---|---|---|---|
| | PASS / FAIL / PARTIAL / BLOCKED / NOT IMPLEMENTED | | Screenshot, response, log | | |

## Defect report

### `[DEFECT-ID] Concise title`

- **Severity:** Critical / High / Medium / Low
- **Priority:** P0 / P1 / P2 / P3
- **Role and module:**
- **Build and environment:**
- **Preconditions:**
- **Steps to reproduce:**
  1.
  2.
  3.
- **Expected:**
- **Actual:**
- **Reproducibility:** Always / Intermittent / Once
- **Evidence:** screenshot, video, request payload, response status/body, console or Laravel log excerpt
- **Data impact:**
- **Security/privacy impact:**
- **Workaround:**

## Severity guide

| Severity | Meaning | Examples |
|---|---|---|
| Critical | System or security failure with no safe continuation | Cross-role access, private-file leak, corrupted records, auth bypass |
| High | Core user goal cannot complete | Cannot onboard, post, apply, update ATS, approve employer, export required report |
| Medium | Feature works incorrectly or with material UX/data defects | Missing fields, stale state, bad validation, unusable mobile layout |
| Low | Cosmetic or minor convenience problem | Spacing, copy, non-blocking warning |

## Evidence checklist

- Capture the route and authenticated role.
- Capture exact input data without secrets.
- Capture HTTP status and validation keys for failed API calls.
- Confirm database persistence by reload or a second authorized screen.
- For ownership tests, prove both the permitted owner and denied non-owner result.
- For exports, open the generated file and validate content, not only download success.
- For notifications, validate unread count, history row, destination, and duplicate prevention.
