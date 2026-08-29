import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import {
  PageLoader,
  RequireAuth,
  RequireVerified,
  RequireProfileComplete,
  RequireApprovedEmployer,
  RequireRole,
  GuestOnly,
} from './guards'

import GuestLayout    from '@/layouts/GuestLayout'
import EmployerLayout from '@/layouts/EmployerLayout'
import SeekerLayout   from '@/layouts/SeekerLayout'
import AdminLayout    from '@/layouts/AdminLayout'
import App            from '@/App'

// --- LAZY LOADED PAGES ---
const LandingPage        = lazy(() => import('@/pages/landing/LandingPage'))
const PrivacyPolicyPage  = lazy(() => import('@/pages/legal/PrivacyPolicyPage'))
const TermsOfServicePage = lazy(() => import('@/pages/legal/TermsOfServicePage'))
const LoginPage          = lazy(() => import('@/pages/auth/LoginPage'))
const AdminLoginPage     = lazy(() => import('@/pages/auth/AdminLoginPage'))
const VerifyEmailPage    = lazy(() => import('@/pages/auth/VerifyEmailPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage  = lazy(() => import('@/pages/auth/ResetPasswordPage'))

// Split Registration Pages
const RegisterGateway      = lazy(() => import('@/pages/auth/register/RegisterGateway'))
const SeekerRegistration   = lazy(() => import('@/pages/auth/register/SeekerRegistration'))
const EmployerRegistration = lazy(() => import('@/pages/auth/register/EmployerRegistration'))
const EmployerOnboarding   = lazy(() => import('@/pages/employer/EmployerRegistration'))

// Dashboards
const EmployerDashboard = lazy(() => import('@/pages/employer/DashboardPage'))
const EmployerPostJob   = lazy(() => import('@/pages/employer/PostJobPage'))
const EmployerVacancies = lazy(() => import('@/pages/employer/VacanciesPage'))
const EmployerATSGrid   = lazy(() => import('@/pages/employer/EmployerATSGrid'))
const VacancyATSPage    = lazy(() => import('@/pages/employer/VacancyATSPage'))
const EmployerCalendar  = lazy(() => import('@/pages/employer/InterviewCalendarPage'))
const EmployerJobFairs  = lazy(() => import('@/pages/employer/EmployerJobFairDashboard'))
const EmployerEstablishmentReport = lazy(() => import('@/pages/employer/EmployerEstablishmentReportPage'))
const EmployerPlacementReport = lazy(() => import('@/pages/employer/EmployerPlacementReportPage'))
const SeekerDashboard   = lazy(() => import('@/pages/seeker/DashboardPage'))
const SeekerProfile     = lazy(() => import('@/pages/seeker/SeekerProfile'))
const SeekerProfileEdit = lazy(() => import('@/pages/seeker/SeekerProfileEdit'))
const SeekerEmployerProfile = lazy(() => import('@/pages/seeker/EmployerProfile'))
const SeekerJobMap      = lazy(() => import('@/pages/seeker/JobMapPage'))
const SeekerJobFairs    = lazy(() => import('@/pages/seeker/JobFairFeed'))
const SeekerGovernmentPrograms = lazy(() => import('@/pages/seeker/GovernmentProgramsPage'))
const SeekerProgramDetails = lazy(() => import('@/pages/seeker/ProgramDetailsPage'))
const SeekerApplications = lazy(() => import('@/pages/seeker/MyApplications'))
const SeekerOnboarding  = lazy(() => import('@/pages/auth/onboarding/SeekerOnboarding'))

// Admin Pages - CATEGORY 1: OVERVIEW
const AdminDashboard = lazy(() => import('@/pages/admin/1-overview/dashboard/DashboardPage'))

// Admin Pages - CATEGORY 2: CONSTITUENT CRM
const AdminVerificationQueue = lazy(() => import('@/pages/admin/2-constituent-crm/employers/VerificationQueuePage'))
const AdminJobSeekersList    = lazy(() => import('@/pages/admin/2-constituent-crm/job-seekers/JobSeekersListPage'))
const AdminJobSeekerDetail   = lazy(() => import('@/pages/admin/2-constituent-crm/job-seekers/JobSeekerDetailPage'))
const AdminEmployersList     = lazy(() => import('@/pages/admin/2-constituent-crm/employers/EmployersListPage'))
const AdminEmployerDetail    = lazy(() => import('@/pages/admin/2-constituent-crm/employers/EmployerDetailPage'))
const AdminEmployerReportsList = lazy(() => import('@/pages/admin/2-constituent-crm/employer-reports/EmployerReportsListPage'))
const AdminEmployerReportDetail = lazy(() => import('@/pages/admin/2-constituent-crm/employer-reports/EmployerReportDetailPage'))

// Admin Pages - CATEGORY 3: EMPLOYMENT HUB
const AdminJobPostingsList = lazy(() => import('@/pages/admin/3-employment-hub/job-postings/JobPostingsListPage'))
const AdminJobPostingDetail = lazy(() => import('@/pages/admin/3-employment-hub/job-postings/JobPostingDetailPage'))
const AdminSmartMatches = lazy(() => import('@/pages/admin/3-employment-hub/smart-matches/SmartMatchesPage'))
const AdminMatchResults = lazy(() => import('@/pages/admin/3-employment-hub/smart-matches/MatchResultsPage'))

// Admin Pages - CATEGORY 4: GOVERNMENT & DOLE
const AdminGovernmentProgramsList = lazy(() => import('@/pages/admin/4-government-dole/government-programs/GovernmentProgramsListPage'))
const AdminGovernmentProgramForm = lazy(() => import('@/pages/admin/4-government-dole/government-programs/GovernmentProgramFormPage'))
const AdminJobFairsList         = lazy(() => import('@/pages/admin/4-government-dole/government-programs/JobFairsListPage'))
const AdminJobFairForm          = lazy(() => import('@/pages/admin/4-government-dole/government-programs/JobFairFormPage'))
const AdminJobFairDetail        = lazy(() => import('@/pages/admin/4-government-dole/government-programs/JobFairDetailPage'))
const AdminEstablishmentReport  = lazy(() => import('@/pages/admin/4-government-dole/dole-reporting/AdminEstablishmentReportPage'))
const AdminPlacementReport      = lazy(() => import('@/pages/admin/4-government-dole/dole-reporting/AdminPlacementReportPage'))
const AdminDOLEReporting       = lazy(() => import('@/pages/admin/4-government-dole/dole-reporting/DOLEReportingPage'))
const AdminPEISExport          = lazy(() => import('@/pages/admin/4-government-dole/dole-reporting/PEISExportPage'))

// Admin Pages - CATEGORY 5: SYSTEM & REPORTS
const AdminLaborAnalytics = lazy(() => import('@/pages/admin/5-system-reports/labor-analytics/LaborAnalyticsPage'))
const AdminLocationDataQuality = lazy(() => import('@/pages/admin/5-system-reports/location-analytics/LocationDataQualityPage'))
const AdminAnalyticsDetail = lazy(() => import('@/pages/admin/5-system-reports/labor-analytics/AnalyticsDetailPage'))
const AdminActivityLogs    = lazy(() => import('@/pages/admin/5-system-reports/activity-logs/ActivityLogsPage'))
const AdminSMSNotifications = lazy(() => import('@/pages/admin/5-system-reports/sms-notifications/SMSNotificationsPage'))
const AdminSMSTemplates = lazy(() => import('@/pages/admin/5-system-reports/sms-notifications/SMSTemplatesPage'))

// Admin Pages - CATEGORY 6: CONFIGURATION
const AdminStaffList = lazy(() => import('@/pages/admin/6-configuration/staff/StaffListPage'))
const AdminRolePermissions = lazy(() => import('@/pages/admin/6-configuration/staff/RolePermissionsPage'))
const AdminAnnouncements = lazy(() => import('@/pages/admin/6-configuration/content/AnnouncementsPage'))
const AdminContentModules = lazy(() => import('@/pages/admin/6-configuration/content/ContentModuleListPage'))
const AdminSystemSettings = lazy(() => import('@/pages/admin/6-configuration/settings/SystemSettingsPage'))

// --- SUSPENSE HELPER ---
const S = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
)

// --- ROUTER CONFIGURATION ---
export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      
      {
        element: <GuestLayout />,
        children: [
          { path: '/', element: S(LandingPage) },
          { path: '/verify-email', element: S(VerifyEmailPage) },
          { path: '/privacy-policy', element: S(PrivacyPolicyPage) },
          { path: '/terms-of-service', element: S(TermsOfServicePage) },
          {
            element: <GuestOnly />,
            children: [
              { path: '/login',             element: S(LoginPage) },
              { path: '/register',          element: S(RegisterGateway) },
              { path: '/register/seeker',   element: S(SeekerRegistration) },
              { path: '/register/employer', element: S(EmployerRegistration) },
              { path: '/forgot-password',   element: S(ForgotPasswordPage) },
              { path: '/reset-password',    element: S(ResetPasswordPage) },
            ],
          },
        ],
      },

      // Deliberately outside GuestLayout — this screen must not carry the
      // public chatbot or any of the citizen-facing brand chrome.
      {
        element: <GuestOnly />,
        children: [
          { path: '/administrator', element: S(AdminLoginPage) },
        ],
      },

      {
        element: <RequireAuth />,
        children: [
          { path: '/seeker/onboarding', element: S(SeekerOnboarding) },

          {
            element: <RequireVerified />,
            children: [
              {
                path: '/employer',
                element: <RequireRole role="employer" />,
                children: [
                  { path: 'onboarding', element: S(EmployerOnboarding) },
                  {
                    element: <EmployerLayout />,
                    children: [
                      { index: true, element: <Navigate to="dashboard" replace /> },
                      { path: 'dashboard', element: S(EmployerDashboard) },
                      {
                        element: <RequireApprovedEmployer />,
                        children: [
                          { path: 'post-job', element: S(EmployerPostJob) },
                          { path: 'vacancies', element: S(EmployerVacancies) },
                          { path: 'ats', element: S(EmployerATSGrid) },
                          { path: 'ats/:vacancyId', element: S(VacancyATSPage) },
                          { path: 'calendar', element: S(EmployerCalendar) },
                          { path: 'job-fairs', element: S(EmployerJobFairs) },
                          { path: 'reports/establishment-report', element: S(EmployerEstablishmentReport) },
                          { path: 'reports/placement-report', element: S(EmployerPlacementReport) },
                        ],
                      },
                    ],
                  }
                ],
              },
              {
                path: '/admin',
                element: <RequireRole role="administrator" />,
                children: [
                  {
                    element: <AdminLayout />,
                    children: [
                      { index: true, element: <Navigate to="dashboard" replace /> },
                      
                      // CATEGORY 1: OVERVIEW
                      { path: 'dashboard', element: S(AdminDashboard) },
                      
                      // CATEGORY 2: CONSTITUENT CRM
                      { path: 'verification-queue', element: S(AdminVerificationQueue) },
                      { path: 'job-seekers', element: S(AdminJobSeekersList) },
                      { path: 'job-seekers/:id', element: S(AdminJobSeekerDetail) },
                      { path: 'employers', element: S(AdminEmployersList) },
                      { path: 'employers/:id', element: S(AdminEmployerDetail) },
                      { path: 'employer-reports', element: S(AdminEmployerReportsList) },
                      { path: 'employer-reports/:id', element: S(AdminEmployerReportDetail) },
                      
                      // CATEGORY 3: EMPLOYMENT HUB
                      { path: 'job-postings', element: S(AdminJobPostingsList) },
                      { path: 'job-postings/:id', element: S(AdminJobPostingDetail) },
                      { path: 'smart-matches', element: S(AdminSmartMatches) },
                      { path: 'smart-matches/:matchId', element: S(AdminMatchResults) },
                      
                      // CATEGORY 4: GOVERNMENT & DOLE
                      { path: 'government-programs', element: S(AdminGovernmentProgramsList) },
                      { path: 'government-programs/create', element: S(AdminGovernmentProgramForm) },
                      { path: 'government-programs/:id/edit', element: S(AdminGovernmentProgramForm) },
                      { path: 'job-fairs', element: S(AdminJobFairsList) },
                      { path: 'job-fairs/create', element: S(AdminJobFairForm) },
                      { path: 'job-fairs/:id', element: S(AdminJobFairDetail) },
                      { path: 'job-fairs/:id/edit', element: S(AdminJobFairForm) },
                      { path: 'dole-reporting', element: S(AdminDOLEReporting) },
                      { path: 'establishment-report', element: S(AdminEstablishmentReport) },
                      { path: 'placement-report', element: S(AdminPlacementReport) },
                      { path: 'peis-export', element: S(AdminPEISExport) },
                      
                      // CATEGORY 5: SYSTEM & REPORTS
                      { path: 'labor-analytics', element: S(AdminLaborAnalytics) },
                      { path: 'location-data-quality', element: S(AdminLocationDataQuality) },
                      { path: 'labor-analytics/:id', element: S(AdminAnalyticsDetail) },
                      { path: 'activity-logs', element: S(AdminActivityLogs) },
                      { path: 'sms-notifications', element: S(AdminSMSNotifications) },
                      { path: 'sms-templates', element: S(AdminSMSTemplates) },
                      
                      // CATEGORY 6: CONFIGURATION
                      { path: 'staff', element: S(AdminStaffList) },
                      { path: 'role-permissions', element: S(AdminRolePermissions) },
                      { path: 'announcements', element: S(AdminAnnouncements) },
                      { path: 'content-modules', element: S(AdminContentModules) },
                      { path: 'settings', element: S(AdminSystemSettings) },
                    ],
                  }
                ],
              },
              {
                path: '/seeker',
                element: <RequireRole role="seeker" />,
                children: [
                  {
                    element: <RequireProfileComplete />,
                    children: [
                      {
                        element: <SeekerLayout />,
                        children: [
                          { index: true, element: <Navigate to="dashboard" replace /> },
                          { path: 'dashboard', element: S(SeekerDashboard) },
                          { path: 'job-map', element: S(SeekerJobMap) },
                          { path: 'job-fairs', element: S(SeekerJobFairs) },
                          { path: 'government-programs', element: S(SeekerGovernmentPrograms) },
                          { path: 'government-programs/:id', element: S(SeekerProgramDetails) },
                          { path: 'applications', element: S(SeekerApplications) },
                          { path: 'profile', element: S(SeekerProfile) },
                          { path: 'profile/edit', element: S(SeekerProfileEdit) },
                          { path: 'employers/:id', element: S(SeekerEmployerProfile) },
                        ],
                      }
                    ],
                  }
                ],
              },
            ],
          },
        ],
      },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

