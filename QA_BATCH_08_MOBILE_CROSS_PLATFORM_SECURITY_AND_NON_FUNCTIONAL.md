# QA Batch 08 — Mobile, Cross-Platform, Security, Privacy, Performance, Accessibility, and Recovery

## Goal

Prove that the system behaves safely under real devices, cross-role state changes, failures, concurrency, hostile input and non-ideal network conditions.

## Preconditions

- Android physical device/emulator and at least one web browser at desktop/mobile widths.
- Laravel reachable using LAN IP for physical device; never `127.0.0.1` on the phone.
- Seeker, employer and administrator test accounts with isolated ownership data.
- Ability to simulate offline/slow/failed third-party services.

## Flow

`Create on one surface -> Act on another role/surface -> Refresh/recover -> Verify ownership, consistency, notification and audit evidence`

## Test cases

| ID | Scenario / action | Expected result |
|---|---|---|
| NFR-001 | Install dependencies and run mobile lint/typecheck | No unresolved `dm-sans` module or TypeScript error |
| NFR-002 | Launch Expo app with correct LAN API URL | Splash/auth route resolves and backend is reachable |
| NFR-003 | Launch with unreachable/malformed API URL | Friendly connection state; no endless spinner or technical dump |
| NFR-004 | Register seeker on mobile | Same minimal account contract as web; no premature NSRP requirement |
| NFR-005 | Verify OTP on mobile | Correct code advances; wrong/expired/resend behavior matches web |
| NFR-006 | Login completed seeker on mobile | Enters `/(seeker)` routes and restores session after restart |
| NFR-007 | Login employer/admin on seeker-only mobile app | Rejected and role token is not retained |
| NFR-008 | Incomplete seeker logs in on mobile | Guided to onboarding/handoff without protected feature bypass |
| NFR-009 | Load mobile home/profile | Real API data and safe empty/error states |
| NFR-010 | Browse mobile jobs | Active relevant jobs, loading/pagination and freshness are correct |
| NFR-011 | Apply from mobile then open web seeker applications | One shared application with identical status/timeline |
| NFR-012 | Employer updates mobile-created application | Mobile and web seeker views reflect status after refresh |
| NFR-013 | Withdraw on one seeker surface | Other surface and employer ATS synchronize |
| NFR-014 | Mobile app background/foreground during expired session | Re-authentication is safe and unsaved action is not duplicated |
| NFR-015 | Offline during submit then reconnect | Clear pending/failure result and no duplicate mutation |
| NFR-016 | Use Android back gestures and deep links | No route trap, wrong-role route or blank screen |
| NFR-017 | Verify mobile touch targets, keyboard and safe areas | Inputs/actions remain reachable and not covered |
| NFR-018 | Web session and mobile session logout behavior | Token revocation policy is consistent and documented |
| NFR-019 | Submit HTML/script strings in free-text fields | Output is escaped; no stored/reflected XSS |
| NFR-020 | Submit SQL-like strings and malformed IDs | Parameterized safe response; no SQL detail leak |
| NFR-021 | Tamper role/status/owner IDs in request body | Server ignores/denies unauthorized privilege or ownership changes |
| NFR-022 | Request private certificates/documents by another owner | 403/404 with no path, filename or metadata leak |
| NFR-023 | Upload executable/disguised/polyglot file | Server rejects based on validated type/content policy |
| NFR-024 | Upload file then force database save failure | Uploaded file is cleaned up; no orphan remains |
| NFR-025 | Inspect sensitive responses/logs | No password, OTP, token, API key, full phone or private document URL |
| NFR-026 | Test CORS from allowed and unapproved origins | Only configured origins/credentials policy succeed |
| NFR-027 | Test CSRF/token misuse according to Sanctum mode | Unauthorized mutation fails safely |
| NFR-028 | Exceed auth, apply, AI, maps and upload throttles | 429 handled with retry guidance; no duplicate action |
| NFR-029 | Concurrent double apply/status/approval requests | Unique/transactional constraints produce one legal result |
| NFR-030 | Employer A and B race on foreign resource ID | Ownership enforcement remains intact |
| NFR-031 | Database/API returns 500 | User sees safe retry state; raw SQL/stack trace hidden |
| NFR-032 | Mail provider fails during registration/status update | Core transaction has defined rollback/retry behavior |
| NFR-033 | SMS provider fails | Core workflow succeeds where appropriate; failure is logged without secret |
| NFR-034 | AI provider times out/unavailable | Rule/fallback or honest failure; user data is not invented/lost |
| NFR-035 | Maps/PSGC service fails | Manual/guided completion remains possible where required |
| NFR-036 | Calendar OAuth denied/token expired | ATS remains usable and reconnect guidance appears |
| NFR-037 | Measure dashboard initial requests/payload | Lightweight summary first; no unbounded notification/profile feed |
| NFR-038 | Measure Job Map initial and detail requests | Compact list first; selected detail/matching fetched on demand |
| NFR-039 | Test directories with large paginated data | Server pagination/filtering; no browser freeze or all-row fetch |
| NFR-040 | Test repeated navigation for request leaks | Polling/listeners cancel; no request storm or duplicate toast |
| NFR-041 | Keyboard-only complete auth and primary forms | Visible focus, logical order and actionable controls |
| NFR-042 | Screen-reader labels for inputs/icons/dialogs | Names, errors, required state and modal context are announced |
| NFR-043 | Check color contrast and non-color status cues | Status/error/success remain understandable without color alone |
| NFR-044 | Zoom web to 200% and test 360px width | No hidden primary action or destructive horizontal clipping |
| NFR-045 | Refresh/back after successful POST/PATCH | No resubmission warning causes duplicate record |
| NFR-046 | Restart Laravel/queue while notifications pending | Queued work resumes/idempotently fails with observable status |
| NFR-047 | Backup/restore representative database and private files | Referential integrity and authorized files remain usable |
| NFR-048 | Execute full seeker -> employer -> admin golden path | Registration, approval, post, apply, interview, hire and report complete with consistent evidence |

## Batch exit criteria

- Mobile lint and TypeScript pass; physical-device API setup is reproducible.
- Zero Critical security/privacy/ownership defects.
- Core workflows recover from third-party and network failure without duplicate/corrupt state.
- Performance and accessibility checks meet the agreed release baseline.
