# i-PESO Admin Module Consolidation

**Last Updated:** June 4, 2026  
**Status:** Admin module fully consolidated into i-peso-frontend ✅

---

## 📋 Summary

The i-PESO system now has a **unified admin experience** with:
- **All admin frontend** integrated into `i-peso-frontend`
- **All admin backend** in `i-peso-backend`
- **Separate i-peso-admin app is deprecated** (kept for reference only)

---

## 🎯 What Changed

### ❌ DEPRECATED: `i-peso-admin` (Standalone App)
- ~~Separate React app on port 5174~~
- ~~Mock authentication (not calling backend)~~
- ~~Hardcoded login (ignores credentials)~~
- **DO NOT USE** - This app has no real authentication

### ✅ ACTIVE: `i-peso-frontend` Admin Module
- Integrated into main app (port 5173)
- **Real Sanctum token authentication**
- Complete admin dashboard, user management, programs, reports
- Proper API integration with backend

---

## 🚀 How to Use Admin Portal

### 1. Start the Backend
```bash
cd i-peso-backend
php artisan serve
```
Backend runs on: `http://localhost:8000/api`

### 2. Start the Frontend
```bash
cd i-peso-frontend
npm run dev
```
Frontend runs on: `http://localhost:5173`

### 3. Login as Admin
- **URL:** `http://localhost:5173/login`
- **Email:** `admin@ejemplo.com`
- **Password:** `password123`
- **You will be redirected to:** `/admin/dashboard`

---

## 📱 Admin Routes (All in i-peso-frontend)

### Location: `src/router/index.jsx`

```
/login                           → Login page (all roles)
/admin/dashboard                 → Main dashboard with KPIs
/admin/verification-queue        → Review pending seeker profiles
/admin/seekers                   → List all job seekers
/admin/seekers/:id               → Seeker profile detail
/admin/employers                 → List all employers
/admin/employers/:id             → Employer profile detail
/admin/vacancies                 → View all job vacancies
/admin/programs                  → Government programs list
/admin/programs/new              → Create new program
/admin/programs/:id/edit         → Edit program
/admin/programs/:id/applicants   → Manage program applicants
/admin/job-fairs                 → Job fairs list
/admin/job-fairs/new             → Create new job fair
/admin/job-fairs/:id/edit        → Edit job fair
/admin/reports                   → Generate/view reports
/admin/reports/:id               → Report details
/admin/activity-log              → System audit trail
```

---

## 📂 Admin Frontend Structure

```
i-peso-frontend/src/
├── pages/admin/
│   ├── DashboardPage.jsx
│   ├── seekers/
│   │   ├── SeekersListPage.jsx
│   │   ├── SeekerDetailPage.jsx
│   │   └── VerificationQueuePage.jsx
│   ├── employers/
│   │   ├── EmployersListPage.jsx
│   │   └── EmployerDetailPage.jsx
│   ├── vacancies/
│   │   └── VacanciesListPage.jsx
│   ├── programs/
│   │   ├── ProgramsListPage.jsx
│   │   ├── ProgramFormPage.jsx
│   │   └── ProgramApplicantsPage.jsx
│   ├── job-fairs/
│   │   ├── JobFairsListPage.jsx
│   │   └── JobFairFormPage.jsx
│   ├── reports/
│   │   ├── ReportsPage.jsx
│   │   └── ReportDetailPage.jsx
│   └── activity/
│       └── ActivityLogPage.jsx
├── components/admin/
│   ├── PageHeader.jsx
│   ├── StatCard.jsx
│   ├── StatusBadge.jsx
│   ├── DataTable.jsx
│   └── ConfirmModal.jsx
├── layouts/
│   └── AdminLayout.jsx
└── services/
    └── adminService.js
```

---

## 🔧 Admin Backend Structure

```
i-peso-backend/
├── app/Http/Controllers/Api/Admin/
│   ├── AdminDashboardController.php
│   ├── AdminSeekerController.php
│   ├── AdminEmployerController.php
│   ├── AdminProgramController.php
│   ├── AdminJobFairController.php
│   ├── AdminReportController.php
│   └── AdminActivityController.php
├── database/migrations/
│   └── 2026_06_03_100000_add_is_verified_to_job_seekers_table.php
├── database/seeders/
│   └── AdminSeeder.php
└── routes/
    └── api.php (includes /api/admin/* routes)
```

---

## 🔑 Admin Credentials

### Default Admin Account
Created by `database/seeders/AdminSeeder.php`:
- **Email:** `admin@ejemplo.com`
- **Password:** `password123`
- **Status:** Active
- **Email Verified:** Yes

### To Create Additional Admin Users
```bash
php artisan tinker
```
```php
DB::table('administrators')->insert([
    'first_name' => 'John',
    'last_name' => 'Doe',
    'email' => 'john@ejemplo.com',
    'password' => Hash::make('password123'),
    'mobile_number' => '09876543210',
    'status' => 'active',
    'email_verified_at' => now(),
]);
```

---

## 🔐 Authentication Flow

1. Admin enters credentials at `/login`
2. Frontend calls `POST /api/auth/login`
3. Backend's `AuthController.login()`:
   - Searches all three user tables (JobSeeker, Employer, Administrator)
   - Validates password with Hash::check()
   - Creates Sanctum token if valid
   - Returns `{ user, token }`
4. Frontend stores token in localStorage (`ipeso_token`)
5. Frontend stores auth state in Zustand store
6. Subsequent requests include token in `Authorization: Bearer` header
7. Backend validates token with `auth:sanctum` middleware

---

## ✅ Admin Features

### Dashboard
- 8 KPI cards (Seekers, Employers, Vacancies, Programs, etc.)
- Recent activity feed
- System overview

### Seeker Management
- List with search/filters
- View complete NSRP profile
- Verify profiles (approve/reject with remarks)
- Pending verification queue

### Employer Management
- List all employers
- View employer details with vacancies
- Track employer activity

### Program Management
- Create government programs
- Edit existing programs
- Review applicants
- Bulk approve/reject applicants

### Job Fair Management
- Schedule job fairs
- Track job fair details
- Manage job fair events

### Reports & Analytics
- Generate reports (placement, registration, vacancies, programs)
- View report history
- Export report data

### Activity Logging
- Audit trail of all admin actions
- Filter by action type and date
- System transparency

---

## 🚫 Why i-peso-admin is Deprecated

### Problems with Standalone App:
1. **Mock Authentication** - Hardcoded login, doesn't validate credentials
2. **No Backend Integration** - Uses fake tokens that don't work with API
3. **Duplicate Code** - Same pages exist in i-peso-frontend
4. **Maintenance Burden** - Two codebases to maintain
5. **No Real Data** - Can't perform actual admin operations

### What to Do Instead:
✅ Use `i-peso-frontend` for all admin work  
✅ Remove i-peso-admin dependency from your deployment  
✅ All admin operations use real authentication  

---

## 📋 Deployment Checklist

- [ ] Run backend migrations: `php artisan migrate`
- [ ] Run admin seeder: `php artisan db:seed --class=AdminSeeder`
- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173
- [ ] Login as admin@ejemplo.com / password123
- [ ] Verify /admin/dashboard loads
- [ ] Test seeker verification workflow
- [ ] Test program creation workflow
- [ ] Remove i-peso-admin from deployment
- [ ] Update deployment docs

---

## 🆘 Troubleshooting

### "Login failed. Check your credentials."
**Cause:** Admin user not in database or wrong password  
**Fix:** Run seeder: `php artisan db:seed --class=AdminSeeder`

### "Unauthorized" on /admin pages
**Cause:** Token not being sent or invalid  
**Fix:** Check browser console, verify token in localStorage

### "Cannot find admin routes"
**Cause:** Backend routes not registered  
**Fix:** Verify `routes/api.php` has Admin controller routes

### "Page won't load"
**Cause:** Frontend not running or API unreachable  
**Fix:** Check both servers are running and CORS configured

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `i-peso-frontend/src/router/index.jsx` | Admin routes configuration |
| `i-peso-frontend/src/layouts/AdminLayout.jsx` | Admin sidebar layout |
| `i-peso-frontend/src/services/adminService.js` | Admin API client |
| `i-peso-backend/app/Http/Controllers/Api/Admin/*` | Admin business logic |
| `i-peso-backend/database/seeders/AdminSeeder.php` | Default admin account |
| `i-peso-backend/routes/api.php` | Backend API routes |

---

**For questions or issues, refer to:** `/memories/repo/admin-module-implementation.md`
