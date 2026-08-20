# i-PESO Mobile — "AI Enhance Bullets" Parity Decision Prompt

## Context
A decision memo first, implementation second — don't paste the implementation block until the decision is actually made and recorded. This exists because building this wrong (real AI on mobile only) would be worse than not building it at all: it would produce different real output for the same labeled feature across platforms.

## Prompt — copy and paste this into a message to whoever can make the call (product/eng lead) first

```
We need a decision on how "AI Enhance Bullets" behaves on mobile before building it.

Web's "AI Enhance Bullets" feature, on the profile/resume screen, is not real AI — it's a hard-coded client-side string template, enhanceResponsibilities() in SeekerProfile.jsx, despite being labeled "AI Enhance" in the UI. Building a real generative call for this on mobile while web keeps faking it would produce different real output for the same labeled feature on the two platforms — worse than either option alone.

Two options:
1. Replicate the fake template on mobile (recommended). Port enhanceResponsibilities()'s exact logic to mobile as a pure client-side function — same input-to-output behavior as web, no API call. This keeps both platforms producing identical text for identical input, which is what parity actually means here even though neither is real AI.
2. Make it a real AI call on both platforms, as a deliberate joint change. This is a bigger scope change — a new endpoint or reuse of an existing one like /seeker/ai-profile-suggestions, plus new 503-handling per the AI-endpoint conventions used elsewhere in the app — and needs sign-off since it changes web's behavior too, not just mobile's.

Please confirm which option we're taking, and why, before implementation starts.
```

## Prompt — once the decision above is made, copy and paste this to implement option 1 (skip if option 2 was chosen; that needs its own joint-change plan, not this prompt)

```
Implement i-peso-mobile's "AI Enhance Bullets" feature as an exact port of web's fake-template behavior, per the team's decision to keep both platforms consistent rather than making this feature real AI on mobile only.

Read enhanceResponsibilities() in i-peso-frontend's SeekerProfile.jsx directly and port its exact string-transformation logic to mobile as a pure client-side function — not a reinterpretation of what it "seems to do." Verify with a few sample inputs that mobile's output byte-matches web's output for the same input.

Definition of done:
- Mobile's output matches web's enhanceResponsibilities() output exactly for the same input, verified with sample cases.
- The "AI Enhance" label in the UI is only used because the behavior is now actually consistent between platforms.
```
