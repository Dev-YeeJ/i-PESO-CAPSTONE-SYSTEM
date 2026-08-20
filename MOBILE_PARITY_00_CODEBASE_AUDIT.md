# i-PESO Mobile — Codebase Audit Prompt

## Context
This is prompt 0 of a 13-part set (`MOBILE_PARITY_00` through `MOBILE_PARITY_12`) that replaces the original single `MOBILE_SEEKER_PARITY_PROMPT.md`. That doc's "Current State" section made claims about what already worked in `i-peso-mobile` that turned out to be inaccurate, which threw off the work built on top of it. This prompt exists to fix that root cause: before any of the other 12 prompts get run, get a real, verified picture of what the mobile app actually does today, straight from the code — not from a doc that's already been shown to drift.

Run this one first, standalone, with no other context needed. Its output — a written report — is what the other 12 prompts should be checked against before starting.

## Prompt — copy and paste this into a fresh session with the `i-peso-capstone-system` repo open

```
Audit the current state of the i-peso-mobile app (the React Native / Expo job-seeker app) against the claims below. Do not change any code — this is a fact-finding pass only, and the deliverable is a written report.

For each claim, check the actual current code and mark it:
- confirmed — cite the file path and line number(s) that prove it
- false or stale — explain what's actually there instead
- partially true — explain the gap

Tech stack — confirm package.json versions still match: expo ~54.0.33, expo-router ~6.0.23, @tanstack/react-query ^5.101.2, zustand ^5.0.12, axios ^1.15.2, expo-secure-store ~15.0.8, expo-image / expo-image-picker / expo-document-picker / expo-file-system / expo-sharing, @expo-google-fonts/dm-sans + dm-serif-display.

Auth — register (seeker-only), OTP email verification, login (incl. client-side role-gate rejecting non-seekers), forgot/reset password, session persistence + auto-login via authStore.initializeAuth() reading /auth/me on boot, logout. Token stored under key ipeso_token via expo-secure-store.

Onboarding — all 7 NSRP steps present in app/onboarding.tsx + components/onboarding/Steps.tsx, geocoding + PSGC resolution on the address step, re-entrant editing via (seeker)/profile/edit.tsx reusing the same step components.

Dashboard — (seeker)/index.tsx: profile strength, next-best-action, quick stats, feed-mode job list (Recommended/Nearby/Latest).

Job search/browse — (seeker)/jobs.tsx, jobs/[id].tsx: filters, sort, infinite scroll, save, apply, skill-gap modal.

Applications — (seeker)/applications.tsx, applications/[id].tsx: list, detail, withdraw.

Profile — (seeker)/profile.tsx, profile/edit.tsx: photo upload, resume generation/share, certificates, AI summary, analytics.

Notifications, job fairs (read-only), program applications, citizen charter — confirm each screen exists and note which actual endpoints it calls.

Route protection — unauthenticated goes to /login; authenticated but profile_completed:false goes to /onboarding.

Then also check these specific gap-list items, since they're what the next 12 prompts assume:

1. Does services/seekerService.ts still call GET /seeker/upskill-hub or GET /seeker/upskill-hub/recommended? Is i-peso-mobile/GOVERNMENT_PROGRAMS_MIGRATION.md still present, and has it already been applied (fully, partially, or not at all)?
2. Are react-native-maps and expo-location already installed? Is there any partial map screen already started anywhere in the app?
3. Is react-native-qrcode-svg installed, and is it actually unused?
4. Does CHATBOT_MOBILE_HANDOFF.md still exist at the capstone repo root? Spot-check whether its POST /chat/public contract still matches the live backend.
5. Does (seeker)/program-applications.tsx exist, and does it actually work end to end (list + document upload), or is it stubbed/broken?
6. Does app/modal.tsx still exist, and is it still absent from the root Stack.Screen list?
7. Do components/hello-wave.tsx, parallax-scroll-view.tsx, external-link.tsx, themed-text.tsx, themed-view.tsx still exist? Does anything import any of them now?
8. Is @react-native-async-storage/async-storage still a dependency? Is it really unreferenced anywhere in the app code?
9. Does app.json have android.package and ios.bundleIdentifier set yet?
10. Is there any mobile equivalent of web's enhanceResponsibilities() fake-AI bullet-enhancement template, or does that feature not exist on mobile at all yet?

Deliverable: one written report, organized by the sections above, each item marked confirmed/false/partial with file:line evidence. Also flag anything you find that isn't covered by any claim above at all — new screens, new dependencies, new bugs, anything that looks like drift since these claims were written. That drift is exactly what this audit exists to catch.
```
