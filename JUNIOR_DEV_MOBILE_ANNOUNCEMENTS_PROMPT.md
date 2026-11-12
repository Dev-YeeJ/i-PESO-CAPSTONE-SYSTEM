# Master prompt: PESO Announcements in the i-PESO mobile app (job seeker)

Paste everything below the line into your AI coding assistant, opened in the `i-PESO-CAPSTONE-SYSTEM` repository. Pull the latest `main` first.

---

You are working in the i-PESO repository: a government employment platform for the Public Employment Service Office (PESO) of Urdaneta City, Pangasinan. It contains:

- `i-peso-backend/`: the Laravel API.
- `i-peso-frontend/`: the React website.
- `i-peso-mobile/`: the job seeker app, built with Expo SDK 54, React Native 0.81, expo-router, TanStack Query and Reanimated 4.

## Your task

The **Announcement module** is finished on the backend and the **website**. PESO administrators publish announcements (office advisories, job fair notices, program news, system notices) to the Public, All users, Job seekers or Employers. Job seekers see them:

- as a **banner** on the dashboard (only *Important* and *Urgent* ones, until dismissed),
- on an **Announcements** page (everything live for them, pinned first, unread marked),
- as a **bell notification + push** when the admin turned on "Also notify".

Build the **job seeker side in the mobile app, based on the website codebase.** Today a push for an announcement arrives on the phone but tapping it goes nowhere, and the app has no place to read announcements.

**The website implementation is your reference.** For each mobile piece below, read the website file it comes from, then rebuild the same behavior, rules, wording and API calls in React Native with the app's own components and theme. Use the same text the website shows. Only change layout where a phone needs it (bottom sheets instead of dialogs, stacked instead of side by side).

**Do not change anything in `i-peso-backend/` or `i-peso-frontend/`.** The API is final. If something seems to need a backend change, stop and report it instead.

## Step 1: Read the website implementation first

**Rules and API (source of truth):**

| What | File |
|---|---|
| The whole module: purpose, audiences, priorities, lifecycle, what readers see | `docs/announcement-module-plan.md` (read sections 3.3 and 5.3 first) |
| Reader endpoints and their responses | `i-peso-backend/app/Http/Controllers/Api/AnnouncementFeedController.php` |
| The exact JSON shape of one announcement (`forReader`) | `i-peso-backend/app/Support/AnnouncementPresenter.php` |
| Push / bell payload (`data.type === 'announcement'`, carries `announcement_id`, `priority`) | `i-peso-backend/app/Notifications/AnnouncementPublished.php` |
| The routes (all under `/api`, signed in) | `GET /announcements`, `GET /announcements/banner`, `GET /announcements/unread-count`, `POST /announcements/read-all`, `GET /announcements/{id}` (**marks it read**), `POST /announcements/{id}/dismiss`, `GET /announcements/{id}/attachment` |
| How it behaves end to end | `i-peso-backend/tests/Feature/AnnouncementModuleTest.php`. Read this; it is the clearest spec. |

**Website screens to rebuild (the UI reference):**

| Mobile piece | Copy the behavior and wording from |
|---|---|
| API calls | `i-peso-frontend/src/services/announcementService.js` (the `announcementService` object only — not the admin one) |
| Category labels/icons, priority colours, date formats | `i-peso-frontend/src/components/announcements/announcementMeta.js` |
| Dashboard banner | `i-peso-frontend/src/components/announcements/AnnouncementBanner.jsx` |
| Full announcement (message, attachment, link) | `i-peso-frontend/src/components/announcements/AnnouncementDetailDialog.jsx` and `AnnouncementPieces.jsx` |
| Announcements screen (filter chips, unread marker, "Mark all as read", `?open=`) | `i-peso-frontend/src/pages/shared/AnnouncementsFeedPage.jsx` |
| The component tests that walk the flow | `i-peso-frontend/src/components/announcements/__tests__/AnnouncementReader.test.jsx` |

**Mobile app conventions** (read before writing code):

- `i-peso-mobile/services/seekerService.ts`: API patterns; `services/api.ts` is the client; `utils/apiError.ts` gives `apiErrorMessage()`.
- `i-peso-mobile/theme/index.ts` and the design rule: **white is the main color and everything else is a shade of blue or a blue gradient.**
  - Amber (`colors.accent`) is only for marking something earned, never a button.
  - Exception for this feature: the *Urgent* banner may use the red error tokens (`colors.error` / `colors.errorBackground`) and *Important* a light amber **background tint only** — the same meaning the website gives them. Buttons stay blue.
- `i-peso-mobile/components/ui/*`: reuse `BottomSheet`, `Button`, `Card`, `Badge`, `EmptyState`, `QueryState`, `Skeleton`, `PressableScale`, `ScreenHeader`, `SegmentedControl`.
- `i-peso-mobile/hooks/useMotion.ts`: every animation must go through it (reduced motion).
- `i-peso-mobile/stores/toastStore.ts`: `const { showToast } = useToast()`.
- The reviews feature (`app/(seeker)/reviews.tsx`) is the closest finished example: a list screen with a route param that opens a sheet, and notification routing. Follow its patterns.
- **Leave alone:** `app/(seeker)/assistant.tsx` and `services/chatbotService.ts`.

## Step 2: Build, in this order

Tasks 1–5 are required. Task 6 can wait if you're short on time; say if you skipped it.

1. **Service and types.** Add to `seekerService.ts`: `announcements({ category, page })`, `announcementBanner()`, `announcementUnreadCount()`, `announcement(id)`, `dismissAnnouncement(id)`, `readAllAnnouncements()`. Write a TypeScript `Announcement` type from `AnnouncementPresenter::forReader()` (`id, title, body, excerpt, category, category_label, priority, priority_label, is_pinned, publish_at, expires_at, link_label, link_url, has_attachment, attachment_name, attachment_is_image, is_read, is_dismissed`). Use the TanStack query keys `['announcements', 'feed' | 'banner' | 'unread' | 'detail', …]` so invalidation matches the website.

2. **Announcement sheet.** Create `components/announcements/AnnouncementSheet.tsx` (a `BottomSheet`), rebuilt from `AnnouncementDetailDialog.jsx`.
   - Fetch with `announcement(id)` — **that request is what marks it read**; afterwards invalidate the feed, banner and unread queries.
   - Show category chip, priority pill (only for Important/Urgent), "Pinned", title, "Posted by PESO Urdaneta · date", "Until …" when `expires_at` is set, and the **body with its line breaks kept** (plain `Text`, never render it as HTML/markdown).
   - **Attachment:** the file streams from `GET /announcements/{id}/attachment` with the seeker's token. Images: show them with `expo-image`/`Image` using `{ uri, headers: { Authorization: 'Bearer …' } }`. PDFs: a row with the file name that opens it (download with the token to the cache directory, then share/open — check how `profile.tsx` handles resume PDFs before inventing a new way). If it fails, show "The attachment could not be loaded."
   - **Link button:** `link_url` is either an i-PESO **web** path (starts with `/`) or an `https://` URL. Map the web paths the app has screens for (`/seeker/job-fairs` → `/(seeker)/job-fairs`, `/seeker/government-programs` → `/(seeker)/government-programs`, `/seeker/applications` → `/(seeker)/applications`, `/seeker/job-map` → `/(seeker)/job-map`); open `https://` links with `Linking.openURL`. For any other `/…` path, open `https://ipeso.website` + the path in the browser. Never open anything else.
   - Error/404 state: "Announcement unavailable — This announcement has ended or is no longer available."

3. **Announcements screen.** Create `app/(seeker)/announcements.tsx`, rebuilt from `AnnouncementsFeedPage.jsx`.
   - Same header text, the category filter (horizontal chips: All + the five categories, same labels), cards with unread dot + bolder title, category chip, priority pill, pinned mark, date, two-line excerpt, "Attachment" hint.
   - "Mark all as read (N)" when `unread_count > 0`; toast "All announcements marked as read."
   - Pull-to-refresh, "Load more" pagination, the website's empty states ("No announcements right now" / "No announcements in this category").
   - Support the `open` route param (e.g. `?open=12`): open that announcement's sheet, then clear the param — the same way `reviews.tsx` handles `review`.
   - Register it in `app/(seeker)/_layout.tsx` with `href: null`.

4. **Home banner.** On `app/(seeker)/index.tsx`, above the existing "PESO Job Fair Bulletin" card, render the banner from `announcementBanner()`, rebuilt from `AnnouncementBanner.jsx`: up to 3 cards, urgent first, kicker "Urgent PESO announcement" / "PESO announcement", title, two-line excerpt, "Read more" (opens the sheet) and a close button that calls `dismissAnnouncement(id)` and hides it immediately (`accessibilityLabel="Dismiss announcement: {title}"`). Render nothing when empty or when the request fails — it must never block or break the home screen. Also add a small "Announcements" entry point on Home (e.g. next to the bulletin, with the unread count from `announcementUnreadCount()` when > 0).

5. **Notification taps.** In `app/(seeker)/notifications.tsx` (`handleNotificationPress` and `iconForNotification`) and `routeForPushData` in `services/pushNotifications.ts`, add `type === 'announcement'` → `/(seeker)/announcements` with `open` = `data.announcement_id` (and `from: 'notifications'`). Put the branch **before** the generic `job_fair_id` / `program_id` fallbacks. Icon: `campaign` (MaterialIcons). Add `announcement_id` and `priority` to both `SeekerNotification['data']` and `PushNotificationData`. Do **not** route by `action_url` — it is a web path.

6. **Profile entry point (optional).** Add an "Announcements" row/card on the Profile screen next to "Open My Reviews", so it's reachable without the home banner.

## Rules

- **Don't decide visibility in the app.** The API only ever returns what this seeker may see (audience, publish time, expiry, archived). Never filter or hide announcements client-side beyond the category the user picked.
- **Opening = read.** Only `GET /announcements/{id}` marks read; don't fake read state locally except for instant UI feedback that the next refetch confirms.
- **Dismiss ≠ read.** Dismissing only removes it from the home banner; it stays on the Announcements screen.
- **Use the API's wording** for categories (`category_label`) and the website's wording for everything else.
- **Errors:** show the API's `message` with `apiErrorMessage()`.
- **Theme:** existing tokens only (see the exception above for banner tints). No new colors, no amber buttons.
- **New screens:** typed routes need regenerating before `tsc` passes. Run `npx expo start` for about 10 seconds, stop it, then type-check. Don't cast around it.

## Done when

- [ ] `npx tsc --noEmit` passes, `npm run lint` passes, and `npx expo export --platform android` bundles.
- [ ] Against the API, with a test seeker account and an admin account on the website (Configuration → Announcements):
  - [ ] An *Urgent* announcement to **Job seekers** shows a red banner on Home; ✕ hides it and it stays hidden after restarting the app; it is still listed on the Announcements screen.
  - [ ] An *Important* one shows an amber-tinted banner; a *Normal* one shows no banner, only in the list.
  - [ ] Opening an announcement removes its unread dot and lowers the unread count; "Mark all as read" clears all.
  - [ ] An announcement to **Employers** never appears in the app.
  - [ ] A **scheduled** announcement appears only after its time; one with an **end date** disappears after it.
  - [ ] With "Also notify" on, the push arrives; tapping it (app closed and app open) opens that announcement. The bell entry does the same.
  - [ ] An image attachment displays and a PDF opens; the link button opens the job fairs screen for `/seeker/job-fairs` and the browser for an `https://` link.
- [ ] Screen readers announce the dismiss button with the announcement title, the filter chips as selected/unselected, and nothing animates when Reduce Motion is on.

When you finish, list the files you changed, whether you skipped task 6, and anything you couldn't verify.
