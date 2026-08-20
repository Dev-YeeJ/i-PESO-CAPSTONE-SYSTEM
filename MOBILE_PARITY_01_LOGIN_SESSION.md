# i-PESO Mobile — Login & Session Parity Prompt

## Context
Part of the 13-prompt set replacing `MOBILE_SEEKER_PARITY_PROMPT.md`. This one covers only the login/session lifecycle — login, forgot/reset password, boot-time session rehydration, logout, and the backend's single-active-session behavior. Account creation and OTP verification are their own prompt (`MOBILE_PARITY_02_REGISTRATION_OTP.md`); the 7-step onboarding that follows verification is `MOBILE_PARITY_03_ONBOARDING_NSRP.md`.

If `MOBILE_PARITY_00_CODEBASE_AUDIT.md` has already been run, check its findings on the Auth section before pasting this — some of what's below may already be implemented correctly. If it hasn't been run, this prompt still works standalone; it tells the executor to verify current behavior against each rule rather than assume a gap.

## Prompt — copy and paste this into a fresh session with `i-peso-mobile` open

```
Bring i-peso-mobile's login and session handling into exact parity with the backend contract below. This is a React Native / Expo app (Expo Router, TanStack Query v5, Zustand, Axios, expo-secure-store, plain StyleSheet against theme/ tokens) — stay in that stack, don't introduce a new state or form library. The session token is stored under the key ipeso_token via expo-secure-store.

First, check what's actually implemented today for login, forgot/reset password, boot-time session rehydration, and logout, and compare it against every rule below. Fix whatever doesn't match; don't rebuild what already works.

Global API conventions that apply to every call in this app: no global response envelope (each endpoint hand-rolls its own shape), standard Laravel 422 validation errors shaped {message, errors: {field: [msg]}}, 403 for wrong role vs 404 for another user's resource, and a 60 req/min baseline throttle on anything without a tighter documented limit.

POST /auth/login (10/min throttle). Body: {email, password}.
- Wrong credentials return 401 with a message that is deliberately identical whether the account doesn't exist or the password is wrong — don't build UI copy that implies which one it was, the backend won't tell you.
- 5 failed attempts for the same email trigger a 429 lockout for 15 minutes, separate from and in addition to the 10/min route throttle — a user can hit this lockout well before the route throttle. Show a clear "too many attempts, try again in X" message, not a generic error.
- An unverified email returns 403 {message, email_unverified: true, email}, and the backend silently resends an OTP on this response. Detect email_unverified: true and route to the OTP verification screen with the email carried forward — this is a redirect, not a failure state to show as a plain error toast.
- On success, store the token and route based on profile_completed.
- Keep the client-side role gate that rejects non-seeker roles, even though the backend would technically authenticate them — this is a mobile-only guard since the app is seeker-only.

GET /auth/me — call on app boot whenever a stored token exists, to rehydrate the session (the authStore.initializeAuth() pattern). Response: {user}.

POST /auth/logout — deletes only the current token, not all of the user's sessions.

Single active session: logging in on a new device revokes all previous tokens for that account — there's only one active session per account, enforced server-side. Handle an unexpected 401 on any authenticated call as a possible remote-eviction event: clear the local token, route to login, and show a message like "signed in on another device" rather than a raw error.

POST /auth/forgot-password (5/min). Body: {email}. Always returns 200 even for an unknown email — never build a "no account with that email" UI. There's a 60-second cooldown between requests, returning 429 if violated; surface that as a visible cooldown timer, not an error.

POST /auth/reset-password (5/min). Body: {email, otp, password, password_confirmation}. This does NOT auto-login — no token comes back in the response. After a successful reset, call POST /auth/login with the new credentials to actually establish a session. Don't treat the reset response itself as a login.

One important shape caveat: the user object returned by /auth/* endpoints includes profile_completed and verification_status. This is NOT the same shape returned by the onboarding step endpoints (/seeker/step-N), which additionally include educ_attainment/form_validation_state but omit verification_status. Whatever function updates the stored user in the auth store, make sure it shallow-merges partial user objects rather than replacing the stored user wholesale — a step-N response must not be allowed to wipe out verification_status that only /auth/me populated.

Definition of done:
- Login distinguishes email_unverified responses from generic 401s and routes accordingly.
- Both the 429 lockout (5 failed attempts) and the 429 route throttle (10/min) are handled with distinct, clear messaging.
- Forgot-password never reveals whether an email exists; reset-password calls /auth/login afterward instead of assuming a session.
- App boot calls /auth/me when a token is stored, and a 401 response there (e.g. from remote session eviction) clears the token and routes to login with an explanation, not a silent crash or infinite spinner.
- The auth store's user-update function merges rather than replaces, verified by confirming a step-N response doesn't erase fields only /auth/me populates.
- Logout clears only the local session.
```
