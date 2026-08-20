# i-PESO Mobile — Cleanup Pass Prompt

## Context
Dead code and config gaps — mechanical, low-risk, and a good one to hand to a junior dev as a standalone task since it doesn't require deep context. Verify each item still applies (some may already be gone) before removing anything — see `MOBILE_PARITY_00_CODEBASE_AUDIT.md` if it's been run.

## Prompt — copy and paste this into a fresh session with `i-peso-mobile` open

```
Do a cleanup pass on i-peso-mobile: dead code removal and a couple of missing config values. This is a deletion-and-config pass — verify each item below still applies before touching anything, since some may already be resolved.

1. Remove app/modal.tsx — an unused Expo template placeholder, not wired into the root Stack.Screen list. Confirm it's genuinely unreferenced before deleting.

2. Remove template leftovers: components/hello-wave.tsx, parallax-scroll-view.tsx, external-link.tsx, themed-text.tsx, themed-view.tsx. Grep for imports of each one first to confirm zero references, then delete. Don't delete on the assumption alone — actually check.

3. Remove the @react-native-async-storage/async-storage dependency. It's installed but should have zero references anywhere in the app, since token storage is exclusively expo-secure-store. Grep to confirm no references exist before removing it from package.json and updating the lockfile.

4. Add android.package and ios.bundleIdentifier to app.json. This is flagged in i-peso-mobile/DEV_BUILD_GUIDE.md as "MANDATORY, do this first" and is currently missing, which blocks any real EAS/native build. Check that doc for guidance on the exact identifiers to use — likely a reverse-domain form matching the project's branding/domain convention. Don't invent arbitrary identifiers; confirm the intended values with the team if the doc doesn't specify them outright.

Definition of done:
- app/modal.tsx and the five template components are gone, confirmed via grep that nothing imported them beforehand.
- @react-native-async-storage/async-storage is removed from package.json and the lockfile, confirmed via grep that no code referenced it.
- app.json has both android.package and ios.bundleIdentifier set to values confirmed with the team, not placeholders.
- The app still builds and runs after all removals — this is a deletion pass, verify nothing broke.
```
