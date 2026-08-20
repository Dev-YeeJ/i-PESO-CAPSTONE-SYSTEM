# i-PESO Mobile — Registration & Email Verification (OTP) Parity Prompt

## Context
Covers account creation and OTP verification only — the two steps before the 7-step onboarding flow begins (`MOBILE_PARITY_03_ONBOARDING_NSRP.md`), and separate from login/session (`MOBILE_PARITY_01_LOGIN_SESSION.md`). These field rules are exact Laravel `validate()` rules on the backend — get them precise, since a mismatched regex or range here produces silent 422s that are hard to debug from the client side.

## Prompt — copy and paste this into a fresh session with `i-peso-mobile` open

```
Bring i-peso-mobile's account registration and OTP email verification into exact parity with the backend contract below. Same stack constraints as the rest of the app: Expo Router, TanStack Query, Zustand, Axios, expo-secure-store — no new libraries needed for this piece.

Global API conventions: no response envelope, standard Laravel 422 {message, errors: {field: [msg]}}, 60/min baseline throttle unless noted otherwise below.

Phase A — Account creation.
POST /auth/register (5/min). Body: {role: "seeker", first_name, last_name, email, mobile_number, password, password_confirmation}.

Field rules — match these exactly, they are the backend's real validate() rules:
- first_name / last_name: required, string, min 2 / max 100 chars, regex ^[\p{L}\s.'-]+$ (letters including accented characters, spaces, periods, apostrophes, hyphens — reject digits and other symbols).
- email: required, valid email format, max 255 chars, must be unique across job_seekers/employers/administrators (a duplicate returns a 422 specifically on the email field).
- mobile_number: required, must match ^09\d{9}$ on the wire. Normalize any +639… or bare 9… input to 09XXXXXXXXX client-side BEFORE sending — write this as a pure function and test it against both input shapes (+639171234567 and 9171234567 should both normalize to 09171234567).
- password: required, confirmed (password_confirmation must match), min 8 chars, must contain at least one number and one symbol. Validate this client-side before submit, but don't make the client rule stricter than the backend's.

Response 201: {message, email, dev_otp?}. dev_otp only appears in local/debug backend environments — never read it or branch app logic on its presence, and never display it in a production build path.

On success, route to the OTP verification screen and carry the email forward automatically — don't make the user retype it.

Phase B — Email verification.
POST /auth/verify-otp (10/min). Body: {email, otp} where otp is a 6-digit numeric string.
- 5 failed attempts trigger a 429 lockout — use the same clear "too many attempts" messaging pattern as login's lockout.
- On success: {message, token, user}. This is the only place a freshly-registered seeker ever receives a token — login is blocked entirely until the account is verified. Store the token via expo-secure-store and route straight to /onboarding.

POST /auth/resend-otp (5/min). Body: {email}. Always returns 200 even for an unknown email (anti-enumeration, same pattern as forgot-password). There's a 60-second cooldown between requests, returning 429 if violated — build a visible cooldown timer on the resend button so the user can't spam their way into a lockout.

Field-level error handling: on a 422 from /auth/register, map errors.<field> directly onto per-field error state under each input (first_name, last_name, email, mobile_number, password). Don't collapse everything into one toast — the backend keys errors by field specifically so they can render inline.

Definition of done:
- Mobile number normalization happens client-side before every submit, tested against both +63 and bare 9 input formats.
- Password client-side validation matches the backend rule exactly — min 8, needs a number and a symbol, nothing stricter or looser.
- dev_otp is never read or displayed anywhere in the built app.
- OTP success stores the token and routes directly to /onboarding, not back to login.
- Resend-OTP shows a 60-second cooldown state before the user can retrigger it.
- 422 errors from registration render per-field inline, not as one generic message.
```
