/**
 * UPDATED ADMIN ROUTES FOR NEW 6-CATEGORY ARCHITECTURE
 * 
 * Replace the admin routes section in src/router/index.jsx with this code.
 * This maintains all existing functionality but reorganizes imports and routes
 * to match the new folder structure.
 */

// ==================== LAZY IMPORTS ====================

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


// ==================== ADMIN ROUTES CONFIGURATION ====================

/**
 * Place this entire object inside your main router configuration under the
 * RequireVerified parent route, alongside employer routes.
 */
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


// ==================== USAGE NOTES ====================

/**
 * 1. Copy the lazy imports section and paste at the top of router/index.jsx
 *    (Replace the old admin imports)
 * 
 * 2. Replace the entire admin route block with the routes configuration above.
 *    This goes inside your createBrowserRouter configuration, typically within
 *    the RequireVerified parent and alongside other role-based routes.
 * 
 * 3. The S() wrapper is already defined in your router file:
 *    const S = (Component) => (
 *      <Suspense fallback={<PageLoader />}>
 *        <Component />
 *      </Suspense>
 *    )
 * 
 * 4. Categories 3-6 include NEW pages you'll need to create:
 *    - 3-employment-hub/smart-matches/*
 *    - 4-government-dole/dole-reporting/*
 *    - 5-system-reports/sms-notifications/*
 *    - 6-configuration/*
 *    
 *    For now, you can create placeholder components or skip those routes.
 * 
 * 5. All existing pages being renamed (e.g., SeekersListPage → JobSeekersListPage)
 *    should have their component files renamed, then this router will find them
 *    at the new paths.
 */
