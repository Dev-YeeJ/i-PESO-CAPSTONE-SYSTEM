# QA Batch 04 — Employer Registration, Documents, Verification, and Access Gates

## Goal

Prove that an employer becomes operational only after complete, auditable PESO verification and that one employer can never access another employer's records or documents.

## Preconditions

- New employer email/mobile and mail inbox.
- Administrator account.
- Valid and invalid registration documents.
- Employer A and Employer B for tenant-isolation tests.

## Flow

`Account -> OTP -> Company profile -> Required documents -> Representative -> Submitted -> Admin review -> Approved/Rejected`

## Test cases

| ID | Scenario / action | Expected result |
|---|---|---|
| EMO-001 | Create employer account and verify OTP | Correct employer identity created; onboarding starts at expected stage |
| EMO-002 | Reload onboarding after each save | Completed stages and saved data restore accurately |
| EMO-003 | Save valid company name, type, workforce/contact data | Backend persists normalized values |
| EMO-004 | Save company profile with missing required field | 422 maps to visible field; button does not appear dead |
| EMO-005 | Use PSGC province/city/barangay cascade | Codes and labels remain internally consistent |
| EMO-006 | Use Google/address picker coordinates | Address and coordinates persist without replacing reliable PSGC values incorrectly |
| EMO-007 | Upload each required valid document | Upload progress/status and server metadata display correctly |
| EMO-008 | Upload disallowed MIME, disguised extension or oversized document | Rejected without database/file orphan |
| EMO-009 | Replace a rejected document | New version is reviewable; old state is not mistaken as approved |
| EMO-010 | View required-document checklist by employer type | Correct requirements and completion count appear |
| EMO-011 | Submit authorized representative with valid contact data | Representative fields persist and normalize |
| EMO-012 | Submit malformed/duplicate representative contact | Validation is field-specific and no partial corruption occurs |
| EMO-013 | Complete all stages | Verification status becomes pending/submitted exactly once |
| EMO-014 | Attempt completion with missing required document | Submission blocked with explicit outstanding item |
| EMO-015 | Pending employer opens dashboard | Clear pending state and document statuses appear |
| EMO-016 | Pending employer opens post-job/vacancies/ATS/calendar URL | Frontend redirects and API denies independently |
| EMO-017 | Admin opens verification queue | New employer appears once with accurate submission time/completeness |
| EMO-018 | Admin opens employer review | Company, representative and document data match submitted values |
| EMO-019 | Admin views document inline | Authorized content loads with private/no-cache behavior |
| EMO-020 | Non-admin calls document view/download endpoint | Denied without storage path or metadata leak |
| EMO-021 | Admin downloads document without reason | Request is rejected if audit reason is required |
| EMO-022 | Admin downloads with reason | File downloads and activity log records admin, employer, document and reason |
| EMO-023 | Approve employer before all required documents approved | Backend blocks premature approval |
| EMO-024 | Approve each required document then employer | Status becomes verified; hiring tools unlock after session refresh |
| EMO-025 | Reject document with notes | Employer sees exact safe notes and notification once |
| EMO-026 | Reject employer with reason | Employer remains blocked and receives reason via configured channels |
| EMO-027 | Re-submit after rejection | Correct stage reopens; updated data returns to queue without duplicate employer |
| EMO-028 | Employer A requests Employer B profile/document/notification IDs | Backend denies cross-tenant access |
| EMO-029 | Administrator endpoint called with employer token | 403; employer cannot self-approve |
| EMO-030 | Approve/reject same employer concurrently | Final state is consistent; duplicate notifications/audit rows are controlled |
| EMO-031 | Mark one/all employer notifications read | Unread count and list update consistently |
| EMO-032 | Logout/login after status transition | Fresh server state controls routes; stale local status cannot bypass gate |

## Batch exit criteria

- Approval is impossible without approved requirements.
- All document access and administrative decisions are authorized and auditable.
- Pending/rejected employers cannot use hiring endpoints.
