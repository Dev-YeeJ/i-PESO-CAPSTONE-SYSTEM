# i-PESO Mobile — AI Chatbot Screen Prompt

## Context
A brand-new screen — no chatbot UI exists in mobile yet. The full spec already lives in `CHATBOT_MOBILE_HANDOFF.md` at the capstone repo root (copy, starter chips, Tagalog/English/Taglish handling, RN keyboard behavior, test checklist). This prompt exists mainly to point at that doc and flag the one thing worth spot-checking before building.

## Prompt — copy and paste this into a fresh session with `i-peso-mobile` and `CHATBOT_MOBILE_HANDOFF.md` open

```
Build an AI chatbot screen for i-peso-mobile, following CHATBOT_MOBILE_HANDOFF.md at the capstone repo root exactly — that document specifies the full contract, copy, starter chips, Tagalog/English/Taglish handling, and RN-specific keyboard-handling guidance. Read it in full before starting; don't improvise a generic KeyboardAvoidingView setup without reading its guidance first, since it calls out specifics for this app.

Before building, spot-check that the API contract below still matches the live backend — the handoff doc states the backend is done and deployed, but other assumptions in the original mobile parity doc turned out stale, so verify rather than assume.

API contract: POST /chat/public (10/min, no auth required). Body: {message, history?: [{role: user|model, text}]} -> {reply}.

Handle a retryable field on error responses if the handoff doc specifies one — build a retry affordance for retryable failures rather than a dead-end error screen. Since this endpoint requires no auth, a 401/403 shouldn't occur; treat 5xx and network failures as retryable by default if the doc doesn't say otherwise.

Definition of done:
- The screen matches the handoff doc's copy, starter chips, and language-handling behavior.
- Keyboard handling follows the doc's RN-specific guidance, verified manually on a real device — this is exactly the kind of thing that looks fine in a simulator and breaks on a real keyboard.
- Error responses with a retryable field (or equivalent) surface a retry action, not a dead end.
- The full test checklist from the handoff doc has been run through manually.
```
