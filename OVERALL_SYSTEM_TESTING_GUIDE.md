# Overall System Testing Guide

This guide is for testers who need to validate the i-PESO system end to end.

Focus on confirming that the system works as a DOLE-compliant employment platform for:

- Job seekers
- Employers
- PESO administrators
- Matching and job recommendations
- Registration and onboarding flows

## Testing Environment

Use the local web app:

```text
http://localhost:5173
```

Backend API should be running at:

```text
http://localhost:8000/api
```

Before testing, confirm the developer has already run:

```powershell
php artisan migrate
php artisan optimize:clear
php artisan skills:sync-taxonomy-links
```

## General Testing Rules

- Test using Chrome or Edge.
- Keep browser DevTools open when checking failed forms.
- Record the exact page, account role, action, expected result, and actual result.
- Screenshot any visual bug, validation bug, or broken flow.
- Do not test using real personal information.
- Use test names, test emails, and test phone numbers only.

## Test Roles

Test these user roles:

| Role | Main Purpose |
|---|---|
| Job Seeker | Register, complete NSRP profile, view job feed |
| Employer | Register, complete employer profile, create vacancies |
| Admin | Review employers, monitor job seekers, view system records |

## 1. Authentication Testing

### 1.1 Login Page

Steps:

1. Open `http://localhost:5173/login`.
2. Enter invalid credentials.
3. Submit the form.

Expected:

- Error message appears.
- User is not logged in.
- Page does not crash.

### 1.2 Valid Login

Steps:

1. Login using a valid test account.
2. Confirm redirect based on role.

Expected:

- Job seeker goes to `/seeker/dashboard`.
- Employer goes to `/employer/dashboard`.
- Admin goes to `/admin/dashboard`.

### 1.3 Logout

Steps:

1. Login.
2. Click Sign out.

Expected:

- User returns to login page.
- Protected pages cannot be opened without logging in again.

## 2. Job Seeker Registration Testing

### 2.1 Account Registration

Steps:

1. Go to `/register/seeker`.
2. Fill out the registration form.
3. Submit.

Expected:

- Required fields are validated.
- Invalid email format is rejected.
- Password rules are enforced.
- Successful registration proceeds to email verification or onboarding flow.

### 2.2 Email Verification Flow

Steps:

1. Register a job seeker.
2. Check the expected verification screen.

Expected:

- User cannot access protected profile features until verified if verification is required.
- Verification page matches the seeker journey.

## 3. Job Seeker NSRP Onboarding Testing

Go to:

```text
/seeker/onboarding
```

### 3.1 Step 1: Personal Information

Check:

- Name fields
- Date of birth
- Sex
- Civil status
- Religion
- Present address
- Disability information

Expected:

- Required fields show clear errors.
- Address selection works.
- Manual address completion works.
- Province, city, and barangay values are consistent.
- No broken layout on mobile width.

### 3.2 Step 2: Employment Status

Check:

- Employment status
- Employment type
- Self-employed fields
- Unemployment reason
- OFW fields
- 4Ps fields

Expected:

- Conditional fields appear only when needed.
- Hidden fields are not required.
- Dropdown/radio selections save correctly.

### 3.3 Step 3: Job Preference

Check:

- Preferred occupation
- Preferred type of work
- Preferred work location
- Local or overseas location selection

Expected:

- Preferred occupation uses PSOC search.
- User cannot save arbitrary free-text occupation as a matching anchor.
- Up to 3 occupations can be selected.
- Duplicate occupation selection is prevented.
- Location selections save correctly.

### 3.4 Step 4: Language

Check:

- Language proficiency options.
- Read, write, speak, and understand checkboxes.
- Other language field.

Expected:

- At least selected language capability saves.
- Other language requires a name when selected.

### 3.5 Step 5: Education and Skills

Check education:

- Currently in school
- Education level
- School name
- Course, strand, or program when required
- Education status
- Year started
- Year graduated
- Level reached
- Year last attended
- Current level

Expected:

- Education records are added as cards.
- Edit works.
- Remove asks for confirmation.
- Duplicate education records are blocked.
- Hidden fields are not required.
- Year graduated and year last attended are not earlier than year started.
- Year last attended is not in the future.

Check skills:

- Technical skills
- Soft skills
- Proficiency dropdown per selected skill

Expected:

- Skills come from taxonomy search.
- User cannot type and save typo-only skills.
- Proficiency values save as Beginner, Intermediate, or Expert.

### 3.6 Step 6: Trainings and Eligibilities

Check:

- Training course
- Training hours
- Training institution
- Skills acquired
- Certificate received
- Eligibility type
- Eligibility name
- Date taken
- Valid until

Expected:

- Required fields validate.
- Date taken cannot be in the future.
- Valid until cannot be earlier than date taken.
- Add, edit, and remove rows work.

### 3.7 Step 7: Work Experience

Check:

- Company name
- Company address
- Position / occupation
- Employment status
- Start date
- End date
- Currently employed checkbox

Expected:

- Position uses PSOC search.
- User cannot save arbitrary free-text occupation as matching anchor.
- Start date is required for added experience.
- End date is required unless currently employed is checked.
- End date cannot be earlier than start date.
- End date cannot be in the future.
- Months are calculated from exact dates.

### 3.8 Complete Onboarding

Expected:

- User is redirected to `/seeker/dashboard`.
- Profile is marked complete.
- Dashboard loads without crashing.

## 4. Job Seeker Home / News Feed Testing

Go to:

```text
/seeker/dashboard
```

Check:

- Header and search
- For You tab
- Nearby tab
- Saved tab
- Bulletin tab
- Job cards
- Match score
- Match breakdown
- Skill gap display
- Save job button
- Job detail modal
- PESO news cards
- Profile readiness card
- Next best actions
- Application activity panel

Expected:

- Feed loads even if nearby jobs API has no location data.
- Fallback feed appears when live nearby jobs are unavailable.
- Search filters jobs.
- Saved jobs remain after page refresh.
- Job detail modal opens and closes.
- Quick Apply shows the correct UI response.
- Page is mobile-friendly.

## 5. Employer Registration Testing

Go to:

```text
/register/employer
```

Check:

- Employer account registration.
- Required fields.
- Business identity fields.
- Authorized representative fields.
- Document upload fields.

Expected:

- Validation messages are clear.
- File upload restrictions work.
- Employer can finish registration.
- Employer is routed to the correct dashboard or verification status page.

## 6. Employer Dashboard Testing

Go to:

```text
/employer/dashboard
```

Expected:

- Dashboard loads.
- Employer status is shown.
- Navigation works.
- Unverified employers cannot access restricted job posting features if approval is required.

## 7. Employer Job Posting Testing

Go to:

```text
/employer/post-job
```

### 7.1 Step 1: Basic Information

Check:

- Job title
- Number of vacancies
- Nature of work
- Work arrangement

Expected:

- Required fields validate.
- Vacancy count must be at least 1.

### 7.2 Step 2: Algorithm Anchors

Check:

- Preferred occupation / PSOC
- Province
- City
- Barangay
- Map pin placeholder

Expected:

- Occupation uses PSOC combobox.
- User cannot save arbitrary occupation text.
- PSGC dropdowns are linked.
- City depends on province.
- Barangay depends on city.

### 7.3 Step 3: Candidate Qualifications

Check:

- Minimum educational attainment
- Required years of experience
- Required hard skills

Expected:

- Education uses rank-based dropdown.
- Required hard skills use taxonomy search.
- User cannot type and save typo-only skill tags.
- Experience accepts 0 or higher.

### 7.4 Step 4: Demographic Preferences

Check:

- Preferred gender
- Minimum age
- Maximum age
- Legal disclaimer

Expected:

- BFOQ warning appears.
- Age fields validate.
- Maximum age cannot be lower than minimum age.

### 7.5 Step 5: Compensation and Details

Check:

- Salary min
- Salary max
- Hide salary checkbox
- Job description
- Application deadline

Expected:

- Salary min and max validate.
- Hidden salary removes public salary display.
- Deadline cannot be before today.
- Job publishes successfully.

## 8. Employer ATS Board Testing

Go to:

```text
/employer/ats
```

Check:

- Applicant search
- Sort dropdown
- Kanban columns
- Applicant cards
- Drag and drop
- Profile modal
- Placement modal

Expected:

- Applicant cards hide age and gender by default.
- Full profile modal reveals demographic data only in expanded view.
- Moving to Interviewing shows notification toast.
- Moving to Hired opens placement capture modal.
- Moving to Rejected shows closure notification toast.
- Empty columns display empty state.

## 9. Admin Dashboard Testing

Go to:

```text
/admin/dashboard
```

Expected:

- Admin dashboard loads.
- Counts and recent activity render.
- Navigation to admin modules works.

## 10. Admin Employer Verification Testing

Go to:

```text
/admin/verification-queue
```

Check:

- Employer list
- Employer details
- Uploaded documents
- Approve action
- Reject action

Expected:

- Admin can view employer verification data.
- Status updates correctly.
- Employer access changes after approval.

## 11. Admin Job Seeker Records Testing

Go to:

```text
/admin/job-seekers
```

Check:

- Job seeker list
- Search and filters
- Job seeker detail page
- NSRP information
- Education records
- Skills
- Work experience
- Download/export if available

Expected:

- Admin can view read-only job seeker profile.
- Data matches what job seeker submitted.
- Page does not expose edit controls unless intended.

## 12. Matching Algorithm Testing

Create test data for these scenarios:

### 12.1 Perfect Match

Expected:

- High match score.
- Occupation, skills, education, and experience all score high.
- No missing critical skills.

### 12.2 Missing Skills

Expected:

- Skills score drops.
- Missing critical skills are shown.
- Total score is lower.

### 12.3 Wrong Occupation

Expected:

- Occupation score drops.
- Job still may appear if other factors are strong, but score should be lower.

### 12.4 Low Education

Expected:

- Education score drops if seeker education rank is below employer requirement.

### 12.5 Old Experience

Expected:

- Experience score is affected by recency time decay.
- Recent experience should score higher than old experience.

### 12.6 Location

Expected:

- Location affects nearby feed/filtering.
- Location should not double-count inside the base match score.

## 13. API Error Testing

Test what happens when:

- Backend is stopped.
- User token is expired.
- Nearby jobs API returns location required.
- PSOC API token is missing.
- Vertex AI is disabled.

Expected:

- Frontend shows clear fallback or error messages.
- App does not crash.
- User can still navigate.

## 14. Responsive UI Testing

Test these widths:

- Desktop: 1440px
- Laptop: 1024px
- Tablet: 768px
- Mobile: 390px

Expected:

- No overlapping text.
- Forms remain usable.
- Buttons remain visible.
- Tables or boards scroll horizontally when needed.
- Modals fit the viewport.

## 15. Accessibility and Usability Testing

Check:

- Inputs have visible labels.
- Required fields are clear.
- Keyboard tab order works.
- Dropdowns and comboboxes are usable.
- Error messages are readable.
- Buttons have clear names.
- Color contrast is acceptable.

## 16. Regression Checklist After Every Pull

Run this quick smoke test:

1. Login works.
2. Job seeker onboarding opens.
3. PSOC occupation search works.
4. Skill taxonomy search works.
5. Work experience date fields work.
6. Job seeker dashboard opens.
7. Employer job posting opens.
8. Employer can publish a job.
9. Admin dashboard opens.
10. Frontend page refresh does not log user out unexpectedly.

## Bug Report Template

Use this format when reporting bugs:

```text
Bug Title:

Role:
Job Seeker / Employer / Admin

Page:

Steps to Reproduce:
1.
2.
3.

Expected Result:

Actual Result:

Screenshot / Video:

Browser:

Device / Screen Size:

Severity:
Low / Medium / High / Critical
```

## Severity Guide

| Severity | Meaning |
|---|---|
| Critical | Login, registration, save, or publish is blocked |
| High | Important feature broken but workaround exists |
| Medium | Feature works but has incorrect validation or UI issue |
| Low | Cosmetic issue, typo, spacing, minor layout issue |

## Final Acceptance Criteria

The system is ready for demo testing when:

- Job seeker can register and complete onboarding.
- Employer can register and create a job post.
- Admin can view seekers and employers.
- Matching-critical fields use PSOC, PSGC, taxonomy skills, education ranks, and exact experience dates.
- Job seeker home feed loads.
- Employer ATS board works.
- No critical errors appear in browser console during main flows.
- Mobile and desktop layouts are usable.
