# Master prompt: Help & FAQs in the i-PESO mobile app (job seeker)

Paste everything below the line into your AI coding assistant, opened in the `i-PESO-CAPSTONE-SYSTEM` repository. Pull the latest `main` first.

---

You are working in the i-PESO repository, a government employment platform for the Public Employment Service Office (PESO) of Urdaneta City, Pangasinan. It contains:

- `i-peso-backend/`: the Laravel API.
- `i-peso-frontend/`: the React website.
- `i-peso-mobile/`: the job seeker app (Expo SDK 54, React Native 0.81, expo-router, TanStack Query, Reanimated 4).

## Your task

The **Content module (Site Content)** is finished on the backend and the **website**. PESO staff now maintain, from the admin side:

- **Office info:** address, hours, phone, email, Facebook, fees policy. Entered once and used everywhere.
- **FAQs:** questions and answers aimed at Everyone, Job seekers or Employers, grouped by topic. Only *published* ones reach readers.
- **Policy pages:** the Privacy Policy, Terms of Service and Review Guidelines, now versioned.

On the website, job seekers get a **Help & FAQs** page at `/seeker/help`. The app has no Help screen, and its contact details are hard-coded or missing.

**Build the job seeker side in the mobile app, based on the website codebase.** For each piece below:

1. Read the website file it comes from.
2. Rebuild the same behaviour, rules, wording and API call in React Native, using the app's own components and theme.
3. Change layout only where a phone needs it.

**Do not change anything in `i-peso-backend/` or `i-peso-frontend/`.** The API is final. If something seems to need a backend change, stop and report it.

## Step 1: Read the website implementation first

**Rules and API (source of truth):**

| What | File |
|---|---|
| The whole module: purpose, audiences, what readers see | `docs/content-module-plan.md` (sections 3.1, 3.2 and 5.2) |
| The endpoint (signed in) | `GET /api/help` → `i-peso-backend/app/Http/Controllers/Api/HelpController.php` |
| The JSON of one FAQ (`toReaderArray`) | `i-peso-backend/app/Models/Faq.php` |
| Office fields and their meaning (`null` = not on record) | `i-peso-backend/app/Support/SiteContentRegistry.php` (`office` section) |
| How it behaves end to end | `i-peso-backend/tests/Feature/SiteContentModuleTest.php` (FAQ audience and publish tests) |

`GET /api/help` returns `{ role, office, faqs, topics }`:

- `faqs` holds only the published FAQs this seeker may see, already in display order.
- `office` holds every Office info field. A field is `null` when PESO has not filled it in.

**Website screens to rebuild (the UI reference):**

| Mobile piece | Copy the behaviour and wording from |
|---|---|
| API call | `i-peso-frontend/src/services/siteContentService.js` (`helpService.get` only) |
| Help screen: search, topic chips, accordion, empty and error states, `#faq-<id>` deep link | `i-peso-frontend/src/components/site-content/HelpCenter.jsx` and `src/pages/shared/HelpPage.jsx` |
| How an answer is drawn: paragraphs, "- " bullets, `**bold**`, links, `{office.email}`-style placeholders | `i-peso-frontend/src/components/site-content/RichText.jsx` and `richTextUtils.js` |
| Contact card (hides fields that are `null`, "Get directions") | `i-peso-frontend/src/components/site-content/OfficeContactCard.jsx` and `mapLinkFor` / `telHref` in `siteContentDefaults.js` |
| Tests that walk the flow | `i-peso-frontend/src/components/site-content/__tests__/SiteContentReader.test.jsx` |

**Mobile app conventions** (read before writing code):

- `i-peso-mobile/services/seekerService.ts`: API patterns. `services/api.ts` is the client, and `utils/apiError.ts` provides `apiErrorMessage()`.
- `i-peso-mobile/theme/index.ts`. Design rule: **white is the main colour and everything else is a shade of blue or a blue gradient.** Amber (`colors.accent`) is never used for a button.
- `i-peso-mobile/components/ui/*`: reuse `Card`, `Badge`, `EmptyState`, `QueryState`, `Skeleton`, `PressableScale`, `ScreenHeader`, `SegmentedControl` and `Button`.
- `i-peso-mobile/hooks/useMotion.ts`: every animation goes through it, so Reduce Motion is respected.
- `app/(seeker)/reviews.tsx` is the closest finished example of a list screen with a route param. `utils/reviews.ts` shows how the app already opens a website page (`REVIEW_GUIDELINES_URL`).
- **Leave these alone:** `app/(seeker)/assistant.tsx` and `services/chatbotService.ts`. The assistant already uses the published FAQs on the server side.

## Step 2: Build, in this order

Tasks 1–4 are required. Task 5 can wait if you're short on time; say if you skipped it.

1. **Service and types.**
   - Add `help()` to `seekerService.ts`, calling `GET /help`.
   - Write TypeScript types:
     - `Faq`: `id, question, answer, audience, topic, topic_label, link_label, link_url, is_featured, sort_order`.
     - `OfficeInfo`: `office_name, address, map_url, hours, phone, email, facebook, fees_policy, employer_approval_time`, each `string | null`.
     - `HelpTopic`: `{ value, label }`.
   - Use the query key `['help', 'seeker']` with `staleTime` 5 minutes.

2. **Answer renderer.** Create `components/help/FaqAnswer.tsx`, rebuilt from `RichText.jsx`.
   - **Layout:** a blank line starts a new paragraph, and a line starting with `- ` is a bullet (use a `View` row with a "•").
   - **Inline text:** `**text**` is bold. `https://…` links and email addresses are tappable `Text` (`Linking.openURL`, with `mailto:` for emails).
   - **Placeholders:** fill `{office.address}`, `{office.phone}`, `{office.email}`, `{office.facebook}`, `{office.hours}` and `{office.name}` from `office`, writing "not on record" when the field is null.
   - **Plain text only:** never render the answer as HTML or Markdown, and never use a WebView for it.

3. **Help screen.** Create `app/(seeker)/help.tsx`, rebuilt from `HelpPage.jsx` and `HelpCenter.jsx`, and register it in `app/(seeker)/_layout.tsx` with `href: null`.
   - **Header:** the title "Help & FAQs" and the same intro text as the website.
   - **Search:** a search field that filters as you type over question and answer. Every word must match, as on the website.
   - **Topic chips:** a horizontal row, "All topics" plus only the topics that have FAQs. Show it only when there are two or more topics.
   - **Questions:** an accordion with one open at a time, animated through `useMotion`.
     - With no search and "All topics" selected, group the questions under topic headings.
     - Each answer uses `FaqAnswer`. Below it, show the link button when `link_url` is set.
   - **Link button:** `link_url` is either an i-PESO web path (starting with `/`) or an `https://` link.
     - Map the web paths the app has screens for: `/seeker/job-fairs` → `/(seeker)/job-fairs`, `/seeker/government-programs` → `/(seeker)/government-programs`, `/seeker/applications` → `/(seeker)/applications`, `/seeker/job-map` → `/(seeker)/job-map`, `/seeker/profile` → `/(seeker)/profile`.
     - For any other `/…` path, open `https://ipeso.website` + the path in the browser. Open `https://` links with `Linking.openURL`.
     - Never open anything else.
   - **Empty states:** "No questions have been published yet. Contact the PESO office below for help." when there are no FAQs. "No questions match "…". Try other words, or contact the office below." when the search finds nothing.
   - **Errors and refresh:** on an error, show the API message with `apiErrorMessage()` and a retry; the contact card still shows. Add pull-to-refresh.
   - **Route param:** support a `faq` param (e.g. `?faq=12`) that opens and scrolls to that question. If the question no longer exists, show the website's notice: "That question is no longer available. Try searching below."
   - **Contact card** at the bottom, rebuilt from `OfficeContactCard.jsx`:
     - Show only the fields that are not null.
     - Tapping an item does: address → "Get directions" (`map_url`, or a Google Maps search of the address); phone → `tel:`; email → `mailto:`; Facebook → the URL.
     - Don't show *Account approval*; it is for employers.

4. **Entry points.**
   - On the Profile screen, add a "Help & FAQs" row next to "Open My Reviews" and "Safety Reports".
   - Under it, add three quiet text links that open the website pages in the browser: `https://ipeso.website/privacy-policy`, `/terms-of-service` and `/review-guidelines`. They are versioned on the website, so don't copy their text into the app.
   - Reuse the `REVIEW_GUIDELINES_URL` pattern from `utils/reviews.ts`, putting the URLs in one `utils/links.ts`.

5. **Home shortcut (optional).** Add a small "Questions? Help & FAQs" link on `app/(seeker)/index.tsx`, below the job fair bulletin.

## Rules

- **Don't decide visibility in the app.** `/help` only returns published FAQs for Everyone and Job seekers. Never filter them yourself beyond the user's search and topic.
- **`null` means not on record.** Never show "null" or an empty row, and never type in a default address or phone number. When every contact field is null, show "Visit the PESO office of Urdaneta City."
- **Wording:** use the API's `topic_label` for topics and the website's wording for everything else.
- **Theme:** use existing tokens only. No new colours and no amber buttons.
- **New screens:** typed routes need regenerating before `tsc` passes. Run `npx expo start` for about 10 seconds, stop it, then type-check. Don't cast around the error.

## Done when

- [ ] `npx tsc --noEmit` passes, `npm run lint` passes, and `npx expo export --platform android` bundles.
- [ ] Against the API, with a test seeker account and an admin account on the website (Configuration → Site Content):
  - [ ] An FAQ for **Everyone** and one for **Job seekers** both appear once published; an **Employers** FAQ and any **unpublished** FAQ never appear.
  - [ ] Editing an answer on the website shows the new text after pull-to-refresh.
  - [ ] Search narrows the list; topic chips filter; "All topics" groups by topic.
  - [ ] An answer with bullets, `**bold**`, a link and `{office.email}` renders correctly, and the link and email are tappable.
  - [ ] Clearing *Office hours* in Office info removes the hours row from the contact card. Changing the phone number changes it in the app.
  - [ ] `?faq=<id>` opens that question; a deleted id shows the "no longer available" notice.
  - [ ] The policy links open the website pages.
- [ ] Screen readers announce each question as a button with its expanded state, the topic chips as selected or unselected, and nothing animates when Reduce Motion is on.

When you finish, list the files you changed, whether you skipped task 5, and anything you couldn't verify.
