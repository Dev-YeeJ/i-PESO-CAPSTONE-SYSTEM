# Mobile Sync Prompt

Use this whenever the job seeker web app has moved ahead of the mobile app and they need to be brought back in line:

> Check the job seeker side of the web app (`i-peso-frontend`) for anything that's changed since the mobile app (`i-peso-mobile`) was last updated to match it — new fields, new screens, changed validation rules, changed API calls, bug fixes, copy changes, anything at all. For each thing you find, check whether the backend (`i-peso-backend`) actually changed too or if it's a web-only change, find the equivalent screen or service file in the mobile app, and bring it up to date the same way — same fields, same validation, same API calls, same behavior. Build it using the mobile app's existing stack and conventions (Expo Router, TanStack Query, Zustand, Axios, expo-secure-store, plain StyleSheet against the theme tokens, hand-rolled form validation) rather than introducing anything new. If you find a bug on the web side while doing this, don't just fix it quietly on mobile — point it out so it can be fixed on both. Reference `MOBILE_SEEKER_PARITY_PROMPT.md` at the repo root for the mobile app's current state and the full backend API contract.

Paste that as-is — it doesn't need filling in, it already covers whatever kind of change happened.
