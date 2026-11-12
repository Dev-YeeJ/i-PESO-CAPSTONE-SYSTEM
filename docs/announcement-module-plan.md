# Announcement Module — Plan

**System:** i-PESO Smart Employment System (Urdaneta City PESO)
**Module owner:** Admin side, under **Configuration → Announcements**
**Status:** Planned and implemented (web). Mobile app screen handed off — see `JUNIOR_DEV_MOBILE_ANNOUNCEMENTS_PROMPT.md`.

---

## 1. Purpose

PESO staff currently have no single way to tell the people who use i-PESO about things that are not tied to a specific record — an office closure, a change in requirements, an upcoming event, a system maintenance window. Notifications in i-PESO are personal (an application moved, an interview was scheduled); announcements are **one message, many readers**.

The module lets an administrator write an announcement once and decide:

- **who** sees it — the public, every signed-in user, only job seekers, or only employers;
- **when** it appears and disappears — now, at a scheduled time, and optionally until an expiry date;
- **how loudly** it is delivered — a quiet entry in the Announcements page, a banner at the top of dashboards, and optionally a bell notification plus a mobile push.

It also shows the administrator **who has actually seen it** (reach), so PESO knows whether a message landed.

### Goals
1. Communicate office-wide information to the right audience without touching individual records.
2. Make urgent information impossible to miss (dashboard banner) without spamming routine news.
3. Keep a permanent, auditable record of what PESO announced, when, by whom.
4. Never slow down or time out the admin's browser, no matter how many users are targeted.

### Non-goals (v1)
- SMS or email blasts (cost per recipient / provider limits on shared hosting — decided 2026-11-12).
- Rich-text/HTML bodies (plain text with line breaks only — safe to render everywhere, including push).
- Targeting finer than role (e.g. "seekers in Barangay X", "employers in manufacturing"). The data model leaves room for it.
- Comments or reactions on announcements.

---

## 2. Users and permissions

| Who | What they can do |
|---|---|
| **Admin with Configuration — full access** (e.g. PESO Office Manager / system administrator) | Create, edit, schedule, publish, unpublish, archive, restore and delete announcements; turn on notifications. |
| **Admin with Configuration — view only** | See the announcement list, details and reach statistics. Cannot change anything. |
| **Admin without Configuration access** | No access (same rule as every other Configuration page). |
| **Job seeker** (web + mobile) | Read announcements addressed to Public, All users, or Job seekers. Dismiss dashboard banners. |
| **Employer** (verified *or still pending verification*) | Read announcements addressed to Public, All users, or Employers. Pending employers need registration-related news too, so the page is outside the "approved employers only" gate. |
| **Visitor (not signed in)** | Sees Public announcements on the landing page only. |

Enforced on the API with the existing `admin.permission:configuration` middleware (reads need view, writes need full access), so the frontend only hides buttons — the server is the real gate.

---

## 3. Features

### 3.1 Composing an announcement
The form is kept short. Only **six things are shown by default**: Title, Message, Who sees it, Priority, When (now / schedule), and Also notify. Audience, priority and timing are one-click choices, not dropdowns. Everything else sits under a collapsed **More options** section (category, pin, end date, link, attachment) with sensible defaults (category *General update*, not pinned, no end date). It opens by itself when an announcement already uses one of them or one of them has an error.

| Field | Rules | Why |
|---|---|---|
| **Title** | Required, ≤ 150 chars | Shown in banners, bell, push title. |
| **Message** | Required, ≤ 5,000 chars, plain text, line breaks kept | Safe to render on web, landing page and push. |
| **Category** | General update · Job fairs & events · Programs & services · Office advisory · System notice | Colour/icon on every surface; lets readers scan. |
| **Priority** | Normal · Important · Urgent | Controls *how* it is shown (see 3.3). |
| **Audience** | Public · All users · Job seekers · Employers | Who can see it. The form shows the live head-count for each option. |
| **Pin to top** | Optional | Keeps it first in every list regardless of date. |
| **Publish timing** | Publish now, or schedule a date & time | Prepare announcements ahead of time. |
| **Expiry** | Optional date & time, must be after publish time | Auto-hides stale notices (e.g. "office closed tomorrow"). |
| **Call-to-action link** | Optional label + link (internal path like `/seeker/job-fairs`, or an `https://` URL) | Sends readers straight to the job fair, program, form, etc. |
| **Attachment** | Optional, one image (JPG/PNG/WEBP) or PDF, ≤ 5 MB | Posters, memos, schedules. Stored privately, streamed through the API with the same visibility rules. |
| **Also notify** | Optional toggle | Adds a bell notification for everyone in the audience and a push to the seeker mobile app — sent once, when it goes live. |

A **live preview** beside the form shows exactly how the banner and the card will look to readers.

### 3.2 Lifecycle
Stored status is one of `draft`, `published`, `archived`; together with the publish/expiry times it gives the **state** shown everywhere:

```
            save draft                 publish (time ≤ now)
 [new] ───────────────▶ DRAFT ──────────────────────────────▶ LIVE ──(expiry passes)──▶ EXPIRED
                          ▲  │ publish (time > now)            ▲  │
                          │  └──────────────▶ SCHEDULED ───────┘  │ (publish time arrives)
                          │                      │                │
                          └──── unpublish ───────┴────────────────┘
   any state ──archive──▶ ARCHIVED ──restore──▶ DRAFT
   DRAFT that was never published ──delete──▶ (gone)
```

- **Live** = published, publish time reached, not yet expired. Only live announcements are visible to readers.
- **Unpublish** pulls a scheduled/live announcement back to draft (e.g. a mistake) without losing it.
- **Archive** retires it permanently from readers but keeps the record and its reach stats.
- **Delete** is only allowed for announcements that were never published — anything readers may have seen stays on record.
- Editing a live announcement updates it in place for everyone; the change is logged.

### 3.3 Where readers see it
| Surface | What appears |
|---|---|
| **Dashboard banner** (seeker & employer dashboards) | Live *Important* and *Urgent* announcements the user hasn't dismissed — up to 3, urgent first. Urgent = red, Important = amber. "Read more" opens it; ✕ dismisses it for that user only. |
| **Announcements page** (`/seeker/announcements`, `/employer/announcements`, sidebar link) | Every live announcement for that role: pinned first, then newest. Unread ones are marked; category filter; opening one shows the full message, attachment and link and marks it read. |
| **Notification bell** (only if "Also notify" was on) | One entry per announcement, megaphone icon, opens the announcement. |
| **Mobile push** (seeker app, only if "Also notify" was on) | Title + first line; tapping opens the announcement in the app. |
| **Landing page** (Public audience only) | "PESO Announcements" section with the latest live public announcements; hidden when there are none. |

### 3.4 Admin workspace
- **List page:** counters (Live, Scheduled, Drafts, Ended), tabs by state, search by title/message, filter by audience; each row shows category, priority, audience, state, schedule and reach ("Seen by 120 of 450 · 27%").
- **Detail/edit page:** the form, the live preview, a status panel with the actions allowed in the current state, delivery status ("Notified 450 users on Nov 12, 9:00 AM") and reach split by job seekers / employers.
- **Audit trail:** every create / edit / publish / unpublish / archive / restore / delete is written to the Activity Log with the staff member's name.

---

## 4. User flows

### 4.1 Admin publishes an urgent office advisory
1. Admin → *Configuration → Announcements* → **New announcement**.
2. Types the title and message, picks *Office advisory*, *Urgent*, audience *Public*, expiry tomorrow 5 PM, turns on **Also notify**. The preview shows the red banner.
3. Clicks **Publish now** → confirmation shows the audience size ("This will be visible to everyone and notify 1,240 users").
4. The API saves it and answers immediately; notifications are sent **after** the response (no waiting in the browser).
5. Seekers and employers see the red banner on their dashboards and a bell entry; seekers get a push; visitors see it on the landing page.
6. Tomorrow at 5 PM it expires and disappears everywhere by itself; it stays in the admin list as *Ended* with its reach.

### 4.2 Admin schedules a job fair notice
1. Creates the announcement, category *Job fairs & events*, audience *Job seekers*, link label "View job fairs" → `/seeker/job-fairs`, attaches the poster.
2. Chooses **Schedule** for Monday 8:00 AM → state *Scheduled*.
3. Monday 8:00 AM the announcement becomes live automatically (the visibility check is time-based, so no job is needed for that). If "Also notify" was on, the every-minute scheduler sends the notifications within a minute.

### 4.3 Job seeker reads an announcement
1. Opens the dashboard → amber banner "New PESO announcement: …".
2. **Read more** → full message, poster, "View job fairs" button. It is now marked read; the banner stays dismissed once closed.
3. Later visits the **Announcements** page from the sidebar to look back at older notices.

### 4.4 Correcting a mistake
- Typo → edit the live announcement; readers see the fix immediately.
- Wrong audience or should not have gone out → **Unpublish** (back to draft) or **Archive**. Notifications already sent cannot be recalled; the confirmation dialog says so.

---

## 5. Functionality and design

### 5.1 Data model
**`announcements`** — one row per announcement.

| Column | Notes |
|---|---|
| `id`, `title`, `body` | |
| `category`, `priority`, `audience` | string enums (validated in the app) |
| `status` | `draft` · `published` · `archived` |
| `is_pinned` | bool |
| `publish_at`, `expires_at` | nullable datetimes; `publish_at` set when published |
| `link_label`, `link_url` | optional CTA |
| `attachment_path`, `attachment_name`, `attachment_mime` | private `local` disk |
| `notify_users`, `notified_at`, `notified_count` | delivery bookkeeping |
| `first_published_at` | first time it ever went public (decides whether it may be deleted) |
| `created_by`, `updated_by`, `published_by` | administrators |
| timestamps | |

**`announcement_reads`** — written only when a person opens or dismisses an announcement.

| Column | Notes |
|---|---|
| `announcement_id` | cascade on delete |
| `reader_type`, `reader_id` | job seeker or employer (polymorphic) |
| `read_at`, `dismissed_at` | |
| unique (`announcement_id`, `reader_type`, `reader_id`) | |

### 5.2 Why reads are "pulled", not "pushed"
Publishing writes **one row**. Readers' pages ask "what is live for my role?" when they load. Nothing is copied per user, so publishing to 10 users or 10,000 users costs the same and can never time out the request — the known failure mode in this deployment (see `memory: sync-notification-blasts`). Read state is only stored for people who actually open/dismiss something, which also makes "seen by X of Y" a direct count.

The only per-user work is the optional bell/push, and it runs **after** the HTTP response (`defer()`, the same pattern job fair publishing uses), in chunks of 200, with an atomic "claim" on `notified_at` so it can never be sent twice — even if the publish button, an edit, and the scheduler all try at once.

### 5.3 API

Admin (`/api/admin`, `admin.permission:configuration`):

| Method & path | Purpose |
|---|---|
| `GET /announcements` | List + filters (`state`, `audience`, `search`, paging) + summary counters |
| `GET /announcements/options` | Categories, priorities, audiences (with live head-counts) |
| `POST /announcements` | Create (multipart; `intent` = `draft` / `publish`) |
| `GET /announcements/{id}` | Detail + reach + delivery status |
| `POST /announcements/{id}` | Update (multipart, `_method=PUT`) |
| `POST /announcements/{id}/publish` · `/unpublish` · `/archive` · `/restore` | Lifecycle actions |
| `DELETE /announcements/{id}` | Only if never published |
| `GET /announcements/{id}/attachment` | Admin preview |

Readers (`auth:sanctum`, job seekers and employers):

| Method & path | Purpose |
|---|---|
| `GET /announcements` | Live announcements for my role, `is_read` / `is_dismissed` flags, `unread_count`; `?category=` |
| `GET /announcements/banner` | Up to 3 undismissed Important/Urgent ones for the dashboard |
| `GET /announcements/{id}` | Full announcement; marks it read |
| `POST /announcements/{id}/dismiss` | Hide from my banner |
| `POST /announcements/read-all` | Mark everything visible as read |
| `GET /announcements/{id}/attachment` | Stream attachment (same visibility rule) |

Public (no login, throttled): `GET /public/announcements`, `GET /public/announcements/{id}/attachment` — Public audience + live only.

### 5.4 Background work
`announcements:deliver-due` runs every minute from the existing scheduler (`Schedule::call(fn () => Artisan::call(...))`, the in-process form required on Hostinger). It finds announcements that are live, have "Also notify" on and have not been delivered — i.e. scheduled ones whose time has come — and delivers them.

### 5.5 Edge cases handled
- Expiry before publish time → rejected by validation.
- Publish time in the past on a schedule → treated as "publish now".
- Link must be an internal path (`/…`) or `https://` — no `javascript:` or plain `http:` links.
- An announcement for Employers never leaks to seekers through any endpoint, including attachments (tested).
- Suspended accounts can't sign in, so they see nothing; restricted (limited) accounts still receive announcements.
- Turning "Also notify" on after an announcement is already live delivers once; turning it off after delivery has no effect (already sent).
- Deleting an announcement removes its attachment file and read rows; archiving keeps both.

---

## 6. Implementation checklist

**Backend (`i-peso-backend`)**
- [x] Migration: `announcements`, `announcement_reads`
- [x] Models `Announcement` (visibility scopes, state), `AnnouncementRead`
- [x] `AnnouncementService` (audience counts, reach, deferred delivery with atomic claim)
- [x] `AnnouncementPublished` notification (database + Expo push for seekers)
- [x] `Admin\Configuration\AnnouncementController`, `AnnouncementFeedController`, `PublicAnnouncementController`
- [x] Routes + `announcements:deliver-due` command on the scheduler
- [x] Feature tests (`tests/Feature/AnnouncementModuleTest.php`)

**Web (`i-peso-frontend`)**
- [x] `services/announcementService.js`
- [x] Admin list page + create/edit page with live preview and lifecycle actions (replaces the placeholder)
- [x] Shared `AnnouncementBanner`, Announcements page, detail dialog for seekers and employers
- [x] Sidebar links, routes, bell icon for `type: announcement`
- [x] Landing page "PESO Announcements" section

**Mobile (`i-peso-mobile`)** — handed off: `JUNIOR_DEV_MOBILE_ANNOUNCEMENTS_PROMPT.md`
- [ ] Announcements screen + detail, home banner, push tap → announcement

### Possible v2
- Targeting by barangay / industry / profile completeness.
- Email or SMS for *Urgent* only, behind an explicit cost warning.
- "Acknowledge" button with an acknowledgement report for compliance notices.
- Bilingual (English/Filipino) message fields.
