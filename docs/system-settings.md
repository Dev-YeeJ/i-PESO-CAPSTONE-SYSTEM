# System Settings

**Where:** Configuration → System Settings (`/admin/settings`).
**Who:** anyone with Configuration access can view it. Only the **system administrator** (PESO Office Manager) can change settings or send test messages.
**Built:** 2026-11-13.

System Settings controls how i-PESO *behaves*. What people *read* lives in Content Modules (`docs/content-module-plan.md`).

**Two rules:**
- **No secrets.** API keys and passwords stay in the server's `.env` file. This page only reports whether each one is set.
- **Fairness rules stay in code.** These were decided on fairness grounds and are not settings:
  - the 3-review threshold for company ratings;
  - the 14-day feedback reveal.

## Sections

| Section | What's in it |
|---|---|
| **System status** (read-only) | Status of the scheduler (cron) and queue worker, SMS (live or test mode, sent/failed this month, limit), email (delivered or log only), mobile push, AI, the assistant, Google Maps, PSOC, the server (debug mode left on in production is flagged as an error) and free disk space. Each check says how to fix itself. Test buttons send a test email to you, a test SMS to a number you enter (one UniSMS credit when live), and a ping to the AI. |
| **Access** | Maintenance mode and its message; pausing job seeker or employer registration and the message shown; the assistant on/off; recording questions the assistant can't answer (Content Modules → Reader insights). |
| **SMS** | A master switch; on/off for each message type (application status, interview messages, employer verification, job fair messages); a monthly limit (0 = no limit). |
| **Employer rules** | Placement report due day (1–28); placement report reminder days (before or after the due day); Mayor's Permit expiry reminder days. |

## How it works

- **Storage:** settings are stored in `system_settings`, one row per *changed* setting; anything never changed uses its default.
  - Values are cached and the cache is cleared on save, so a change applies to the next request.
  - If the table is missing, everything falls back to its default.
  - Definitions, limits and defaults are in `App\Support\SystemSettingsRegistry`.
- **Config overrides:** some settings override a config value at boot (`AppServiceProvider` → `SystemSettings::applyToConfig()`), so existing code follows them unchanged:
  - `placement_reports.deadline_day`
  - `placement_reports.reminder_offsets`
  - `permits.reminder_days` (new `config/permits.php`)
  - `services.chatbot.gap_logging`

  Setup commands (`package:discover`, `migrate`, `config:*`…) skip this step, so they never need a database.
- **Maintenance mode:** the `EnforceSystemAccess` middleware on the API group answers 503 `{ maintenance: true, message }`.
  - **Stays open:** staff accounts, `api/admin/*`, `api/auth/*` (so staff can sign in) and `api/public/system-status`.
  - **On the website:** the page shows a full-screen notice that rechecks every minute; staff pages keep working.
- **Paused registration:**
  - **API:** `POST /api/auth/register` returns 403 `{ registration_closed: true, message }`.
  - **Website:** `/register`, `/register/seeker` and `/register/employer` show the notice, and point to the other form if it is still open.
- **Assistant off:** `POST /api/chat/public` returns 503 without calling the AI, and the website hides the chat button.
- **SMS:** `SmsService::send()` checks the master switch, the type switch and the monthly limit (counting messages actually *sent* this month). A blocked message is still recorded in the SMS log as "skipped", with the reason. Test messages from this page always go through.
- **Heartbeats:** `routes/console.php` writes a heartbeat to the cache every minute, and again after each queue-worker run. The status page reports **Stopped** when a heartbeat is more than 5 minutes old, because on shared hosting a dead cron job otherwise fails silently.
- **Audit:** every change goes to the Activity Log as old → new (e.g. "Changed “Placement report due day” from 10 to 15."). Test messages are logged too.

## API

| Method | Path | Access |
|---|---|---|
| GET | `/api/public/system-status` | Public (open during maintenance) |
| GET | `/api/admin/system-settings` | Configuration view |
| GET | `/api/admin/system-settings/status` | Configuration view |
| PUT | `/api/admin/system-settings` `{ values: { 'sms.enabled': false, … } }` | System administrator |
| POST | `/api/admin/system-settings/test-email` · `/test-sms {phone}` · `/test-ai` | System administrator (throttled) |

## Not built yet (suggested next)

- **Staff account security:** sign-in timeout, temporary password validity (now 3 days), minimum password length, lock after repeated failed sign-ins.
- **Data retention:** how long activity logs and reader insights are kept.
- **OJT defaults:** required hours, and the "ending soon" warning (now 3 days).
- **Mobile app:** the app does not read `/public/system-status` yet. During maintenance its API calls get the 503 message, but it shows no dedicated screen.
