# Content Module — Plan

**System:** i-PESO Smart Employment System (Urdaneta City PESO)
**Module owner:** Admin side, under **Configuration → Content Modules** at `/admin/content-modules` (the interim `/admin/site-content` link redirects there)
**Status:** Implemented on the backend and website, all phases, plus the wider content types and smart features in §9 (2026-11-13). Mobile side handed off — see `JUNIOR_DEV_MOBILE_HELP_PROMPT.md`. Section 8 lists where the build differs from this plan. (The module was briefly called "Site Content"; API paths under `/admin/site-content/*` keep that name.)
**Related:** [Announcement module](announcement-module-plan.md). Announcements are *news*; this module is the *standing information* that does not expire.

---

## 1. Purpose

Most text that the public reads on i-PESO is written straight into the code. Only a developer can change it, and changing it means a new deploy. Today that includes:

| Content | Where it lives now | Who can change it |
|---|---|---|
| Office address, phone, email, Facebook, office hours, fees policy, employer approval time | `i-peso-backend/config/peso_knowledge.php` (`office`) | Developer + deploy |
| The same contact details, typed again | `PrivacyPolicyPage.jsx` ("Who We Are"), `emails/safety-notice.blade.php`, job fair defaults | Developer + deploy |
| Landing page hero and the four "What you get" feature cards | `LandingPage.jsx` (`UNIFIED_FEATURES` and inline JSX) | Developer + deploy |
| Frequently asked questions | **Nowhere.** No FAQ exists. The chatbot answers from `peso_knowledge.php` → `site` | — |
| Privacy Policy, Terms of Service, Review Guidelines | `pages/legal/*.jsx`, with hand-set `EFFECTIVE_DATE`s | Developer + deploy |

Because the same facts are typed in several places, they have already drifted apart. The safety-notice email says *"visit the PESO office at Urdaneta City Hall or email **pesourdaneta**@gmail.com"*. The config file and the Privacy Policy say **pesourdanetacity**@gmail.com and Alexander St. One of those is wrong, and a job seeker who receives that email might be writing to an address nobody reads.

The Content module gives PESO staff **one place to maintain the standing information** of the portal:

- **Office information.** Entered once and used everywhere: footer, Help page, legal pages, emails, the chatbot.
- **FAQs.** Questions and answers for the public, job seekers and employers. The chatbot can use them too.
- **Landing page text.** The headline, the sub-headline and the feature cards, within limits that keep the design intact.
- **Policy pages** (later phase, versioned). The Privacy Policy, Terms of Service and Review Guidelines.

### Goals
1. **One source of truth.** A phone number or office hours change is made once, by PESO staff, and shows everywhere within a minute.
2. **Fewer repeated questions to the office.** A searchable FAQ answers the common ones: requirements, registration steps, verification time, fees.
3. **A smarter chatbot without code changes.** Office facts and FAQs that staff fill in become things the assistant can answer. Anything left blank is still answered with "please contact the office", which is how it works now.
4. **Safe to edit.** Staff can only change *text in fixed places*. They cannot break the layout, inject code, or publish something unreviewed by accident.
5. **Accountable.** Every change records who made it and when. A previous version can be restored in one click.

### Non-goals (v1)
- **No page builder.** Staff can't add sections, move blocks or change colours. A generic block builder is much more work, breaks the design easily, and PESO does not need one.
- **No rich-text or HTML editing.** Text is plain, line breaks are kept, and links are given as separate link fields. This closes off XSS and keeps the design consistent.
- **No time-bound news.** That belongs to Announcements. If a message has an end date, it is an announcement.
- **No Citizen's Charter.** It already has its own admin screen (`AdminCitizenCharterController`, on the Government Program form) and its own chatbot tool. The Content module links to it and does not duplicate it.
- **No System Settings.** Site name, upload limits, session timeout and the like stay on the System Settings page (currently a mock) and are planned separately.

---

## 2. Users and permissions

Permissions use the existing **Configuration** module in Roles & Permissions, the same as Announcements:

| Access | Can do |
|---|---|
| **Manage** (e.g. PESO Office Manager, the system admin) | Edit office information, FAQs and landing text; publish or unpublish FAQs; restore a previous version |
| **View** | Open every Site Content screen read-only (the forms are disabled), with a note saying they can view but not change it |
| **None** | Nav item hidden; the API returns 403 |

Every change goes to the **Activity Log** through `ActivityLogger::logAs`, e.g. "Updated office information (hours, phone)", "Published FAQ 'How long does employer verification take?'", "Restored landing page text to the version from Nov 13, 2:40 PM".

**Readers:**

| Reader | Sees |
|---|---|
| Public (not signed in) | Landing page text, office info in the footer, the public FAQ page `/help` |
| Job seekers | Help page inside the seeker portal (public FAQs + seeker FAQs + office contact). Mobile app later |
| Employers | Help page inside the employer portal (public FAQs + employer FAQs + office contact). Visible to pending employers too, like Announcements, because pending employers ask the most questions |
| Chatbot | Office info + published FAQs as reference text |

---

## 3. Features

The admin page becomes **Site Content** with four tabs. The **Policy pages** tab appears only once Phase 3 is built.

```
Site Content
┌────────────────┬──────┬──────────────┬──────────────┐
│ Office info    │ FAQs │ Landing page │ Policy pages │
└────────────────┴──────┴──────────────┴──────────────┘
```

### 3.1 Office information (one form, one record)

| Field | Limit / rule | Used by |
|---|---|---|
| Office name | 120 chars. Default "Public Employment Service Office — Urdaneta City" | Footer, Help, legal pages, emails |
| Address | 200 chars | Footer, Help, Privacy Policy, emails, chatbot "where is the office" |
| Map link | optional `https://` link (Google Maps) | "Get directions" button on Help |
| Office hours | 150 chars, e.g. "Mon–Fri, 8:00 AM – 5:00 PM (closed on holidays)" | Footer, Help, chatbot (currently **null**, so the bot can't answer it) |
| Phone | PH mobile or landline format | Footer, Help, Privacy Policy, emails, chatbot |
| Email | valid email | Footer, Help, Privacy Policy, emails, job fair contact fallback, chatbot |
| Facebook page | `https://facebook.com/...` or `https://www.facebook.com/...` only | Footer, Help, Privacy Policy, chatbot |
| Fees policy | 300 chars, e.g. "All PESO services are free of charge." | Help, chatbot (currently **null**) |
| Employer approval time | 150 chars, e.g. "3–5 working days after complete documents" | Employer Help, employer pending screen, chatbot (currently **null**) |

**Rules:**
- **Blank means "not on record", not "empty string".** A blank field is hidden on the site, and the chatbot keeps its current behaviour of telling people to contact the office. The form shows a note under each blank field: *"Left blank — the assistant will tell people to contact the office."*
- **Initial values come from `config/peso_knowledge.php`.** Nothing is lost on the first deploy. The config file stays as a fallback for when the table is empty, e.g. a fresh install or tests.
- A side **preview** shows the footer and Help contact card as they will look.
- **Save shows what changed** before it applies. For example: *"Phone: 0923 810 2011 → 0917 …"*. This is a small diff, not another form.

### 3.2 FAQs

Each FAQ is a question with an answer, aimed at an audience.

| Field | Rule |
|---|---|
| Question | required, 200 chars |
| Answer | required, 2,000 chars, plain text, line breaks kept |
| Who it's for | **Everyone** (public + all signed-in users) · **Job seekers** · **Employers** |
| Topic | Registration & account · Jobs & applications · Employer verification · Job fairs · Government programs · Office & services |
| Link (optional) | label + internal path or `https://` link, using the same rule as announcement links |
| Published | on/off. A new FAQ starts **unpublished**, so half-written answers never go live |

**Admin list:**
- Grouped by topic, with drag-to-reorder inside each topic (keyboard alternative: ↑ ↓ buttons).
- Filters: audience and published/unpublished. Search over question and answer.
- Quick actions: Publish/Unpublish, Edit, Delete. Delete asks for confirmation and is recorded in the activity log.
- **Starter pack.** The first time the FAQ list is empty, a one-time **"Add suggested FAQs"** button creates about 12 *unpublished* drafts. They are taken from what `peso_knowledge.php` → `site` already says: seeker registration steps, employer documents, forgot password, verification email, placement report deadline, establishment report, and so on. Staff review and publish them; nothing goes live automatically.

**Reader side (`/help` public, `/seeker/help`, `/employer/help`):**
- A search box at the top that filters as you type, over question + answer.
- Topic chips, then an accordion of questions. Each question can be linked to directly (`/help#faq-12`) so staff can paste the link into a chat reply.
- A contact card at the bottom showing office info from 3.1.
- A short link to the landing page section "Common questions", which shows the top 5 public FAQs marked **Featured** (an extra checkbox, max 5).

### 3.3 Landing page text (fixed slots)

Staff edit **only the text in slots that already exist**. The layout, icons and colours stay in code.

| Slot | Limit |
|---|---|
| Hero headline | 80 chars |
| Hero sub-headline | 220 chars |
| "What you get" heading | 70 chars |
| Feature cards ×4 | title 40 chars, body 160 chars; the icon is picked from the 12 icons already used on the page |
| Footer tagline | 100 chars (currently "Urdaneta City PESO Employment Portal") |

**Rules:**
- **Character limits are what keep the layout safe.** They are chosen so the longest allowed text still fits on a phone.
- **Every slot has a code default** (today's text). A slot with no saved value, or an API that cannot be reached, shows the default. The landing page is never blank or broken.
- **Reset to default** is available per slot.
- **Live preview.** The editor renders the real hero and feature cards next to the form, with a desktop / phone width toggle.
- **Changes go live on Save.** There is no draft state for the landing page. It is a handful of short strings, and version history (3.5) gives a safe undo.

### 3.4 Policy pages (Phase 3 — versioned)

The Privacy Policy, Terms of Service and Review Guidelines are legal text under RA 10173 (Data Privacy Act). Editing them is different from editing a phone number:

- **Never edit in place.** Each change creates a new **version** with its own **effective date**. The page shows the current version and lists older ones ("Previous versions"). Anyone who agreed under an older version can still read what they agreed to.
- **The structure stays in code** (numbered sections, side navigation, cross-links). Staff edit the text *of each section*, and can add or remove sections, with a heading of max 80 chars and a plain-text body.
- **Two-step publish.** Saving creates a draft version. Publishing asks for the effective date and shows a confirmation: *"This replaces the Privacy Policy shown to everyone from Dec 1, 2026."*
- **Optional later step:** when the Terms change materially, signed-in users are asked to accept them again on their next login. This only matters if PESO's legal adviser wants it, so it is **not** in scope until they ask.

This phase is last on purpose. It needs PESO or the LGU legal office to agree on who may change policy text. Until then, the pages stay in code and only a developer changes them.

### 3.5 Version history (all sections)

- **What is saved.** Every save of office info, landing text or an FAQ stores the previous value in a `site_content_revisions` row: who, when, and the full old value.
- **History drawer.** It lists the last 20 versions per section, shows the differences in each, and has **Restore this version**. A restore is itself a new save, so it can be undone too.
- **Clean-up.** Older revisions beyond 20 per item are pruned by the existing daily scheduler.

---

## 4. User flows

### 4.1 Office hours are finally confirmed
1. The PESO Office Manager opens **Site Content → Office info**. "Office hours" is blank, with the note *"Left blank — the assistant will tell people to contact the office."*
2. They type "Monday to Friday, 8:00 AM – 5:00 PM (closed on holidays)" and press **Save**.
3. The dialog shows: *Office hours: (not on record) → Monday to Friday…*. They confirm.
4. **Result within a minute:**
   - the landing footer and every Help page show the hours;
   - the chatbot answers "what time are you open?" directly;
   - the activity log reads "Updated office information (hours)".

### 4.2 Same question keeps coming in at the front desk
1. Staff notice several walk-ins asking "Do I pay to register?"
2. In **FAQs → New FAQ** they write the question and answer, set the audience to *Everyone* and the topic to *Office & services*, and save. It is saved **unpublished**.
3. They check the preview, then press **Publish**.
4. **Result:**
   - the FAQ appears on `/help`, `/seeker/help` and `/employer/help`;
   - it is included in the chatbot's reference text;
   - staff can send the link `/help#faq-31` in Messenger replies.

### 4.3 Employer waiting for approval
1. A pending employer opens **Help** from the employer portal. It is available before approval.
2. They search "how long". The FAQ "How long does verification take?" and the office's *Employer approval time* both appear.
3. If they still need help, the contact card shows the phone number and email.

### 4.4 A wrong edit to the landing page
1. A staff member shortens the hero sub-headline and saves, then realises the old one was better.
2. They open **History** on the Landing page tab and choose yesterday's version.
3. **Restore** brings it back. The restore is logged and can itself be undone.

### 4.5 View-only staff
An OJT intern or encoder with *View* access can read every tab. The fields are disabled and a banner explains why. No Save, Publish or Restore buttons are shown.

---

## 5. Functionality and design

### 5.1 Data model

```
site_contents                       -- one row per editable section (office, landing, …)
  id
  key            string(60) unique  -- 'office' | 'landing'   (later: 'policy.privacy', …)
  value          json               -- the section's fields, validated by SiteContentRegistry
  updated_by     FK administrators.admin_id, nullOnDelete
  timestamps                         -- updated_at doubles as the edit-conflict token (5.5)

site_content_revisions              -- previous values, for history + restore
  id
  content_type   string(30)         -- 'section' | 'faq'
  content_key    string(60)         -- 'office' | 'landing' | faq id
  value          json               -- full previous value
  changed_by     FK administrators.admin_id, nullOnDelete
  created_at
  index (content_type, content_key, created_at)

faqs
  id
  question       string(200)
  answer         text               -- ≤ 2,000 chars (validated)
  audience       string(20)         -- everyone | seekers | employers
  topic          string(40)
  link_label     string(60) null
  link_url       string(500) null
  is_published   bool default false
  is_featured    bool default false -- max 5 featured, enforced in the controller
  sort_order     unsigned int
  created_by / updated_by  FK administrators.admin_id, nullOnDelete
  timestamps
  index (is_published, audience, topic, sort_order)
```

**Why office info and landing text are JSON rows, not columns:**
- each is a single record of a handful of fields;
- putting them in one table keeps history and restore identical for every section;
- adding a new section later (e.g. the policy pages) needs no migration.

**`App\Support\SiteContentRegistry`** is the one place that defines, for each key:
- the field list;
- the validation rules (limits in 3.1 / 3.3);
- the default values. For `office`, the defaults are read from `config('peso_knowledge.office')`, so today's values survive.

Unknown keys are rejected.

**Reading:** `SiteContent::get('office')` returns the saved value merged over the registry defaults, cached (see 5.3). All PHP code reads through this, including:
- `GeminiChatService::knowledgeSection()` and `officeLocationIfAsked()`;
- the job fair contact fallback;
- `emails/safety-notice.blade.php`, which loses its hard-coded wrong email;
- the PDF letterhead.

### 5.2 API

**Public (no auth, `throttle:60,1`):**

| Method | Path | Returns |
|---|---|---|
| GET | `/public/site-content` | `{ office, landing, featured_faqs }`. One call for the landing page and footer |
| GET | `/public/faqs?topic=&q=` | Published FAQs for *Everyone*, in order |

**Signed-in seekers and employers (`auth:sanctum`):**

| Method | Path | Returns |
|---|---|---|
| GET | `/help` | `{ office, faqs }`. FAQs for *Everyone* + the reader's role. Same shape as public |

**Admin (`admin.permission:configuration`; GET = view, writes = manage):**

| Method | Path | Does |
|---|---|---|
| GET | `/admin/site-content` | All sections with values, defaults, `updated_at`, last editor |
| PUT | `/admin/site-content/{key}` | Save one section (`office` / `landing`). Body includes `updated_at` for conflict check |
| POST | `/admin/site-content/{key}/reset` | Reset listed fields (or the whole section) to defaults |
| GET | `/admin/site-content/{key}/revisions` | Last 20 versions |
| POST | `/admin/site-content/revisions/{revision}/restore` | Restore a version (section or FAQ) |
| GET | `/admin/faqs` | List, with filters (audience, topic, published, q) |
| POST | `/admin/faqs` | Create (always unpublished) |
| PUT | `/admin/faqs/{faq}` | Update |
| POST | `/admin/faqs/{faq}/publish` · `/unpublish` | Toggle |
| PUT | `/admin/faqs/reorder` | `{ topic, ids: [...] }` |
| DELETE | `/admin/faqs/{faq}` | Delete (confirmed in UI) |
| POST | `/admin/faqs/starter-pack` | One-time drafts from `peso_knowledge.site`; refused if any FAQ exists |

### 5.3 Caching and speed

- **Server.** Public payloads and the chatbot's knowledge text are cached with `Cache::rememberForever('site-content:…')`. The file cache works on Hostinger. Every admin write calls `SiteContent::flush()`, so a change shows on the next request. There is no time-based expiry to wait for.
- **Frontend.**
  - The landing page and footer use one TanStack query (`['site-content']`) with `staleTime: 5 min`, and render code defaults while it loads or if it fails. The landing page must never show a spinner or blank hero.
  - The Help page uses `['help', role]`.
- **Chatbot size limit.** Only *published* FAQs go into the prompt, at most 40, with answers trimmed to 600 chars. This keeps the Gemini token cost predictable. A note in the FAQ editor shows "Included in the assistant (31 of 40)".

### 5.4 Safety

- **Text is never rendered as HTML.** It is shown the way announcement bodies are (`whitespace-pre-line`), so a pasted `<script>` shows as text.
- **Links follow the announcement rule.** Only an internal path (`/seeker/...`) or `https://` is allowed. `javascript:` and `//evil.com` are rejected server-side.
- **Admin text in the chatbot prompt** is wrapped in the existing REFERENCE section and labelled as data. It is length-capped, and only staff with *Manage* access can write it.
- **Phone, email and Facebook are validated by format.** This catches typos like a missing digit before they reach every email PESO sends.

### 5.5 Edge cases

| Case | Behaviour |
|---|---|
| Two admins edit Office info at once | The save sends the `updated_at` it loaded. If the row changed since, the API returns **409**: *"Someone else saved changes a moment ago. Reload to see them."* No silent overwrite |
| Table empty (fresh install, tests) | The registry defaults (from config / code) are used everywhere. Nothing breaks |
| Admin clears a field | Stored as `null` → hidden on the site; the chatbot says "please contact the office" |
| Public API down | The landing page and footer show code defaults; the Help page shows "Help is unavailable right now" plus the contact details from defaults |
| FAQ unpublished while someone has `/help#faq-12` open | The link lands at the top of Help with "That question is no longer available." |
| More than 5 featured FAQs | Refused, with a message naming the current five |
| Revision restore of a deleted FAQ | Restores it as an *unpublished* FAQ |
| Very long FAQ list (100+) | Grouped by topic with search; the reader page stays one request (FAQ text is small) |

---

## 6. Phases and checklist

### Phase 1 — Office info + FAQs (the highest value)

**Backend**
- [x] Migration: `site_contents`, `site_content_revisions`, `faqs`
- [x] `SiteContentRegistry`, `SiteContent` model + `get()` / `flush()`, `Faq` model (scopes `published()`, `forAudience()`, `ordered()`)
- [x] `Admin\Configuration\SiteContentController`, `Admin\Configuration\FaqController`, `PublicSiteContentController`, `HelpController`
- [x] Routes (5.2), all admin writes logged through `ActivityLogger`
- [x] Replace hard-coded office facts: `GeminiChatService` (knowledge + location), job fair contact fallback, `safety-notice.blade.php`, PDF letterhead (left unchanged — see §8)
- [x] Chatbot: append published FAQs to the REFERENCE section (capped)
- [x] Revision pruning added to the daily scheduler
- [x] Feature tests:
  - permissions (none / view / manage);
  - validation limits;
  - blank → null;
  - 409 conflict;
  - restore;
  - unpublished FAQs never public;
  - audience filtering;
  - starter pack runs only once;
  - the chatbot prompt includes only published FAQs and respects the cap

**Frontend**
- [x] Rename nav "Content Modules" → **Site Content**. Keep `/admin/content-modules` as a redirect to `/admin/site-content`
- [x] Replace `ContentModuleListPage.jsx` with a tabbed `SiteContentPage` → Office info form and FAQ list/editor
- [x] `siteContentService.js` (admin + public + help)
- [x] Public `/help` page, `/seeker/help`, `/employer/help` (outside the approved-employer gate) + nav items (LifeBuoy icon)
- [x] Landing footer shows office contact from the API; Privacy Policy "Who We Are" reads office info
- [x] Tests: form validation, read-only mode, FAQ search/filter, defaults when the API fails

### Phase 2 — Landing page text
- [x] `landing` key in the registry with today's text as defaults
- [x] Landing page tab with live preview (desktop / phone)
- [x] `LandingPage.jsx` reads the slots and falls back to defaults
- [x] "Common questions" section with featured FAQs

### Phase 3 — Policy pages (needs PESO legal sign-off first)
- [x] `policy_versions` table (policy, version, effective_at, sections json, published_by)
- [x] Draft → publish with an effective date; a "Previous versions" list on each page
- [x] Convert the three `pages/legal/*.jsx` to render from the current version, with today's text as version 1

### Mobile (hand-off to junior, like Announcements)
- [ ] Seeker app (junior dev): Help screen (search + topics + accordion + contact card) from `GET /help`
- [ ] Profile → "Help & FAQs" entry and policy links (junior dev)
- [x] Guide file: `JUNIOR_DEV_MOBILE_HELP_PROMPT.md` (written)

---

## 7. Decisions (confirmed 2026-11-13)

The answer to all four was "yes, as recommended":

- **Email:** Office info starts from `config/peso_knowledge.php` (`pesourdanetacity@gmail.com`, Alexander St). The safety-notice email and the suspension message now read Office info, so their old `pesourdaneta@gmail.com` / "Urdaneta City Hall" text is gone. If the other address is the right one, change it once in Office info.
- **Who edits:** Configuration *Manage* for everything. FAQs are also managed by anyone with Constituent CRM *Manage* (front desk).
- **Policy pages:** built (Phase 3), versioned.
- **Chatbot:** uses published FAQs.

The original open questions are kept below for the record.

1. **Which email is correct?** The safety-notice email says `pesourdaneta@gmail.com` and "Urdaneta City Hall"; everything else says `pesourdanetacity@gmail.com` and Alexander St. Phase 1 makes every place use the one in Office info, so this must be settled before it ships.
2. **Who may edit?** The recommendation is the Configuration module's *Manage* permission, the same as Announcements. Should FAQs be editable by a wider group, e.g. the CRM/front-desk staff?
3. **Policy pages.** Should staff ever edit legal text in the app (Phase 3), or should it stay developer-only?
4. **Chatbot use of FAQs.** Recommended: yes. The FAQ editor will warn that published answers are also given by the assistant.

---

## 8. As built — differences from the plan

| Plan said | What was built, and why |
|---|---|
| FAQ drag-to-reorder | ↑ ↓ buttons inside each topic, hidden while a search or filter is active. They are keyboard-accessible, with no extra drag library. |
| Restore a deleted FAQ from history | Deleting an FAQ also deletes its history, and the confirmation says so. **Unpublish** is the reversible option. FAQ history is opened inside the editor ("Earlier versions → Use this version"), which fills the form so staff can save it. |
| PDF letterhead reads Office info | Not changed. The letterhead has no contact line, and the PDF layout was tuned by hand. |
| "Featured" checkbox | "Show on home" button. Only **Everyone** FAQs can be featured, at most 5, and the refusal names the current five. Changing an FAQ's audience away from Everyone un-features it. |
| History stores the previous value | History stores a **snapshot after each save**, with `changed_fields` and `action` (saved, reset, restored, created). The newest entry is the current value; restoring is itself a new save. |
| Edit-conflict token = `updated_at` | `site_contents.version`, an integer bumped on every save. The editor sends the version it loaded; a mismatch returns 409. |
| Policy text "plain" | Plain text with: a blank line for a paragraph, `- ` for bullets, `**bold**`, auto-linked `https://` links and emails, and `{office.address}` / `{office.phone}` / `{office.email}` / `{office.facebook}` / `{office.hours}` / `{office.name}`, filled from Office info. Rendered by `components/site-content/RichText.jsx`, never as HTML. FAQ answers use the same format. |
| Policy version 1 | `resources/policies/*.json`, generated once from the original React pages. Until PESO publishes a change, readers see the **original React page** (unchanged design). Its Privacy Policy contact line now reads Office info. Starting the first draft stores version 1 as a row, so history is complete. |
| — (new) | Section anchors are kept across versions (`#retention` keeps working); new sections get an anchor from their heading. |
| — (new) | Publishing needs a "What changed?" note. A draft identical to the newest version is refused, and the effective date can't be in the past. A future date shows an "updated version takes effect on …" notice, and `?version=N` opens any version. |
| — (new) | The permission middleware accepts `admin.permission:configuration\|constituent_crm` ("any of these"). The frontend's `moduleForPath` / `accessLevel` take a list too. |

**Key files**

- **Backend:**
  - `app/Support/SiteContentRegistry.php` (fields, limits, defaults)
  - `app/Services/SiteContentService.php` (cached reads, conflict-checked saves, history, chatbot FAQs)
  - `app/Services/PolicyService.php`, `app/Support/PolicyRegistry.php`, `app/Support/FaqStarterPack.php`
  - Controllers under `Api/Admin/Configuration/` (`SiteContentController`, `FaqController`, `PolicyController`), plus `Api/PublicSiteContentController.php` and `Api/HelpController.php`
  - Command `site-content:prune-history`, run daily at 02:15 Manila time
  - Tests: `tests/Feature/SiteContentModuleTest.php`
- **Frontend:**
  - `services/siteContentService.js`
  - `components/site-content/*` (defaults, `useSiteContent`, `RichText`, `HelpCenter`, `OfficeContactCard`, `LandingBlocks`, `LandingFaqSection`)
  - `pages/admin/6-configuration/content/SiteContentPage.jsx` and its `site-content/*` tabs
  - `pages/help/PublicHelpPage.jsx`, `pages/shared/HelpPage.jsx`
  - `pages/legal/PolicyRoute.jsx`, `pages/legal/policyMeta.js`

---

## 9. Wider and smarter (added 2026-11-13)

The user asked to name it back to **Content Modules**, "widen it", and "make it as smart as possible". They chose both a wider layout and more content types, and all four smart features. (A mobile-app Welcome screens module was added and then reverted at the user's request on 2026-11-13, together with that round's mobile hand-off additions; the mobile app itself was never changed.)

### 9.1 Layout

- **Full width.** The page uses the full width of the admin area, with a **module sidebar** grouped as:
  - Overview (Health check, Reader insights)
  - Information (Office info, About PESO)
  - Help (FAQs)
  - Pages (Landing page, Policy pages)
- **Phones:** the sidebar becomes one scrolling row.
- **Badges:** the sidebar counts warnings, unanswered reports and unpublished FAQs.
- **Links between modules:** `?tab=` picks the module. Other modules can link straight into an FAQ with `?tab=faqs&faq=<id>`, or start a new FAQ with `?tab=faqs&new=<question>`.
- **Who sees what:** Configuration staff see everything. Constituent CRM (front desk) staff see Health check, Reader insights and FAQs.

### 9.2 More content types

| Module | What | Public surface |
|---|---|---|
| **About PESO** | Heading, intro, mission, vision, legal mandate, and up to 12 **PESO services**. Each service has a name, description, who it's for and an optional link. | New page `/about`, linked from the landing nav and footer. Mission and vision start **blank and stay hidden** until PESO supplies its official wording; they are never invented. |
| **Landing page → Sections shown** | On/off switches for Announcements, Features, Job discovery, Government programs and Common questions. The hero always shows. | A section that is switched off is removed from the landing page, along with its menu link. |

Both use the same section machinery as Office info: registry limits and defaults, a version number for edit conflicts, history with restore, and the Activity Log.

### 9.3 Smart features

**AI writing helper** (FAQ editor):
- **What it does:** *Draft answer*, *Simplify* and *Filipino version*, through the existing AI service (`VertexAiSuggestionService::generateText`).
- **Grounded drafts:** a draft may only use how i-PESO works (`peso_knowledge.site`), the saved Office info and the published FAQs. When those don't cover the question, the model replies `NOT_ENOUGH_INFO`, and staff are told to write the answer themselves or fill in Office info.
- **Staff stay in control:** the suggestion shows in a box with *Use this*, *Add below the English* (for translations) and *Discard*. Nothing is saved automatically.
- **Access:** `POST /admin/content-modules/ai-assist` requires full access and is throttled to 20 requests a minute. If AI is off on the server, it returns 503 with a plain message.
- **Not on policy pages, on purpose:** legal text should not be rewritten by AI.

**Learning from readers:**
- **"Was this helpful?"** appears under every answer: Help pages and the landing page's Common questions. There is one vote per reader per FAQ, and a reader can change their vote. The server keeps only an HMAC of (account, or IP + browser), so it can stop repeat votes without storing who voted. Vote counts show on each FAQ row and in Insights; an answer with at least 5 votes and less than 50% helpful is flagged **Rewrite**.
- **Searches that found nothing:** reported after the reader pauses typing (terms of 3+ characters), once per wording per reader per day.

**Chatbot gap report:**
- **How it works:** the assistant is told to end any "I don't have that information" reply with `[[NO_ANSWER]]`. `GeminiChatService::takeGapMarker` strips the marker, so visitors never see it, and records the question. Questions are also recorded when the tool loop runs out of rounds.
- **Switch:** `CHATBOT_GAP_LOGGING=false` turns recording off. The marker is still stripped.

**Reader insights** (`/admin/content-modules/insights?days=7|30|90`):
- **What it shows:** missed searches and unanswered chat questions grouped by their normalized wording (most frequent first, with sources), plus the vote table.
- **Closest FAQ:** each report shows the FAQ that probably answers it, or a note that it is unpublished.
- **Write FAQ:** asks the AI to turn the reader's words into a clean question, then opens the FAQ editor with it. Without AI, the raw words are used.
- **Dealt with:** resolves every report with that wording.

**Content health check** (`/admin/content-modules/health`): a score (ok ÷ (ok + warn)) and a checklist with action buttons. It checks for:
- blank Office info the assistant can't answer;
- no published FAQs;
- FAQs not reviewed in 6 months;
- unpublished FAQs older than 2 weeks;
- FAQ links to pages i-PESO doesn't have;
- near-duplicate questions (the editor also warns while you type, using the same similarity rule);
- unhelpful answers;
- searches that came up empty 3+ times;
- assistant questions unanswered 2+ times;
- a Privacy Policy that doesn't mention question logging;
- a Common questions section that is on but has no featured FAQs;
- a blank mission or vision;
- policy drafts left open for 30+ days.

### 9.4 Privacy

Nothing in the insight tables identifies a person:
- **Votes** store a salted hash only.
- **Search terms and chatbot questions** are stored with emails, phone and ID numbers removed (`ContentInsightService::redact`).
- **Retention:** everything is deleted after **90 days** by the nightly `site-content:prune-history` job.

**Action for PESO:** publish a Privacy Policy version (Content Modules → Policy pages) that says unanswered assistant questions and empty Help searches are recorded without names, emails or numbers, kept 90 days, and used only to improve the Help content. The health check shows this as a warning until a published Privacy Policy mentions the assistant. Suggested wording for the "What We Collect" section:

> **When you use Help or the assistant**, we record — without your name, email or phone number — the questions the assistant could not answer and the Help searches that found nothing, and whether you marked an answer helpful. We keep these for 90 days and use them only to improve the answers on i-PESO.

### 9.5 Files

- **Backend:**
  - Migration `2026_11_13_000006_create_content_insight_tables.php` (`faq_feedback`, `help_search_misses`, `chatbot_gaps`)
  - `app/Services/ContentInsightService.php` (redaction, similarity, insights, health)
  - `app/Services/ContentAiService.php`
  - `app/Http/Controllers/Api/Admin/Configuration/ContentInsightController.php`, `app/Http/Controllers/Api/HelpFeedbackController.php`
  - Registry sections `about` and `landing.show_sections`
  - `services.chatbot.gap_logging` config
  - Tests: `tests/Feature/ContentModulesSmartTest.php`
- **Frontend:**
  - `pages/admin/6-configuration/content/ContentModulesPage.jsx`
  - `site-content/` modules: `OverviewModule`, `InsightsModule`, `AboutTab`, `useSectionEditor`
  - `pages/about/AboutPage.jsx`
  - `components/site-content/textSimilarity.js`
  - `FaqFeedback` and search-miss reporting in `HelpCenter.jsx`

