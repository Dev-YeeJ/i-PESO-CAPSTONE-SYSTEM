# QUICK REFERENCE: Admin Architecture Refactor

## 🎯 The 6 Categories (What Goes Where)

| Category | Folder | Key Pages | Backend Folder |
|----------|--------|-----------|-----------------|
| **1. OVERVIEW** | `1-overview/` | Dashboard | AdminDashboardController |
| **2. CONSTITUENT CRM** | `2-constituent-crm/` | Job Seekers, Employers | ConstituentCRM/ |
| **3. EMPLOYMENT HUB** | `3-employment-hub/` | Job Postings, Smart Matches | EmploymentHub/ |
| **4. GOVERNMENT & DOLE** | `4-government-dole/` | DOLE Reports, Gov Programs, Job Fairs | GovernmentDole/ |
| **5. SYSTEM & REPORTS** | `5-system-reports/` | Analytics, SMS, Activity Logs | SystemReports/ |
| **6. CONFIGURATION** | `6-configuration/` | Staff, Content, Settings | Configuration/ |

---

## 🔄 File Migration Summary

### Existing Files to Move

```
OLD LOCATION → NEW LOCATION
=========================================
admin/DashboardPage.jsx 
  → 1-overview/dashboard/DashboardPage.jsx

admin/seekers/VerificationQueuePage.jsx 
  → 2-constituent-crm/job-seekers/VerificationQueuePage.jsx

admin/seekers/SeekersListPage.jsx 
  → 2-constituent-crm/job-seekers/JobSeekersListPage.jsx (RENAME)

admin/seekers/SeekerDetailPage.jsx 
  → 2-constituent-crm/job-seekers/JobSeekerDetailPage.jsx (RENAME)

admin/employers/* 
  → 2-constituent-crm/employers/

admin/vacancies/VacanciesListPage.jsx 
  → 3-employment-hub/job-postings/JobPostingsListPage.jsx (RENAME)

admin/programs/* 
  → 4-government-dole/government-programs/

admin/job-fairs/* 
  → 4-government-dole/government-programs/

admin/reports/* 
  → 5-system-reports/labor-analytics/

admin/activity/* 
  → 5-system-reports/activity-logs/
```

### Shared Components (Move to `_components/`)

```
components/admin/PageHeader.jsx 
  → pages/admin/_components/PageHeader.jsx

components/admin/StatCard.jsx 
  → pages/admin/_components/StatCard.jsx

components/admin/StatusBadge.jsx 
  → pages/admin/_components/StatusBadge.jsx

components/admin/DataTable.jsx 
  → pages/admin/_components/DataTable.jsx

components/admin/ConfirmModal.jsx 
  → pages/admin/_components/ConfirmModal.jsx
```

---

## 🔧 Backend Controllers Reorganization

### Current (Flat)
```
app/Http/Controllers/Api/Admin/
  ├── AdminDashboardController.php
  ├── AdminSeekerController.php
  ├── AdminEmployerController.php
  ├── AdminProgramController.php
  ├── AdminJobFairController.php
  ├── AdminReportController.php
  └── AdminActivityController.php
```

### After (Organized by Category)
```
app/Http/Controllers/Api/Admin/
  ├── AdminDashboardController.php (unchanged)
  ├── ConstituentCRM/
  │   ├── SeekerController.php (from AdminSeekerController)
  │   └── EmployerController.php (from AdminEmployerController)
  ├── EmploymentHub/
  │   ├── JobPostingController.php (NEW)
  │   └── SmartMatchController.php (NEW)
  ├── GovernmentDole/
  │   ├── DOLEReportingController.php (NEW)
  │   ├── GovernmentProgramController.php (from AdminProgramController)
  │   └── JobFairController.php (from AdminJobFairController)
  ├── SystemReports/
  │   ├── LaborAnalyticsController.php (from AdminReportController)
  │   ├── SMSNotificationController.php (NEW)
  │   └── ActivityLogController.php (from AdminActivityController)
  └── Configuration/
      ├── StaffController.php (NEW)
      ├── RolePermissionController.php (NEW)
      ├── PortalContentController.php (NEW)
      └── SettingsController.php (NEW)
```

---

## 📋 Step-by-Step Execution Order

### Phase 1: Prep (No files changed)
1. Backup database
2. Create git branch `refactor/admin-architecture`
3. Search for all references to old paths

### Phase 2: Create Structure (Folder-only changes)
```bash
mkdir -p src/pages/admin/1-overview/dashboard
mkdir -p src/pages/admin/2-constituent-crm/{employers,job-seekers}
mkdir -p src/pages/admin/3-employment-hub/{job-postings,smart-matches}
mkdir -p src/pages/admin/4-government-dole/{dole-reporting,government-programs}
mkdir -p src/pages/admin/5-system-reports/{labor-analytics,sms-notifications,activity-logs}
mkdir -p src/pages/admin/6-configuration/{staff-management,portal-content,settings}
mkdir -p src/pages/admin/_components
```

### Phase 3: Move Files
- Move each file from old → new location per table above
- Update imports in each file for shared components
- Update imports for relative paths that changed

### Phase 4: Update Router
- Replace lazy imports at top of `router/index.jsx`
- Replace admin routes section with new structure

### Phase 5: Update Sidebar
- Update `navGroups` in `AdminLayout.jsx`

### Phase 6: Test Frontend
```bash
npm run dev       # Check for import errors
npm run build     # Check for build errors
npm test          # Run tests
```

### Phase 7: Reorganize Backend
- Create subdirectories in `app/Http/Controllers/Api/Admin/`
- Move and rename controllers
- Update namespace declarations in each controller file

### Phase 8: Update Routes
- Update `routes/api.php` with new controller namespaces

### Phase 9: Test Backend
```bash
php artisan config:cache
composer dump-autoload
php artisan test
```

### Phase 10: Full Integration Test
- Test admin login
- Test each major workflow (verification, program creation, etc.)

---

## ✅ Validation Checklist

### Frontend
- [ ] No import errors in console
- [ ] `npm run build` succeeds
- [ ] All sidebar links navigate correctly
- [ ] `/admin/dashboard` loads without errors
- [ ] Existing workflows still work (verify seeker, create program, etc.)
- [ ] Tests pass: `npm test`

### Backend
- [ ] No PHP errors: `php artisan config:cache`
- [ ] Autoloader rebuilt: `composer dump-autoload`
- [ ] Routes load correctly: `php artisan route:list | grep admin`
- [ ] Tests pass: `php artisan test`
- [ ] API calls work with Postman/Insomnia

### Integration
- [ ] Admin can login and access `/admin`
- [ ] All API endpoints return 200 (not 404)
- [ ] Database queries still work
- [ ] No broken relationships in migrations

---

## 🚨 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Cannot find module" errors | Import paths not updated | Search & replace import paths |
| 404 on routes | Router not updated | Verify `router/index.jsx` changes |
| Controllers not found | Namespace mismatch | Check `app/Http/Controllers/Api/Admin/` structure |
| API 404 errors | `routes/api.php` outdated | Verify controller references in routes |
| Sidebar broken | `AdminLayout.jsx` outdated | Update `navGroups` array |

---

## 📚 Files to Modify (Summary)

| File | Change Type | Priority |
|------|-------------|----------|
| `src/router/index.jsx` | Replace imports & routes | High |
| `src/layouts/AdminLayout.jsx` | Update navigation | High |
| All files being moved | Update imports | High |
| `src/services/adminService.js` | Verify API calls | Medium |
| `routes/api.php` | Update controller namespaces | High |
| Backend controllers | Move & rename | High |

---

## 🎁 Post-Refactor Benefits

1. **Maintainability**: Clear structure makes onboarding easier
2. **Scalability**: New features fit naturally into categories
3. **Team Ownership**: Each team can own one category
4. **API Clarity**: Backend mirrors frontend organization
5. **Debugging**: Errors are easier to locate by category

---

## 📞 Need Help?

If you get stuck during implementation:
1. Check the detailed blueprint in `ARCHITECTURE_REFACTOR_BLUEPRINT.md`
2. Review the Phase descriptions - each has detailed steps
3. Use git to see exactly what changed: `git diff`
4. Test individual components before running full build

