# Master prompt: Report & Safety in the i-PESO mobile app (job seeker)

Paste everything below the line into your AI coding assistant, opened in the `i-PESO-CAPSTONE-SYSTEM` repository. Pull the latest `main` first.

---

You are working in the i-PESO repository: a government employment platform for the Public Employment Service Office (PESO) of Urdaneta City, Pangasinan. It contains:

- `i-peso-backend/`: the Laravel API.
- `i-peso-frontend/`: the React website.
- `i-peso-mobile/`: the job seeker app, built with Expo SDK 54, React Native 0.81, expo-router, TanStack Query and Reanimated 4.

## Your task

**Report & Safety Management** is finished on the backend and the **website**:
- Job seekers can report an employer, company or job vacancy.
- Employers can report job seekers.
- PESO reviews every report before anything happens.

Build the **job seeker side of it in the mobile app, based on the website codebase.** The mobile app is seeker-only, so you only need the "report an employer" direction, plus the seeker's own list of reports.

The app already has an old, simpler "Report employer" sheet (`components/ReportEmployerModal.tsx`). It posts to an old endpoint that still works but skips the new features. You will **replace it** with the new flow.

**The website implementation is your reference.** For each mobile piece below, read the website file it comes from, then rebuild the same behavior, rules, wording and API calls in React Native with the app's own components and theme. Use the same text the website shows. Only change layout where a phone needs it (bottom sheets instead of dialogs, stacked instead of side by side).

**Do not change anything in `i-peso-backend/` or `i-peso-frontend/`.** The API is final. If something seems to need a backend change, stop and report it instead. In particular, **do not remove** the old `POST /seeker/employers/{employer}/report` route: older installed copies of the app still use it.

## Step 1: Read the website implementation first

**Rules and API (source of truth):**

| What | Backend file |
|---|---|
| Seeker endpoints, validation rules, the 201 / 409 / 422 responses | `i-peso-backend/app/Http/Controllers/Api/SafetyReportController.php` |
| What the seeker is allowed to see about their own case (`reporterView`), context linking, duplicate and daily-limit guards | `i-peso-backend/app/Services/Safety/SafetyReportService.php` |
| Categories, hints, statuses, upload limits (`formOptions`) | `i-peso-backend/app/Support/SafetyReportCatalog.php` and `config/safety_reports.php` |
| Notification payloads (`data.type`) | `i-peso-backend/app/Notifications/SafetyReportUpdateNotification.php` (`safety_report_update`, carries `report_id`) and `SafetyActionNotice.php` (`safety_action_notice`, carries `action`) |
| The routes | `i-peso-backend/routes/api.php`, under the `seeker` prefix: `GET /safety-reports/options`, `GET /safety-reports`, `POST /safety-reports`, `GET /safety-reports/{id}`, `POST /safety-reports/{id}/details` |
| How it behaves end to end | `i-peso-backend/tests/Feature/SafetyReportFlowTest.php`. Read this; it is the clearest spec. |

**Website screens to rebuild (the UI reference):**

| Mobile piece | Copy the behavior and wording from |
|---|---|
| API calls, including the multipart upload | `i-peso-frontend/src/services/safetyReportService.js` (the `safetyReportService` object and `safetyStatusBadge`) |
| The report form: steps, texts, checks, duplicate and success states | `i-peso-frontend/src/components/safety/ReportConcernDialog.jsx` |
| How each entry point fills in the target | `i-peso-frontend/src/components/ReportEmployerModal.jsx`, `src/components/JobDetailModal.jsx` ("Report this vacancy"), `src/pages/seeker/JobMapPage.jsx` (`setReportTarget`), `src/pages/seeker/MyApplications.jsx` ("Report a concern") |
| My Safety Reports screen, the case detail and "Add new information" | `i-peso-frontend/src/pages/shared/MySafetyReportsPage.jsx` |
| The component test that walks the whole flow | `i-peso-frontend/src/pages/seeker/__tests__/EmployerProfileModal.test.jsx` |

**Mobile app conventions** (read before writing code):

- `i-peso-mobile/services/seekerService.ts`: API patterns. Its `toFormData()` helper shows how React Native appends a file (`{ uri, name, type }`). `services/api.ts` is the API client, and `utils/apiError.ts` provides `apiErrorMessage()` for errors.
- Picking files: `app/(seeker)/profile.tsx` already uses `expo-image-picker` (photos) and `expo-document-picker` (PDF). Both packages are installed, so don't add new ones.
- Date input: reuse `CalendarField` from `components/onboarding/Steps.tsx` (pass `maximumDate={new Date()}`).
- `i-peso-mobile/theme/index.ts` and the design rule: **white is the main color and everything else is a shade of blue or a blue gradient.**
  - Amber (`colors.accent`) is only for marking something earned, never a button.
  - Red (`colors.error` / `colors.errorBackground`) is fine for the report flag and the "Submit report" danger button, as the existing sheet already does.
- `i-peso-mobile/components/ui/*`: reuse `BottomSheet`, `Button`, `Card`, `Badge`, `AlertBox`, `EmptyState`, `QueryState`, `Skeleton`, `PressableScale`, `ScreenHeader`, `SuccessSheet`.
- `i-peso-mobile/hooks/useMotion.ts`: every animation must go through it (reduced motion).
- `i-peso-mobile/stores/toastStore.ts`: `const { showToast } = useToast()`.
- The reviews feature (`components/reviews/*`, `app/(seeker)/reviews.tsx`) is the closest finished example of this kind of work in the app: a bottom-sheet form, a list screen with a route param, and notification routing. Follow its patterns.
- **Leave alone:** `app/(seeker)/assistant.tsx` and `services/chatbotService.ts`.

## Step 2: Build, in this order

Tasks 1–5 are required. Task 6 can wait if you're short on time; say if you skipped it.

1. **Service and types.** Add `safetyReportOptions()`, `mySafetyReports(page)`, `mySafetyReport(id)`, `submitSafetyReport(payload)` and `addSafetyReportDetails(id, payload)` to `seekerService.ts`, mirroring `safetyReportService.js` with role `seeker`.
   - Write TypeScript types from `SafetyReportCatalog::formOptions()` and `SafetyReportService::reporterView()` (list items, and the detailed view with `attachments` and `updates`). Also type the 409 body (`message`, `existing_report: { id, case_number, status }`).
   - The upload is multipart:
     - Each file goes in as `attachments[]` with `{ uri, name, type }`.
     - `acknowledge` is sent as `'1'`.
     - Leave out empty optional fields.
   - Then delete the old `reportEmployer()` method and the `EmployerReportReason` type once nothing uses them.

2. **Report sheet.** Create `components/safety/ReportConcernSheet.tsx` (a `BottomSheet`), rebuilt from `ReportConcernDialog.jsx`, and delete `components/ReportEmployerModal.tsx`.
   - **Props:** `visible`, `onClose`, and `target: { subjectId, subjectName, postId?, postTitle?, applicationId? }`.
   - **Same four states as the website:** `form` → `confirm` → `done`, plus `duplicate` for a 409.
   - **"You are reporting" box on every step:** it shows the employer name and, when present, the vacancy title, so nobody reports the wrong company by accident.
   - **Categories come from the options endpoint.** Do not hard-code them. Show each one as a selectable row with its label and hint (`accessibilityRole="radio"`, `accessibilityState={{ checked }}`).
   - **Description:** at least `limits.description_min` characters, with a counter, and the same factual-writing hint as the website.
   - **Incident date:** optional, and can't be in the future.
   - **Evidence:**
     - Offer two buttons, "Add photo" (image picker) and "Add PDF" (document picker).
     - Check type, size and count against `limits` before adding a file, showing the same messages as the website's `addFiles`.
     - List the chosen files with a remove button.
     - Show the privacy note ("Only PESO administrators can open these files. Don't upload more personal information than needed…").
   - **Confirm step:** a summary of what will be sent, the truthfulness checkbox with the false-report warning, Back, and "Submit report". If the checkbox is unticked, show "Please confirm that your report is truthful." and don't call the API.
   - **Success:** show the case number, the "You'll be notified…" text, and a "View my reports" button that opens task 4's screen with `case` set.
   - **409 (already reported):** show the API `message` and an "Add details to that case" button that opens the existing case.
   - **422:**
     - Put field errors under their fields (`category`, `description`, `incident_date`, `attachments`).
     - Show `subject_id` / `application_id` / `post_id` errors at the top, and go back to the form step.
     - Show any other error with `apiErrorMessage()`.
   - Clear the whole sheet (including any mutation error) every time it closes, so it never reopens with old text or an old error.

3. **Entry points.** Replace every use of the old modal, and add the missing one.
   - `app/(seeker)/employers/[id].tsx`: "Report this employer" with `subjectId` and `subjectName` only.
   - `app/(seeker)/jobs/[id].tsx`: label it "Report this vacancy", and pass `postId: job.post_id` and `postTitle: job.job_title` too. The backend links the seeker's application to that vacancy automatically.
   - `app/(seeker)/applications/[id].tsx`: **new.** Add a quiet "Report a concern" action at the bottom, passing the employer, the vacancy and `applicationId: application.apply_id`. Show it only when the application has an employer id.
   - Keep these links low-key (small text or outline buttons), as on the website. Reporting must never compete with Apply or the other main actions.

4. **My Safety Reports screen.** Create `app/(seeker)/safety-reports.tsx`, rebuilt from `MySafetyReportsPage.jsx`.
   - **Header and info box:** the same header and explanation box. The box tells seekers where to report from and that a PESO administrator reviews every report.
   - **List:** each case shows the company name, case number, category (plus vacancy title), filed date and a status `Badge`. Map the badge colour from the status the same way as `safetyStatusBadge`, using the app's own badge variants. Include pull-to-refresh and pagination ("Load more" is fine), and use the same empty state as the website.
   - **Case detail:** tapping a case opens a bottom sheet with:
     - the status and `outcome_message`
     - the reason, the vacancy, the incident date and the seeker's own description
     - the names of the files they sent
     - "Information you added"
   - **Adding information:** while the case is open, an "Add new information" box lets the seeker add text (10+ characters) and/or files (photos and PDFs, within the case's file limit). After saving, show the API `message` as a toast and update the sheet.
   - **`case` route param:** support it (e.g. `?case=12`). Open that case's sheet, then clear the param, the same way `reviews.tsx` handles `review`.
   - **Registration:** register the screen in `app/(seeker)/_layout.tsx` with `href: null`. Add a "Safety Reports" card on the Profile screen next to the existing "Open My Reviews" card, with one line of explanation and an "Open My Safety Reports" button.

5. **Notification taps.** In `app/(seeker)/notifications.tsx` (`handleNotificationPress`) and `routeForPushData` in `services/pushNotifications.ts`, add these next to the review branches, **before** the `application_id` branch:
   - `safety_report_update` opens the safety reports screen with `case` = `data.report_id` (and `from: 'notifications'`).
   - `safety_action_notice` is a notice from PESO about the seeker's own account. It has no screen of its own, so the tap only marks it read and stays on Notifications. Make sure it doesn't fall through to another branch.
   - Add both types to the push data type.

6. **Restriction and suspension messages.** PESO can now restrict or suspend a seeker after reviewing a report about them. The API already sends readable messages; make sure the app shows them.
   - **Applying while restricted:** `POST /seeker/jobs/{id}/apply` returns **403** with `account_restricted: true` and a `message`. Check that `jobs/[id].tsx` shows that `message`, not a generic error, and that it doesn't show the apply success state.
   - **Signing in while suspended:** `POST /auth/login` returns **403** with `account_suspended: true` and a `message`. In `app/(auth)/login.tsx`, make sure this shows the `message` (it explains the suspension and how to contact PESO). It must not go to verify-email or show "check your credentials".

## Rules

- **Don't decide in the app what can be reported.** The backend links the vacancy and application, refuses another person's application, blocks a second open report about the same employer (409), and enforces 5 reports a day (422). Send what the screen knows and show what the API answers.
- **Confidentiality:**
  - The seeker only ever sees the reporter view the API returns. Never show or invent PESO's notes, findings or the action taken.
  - The `outcome_message` is the only outcome text.
  - Don't log report descriptions or file names to the console.
- **Use the API's wording** for categories, hints, statuses and messages. Don't keep a second copy of the category list in the app; that drift is what the new options endpoint replaced.
- **Errors:** show the API's `message` (toast after saving, inline inside sheets). Show 422 field errors under their fields.
- **Theme:** use the existing tokens only. No new colors, and no amber buttons.
- **New screens:** typed routes need regenerating before `tsc` passes. Run `npx expo start` for about 10 seconds, stop it, then type-check. Don't cast around it.

## Done when

- [ ] `npx tsc --noEmit` passes, `npm run lint` passes, and `npx expo export --platform android` bundles.
- [ ] Against the API, with a test seeker account:
  - [ ] Reporting from a **job** screen creates a case that shows the vacancy title in My Safety Reports. If the seeker applied to that job, PESO's case page (website, Reports & Safety) shows the linked application.
  - [ ] Reporting from an **application** works, and so does reporting from the **company profile**.
  - [ ] A photo and a PDF upload and appear under Evidence on PESO's case page.
  - [ ] Reporting the same employer again shows the "already reported" state, and "Add details to that case" opens it. Adding details there shows up on PESO's case page.
  - [ ] Leaving the truthfulness box unticked blocks sending. A description under 30 characters shows the field error.
  - [ ] When PESO moves the case to Under Review and then Resolved, the seeker gets both notifications, and tapping each opens the right case.
  - [ ] After PESO restricts the account, Apply shows PESO's message. After PESO suspends it, signing in shows the suspension message.
- [ ] Screen readers announce the category rows as radio buttons and the checkbox state correctly, and nothing animates when Reduce Motion is on.

When you finish, list the files you changed and deleted, whether you skipped task 6, and anything you couldn't verify.
