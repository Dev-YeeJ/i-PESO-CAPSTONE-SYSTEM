# QA Batch 01 — Authentication, Registration, Verification, and Access

## Goal

Prove that every account enters through the correct journey, session state is trustworthy, and no role can cross an authorization boundary.

## Preconditions

- Clean guest browser plus separate sessions for seeker, employer, and administrator.
- One verified and one unverified account per applicable role.
- Access to the local mail catcher or test inbox.
- Use browser Network tools for 401, 403, 422, and 429 checks.

## Flow

`Landing -> Role selection -> Registration -> OTP verification -> Role/completion gate -> Dashboard -> Logout`

## Test cases

| ID | Scenario / action | Expected result |
|---|---|---|
| AUTH-001 | Open `/`, login, register, forgot-password as guest | Public pages load without protected data or console crash |
| AUTH-002 | Open a protected seeker URL while logged out | Redirect to `/login` retains an encoded return URL |
| AUTH-003 | Submit empty login form | Required errors are visible and request is not sent unnecessarily |
| AUTH-004 | Submit malformed email and valid-looking password | Client/server reject the email consistently |
| AUTH-005 | Submit valid email with wrong password | Generic failure; no account-existence or password detail leak |
| AUTH-006 | Repeatedly submit wrong credentials | Throttling returns controlled feedback; UI does not loop |
| AUTH-007 | Register seeker with valid names, email, PH mobile and password | Account created; OTP journey starts; no NSRP fields required yet |
| AUTH-008 | Register seeker with duplicate email | 422 maps to the email field and does not create a duplicate |
| AUTH-009 | Register seeker with duplicate normalized mobile formats | Duplicate is rejected after normalization |
| AUTH-010 | Register seeker with weak password | Password rules and confirmation are enforced |
| AUTH-011 | Register seeker with leading/trailing spaces | Names/contact values are safely normalized |
| AUTH-012 | Register employer with valid account fields | Employer account created and enters verification/onboarding journey |
| AUTH-013 | Register employer using an existing seeker email | Global account uniqueness is enforced |
| AUTH-014 | Enter correct six-digit OTP | Email is verified once and user advances correctly |
| AUTH-015 | Enter wrong OTP | Verification fails without clearing unrelated account state |
| AUTH-016 | Enter expired OTP | Expiry is explained; account remains eligible for resend |
| AUTH-017 | Resend OTP once | New OTP arrives and countdown/feedback prevent accidental spam |
| AUTH-018 | Verify using the old OTP after resend | Old code is rejected; latest code succeeds |
| AUTH-019 | Exceed resend limit | 429 is handled with retry guidance, not a generic crash |
| AUTH-020 | Request password reset for known email | Neutral success response and reset email; no sensitive data leak |
| AUTH-021 | Request password reset for unknown email | Response remains enumeration-safe |
| AUTH-022 | Reset with invalid/expired token | Password is unchanged and clear failure is shown |
| AUTH-023 | Reset with valid token and strong matching passwords | Password changes; old credential fails; new credential works |
| AUTH-024 | Login as verified incomplete seeker | Redirect to `/seeker/onboarding` until profile completion |
| AUTH-025 | Login as completed seeker | Redirect to seeker dashboard |
| AUTH-026 | Login as pending employer | Employer dashboard allowed; verified-employer tools remain blocked |
| AUTH-027 | Login as approved employer | Employer hiring routes become available |
| AUTH-028 | Login as administrator | Admin dashboard opens; seeker/employer dashboard does not |
| AUTH-029 | Manually enter another role's URL for each role pair | Frontend redirects and API independently returns 403/denial |
| AUTH-030 | Refresh a protected deep link | Session restores before guards run; no redirect flicker or loop |
| AUTH-031 | Logout, then use Back and refresh | Protected content is not usable and token is invalidated server-side |
| AUTH-032 | Tamper/remove local token while page is open | Next request safely returns to login and clears stale user state |

## Batch exit criteria

- Zero Critical or High defects.
- No account enumeration, role bypass, onboarding bypass, or employer-approval bypass.
- Every 422 error appears at the correct field; every 401/403 produces a controlled user state.

