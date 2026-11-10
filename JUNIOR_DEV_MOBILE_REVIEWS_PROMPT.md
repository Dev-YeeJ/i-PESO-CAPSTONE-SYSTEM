# Master prompt: Verified Reviews in the i-PESO mobile app

Paste everything below the line into your AI coding assistant, opened in the `i-PESO-CAPSTONE-SYSTEM` repository. Pull the latest `main` first.

---

You are working in the i-PESO repository: a government employment platform for the Public Employment Service Office (PESO) of Urdaneta City, Pangasinan. It contains:

- `i-peso-backend/`: the Laravel API.
- `i-peso-frontend/`: the React website.
- `i-peso-mobile/`: the job seeker app, built with Expo SDK 54, React Native 0.81, expo-router, TanStack Query and Reanimated 4.

## Your task

The **Verified Mutual Feedback System** (job seekers' reviews of employers) is finished and live on the backend and the **website**. Build the **job seeker side of it in the mobile app, based on the website codebase.**

**The website implementation is your reference.** For each mobile piece below, read the website file it comes from, then rebuild the same behavior, rules, wording and API calls in React Native with the app's own components and theme. Use the same text the website shows. Only change layout where a phone needs it (bottom sheets instead of dialogs, stacked instead of side by side).

**Do not change anything in `i-peso-backend/` or `i-peso-frontend/`.** The API is final and deployed. If something seems to need a backend change, stop and report it instead.

## Step 1: Read the website implementation first

**Rules and API (source of truth):**

| What | Website / backend file |
|---|---|
| All seeker review endpoints and their exact response shapes | `i-peso-backend/app/Http/Controllers/Api/SeekerReviewController.php` |
| Who can review what, and when | `i-peso-backend/app/Services/Feedback/FeedbackEligibility.php` |
| Company summary and how a public review looks (anonymous) | `i-peso-backend/app/Services/Feedback/ReputationSummary.php` |
| Employer feedback about the worker (locked until reviewed / 14 days) | `i-peso-backend/app/Services/Feedback/WorkerFeedbackVisibility.php` |
| Aspect keys and labels, report reasons | `i-peso-backend/app/Support/FeedbackAspects.php` |
| Notification payloads (`data.type`) | `i-peso-backend/app/Notifications/ReviewInvitationNotification.php`, `ReviewModeratedNotification.php`, `WorkerFeedbackReceivedNotification.php` |
| The routes | `i-peso-backend/routes/api.php`, under the `seeker` prefix: `/reviews`, `/reviews/{review}`, `/reviews/{review}/report`, `/employers/{employer}/reviews`, `/employer-ratings` |

**Website screens to rebuild (the UI reference):**

| Mobile piece | Copy the behavior and wording from |
|---|---|
| API calls | `i-peso-frontend/src/services/reviewService.js` |
| Aspect lists, "open actions" logic, query key | `i-peso-frontend/src/utils/reviews.js` (and its tests in `src/utils/__tests__/reviews.test.js`) |
| Review form (write and edit) | `i-peso-frontend/src/components/reviews/ReviewFormDialog.jsx` |
| Star input and read-only stars | `i-peso-frontend/src/components/reviews/StarRating.jsx` |
| My Reviews screen | `i-peso-frontend/src/pages/seeker/MyReviewsPage.jsx` (including `EmployerFeedbackSection`) |
| Rate buttons on applications | `i-peso-frontend/src/pages/seeker/MyApplications.jsx` (`reviewActionsFor`, `ReviewNote`) |
| Reviews on the company profile | `i-peso-frontend/src/components/reviews/CompanyReviews.jsx` and `ReputationSummaryCard.jsx` |
| Reporting a review | `i-peso-frontend/src/components/reviews/ReportReviewDialog.jsx` |
| Rating on job cards | `i-peso-frontend/src/pages/seeker/JobSeekerHome.jsx` (`ratingEmployerIds` / `employerRatings`, and the `rating` prop in `JobCard`) |
| Community guidelines | `https://ipeso.website/review-guidelines` (`i-peso-frontend/src/pages/legal/ReviewGuidelinesPage.jsx`). Open it in the browser with `Linking.openURL`; don't rebuild the page. |

**Mobile app conventions** (read before writing code):

- `i-peso-mobile/services/seekerService.ts`, `services/api.ts`, `utils/apiError.ts`: API patterns, and `apiErrorMessage()` for errors.
- `i-peso-mobile/theme/index.ts` and the design rule: **white is the main color and everything else is a shade of blue or a blue gradient.**
  - Amber (`colors.accent`) is only for marking something earned, such as the star fill. It is never a button color.
  - Text on amber uses `colors.accentText`.
- `i-peso-mobile/components/ui/*`: reuse `BottomSheet`, `Button`, `Card`, `SectionHeader`, `SegmentedControl`, `EmptyState`, `QueryState`, `Skeleton`, `Badge`, `PressableScale`, `ScreenHeader`.
- `i-peso-mobile/hooks/useMotion.ts`: every animation must go through it (reduced motion).
- `i-peso-mobile/stores/toastStore.ts`: `const { showToast } = useToast()`.
- `i-peso-mobile/components/ReportEmployerModal.tsx`: the existing pattern for a reason picker in a bottom sheet.
- **Leave alone:** `app/(seeker)/assistant.tsx` and `services/chatbotService.ts`.

## Step 2: Build, in this order

Tasks 1–5 are required. Tasks 6–8 can wait if you're short on time; say which ones you skipped.

1. **Service and types.** Add the review endpoints to `seekerService.ts`, mirroring `reviewService.js`. Write TypeScript types from the shapes the controller returns (`index`, `ownReview`, `employerReviews`, and `ReputationSummary::publicReview`).

2. **Review form.** Create `components/reviews/ReviewFormSheet.tsx` (a bottom sheet), rebuilt from `ReviewFormDialog.jsx`.
   - Keep the same fields, aspect hints, notes ("Your name is never shown…", "Rate how the hiring was handled, not whether you got the job.", the limited-review note) and the checkboxes.
   - The "community guidelines" text opens the guidelines URL.
   - Star input: rebuild from `StarRating.jsx`.
     - Each star is a button with `accessibilityRole="radio"`, `accessibilityState={{ checked }}` and a label like "4 of 5 stars, Good".
     - Touch targets are at least 44 pt. Filled stars use amber; empty stars use `colors.border`.

3. **My Reviews screen.** Create `app/(seeker)/reviews.tsx`, rebuilt from `MyReviewsPage.jsx`.
   - It has the same three sections: **Ready to review**, **Feedback from employers** (locked or unlocked), and **Your reviews** (status badge, reason or PESO note, employer reply, Edit, and Take back with a confirmation).
   - Register it in `app/(seeker)/_layout.tsx` with `href: null`, and add a "My Reviews" entry on the Profile screen.
   - Support the route param `review` (e.g. `application-12-recruitment`) the same way the website handles `?review=`: open the form for that action, or the edit form if it's already reviewed, then clear the param.

4. **Reviews on the company profile.** In `app/(seeker)/employers/[id].tsx`, rebuild `CompanyReviews.jsx` and `ReputationSummaryCard.jsx`.
   - "Hiring process" / "Working here" switcher.
   - The summary card, or "Not enough verified reviews yet" below 3 reviewers.
   - The anonymous review list with employer replies, "Show more", and the footer note.

5. **Notification taps.** In `app/(seeker)/notifications.tsx` (`handleNotificationPress`) and `routeForPushData` in `services/pushNotifications.ts`, handle these **before** the existing `application_id` branch.
   - Review invitations also carry `application_id`, so today they wrongly open the Applications list.
   - `review_invitation` opens the reviews screen with `review` = `application-{application_id}-{review_type}` (or `placement-{placement_record_id}-{review_type}`).
   - `review_moderated` and `worker_feedback_received` open the reviews screen.

6. **Rate buttons on applications.** On `applications.tsx` and `applications/[id].tsx`, rebuild `reviewActionsFor` and `ReviewNote` from `MyApplications.jsx`: Rate buttons that open the form, plus "You reviewed this employer" and "You can rate this employer once they respond, or from {date}…".

7. **Report a review.** Add a Report action on each company-profile review, rebuilt from `ReportReviewDialog.jsx` using the `ReportEmployerModal.tsx` sheet pattern.

8. **Rating on job cards.** On the jobs and home feeds, fetch `/seeker/employer-ratings` **once per feed** for the visible employers, as `JobSeekerHome.jsx` does.
   - `JobFeedCard` shows "★ 4.3 (12)" next to the company name.
   - The accessibility label is "Rated 4.3 out of 5 by 12 verified reviewers".

## Rules

- **Don't work out eligibility in the app.** Use the API's `allowed`, `limited`, `reason`, `available_from` and `review_id`, the same way `utils/reviews.js` (`openActions`) does.
- **Privacy:** never show a reviewer's identity, and never show job titles on public reviews.
- **Errors:** show the API's `message` as a toast after saving. Show 422 errors under their fields (`errors["ratings.process"]`, `errors.agree_guidelines`, `errors.confirm_started`), and show `errors.type` at the top of the form, like the website.
- **Theme:** use the existing tokens only. No new colors, and no amber buttons.
- **New screens:** typed routes need regenerating before `tsc` passes. Run `npx expo start` for about 10 seconds, stop it, then type-check. Don't cast around it.

## Done when

- [ ] `npx tsc --noEmit` passes, `npm run lint` passes, and `npx expo export --platform android` bundles.
- [ ] On the live API, the app matches the website for the same test account:
  - [ ] The same items under Ready to review.
  - [ ] Submitting a review shows it as Published, in My Reviews and on the company profile.
  - [ ] A comment containing a phone number shows "Waiting for PESO".
  - [ ] Edit and Take back work.
  - [ ] Fewer than 3 reviewers shows "Not enough verified reviews yet".
  - [ ] Tapping a review invitation notification opens the form.
- [ ] Screen readers announce the stars and buttons correctly, and nothing animates when Reduce Motion is on.

When you finish, list the files you changed, which tasks (if any) you skipped, and anything you couldn't verify.
