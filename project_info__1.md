# i-PESO Capstone System — Codebase Overview

## Summary
i-PESO is a government capstone project that digitizes the **DOLE NSRP Form 1** (National Skills Registration Program). It is a full-stack Laravel 11 + React (Vite) application with a mobile Expo (React Native) companion. The system supports three user roles: **Job Seekers** (register, complete a multi-step onboarding wizard mirroring the paper NSRP form, apply to jobs/programs), **Employers** (post vacancies, manage applications), and **Administrators** (verify seekers, manage government programs, job fairs, reports, and export NSRP PDFs). The current focus is expanding the onboarding wizard to cover **Page 2** of the physical NSRP form: Educational Background, Trainings, Eligibilities/Licenses, Work Experience, and Other Skills — structured as normalized one-to-many relationships.

## Architecture
- **Primary Pattern**: Layered MVC on the backend, component-based SPA with Zustand state management on the frontend. The onboarding wizard uses a step-by-step API pattern (POST `/api/seeker/step-N`) where each step writes to the `job_seekers` table and associated pivot tables.
- **Backend**: Laravel 11 (PHP) with Sanctum token authentication. The `seeker_id` primary key is manually assigned using an Observer (gap-filling sequential integer assignment), **not** auto-increment. MySQL/MariaDB is the production database. Pivot/child tables use standard auto-increment `id` columns with `seeker_id` as a foreign key constrained to `job_seekers.seeker_id`.
- **Frontend**: React (Vite) with Tailwind CSS. The `SeekerOnboarding.jsx` component is a single-file multi-step wizard (Steps 1–4 currently). Zustand (`useAuthStore`) holds the authenticated user and provides an `updateUser` method to merge step responses back into local state after each save.
- **Mobile**: Expo (React Native/TypeScript) with shared API service pattern — currently in early development.
- **Key architectural decisions**:
  - The `seeker_id` is **not auto-increment**. An Observer (`JobSeekerObserver::creating`) locks the table, finds gaps, and assigns the smallest available positive integer. This was implemented to support predictable sequential IDs and gap-filling for deleted records. The migration `2026_05_31_000002` explicitly removes AUTO_INCREMENT via raw SQL.
  - The onboarding uses **delete + re-insert** for all dynamic pivot data (disabilities, occupations, languages). This simplifies editing — no need to track individual row IDs on the frontend.
  - `form_validation_state` (JSON column on `job_seekers`) tracks which steps are completed. `profile_completed` is set to `true` only on the final step (Step 4 currently, will become Step 7 or 8 after expansion).
  - All step endpoints are guarded by `auth:sanctum` middleware. The `getSeeker()` private helper checks that the authenticated user `instanceof JobSeeker` and returns 403 otherwise.

## Directory Structure
```
i-peso-capstone-system/
├── i-peso-backend/
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   │   ├── SeekerController.php         — Step-by-step onboarding endpoints (steps 1-4)
│   │   │   ├── AuthController.php           — Register, login, OTP, password reset
│   │   │   └── Admin/                       — Admin CRM, programs, job fairs, reports
│   │   ├── Models/
│   │   │   ├── JobSeeker.php                — Central seeker model with hasMany relationships
│   │   │   ├── SeekerDisability.php         — Pivot: disability types
│   │   │   ├── SeekerOccupation.php         — Pivot: 3 preferred occupations
│   │   │   ├── SeekerLanguage.php           — Pivot: language × proficiency matrix
│   │   │   ├── SeekerWorkLocation.php       — Pivot: preferred work locations
│   │   │   ├── Employer.php, Administrator.php
│   │   ├── Observers/
│   │   │   └── JobSeekerObserver.php        — Gap-filling seeker_id assignment on create
│   │   └── Mail/OtpMail.php
│   ├── database/migrations/
│   │   ├── 2024_01_01_000003_create_job_seekers_table.php    — Base table (original)
│   │   ├── 2026_05_30_100000_create_comprehensive_seeker_profile.php — Adds columns for steps 1-3
│   │   ├── 2026_05_30_100001_create_seeker_pivot_tables.php  — Disabilities, occupations, languages, work locations
│   │   ├── 2026_05_31_000002_make_seeker_id_non_auto_increment.php — Removes AUTO_INCREMENT
│   │   └── 2026_06_03_100000_add_is_verified_to_job_seekers_table.php — Admin verification columns
│   ├── routes/api.php                      — All API route definitions
│   └── config/database.php                 — MySQL default, supports sqlite/mariadb/pgsql
├── i-peso-frontend/
│   ├── src/
│   │   ├── pages/auth/onboarding/
│   │   │   └── SeekerOnboarding.jsx         — Main onboarding wizard (Steps 1-4, single file)
│   │   ├── services/
│   │   │   ├── authService.js               — All API calls including step saves
│   │   │   ├── api.js                       — Axios instance with Sanctum token interceptor
│   │   │   ├── psgcServices.js              — Philippine PSGC address API
│   │   │   └── geoService.js                — GPS/browser geolocation
│   │   ├── stores/
│   │   │   └── authStore.js                 — Zustand store: user, token, updateUser()
│   │   ├── constants/philippines.js
│   │   └── router/                          — Role-based routing
│   └── tailwind.config.js
└── i-peso-mobile/                           — Expo React Native (early stage)
```

## Key Abstractions

### JobSeeker (Model)
- **File**: `i-peso-backend/app/Models/JobSeeker.php`
- **Responsibility**: Central model for seeker identity, authentication (extends `Authenticatable`, uses `HasApiTokens`), and all NSRP Form 1 personal information. Contains ~50+ fillable fields spanning steps 1-4 of the current wizard.
- **Key Relationships**: `hasMany` for disabilities, occupations, languages, workLocations.
- **Casts**: `skills` (array), `preferred_locations_details` (array), `form_validation_state` (array), `is_ofw`/`is_former_ofw`/`is_4ps_beneficiary` (boolean), `date_of_birth`/`former_ofw_return_date`/`email_verified_at` (date/datetime), `password` (hashed).
- **Identity Pattern**: `seeker_id` is the non-auto-increment primary key (BIGINT UNSIGNED), manually assigned by the Observer.

### SeekerController
- **File**: `i-peso-backend/app/Http/Controllers/Api/SeekerController.php`
- **Responsibility**: Step-by-step onboarding API. Four public methods: `saveStep1` through `saveStep4`, plus `getProfile`.
- **Pattern**: Each `saveStepN` method validates input with `$request->validate()`, calls `$seeker->forceFill([...])->save()` for main columns, then `$seeker->relatedTable()->delete()` + re-insert loop for pivot data. Finally calls `markStepComplete()` and returns the `buildPayload()`.
- **`buildPayload()`**: Returns a minimal user object matching what `authStore.updateUser()` expects: `id`, `name`, `email`, `role`, `email_verified_at`, `profile_completed`, `first_name`, `last_name`, `mobile_number`, `form_validation_state`.
- **`getProfile()`**: Loads `disabilities`, `occupations`, `languages` relationships and returns all fields — used to pre-fill the wizard on return visits.

### JobSeekerObserver
- **File**: `i-peso-backend/app/Observers/JobSeekerObserver.php`
- **Responsibility**: On `creating` event, locks the `job_seekers` table, reads all existing `seeker_id` values in order, finds the smallest gap (starting from 1), and assigns it. If no gap exists, uses max+1. Done inside a DB transaction with row locking to prevent race conditions.

### authService (Frontend)
- **File**: `i-peso-frontend/src/services/authService.js`
- **Responsibility**: Wraps all authenticated API calls. Currently exports `saveStep1` through `saveStep4` (each posts to `/seeker/step-N`), plus `getSeekerProfile()` for pre-filling. Will need `saveStep5`, `saveStep6`, etc. added.

### useAuthStore (Zustand)
- **File**: `i-peso-frontend/src/stores/authStore.js`
- **Responsibility**: Client-side auth state. `updateUser(updatedUser)` merges partial user objects into the store — this is how step responses update the local user after each successful API save.
- **Token persistence**: Uses `localStorage.getItem('ipeso_token')` for session survival across page refreshes.

### SeekerOnboarding (React Component)
- **File**: `i-peso-frontend/src/pages/auth/onboarding/SeekerOnboarding.jsx`
- **Responsibility**: Multi-step wizard with step indicator, client-side validation, and step-by-step save. Each step is a separate sub-component (`Step1`, `Step2`, `Step3`, `Step4`). The main component holds `form` state, `errors` state, and a `saveCurrentStep()` function that calls the appropriate `authService.saveStepN()`, then advances the step.
- **Currently**: 4 steps defined in `STEPS` constant. Steps 1-4 map to NSRP Form sections I-IV. The user explicitly requested expansion to cover Page 2 sections (Educational Background, Trainings, Eligibilities, Work Experience, Other Skills).

## Data Flow (Current Onboarding)
1. User registers (email, password, first_name, last_name, mobile_number) → `AuthController@register` → OTP sent via email.
2. User verifies OTP → logged in → redirected to `/onboarding`.
3. `SeekerOnboarding` loads step 1. Form state is initialized from `user` object (pre-filled from registration) merged with any existing profile data from `getSeekerProfile()`.
4. User fills Step 1 (Personal Info + Address + Disability). Client validates, calls `authService.saveStep1(formData)`.
5. Backend `saveStep1`: validates → `forceFill` on `job_seekers` for name/dob/address/religion/etc. → `disabilities()->delete()` → re-insert checked disabilities → `markStepComplete('step1')` → returns updated user payload.
6. Frontend receives response → `updateUser(response.user)` → advances to Step 2.
7. Repeat for Steps 2 (Employment), 3 (Job Preferences), 4 (Languages).
8. Step 4 backend also sets `profile_completed = true` and `profile_completed_at = now()`.

## Non-Obvious Behaviors & Design Decisions

### Seeker ID is NOT auto-increment
This is the most surprising design choice. The `seeker_id` column on `job_seekers` was originally created as `$table->id('seeker_id')` (which adds AUTO_INCREMENT), but migration `2026_05_31_000002` runs raw SQL to **remove** the AUTO_INCREMENT attribute. A model Observer then manually assigns IDs by scanning for gaps. This means:
- **You cannot use `$table->foreignId('seeker_id')->constrained('job_seekers', 'seeker_id')` in new migrations without ensuring `seeker_id` is BIGINT UNSIGNED**.
- All pivot tables use `$table->foreignId('seeker_id')->constrained('job_seekers', 'seeker_id')` — this works because `foreignId` creates a `BIGINT UNSIGNED` column, which matches `seeker_id`.
- When creating new child tables (educations, trainings, etc.), use the same pattern: `$table->foreignId('seeker_id')->constrained('job_seekers', 'seeker_id')->onDelete('cascade')`.

### Delete + Re-insert pattern for pivot data
The controller **deletes all existing related rows** and re-inserts them on every step save. This avoids:
- Tracking individual row IDs from the frontend
- Complex diff logic for "which rows were added/removed/changed"
- Accidental duplication if a user edits and re-saves
This pattern must be followed for the new Page 2 tables (educations, trainings, eligibilities, work_experiences).

### form_validation_state tracking
The JSON column `form_validation_state` stores `{ "step1": true, "step2": true, ... }`. This allows the system to know which wizard steps are complete even if the user hasn't finished all steps. The `isProfileComplete()` method checks for `step1` through `step4` — this will need to be updated to include the new Page 2 steps.

### step key naming convention
Steps are identified by string keys: `'step1'`, `'step2'`, `'step3'`, `'step4'`. New steps should follow this convention: `'step5'`, `'step6'`, etc. The `markStepComplete()` helper sets `form_validation_state[stepKey] = true`.

### Profile completion gate
`profile_completed` is set to `true` ONLY in `saveStep4` (currently the last step). After expansion, the final step's save method should be the one that sets `profile_completed = true`. The `isProfileComplete()` method checks for all step keys — this must be updated.

### Pivot table naming convention
Existing pivot tables use the naming pattern `seeker_*` in plural snake_case: `seeker_disabilities`, `seeker_occupations`, `seeker_languages`, `seeker_work_locations`. New tables should follow: `seeker_educations`, `seeker_trainings`, `seeker_eligibilities`, `seeker_work_experiences`.

### Model pattern for child tables
All existing child models follow an identical pattern:
- Extends `Model` (not `Authenticatable`)
- Uses auto-increment `id` primary key (default)
- Has `$timestamps = true`
- Has `$fillable` array
- Has `seeker(): BelongsTo` relationship pointing to `JobSeeker::class, 'seeker_id', 'seeker_id'`

### Frontend step component pattern
Each `StepN` component receives `{ form, errors, onChange }` props. The `onChange` handler works with standard `e.target.name` and `e.target.value` from form inputs. Checkboxes and arrays require custom `onChange` wrappers. The `form` object is a flat state object — there's no nested state structure. Dynamic arrays (like for trainings or work experience) will need to use indexed keys (e.g., `trainings[0].course`, `trainings[1].course`) or be managed in local sub-state.

### `skills` column already exists
The base `job_seekers` table has a `json` column called `skills` (cast to `array`). This was originally intended for a simple comma-separated list. The new "Other Skills Acquired Without Certificate" (checkbox array) could either use this existing `skills` column or add a new `other_skills` column. Given that `skills` is already cast as array and is in `$fillable`, the simplest approach is to **add a new `other_skills` JSON column** for the checkbox array (Auto Mechanic, Beautician, etc.) to avoid confusion with the old `skills` field.

### Route pattern
All seeker step endpoints are grouped under `Route::prefix('seeker')` with `auth:sanctum` middleware. New endpoints should follow: `Route::post('/step-5', [SeekerController::class, 'saveStep5'])` etc.

### Frontend API service pattern
`authService.js` exports methods like `saveStep1(data)`. Each calls `apiClient.post('/seeker/step-N', data)`. New step methods should be added alongside existing ones.

### `other_skills` checkbox array mapping
Per the DOLE NSRP Form 1 Page 2, the "Other Skills Acquired Without Certificate" section lists: Auto Mechanic, Beautician, Carpentry Work, Computer Literate, Domestic Chores, Driver, Electrician, Embroidery, Gardening, Masonry, Painter/Artist, Painting Jobs, Photography, Plumbing, Sewing Dresses, Stenography, Tailoring, Others (with specify field). This maps cleanly to a JSON array column with a companion text field for "Others" specification.

## Module Reference

| File | Purpose |
|------|---------|
| `i-peso-backend/app/Models/JobSeeker.php` | Central seeker model: ~50 columns, hasMany relationships, cast definitions, auth |
| `i-peso-backend/app/Http/Controllers/Api/SeekerController.php` | 4 step-save endpoints + getProfile; uses delete+reinsert pattern for pivot data |
| `i-peso-backend/app/Observers/JobSeekerObserver.php` | Gap-filling manual seeker_id assignment on create |
| `i-peso-backend/app/Models/SeekerDisability.php` | Child model template: BelongsTo seeker, fillable array |
| `i-peso-backend/app/Models/SeekerOccupation.php` | Child model: seeker occupations with preference_order |
| `i-peso-backend/app/Models/SeekerLanguage.php` | Child model: language × 4 proficiency booleans |
| `i-peso-backend/app/Models/SeekerWorkLocation.php` | Child model: preferred work locations |
| `i-peso-backend/database/migrations/2024_01_01_000003_create_job_seekers_table.php` | Original base table (before expansion migrations) |
| `i-peso-backend/database/migrations/2026_05_30_100000_create_comprehensive_seeker_profile.php` | Migration adding Steps 1-3 columns to job_seekers |
| `i-peso-backend/database/migrations/2026_05_30_100001_create_seeker_pivot_tables.php` | Creates disabilities, occupations, languages, work_locations tables |
| `i-peso-backend/database/migrations/2026_05_31_000002_make_seeker_id_non_auto_increment.php` | Removes AUTO_INCREMENT from seeker_id |
| `i-peso-backend/database/migrations/2026_06_03_100000_add_is_verified_to_job_seekers_table.php` | Adds admin verification columns |
| `i-peso-backend/routes/api.php` | All API route definitions; seeker step routes at `/api/seeker/step-N` |
| `i-peso-backend/config/database.php` | DB config; default mysql, supports sqlite testing |
| `i-peso-frontend/src/pages/auth/onboarding/SeekerOnboarding.jsx` | Single-file multi-step wizard component (1200+ lines) |
| `i-peso-frontend/src/services/authService.js` | API service: login, register, OTP, step saves, profile fetch |
| `i-peso-frontend/src/stores/authStore.js` | Zustand store: user state, updateUser, token persistence |
| `i-peso-frontend/src/services/psgcServices.js` | Philippine PSGC address hierarchy API (provinces, cities, barangays) |
| `i-peso-frontend/src/services/geoService.js` | Browser geolocation for GPS address detection |
| `i-peso-frontend/src/constants/philippines.js` | Philippine constant data |
| `i-peso-frontend/tailwind.config.js` | Tailwind CSS configuration |

## Implementation Blueprint for Page 2 Expansion

### New Database Tables Needed
1. **`seeker_educations`** — One row per education level. Columns: `id`, `seeker_id` (FK), `level` (enum: elementary, secondary_old, secondary_k12, senior_high_strand, tertiary, graduate_postgrad), `course_strand` (nullable string), `year_graduated` (year, nullable), `undergrad_level_reached` (nullable string), `undergrad_year_last_attended` (nullable year), `currently_in_school` is a boolean on the form but logically should be determined by whether `year_graduated` is filled — or could be a column on the main `job_seekers` table.
2. **`seeker_trainings`** — One row per training entry. Columns: `id`, `seeker_id` (FK), `course`, `hours_of_training`, `training_institution`, `skills_acquired`, `certificates_received`.
3. **`seeker_eligibilities`** — Covers both Civil Service eligibilities and PRC licenses. Columns: `id`, `seeker_id` (FK), `type` (enum: eligibility, license), `name` (eligibility_name or license_name), `date_taken` (nullable date, for eligibilities), `valid_until` (nullable date, for licenses).
4. **`seeker_work_experiences`** — One row per job. Columns: `id`, `seeker_id` (FK), `company_name`, `address`, `position`, `number_of_months` (unsigned integer), `status` (enum: permanent, contractual, part_time, probationary).
5. **New JSON column on `job_seekers`**: `other_skills` (JSON, cast to array) — stores the checkbox selections from "Other Skills Acquired Without Certificate". Optionally, a companion `other_skills_specify` text column for the "Others" free-text field.

### Migration numbering
The last migration is `2026_06_03_100000`. New migrations should use a later date prefix, e.g., `2026_06_05_100000_create_seeker_page2_tables.php`.

### Controller steps
New endpoints: `POST /api/seeker/step-5` (Education), `POST /api/seeker/step-6` (Trainings + Eligibilities), `POST /api/seeker/step-7` (Work Experience + Other Skills). Each follows the same pattern: validate → forceFill/delete+reinsert → markStepComplete → return buildPayload.

### Profile completion update
`isProfileComplete()` must be updated to check for `step5`, `step6`, `step7` in `form_validation_state`. `saveStep7` (or whichever is the final step) should set `profile_completed = true`.

### Frontend additions
New `Step5`, `Step6`, `Step7` components in `SeekerOnboarding.jsx`, each handling dynamic "Add Row / Remove Row" for the array-based sections. New `STEPS` entries in the step indicator. New `saveStep5`, `saveStep6`, `saveStep7` methods in `authService.js`.

## Suggested Reading Order
For a developer implementing the Page 2 expansion:

1. **`i-peso-backend/app/Http/Controllers/Api/SeekerController.php`** — Understand the step-save pattern (validate → delete → re-insert → markStepComplete → buildPayload). This is the template for all new step methods.
2. **`i-peso-backend/database/migrations/2026_05_30_100001_create_seeker_pivot_tables.php`** — Reference for table structure: foreignId references, unique constraints, cascade deletes. Copy this pattern for new tables.
3. **`i-peso-backend/app/Models/JobSeeker.php`** — See all existing columns, casts, relationships. You'll add new `hasMany` relationships and new JSON columns here.
4. **`i-peso-frontend/src/pages/auth/onboarding/SeekerOnboarding.jsx`** — Understand the component structure: `StepN` sub-components, `saveCurrentStep()` function, `form`/`errors` state, `STEPS` constant. New steps follow `Step3`/`Step4` patterns for dynamic arrays.
5. **`i-peso-frontend/src/services/authService.js`** — Add new `saveStep5+` methods matching the existing pattern.
6. **`i-peso-backend/routes/api.php`** — Add new step routes in the `seeker` prefix group.
