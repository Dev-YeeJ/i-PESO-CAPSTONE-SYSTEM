# i-PESO Admin Portal - Enterprise Architecture Refactor Blueprint

**Date**: June 4, 2026  
**Status**: Pre-Implementation Planning  
**Architect Decision**: Approved for 6-category structure reorganization

---

## 📋 EXECUTIVE SUMMARY

You are transitioning from a **flat admin folder structure** (7 separate subdirectories) to a **6-category enterprise hierarchy** that groups related functionality by business domain. This improves:
- **Cognitive load**: Easier to find related features
- **Team ownership**: Clear domain boundaries for microteams
- **Scalability**: Adding new features fits naturally into existing categories
- **API consistency**: Backend controllers align with frontend organization

---

## PART 1: FRONTEND REFACTOR (`i-peso-frontend/src/pages/admin/`)

### Target Folder Structure (After Refactor)

```
src/pages/admin/
├── _components/              # ← SHARED admin UI library (NEW)
│   ├── PageHeader.jsx
│   ├── StatCard.jsx
│   ├── StatusBadge.jsx
│   ├── DataTable.jsx
│   ├── ConfirmModal.jsx
│   └── index.js              # barrel export
│
├── 1-overview/
│   ├── dashboard/
│   │   └── DashboardPage.jsx
│   └── _layout.jsx            # (optional) Overview section layout
│
├── 2-constituent-crm/
│   ├── employers/
│   │   ├── EmployersListPage.jsx
│   │   └── EmployerDetailPage.jsx
│   ├── job-seekers/
│   │   ├── VerificationQueuePage.jsx
│   │   ├── JobSeekersListPage.jsx    # (renamed from SeekersListPage)
│   │   └── JobSeekerDetailPage.jsx   # (renamed from SeekerDetailPage)
│   └── _layout.jsx            # (optional) CRM section layout
│
├── 3-employment-hub/
│   ├── job-postings/
│   │   ├── JobPostingsListPage.jsx   # (renamed from VacanciesListPage)
│   │   └── JobPostingDetailPage.jsx  # (NEW - detailed vacancy view)
│   ├── smart-matches/
│   │   ├── SmartMatchesPage.jsx      # (NEW - AI matching dashboard)
│   │   └── MatchResultsPage.jsx      # (NEW - results/notifications)
│   └── _layout.jsx            # (optional) Employment section layout
│
├── 4-government-dole/
│   ├── dole-reporting/
│   │   ├── DOLEReportingPage.jsx     # (NEW - SPRS generation)
│   │   └── PEISExportPage.jsx        # (NEW - PEIS data export)
│   ├── government-programs/
│   │   ├── GovernmentProgramsListPage.jsx    # (renamed from ProgramsListPage)
│   │   ├── GovernmentProgramFormPage.jsx     # (renamed from ProgramFormPage)
│   │   └── ProgramApplicantsPage.jsx
│   └── _layout.jsx            # (optional) Government section layout
│
├── 5-system-reports/
│   ├── labor-analytics/
│   │   ├── LaborAnalyticsPage.jsx    # (NEW - skills gaps, employment rate charts)
│   │   └── AnalyticsDetailPage.jsx   # (NEW - drill-down views)
│   ├── sms-notifications/
│   │   ├── SMSNotificationsPage.jsx  # (NEW - mass broadcasting dashboard)
│   │   └── SMSTemplatesPage.jsx      # (NEW - SMS template management)
│   ├── activity-logs/
│   │   ├── ActivityLogsPage.jsx      # (renamed from ActivityLogPage)
│   │   └── ActivityFilterPage.jsx    # (NEW - advanced filtering)
│   └── _layout.jsx            # (optional) System section layout
│
├── 6-configuration/
│   ├── staff-management/
│   │   ├── StaffListPage.jsx         # (NEW - RBAC for PESO admins)
│   │   ├── StaffFormPage.jsx         # (NEW - create/edit staff)
│   │   └── RolePermissionsPage.jsx   # (NEW - role matrix)
│   ├── portal-content/
│   │   ├── AnnouncementsPage.jsx     # (NEW - CMS announcements)
│   │   ├── AnnouncementFormPage.jsx  # (NEW - create/edit)
│   │   └── ContentModuleListPage.jsx # (NEW - manage homepage modules)
│   ├── settings/
│   │   ├── SystemSettingsPage.jsx    # (NEW - general settings)
│   │   ├── NotificationSettingsPage.jsx   # (NEW - notification preferences)
│   │   └── BrandingSettingsPage.jsx  # (NEW - logo, colors, etc)
│   └── _layout.jsx            # (optional) Configuration section layout
│
└── shared/                    # ← UTILITIES & HOOKS (if needed)
    ├── hooks.js
    └── formatters.js
```

### Migration Map: Old → New Paths

| Old Path | New Path | Status |
|----------|----------|--------|
| `pages/admin/DashboardPage.jsx` | `pages/admin/1-overview/dashboard/DashboardPage.jsx` | Move + Rename |
| `pages/admin/seekers/VerificationQueuePage.jsx` | `pages/admin/2-constituent-crm/job-seekers/VerificationQueuePage.jsx` | Move |
| `pages/admin/seekers/SeekersListPage.jsx` | `pages/admin/2-constituent-crm/job-seekers/JobSeekersListPage.jsx` | Move + Rename |
| `pages/admin/seekers/SeekerDetailPage.jsx` | `pages/admin/2-constituent-crm/job-seekers/JobSeekerDetailPage.jsx` | Move + Rename |
| `pages/admin/employers/EmployersListPage.jsx` | `pages/admin/2-constituent-crm/employers/EmployersListPage.jsx` | Move |
| `pages/admin/employers/EmployerDetailPage.jsx` | `pages/admin/2-constituent-crm/employers/EmployerDetailPage.jsx` | Move |
| `pages/admin/vacancies/VacanciesListPage.jsx` | `pages/admin/3-employment-hub/job-postings/JobPostingsListPage.jsx` | Move + Rename |
| `pages/admin/programs/ProgramsListPage.jsx` | `pages/admin/4-government-dole/government-programs/GovernmentProgramsListPage.jsx` | Move + Rename |
| `pages/admin/programs/ProgramFormPage.jsx` | `pages/admin/4-government-dole/government-programs/GovernmentProgramFormPage.jsx` | Move + Rename |
| `pages/admin/programs/ProgramApplicantsPage.jsx` | `pages/admin/4-government-dole/government-programs/ProgramApplicantsPage.jsx` | Move |
| `pages/admin/job-fairs/JobFairsListPage.jsx` | `pages/admin/4-government-dole/government-programs/JobFairsListPage.jsx` | Move |
| `pages/admin/job-fairs/JobFairFormPage.jsx` | `pages/admin/4-government-dole/government-programs/JobFairFormPage.jsx` | Move |
| `pages/admin/reports/ReportsPage.jsx` | `pages/admin/5-system-reports/labor-analytics/LaborAnalyticsPage.jsx` | Move + Rename |
| `pages/admin/reports/ReportDetailPage.jsx` | `pages/admin/5-system-reports/labor-analytics/AnalyticsDetailPage.jsx` | Move + Rename |
| `pages/admin/activity/ActivityLogPage.jsx` | `pages/admin/5-system-reports/activity-logs/ActivityLogsPage.jsx` | Move + Rename |
| `components/admin/*` | `pages/admin/_components/` | Move |

**NEW pages to create**: 
- All pages in 3-employment-hub/smart-matches/
- All pages in 4-government-dole/dole-reporting/
- All pages in 5-system-reports/sms-notifications/
- All pages in 6-configuration/staff-management/
- All pages in 6-configuration/portal-content/
- All pages in 6-configuration/settings/

---

## PART 2: ROUTER UPDATE (`i-peso-frontend/src/router/index.jsx`)

### New Lazy Imports (Replace old admin imports)

```javascript
// ========== CATEGORY 1: OVERVIEW ==========
const AdminDashboard = lazy(() => import('@/pages/admin/1-overview/dashboard/DashboardPage'))

// ========== CATEGORY 2: CONSTITUENT CRM ==========
const AdminVerificationQueue = lazy(() => import('@/pages/admin/2-constituent-crm/job-seekers/VerificationQueuePage'))
const AdminJobSeekersList = lazy(() => import('@/pages/admin/2-constituent-crm/job-seekers/JobSeekersListPage'))
const AdminJobSeekerDetail = lazy(() => import('@/pages/admin/2-constituent-crm/job-seekers/JobSeekerDetailPage'))
const AdminEmployersList = lazy(() => import('@/pages/admin/2-constituent-crm/employers/EmployersListPage'))
const AdminEmployerDetail = lazy(() => import('@/pages/admin/2-constituent-crm/employers/EmployerDetailPage'))

// ========== CATEGORY 3: EMPLOYMENT HUB ==========
const AdminJobPostingsList = lazy(() => import('@/pages/admin/3-employment-hub/job-postings/JobPostingsListPage'))
const AdminJobPostingDetail = lazy(() => import('@/pages/admin/3-employment-hub/job-postings/JobPostingDetailPage'))
const AdminSmartMatches = lazy(() => import('@/pages/admin/3-employment-hub/smart-matches/SmartMatchesPage'))
const AdminMatchResults = lazy(() => import('@/pages/admin/3-employment-hub/smart-matches/MatchResultsPage'))

// ========== CATEGORY 4: GOVERNMENT & DOLE ==========
const AdminDOLEReporting = lazy(() => import('@/pages/admin/4-government-dole/dole-reporting/DOLEReportingPage'))
const AdminPEISExport = lazy(() => import('@/pages/admin/4-government-dole/dole-reporting/PEISExportPage'))
const AdminGovernmentProgramsList = lazy(() => import('@/pages/admin/4-government-dole/government-programs/GovernmentProgramsListPage'))
const AdminGovernmentProgramForm = lazy(() => import('@/pages/admin/4-government-dole/government-programs/GovernmentProgramFormPage'))
const AdminProgramApplicants = lazy(() => import('@/pages/admin/4-government-dole/government-programs/ProgramApplicantsPage'))
const AdminJobFairsList = lazy(() => import('@/pages/admin/4-government-dole/government-programs/JobFairsListPage'))
const AdminJobFairForm = lazy(() => import('@/pages/admin/4-government-dole/government-programs/JobFairFormPage'))

// ========== CATEGORY 5: SYSTEM & REPORTS ==========
const AdminLaborAnalytics = lazy(() => import('@/pages/admin/5-system-reports/labor-analytics/LaborAnalyticsPage'))
const AdminAnalyticsDetail = lazy(() => import('@/pages/admin/5-system-reports/labor-analytics/AnalyticsDetailPage'))
const AdminSMSNotifications = lazy(() => import('@/pages/admin/5-system-reports/sms-notifications/SMSNotificationsPage'))
const AdminSMSTemplates = lazy(() => import('@/pages/admin/5-system-reports/sms-notifications/SMSTemplatesPage'))
const AdminActivityLogs = lazy(() => import('@/pages/admin/5-system-reports/activity-logs/ActivityLogsPage'))
const AdminActivityFilter = lazy(() => import('@/pages/admin/5-system-reports/activity-logs/ActivityFilterPage'))

// ========== CATEGORY 6: CONFIGURATION ==========
const AdminStaffList = lazy(() => import('@/pages/admin/6-configuration/staff-management/StaffListPage'))
const AdminStaffForm = lazy(() => import('@/pages/admin/6-configuration/staff-management/StaffFormPage'))
const AdminRolePermissions = lazy(() => import('@/pages/admin/6-configuration/staff-management/RolePermissionsPage'))
const AdminAnnouncements = lazy(() => import('@/pages/admin/6-configuration/portal-content/AnnouncementsPage'))
const AdminAnnouncementForm = lazy(() => import('@/pages/admin/6-configuration/portal-content/AnnouncementFormPage'))
const AdminContentModules = lazy(() => import('@/pages/admin/6-configuration/portal-content/ContentModuleListPage'))
const AdminSystemSettings = lazy(() => import('@/pages/admin/6-configuration/settings/SystemSettingsPage'))
const AdminNotificationSettings = lazy(() => import('@/pages/admin/6-configuration/settings/NotificationSettingsPage'))
const AdminBrandingSettings = lazy(() => import('@/pages/admin/6-configuration/settings/BrandingSettingsPage'))
```

### New Admin Routes (Replace old admin route block)

```javascript
{
  path: '/admin',
  element: <RequireRole role="administrator" />,
  children: [
    {
      element: <AdminLayout />,
      children: [
        { index: true, element: <Navigate to="dashboard" replace /> },
        
        // ========== CATEGORY 1: OVERVIEW ==========
        { path: 'dashboard', element: S(AdminDashboard) },
        
        // ========== CATEGORY 2: CONSTITUENT CRM ==========
        { path: 'verification-queue', element: S(AdminVerificationQueue) },
        { path: 'job-seekers', element: S(AdminJobSeekersList) },
        { path: 'job-seekers/:id', element: S(AdminJobSeekerDetail) },
        { path: 'employers', element: S(AdminEmployersList) },
        { path: 'employers/:id', element: S(AdminEmployerDetail) },
        
        // ========== CATEGORY 3: EMPLOYMENT HUB ==========
        { path: 'job-postings', element: S(AdminJobPostingsList) },
        { path: 'job-postings/:id', element: S(AdminJobPostingDetail) },
        { path: 'smart-matches', element: S(AdminSmartMatches) },
        { path: 'smart-matches/:id/results', element: S(AdminMatchResults) },
        
        // ========== CATEGORY 4: GOVERNMENT & DOLE ==========
        { path: 'dole-reporting', element: S(AdminDOLEReporting) },
        { path: 'dole-reporting/peis-export', element: S(AdminPEISExport) },
        { path: 'government-programs', element: S(AdminGovernmentProgramsList) },
        { path: 'government-programs/create', element: S(AdminGovernmentProgramForm) },
        { path: 'government-programs/:id/edit', element: S(AdminGovernmentProgramForm) },
        { path: 'government-programs/:id/applicants', element: S(AdminProgramApplicants) },
        { path: 'job-fairs', element: S(AdminJobFairsList) },
        { path: 'job-fairs/create', element: S(AdminJobFairForm) },
        { path: 'job-fairs/:id/edit', element: S(AdminJobFairForm) },
        
        // ========== CATEGORY 5: SYSTEM & REPORTS ==========
        { path: 'labor-analytics', element: S(AdminLaborAnalytics) },
        { path: 'labor-analytics/:id', element: S(AdminAnalyticsDetail) },
        { path: 'sms-notifications', element: S(AdminSMSNotifications) },
        { path: 'sms-notifications/templates', element: S(AdminSMSTemplates) },
        { path: 'activity-logs', element: S(AdminActivityLogs) },
        { path: 'activity-logs/filter', element: S(AdminActivityFilter) },
        
        // ========== CATEGORY 6: CONFIGURATION ==========
        { path: 'staff', element: S(AdminStaffList) },
        { path: 'staff/create', element: S(AdminStaffForm) },
        { path: 'staff/:id/edit', element: S(AdminStaffForm) },
        { path: 'staff/roles-permissions', element: S(AdminRolePermissions) },
        { path: 'announcements', element: S(AdminAnnouncements) },
        { path: 'announcements/create', element: S(AdminAnnouncementForm) },
        { path: 'announcements/:id/edit', element: S(AdminAnnouncementForm) },
        { path: 'content-modules', element: S(AdminContentModules) },
        { path: 'settings/system', element: S(AdminSystemSettings) },
        { path: 'settings/notifications', element: S(AdminNotificationSettings) },
        { path: 'settings/branding', element: S(AdminBrandingSettings) },
      ],
    }
  ],
}
```

---

## PART 3: BACKEND REFACTOR (`i-peso-backend/app/Http/Controllers/Api/Admin/`)

### Current Controllers (7)
- AdminDashboardController
- AdminSeekerController
- AdminEmployerController
- AdminProgramController
- AdminJobFairController
- AdminReportController
- AdminActivityController

### New/Renamed Controllers (Aligned with 6 Categories)

#### **CATEGORY 1: OVERVIEW**
| Controller | Methods | Routes |
|----------|---------|--------|
| `AdminDashboardController` | `stats()` | `GET /api/admin/dashboard/stats` |

#### **CATEGORY 2: CONSTITUENT CRM**
| Controller | Methods | Routes |
|----------|---------|--------|
| `Admin/ConstituentCRM/SeekerController` | `index()`, `show($id)`, `verify($id)`, `verificationQueue()` | `/api/admin/seekers` |
| `Admin/ConstituentCRM/EmployerController` | `index()`, `show($id)`, `suspend($id)`, `resume($id)` | `/api/admin/employers` |

#### **CATEGORY 3: EMPLOYMENT HUB**
| Controller | Methods | Routes |
|----------|---------|--------|
| `Admin/EmploymentHub/JobPostingController` | `index()`, `show($id)`, `approve($id)`, `reject($id)` | `/api/admin/job-postings` |
| `Admin/EmploymentHub/SmartMatchController` | `runMatching()`, `notifyCandidates($matchId)`, `getResults($matchId)` | `/api/admin/smart-matches` |

#### **CATEGORY 4: GOVERNMENT & DOLE**
| Controller | Methods | Routes |
|----------|---------|--------|
| `Admin/GovernmentDole/DOLEReportingController` | `generateSPRS()`, `exportPEIS()`, `downloadReport()` | `/api/admin/dole-reporting` |
| `Admin/GovernmentDole/GovernmentProgramController` | `index()`, `store()`, `show($id)`, `update($id)`, `destroy($id)`, `getApplicants($id)`, `bulkReview()` | `/api/admin/government-programs` |
| `Admin/GovernmentDole/JobFairController` | `index()`, `store()`, `show($id)`, `update($id)`, `destroy($id)` | `/api/admin/job-fairs` |

#### **CATEGORY 5: SYSTEM & REPORTS**
| Controller | Methods | Routes |
|----------|---------|--------|
| `Admin/SystemReports/LaborAnalyticsController` | `getSkillsGaps()`, `getEmploymentRate()`, `getCharts()`, `export()` | `/api/admin/labor-analytics` |
| `Admin/SystemReports/SMSNotificationController` | `broadcast()`, `getTemplates()`, `createTemplate()`, `bulkSend()` | `/api/admin/sms-notifications` |
| `Admin/SystemReports/ActivityLogController` | `index()`, `filter()`, `export()` | `/api/admin/activity-logs` |

#### **CATEGORY 6: CONFIGURATION**
| Controller | Methods | Routes |
|----------|---------|--------|
| `Admin/Configuration/StaffController` | `index()`, `store()`, `show($id)`, `update($id)`, `destroy($id)`, `updateRole()` | `/api/admin/staff` |
| `Admin/Configuration/RolePermissionController` | `index()`, `update($roleId)`, `getMatrix()` | `/api/admin/roles-permissions` |
| `Admin/Configuration/PortalContentController` | `announcements.*`, `modules.*` (CRUD for both) | `/api/admin/announcements`, `/api/admin/content-modules` |
| `Admin/Configuration/SettingsController` | `getSettings()`, `updateSystem()`, `updateNotifications()`, `updateBranding()` | `/api/admin/settings` |

### New Routes File Organization

**File**: `routes/api.php` - Admin Routes Section

```php
Route::prefix('admin')->middleware(['auth:sanctum', 'admin'])->group(function () {
    
    // Category 1: Overview
    Route::get('dashboard/stats', [AdminDashboardController::class, 'stats']);
    
    // Category 2: Constituent CRM
    Route::apiResource('seekers', 'Admin/ConstituentCRM/SeekerController');
    Route::post('seekers/{id}/verify', [SeekerController::class, 'verify']);
    Route::get('seekers/verification-queue', [SeekerController::class, 'verificationQueue']);
    
    Route::apiResource('employers', 'Admin/ConstituentCRM/EmployerController');
    Route::post('employers/{id}/suspend', [EmployerController::class, 'suspend']);
    Route::post('employers/{id}/resume', [EmployerController::class, 'resume']);
    
    // Category 3: Employment Hub
    Route::apiResource('job-postings', 'Admin/EmploymentHub/JobPostingController');
    Route::post('job-postings/{id}/approve', [JobPostingController::class, 'approve']);
    Route::post('job-postings/{id}/reject', [JobPostingController::class, 'reject']);
    
    Route::post('smart-matches/run', [SmartMatchController::class, 'runMatching']);
    Route::get('smart-matches/{id}/results', [SmartMatchController::class, 'getResults']);
    Route::post('smart-matches/{id}/notify', [SmartMatchController::class, 'notifyCandidates']);
    
    // Category 4: Government & DOLE
    Route::post('dole-reporting/sprs', [DOLEReportingController::class, 'generateSPRS']);
    Route::post('dole-reporting/peis', [DOLEReportingController::class, 'exportPEIS']);
    
    Route::apiResource('government-programs', 'Admin/GovernmentDole/GovernmentProgramController');
    Route::get('government-programs/{id}/applicants', [GovernmentProgramController::class, 'getApplicants']);
    Route::post('government-programs/{id}/applicants/bulk-review', [GovernmentProgramController::class, 'bulkReview']);
    
    Route::apiResource('job-fairs', 'Admin/GovernmentDole/JobFairController');
    
    // Category 5: System & Reports
    Route::get('labor-analytics/skills-gaps', [LaborAnalyticsController::class, 'getSkillsGaps']);
    Route::get('labor-analytics/employment-rate', [LaborAnalyticsController::class, 'getEmploymentRate']);
    Route::post('labor-analytics/export', [LaborAnalyticsController::class, 'export']);
    
    Route::post('sms-notifications/broadcast', [SMSNotificationController::class, 'broadcast']);
    Route::apiResource('sms-templates', 'Admin/SystemReports/SMSNotificationController@templateMethods');
    
    Route::get('activity-logs', [ActivityLogController::class, 'index']);
    Route::post('activity-logs/filter', [ActivityLogController::class, 'filter']);
    Route::post('activity-logs/export', [ActivityLogController::class, 'export']);
    
    // Category 6: Configuration
    Route::apiResource('staff', 'Admin/Configuration/StaffController');
    Route::post('staff/{id}/role', [StaffController::class, 'updateRole']);
    
    Route::get('roles-permissions', [RolePermissionController::class, 'getMatrix']);
    Route::put('roles-permissions/{roleId}', [RolePermissionController::class, 'update']);
    
    Route::apiResource('announcements', 'Admin/Configuration/PortalContentController@announcements');
    Route::apiResource('content-modules', 'Admin/Configuration/PortalContentController@modules');
    
    Route::get('settings', [SettingsController::class, 'getSettings']);
    Route::put('settings/system', [SettingsController::class, 'updateSystem']);
    Route::put('settings/notifications', [SettingsController::class, 'updateNotifications']);
    Route::put('settings/branding', [SettingsController::class, 'updateBranding']);
});
```

---

## PART 4: SIDEBAR NAVIGATION UPDATE

### Updated `AdminLayout.jsx` Navigation Structure

The current sidebar groups need to match the 6 categories:

```javascript
const navGroups = [
  {
    name: 'OVERVIEW',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: '🏠' },
    ]
  },
  {
    name: 'CONSTITUENT CRM',
    items: [
      { to: '/admin/verification-queue', label: 'Verification Queue', icon: '✓', badge: 'pending' },
      { to: '/admin/job-seekers', label: 'Job Seekers', icon: '👤' },
      { to: '/admin/employers', label: 'Employers', icon: '🏢' },
    ]
  },
  {
    name: 'EMPLOYMENT HUB',
    items: [
      { to: '/admin/job-postings', label: 'Job Postings', icon: '📋' },
      { to: '/admin/smart-matches', label: 'Smart Matches', icon: '🤖' },
    ]
  },
  {
    name: 'GOVERNMENT & DOLE',
    items: [
      { to: '/admin/dole-reporting', label: 'DOLE Reporting', icon: '📊' },
      { to: '/admin/government-programs', label: 'Gov Programs', icon: '🎯' },
      { to: '/admin/job-fairs', label: 'Job Fairs', icon: '🎪' },
    ]
  },
  {
    name: 'SYSTEM & REPORTS',
    items: [
      { to: '/admin/labor-analytics', label: 'Labor Analytics', icon: '📈' },
      { to: '/admin/sms-notifications', label: 'SMS Notifications', icon: '💬' },
      { to: '/admin/activity-logs', label: 'Activity Logs', icon: '📝' },
    ]
  },
  {
    name: 'CONFIGURATION',
    items: [
      { to: '/admin/staff', label: 'Staff Management', icon: '👥' },
      { to: '/admin/announcements', label: 'Portal Content', icon: '📢' },
      { to: '/admin/settings/system', label: 'Settings', icon: '⚙️' },
    ]
  },
]
```

---

## PART 5: ACTION PLAN CHECKLIST

### PHASE 1: PREPARATION (Before Any File Moves)
- [ ] **Backup Database** - Run full backup of MySQL
- [ ] **Create Feature Branch** - `git checkout -b refactor/admin-architecture`
- [ ] **Review All Existing Routes** - Document current API endpoints being called from frontend
- [ ] **Review All Import Statements** - Use grep to find all references to old admin paths:
  ```bash
  grep -r "pages/admin/seekers" src/
  grep -r "pages/admin/employers" src/
  grep -r "pages/admin/programs" src/
  grep -r "pages/admin/job-fairs" src/
  grep -r "pages/admin/reports" src/
  grep -r "pages/admin/activity" src/
  grep -r "pages/admin/vacancies" src/
  ```

### PHASE 2: FOLDER STRUCTURE CREATION (Frontend)
- [ ] **Create Main Category Folders**:
  ```bash
  mkdir -p src/pages/admin/1-overview/dashboard
  mkdir -p src/pages/admin/2-constituent-crm/{employers,job-seekers}
  mkdir -p src/pages/admin/3-employment-hub/{job-postings,smart-matches}
  mkdir -p src/pages/admin/4-government-dole/{dole-reporting,government-programs}
  mkdir -p src/pages/admin/5-system-reports/{labor-analytics,sms-notifications,activity-logs}
  mkdir -p src/pages/admin/6-configuration/{staff-management,portal-content,settings}
  mkdir -p src/pages/admin/_components
  mkdir -p src/pages/admin/shared
  ```

- [ ] **Move Shared Components**:
  - Move `src/components/admin/PageHeader.jsx` → `src/pages/admin/_components/PageHeader.jsx`
  - Move `src/components/admin/StatCard.jsx` → `src/pages/admin/_components/StatCard.jsx`
  - Move `src/components/admin/StatusBadge.jsx` → `src/pages/admin/_components/StatusBadge.jsx`
  - Move `src/components/admin/DataTable.jsx` → `src/pages/admin/_components/DataTable.jsx`
  - Move `src/components/admin/ConfirmModal.jsx` → `src/pages/admin/_components/ConfirmModal.jsx`
  - Create `src/pages/admin/_components/index.js` barrel export

### PHASE 3: MOVE EXISTING FILES (With Path Updates)
Move files and update their imports per the Migration Map above:

**STEP 3A: OVERVIEW**
- [ ] Move `DashboardPage.jsx` → `1-overview/dashboard/`
  - Update imports in the file for component paths
  - Update reference in `router/index.jsx`

**STEP 3B: CONSTITUENT CRM**
- [ ] Move `seekers/VerificationQueuePage.jsx` → `2-constituent-crm/job-seekers/`
  - Update imports for shared components
- [ ] Rename & move `seekers/SeekersListPage.jsx` → `2-constituent-crm/job-seekers/JobSeekersListPage.jsx`
  - Update imports
- [ ] Rename & move `seekers/SeekerDetailPage.jsx` → `2-constituent-crm/job-seekers/JobSeekerDetailPage.jsx`
  - Update imports
- [ ] Move `employers/EmployersListPage.jsx` → `2-constituent-crm/employers/`
  - Update imports
- [ ] Move `employers/EmployerDetailPage.jsx` → `2-constituent-crm/employers/`
  - Update imports
- [ ] Delete old directories: `rm -rf src/pages/admin/seekers src/pages/admin/employers`

**STEP 3C: EMPLOYMENT HUB**
- [ ] Rename & move `vacancies/VacanciesListPage.jsx` → `3-employment-hub/job-postings/JobPostingsListPage.jsx`
  - Update imports
  - Update API calls if needed (may stay same if backend unchanged)
- [ ] Delete old directory: `rm -rf src/pages/admin/vacancies`

**STEP 3D: GOVERNMENT & DOLE**
- [ ] Rename & move `programs/ProgramsListPage.jsx` → `4-government-dole/government-programs/GovernmentProgramsListPage.jsx`
  - Update imports
- [ ] Rename & move `programs/ProgramFormPage.jsx` → `4-government-dole/government-programs/GovernmentProgramFormPage.jsx`
  - Update imports
- [ ] Move `programs/ProgramApplicantsPage.jsx` → `4-government-dole/government-programs/`
  - Update imports
- [ ] Move `job-fairs/JobFairsListPage.jsx` → `4-government-dole/government-programs/`
  - Update imports
- [ ] Move `job-fairs/JobFairFormPage.jsx` → `4-government-dole/government-programs/`
  - Update imports
- [ ] Delete old directories: `rm -rf src/pages/admin/programs src/pages/admin/job-fairs`

**STEP 3E: SYSTEM & REPORTS**
- [ ] Rename & move `reports/ReportsPage.jsx` → `5-system-reports/labor-analytics/LaborAnalyticsPage.jsx`
  - Update imports
- [ ] Rename & move `reports/ReportDetailPage.jsx` → `5-system-reports/labor-analytics/AnalyticsDetailPage.jsx`
  - Update imports
- [ ] Rename & move `activity/ActivityLogPage.jsx` → `5-system-reports/activity-logs/ActivityLogsPage.jsx`
  - Update imports
- [ ] Delete old directories: `rm -rf src/pages/admin/reports src/pages/admin/activity`

**STEP 3F: CONFIGURATION (NEW pages - no migration needed yet)**
- [ ] Mark directories for future development

### PHASE 4: UPDATE ROUTER (`src/router/index.jsx`)
- [ ] Replace all old admin lazy imports with new ones (per Part 2 above)
- [ ] Replace entire admin routes block with new nested structure (per Part 2 above)
- [ ] Test router in browser - verify all routes load without 404s

### PHASE 5: UPDATE ADMIN LAYOUT SIDEBAR (`src/layouts/AdminLayout.jsx`)
- [ ] Update `navGroups` array to match 6 categories (per Part 4 above)
- [ ] Update route navigation links (`to` props) to match new paths
- [ ] Test sidebar navigation - click each link and verify it loads

### PHASE 6: UPDATE SERVICE LAYER (`src/services/adminService.js`)
- [ ] Review all API calls in adminService.js
- [ ] Verify API endpoints align with backend routes (may not need changes if backend not renamed)
- [ ] If backend routes renamed, update all API calls accordingly

### PHASE 7: BACKEND FOLDER STRUCTURE (`app/Http/Controllers/Api/Admin/`)
- [ ] Create new subdirectory structure:
  ```bash
  mkdir -p app/Http/Controllers/Api/Admin/{ConstituentCRM,EmploymentHub,GovernmentDole,SystemReports,Configuration}
  ```

- [ ] **Move & Rename Backend Controllers**:
  - [ ] Keep `AdminDashboardController.php` in `Admin/`
  - [ ] Move `AdminSeekerController.php` → `Admin/ConstituentCRM/SeekerController.php`
  - [ ] Move `AdminEmployerController.php` → `Admin/ConstituentCRM/EmployerController.php`
  - [ ] Create `Admin/EmploymentHub/JobPostingController.php` (from vacancies logic)
  - [ ] Create `Admin/EmploymentHub/SmartMatchController.php` (NEW)
  - [ ] Create `Admin/GovernmentDole/DOLEReportingController.php` (NEW)
  - [ ] Move `AdminProgramController.php` → `Admin/GovernmentDole/GovernmentProgramController.php`
  - [ ] Move `AdminJobFairController.php` → `Admin/GovernmentDole/JobFairController.php`
  - [ ] Move `AdminReportController.php` → `Admin/SystemReports/LaborAnalyticsController.php`
  - [ ] Create `Admin/SystemReports/SMSNotificationController.php` (NEW)
  - [ ] Move `AdminActivityController.php` → `Admin/SystemReports/ActivityLogController.php`
  - [ ] Create `Admin/Configuration/*` controllers (NEW)

- [ ] **Update Controller Namespace Declarations**:
  - [ ] Each controller: Update `namespace App\Http\Controllers\Api\Admin\ConstituentCRM;` etc.

- [ ] **Update Route Registrations** (`routes/api.php`):
  - [ ] Replace old admin routes block with new nested structure (per Part 3 above)
  - [ ] Verify controller class references use correct namespaces
  - [ ] Test: `php artisan route:list | grep admin`

### PHASE 8: TEST & VALIDATE
- [ ] **Frontend Tests**:
  - [ ] npm run build (should complete without errors)
  - [ ] Visit `/admin/dashboard` in browser - should load
  - [ ] Test each sidebar link - verify routing works
  - [ ] Test a full user flow (e.g., verify a seeker)
  - [ ] Check browser console for import errors
  - [ ] Run existing unit tests: `npm test`

- [ ] **Backend Tests**:
  - [ ] `php artisan config:cache`
  - [ ] `composer dump-autoload`
  - [ ] Test each admin endpoint with Postman/Insomnia
  - [ ] Run test suite: `php artisan test`
  - [ ] Check that middleware still works (auth:sanctum, admin role)

- [ ] **Integration Tests**:
  - [ ] Full admin login flow → dashboard
  - [ ] Test verification queue workflow
  - [ ] Test CRUD operations (create/edit/delete programs)
  - [ ] Test search/filter functionality

### PHASE 9: CLEANUP & OPTIMIZATION
- [ ] Delete old empty directories
- [ ] Remove old unused imports from components
- [ ] Delete old component files from `src/components/admin/` (already moved to `_components`)
- [ ] Update `.env` variables if any paths reference old structure
- [ ] Run linter: `npm run lint` (fix any issues)

### PHASE 10: COMMIT & MERGE
- [ ] Stage all changes: `git add .`
- [ ] Commit with descriptive message:
  ```bash
  git commit -m "refactor: reorganize admin architecture into 6 business categories

  - Frontend: Restructure pages into 6 category folders (overview, crm, employment, government, reports, configuration)
  - Backend: Reorganize controllers into domain-specific subdirectories
  - Routing: Update all imports and route definitions
  - Navigation: Align sidebar with new structure
  - Docs: Add architecture blueprint for future reference"
  ```
- [ ] Push to remote: `git push origin refactor/admin-architecture`
- [ ] Create Pull Request with checklist above as description
- [ ] Code review & merge after testing

---

## PART 6: KEY INTEGRATION POINTS

### Import Pattern (All New Pages)

Every admin page should now import components from the shared library:

```javascript
// OLD (relative imports scattered)
import PageHeader from '@/components/admin/PageHeader'
import StatCard from '@/components/admin/StatCard'

// NEW (centralized barrel export)
import { PageHeader, StatCard, DataTable, StatusBadge, ConfirmModal } from '@/pages/admin/_components'
```

### Service Layer Calls

Service calls remain the same, but organize by category in future:

```javascript
// Current: adminService.js
export const getJobSeekers = () => api.get('/admin/seekers')
export const getEmployers = () => api.get('/admin/employers')

// Future: Could split into separate service files per category
// src/services/admin/seekerService.js
// src/services/admin/employerService.js
```

### API Endpoint Consistency

All endpoints follow REST conventions:

```
GET    /api/admin/{resource}           - List
GET    /api/admin/{resource}/{id}      - Detail
POST   /api/admin/{resource}           - Create
PUT    /api/admin/{resource}/{id}      - Update
DELETE /api/admin/{resource}/{id}      - Delete
POST   /api/admin/{resource}/{id}/{action} - Custom action
```

---

## PART 7: ROLLBACK PLAN (If Needed)

If the refactor breaks something:

1. **Immediate Rollback**:
   ```bash
   git revert HEAD~1
   npm install
   npm run dev
   ```

2. **Partial Rollback** (if only one category broke):
   - Revert just that category's changes
   - Keep completed categories

3. **Database**: No schema changes made, so no migration rollback needed

---

## PART 8: FUTURE EXTENSIONS

This architecture makes it easy to add:

1. **New Categories**: Just create new folder under `src/pages/admin/`
2. **New Features**: Add page to appropriate category folder
3. **Shared Utilities**: Add to `src/pages/admin/shared/`
4. **Backend Organization**: New controllers fit naturally into existing subdirectories

---

## DELIVERABLES SUMMARY

| Item | Status | Owner |
|------|--------|-------|
| Frontend folder structure | Plan ✅ | Complete at Phase 2 |
| Router updates | Plan ✅ | Complete at Phase 4 |
| Backend controllers | Plan ✅ | Complete at Phase 7 |
| Tests passing | TBD | Complete at Phase 8 |
| Production deployment | TBD | After code review |

---

**Next Step**: Begin Phase 1 (Preparation) - Review existing routes and start git branch.

