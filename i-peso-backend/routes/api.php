<?php

use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminAnalyticsController;
use App\Http\Controllers\Api\Admin\AdminSmsNotificationController;
use App\Http\Controllers\Api\Admin\ApplicationController as AdminApplicationController;
use App\Http\Controllers\Api\Admin\ConstituentCRM\EmployerController as AdminEmployerController;
use App\Http\Controllers\Api\Admin\ConstituentCRM\SeekerController as AdminSeekerController;
use App\Http\Controllers\Api\Admin\EmployerVerificationController;
use App\Http\Controllers\Api\Admin\GovernmentDole\JobFairController as AdminJobFairController;
use App\Http\Controllers\Api\Admin\AdminCitizenCharterController;
use App\Http\Controllers\Api\Admin\AdminEmployerReportController;
use App\Http\Controllers\Api\Admin\AdminEstablishmentReportController;
use App\Http\Controllers\Api\Admin\AdminGovernmentProgramController;
use App\Http\Controllers\Api\Admin\AdminPlacementReportController;
use App\Http\Controllers\Api\Admin\AdminRoleController;
use App\Http\Controllers\Api\Admin\AdminStaffController;
use App\Http\Controllers\Api\Admin\LocationDataQualityController;
use App\Http\Controllers\Api\Admin\NSRPPdfExportController;
use App\Http\Controllers\Api\Admin\OccupationMappingController;
use App\Http\Controllers\Api\Admin\SystemReports\ActivityController as AdminActivityController;
use App\Http\Controllers\Api\Admin\SystemReports\ReportController as AdminReportController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmployerApplicationController;
use App\Http\Controllers\Api\EmployerJobVacancyController;
use App\Http\Controllers\Api\EmployerEstablishmentReportController;
use App\Http\Controllers\Api\EmployerJobFairController;
use App\Http\Controllers\Api\EmployerNotificationController;
use App\Http\Controllers\Api\EmployerPlacementReportController;
use App\Http\Controllers\Api\EmployerRegistrationController;
use App\Http\Controllers\Api\InterviewCalendarController;
use App\Http\Controllers\Api\GoogleMapsController;
use App\Http\Controllers\Api\JobFairController;
use App\Http\Controllers\Api\OccupationController;
use App\Http\Controllers\Api\PublicChatbotController;
use App\Http\Controllers\Api\SeekerAiSuggestionController;
use App\Http\Controllers\Api\SeekerAnalyticsController;
use App\Http\Controllers\Api\SeekerApplicationController;
use App\Http\Controllers\Api\SeekerCertificateController;
use App\Http\Controllers\Api\SeekerController;
use App\Http\Controllers\Api\SeekerEmployerReportController;
use App\Http\Controllers\Api\SeekerGovernmentProgramController;
use App\Http\Controllers\Api\SeekerNearbyJobController;
use App\Http\Controllers\Api\SeekerProfileImageController;
use App\Http\Controllers\Api\SeekerResumeController;
use App\Http\Controllers\Api\SkillCatalogController;
use Illuminate\Support\Facades\Route;

// Unauthenticated connectivity check — used by the mobile app to distinguish
// "backend unreachable" (network/firewall) from "backend reachable, route/data issue".
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'i-PESO API is reachable',
    ]);
});

Route::get('/occupations', [OccupationController::class, 'index'])->middleware('throttle:60,1');
Route::get('/skills', [SkillCatalogController::class, 'index'])->middleware('throttle:60,1');

// Public assistant for visitors without an account (landing / login / register).
// The throttle is deliberately tight: every call spends Gemini free-tier quota,
// and an unauthenticated route is the easiest place to burn a day's worth of it.
Route::post('/chat/public', PublicChatbotController::class)->middleware('throttle:10,1');

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:10,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('/resend-otp', [AuthController::class, 'resendOtp'])->middleware('throttle:5,1');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/job-fairs', [JobFairController::class, 'index']);
    Route::post('/job-fairs/{id}/rsvp', [JobFairController::class, 'rsvp']);
    Route::get('/job-fairs/posters', [JobFairController::class, 'posters']);
    Route::get('/job-fair-posters/{submission}/view', [JobFairController::class, 'viewPoster']);

    Route::prefix('geo')->group(function () {
        Route::get('/autocomplete', [GoogleMapsController::class, 'autocomplete'])->middleware('throttle:30,1');
        Route::get('/place/{placeId}', [GoogleMapsController::class, 'place'])->middleware('throttle:20,1');
        Route::get('/geocode', [GoogleMapsController::class, 'geocode'])->middleware('throttle:20,1');
        Route::get('/reverse', [GoogleMapsController::class, 'reverse'])->middleware('throttle:20,1');
        Route::post('/route', [GoogleMapsController::class, 'route'])->middleware('throttle:15,1');
        Route::post('/matrix', [GoogleMapsController::class, 'matrix'])->middleware('throttle:5,1');
    });

    // Employer authenticated endpoints
    Route::prefix('employer')->group(function () {
        Route::get('/profile', [EmployerRegistrationController::class, 'getProfile']);
        Route::post('/register/step-2', [EmployerRegistrationController::class, 'registerStep2']);
        Route::post('/register/step-3', [EmployerRegistrationController::class, 'registerStep3']);
        Route::post('/register/step-4', [EmployerRegistrationController::class, 'registerStep4']);
        Route::get('/required-documents', [EmployerRegistrationController::class, 'getRequiredDocuments']);
        Route::get('/notifications', [EmployerNotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [EmployerNotificationController::class, 'unreadCount']);
        Route::patch('/notifications/read-all', [EmployerNotificationController::class, 'markAllAsRead']);
        Route::patch('/notifications/{notification}/read', [EmployerNotificationController::class, 'markAsRead']);

        Route::middleware('verified.employer')->group(function () {
            Route::get('/job-fairs', [EmployerJobFairController::class, 'index']);
            Route::post('/job-fairs/{jobFair}/interest', [EmployerJobFairController::class, 'interest']);
            Route::post('/job-fairs/{jobFair}/respond', [EmployerJobFairController::class, 'respond']);
            Route::post('/job-fairs/{jobFair}/requirements/{requirement}', [EmployerJobFairController::class, 'uploadRequirement']);
            Route::get('/job-fair-requirements/{submission}/view', [EmployerJobFairController::class, 'viewRequirement']);
            Route::post('/job-fairs/{jobFair}/confirmation-slip', [EmployerJobFairController::class, 'confirmation']);
            Route::post('/job-fairs/{jobFair}/results', [EmployerJobFairController::class, 'results']);
            Route::get('/job-fair-results/{resultReport}/roi-form-3', [EmployerJobFairController::class, 'downloadReport']);
            Route::get('/reports/establishment-report/preview', [EmployerEstablishmentReportController::class, 'preview']);
            Route::post('/reports/establishment-report/export', [EmployerEstablishmentReportController::class, 'export']);

            // Placement Report — flexible spreadsheet import (upload -> map -> preview -> submit)
            Route::get('/placement-reports', [EmployerPlacementReportController::class, 'index']);
            Route::post('/placement-reports', [EmployerPlacementReportController::class, 'store'])->middleware('throttle:20,1');
            Route::post('/placement-reports/nil', [EmployerPlacementReportController::class, 'storeNil']);
            Route::get('/placement-reports/{placementReport}', [EmployerPlacementReportController::class, 'show']);
            Route::post('/placement-reports/{placementReport}/sheet', [EmployerPlacementReportController::class, 'selectSheet']);
            Route::post('/placement-reports/{placementReport}/preview', [EmployerPlacementReportController::class, 'preview']);
            Route::post('/placement-reports/{placementReport}/submit', [EmployerPlacementReportController::class, 'submit']);
            Route::delete('/placement-reports/{placementReport}', [EmployerPlacementReportController::class, 'destroy']);

            Route::apiResource('vacancies', EmployerJobVacancyController::class);
            Route::get('/applications', [EmployerApplicationController::class, 'index']);
            Route::get('/applications/{application}', [EmployerApplicationController::class, 'show']);
            Route::patch('/applications/bulk-status', [EmployerApplicationController::class, 'updateStatusBulk'])->middleware('throttle:20,1');
            Route::patch('/applications/{application}/status', [EmployerApplicationController::class, 'updateStatus'])->middleware('throttle:30,1');

            Route::get('/calendar/events', [InterviewCalendarController::class, 'events'])->middleware('throttle:20,1');
        });
    });

    // Seeker profile endpoints (step-by-step completion)
    Route::prefix('seeker')->group(function () {
        Route::get('/dashboard-summary', [SeekerController::class, 'dashboardSummary']);
        Route::get('/profile', [SeekerController::class, 'getProfile']);
        Route::put('/professional-summary', [SeekerController::class, 'saveProfessionalSummary']);
        Route::get('/government-programs', [SeekerGovernmentProgramController::class, 'index']);
        Route::get('/citizen-charter', [SeekerGovernmentProgramController::class, 'citizenCharter']);
        Route::get('/government-programs/{governmentProgram}', [SeekerGovernmentProgramController::class, 'show']);
        Route::get('/government-programs/{governmentProgram}/attachment', [SeekerGovernmentProgramController::class, 'attachment']);

        Route::get('/nearby-jobs', [SeekerNearbyJobController::class, 'getNearbyJobs'])
            ->middleware('throttle:60,1');
        Route::get('/job-map', [SeekerNearbyJobController::class, 'getNearbyJobs'])
            ->middleware('throttle:60,1');
        Route::get('/job-map/{job}', [SeekerNearbyJobController::class, 'show'])
            ->middleware('throttle:60,1');
        Route::get('/applications', [SeekerApplicationController::class, 'index']);
        Route::get('/applications/{application}', [SeekerApplicationController::class, 'show']);
        Route::post('/applications/{application}/withdraw', [SeekerApplicationController::class, 'withdraw']);
        Route::post('/jobs/{vacancy}/apply', [SeekerApplicationController::class, 'apply'])
            ->middleware('throttle:20,1');
        Route::post('/saved-jobs/{vacancy}', [SeekerController::class, 'toggleSavedJob']);
        Route::post('/step-1', [SeekerController::class, 'saveStep1']);
        Route::post('/step-2', [SeekerController::class, 'saveStep2']);
        Route::post('/step-3', [SeekerController::class, 'saveStep3']);
        Route::post('/step-4', [SeekerController::class, 'saveStep4']);
        Route::post('/step-5', [SeekerController::class, 'saveStep5']);
        Route::post('/step-6', [SeekerController::class, 'saveStep6']);
        Route::post('/step-7', [SeekerController::class, 'saveStep7']);
        Route::post('/profile', [SeekerController::class, 'saveProfile']); // Legacy single-submit endpoint
        Route::post('/profile-image', [SeekerProfileImageController::class, 'store']);
        Route::get('/profile-image', [SeekerProfileImageController::class, 'show']);
        Route::delete('/profile-image', [SeekerProfileImageController::class, 'destroy']);
        // Public Employer Profile for Job Seekers
        Route::get('/employers/{employer}', [SeekerController::class, 'getPublicEmployerProfile']);
        // Report a suspicious / abusive employer or job posting
        Route::post('/employers/{employer}/report', [SeekerEmployerReportController::class, 'store'])
            ->middleware('throttle:10,1');
        Route::post('/certificates', [SeekerCertificateController::class, 'store']);
        Route::get('/certificates/{certificate}/view', [SeekerCertificateController::class, 'view']);
        Route::delete('/certificates/{certificate}', [SeekerCertificateController::class, 'destroy']);
        Route::post('/ai-profile-suggestions', [SeekerAiSuggestionController::class, 'suggest'])
            ->middleware('throttle:10,1');
        Route::post('/ai-professional-summary', [SeekerAiSuggestionController::class, 'professionalSummary'])
            ->middleware('throttle:10,1');
        Route::post('/ai-occupation-classification', [SeekerAiSuggestionController::class, 'classifyOccupation'])
            ->middleware('throttle:20,1');
        Route::post('/classify-occupation', [\App\Http\Controllers\Api\OccupationClassificationController::class, 'classify'])
            ->middleware('throttle:30,1');
        Route::post('/nearby-jobs/ai-parse', [SeekerAiSuggestionController::class, 'parseMapQuery'])
            ->middleware('throttle:10,1');
        Route::post('/resume/generate', [SeekerResumeController::class, 'generate'])
            ->middleware('throttle:5,1');
        Route::get('/analytics', [SeekerAnalyticsController::class, 'index']);
        Route::get('/notifications', [\App\Http\Controllers\Api\SeekerNotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [\App\Http\Controllers\Api\SeekerNotificationController::class, 'unreadCount']);
        Route::patch('/notifications/read-all', [\App\Http\Controllers\Api\SeekerNotificationController::class, 'markAllAsRead']);
        Route::patch('/notifications/{notification}/read', [\App\Http\Controllers\Api\SeekerNotificationController::class, 'markAsRead']);
        Route::post('/push-tokens', [\App\Http\Controllers\Api\SeekerPushTokenController::class, 'store']);
        Route::delete('/push-tokens', [\App\Http\Controllers\Api\SeekerPushTokenController::class, 'destroy']);
    });

    // Admin endpoints (protected by auth:sanctum + Administrator model check)
    Route::prefix('admin')->middleware('admin')->group(function () {
        // Dashboard — visible to every signed-in admin/staff account, no module gate
        Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats']);

        Route::middleware('admin.permission:employment_hub')->group(function () {
            Route::get('/applications', [AdminApplicationController::class, 'index']);
            Route::get('/vacancies', [\App\Http\Controllers\Api\Admin\EmploymentHub\JobVacancyController::class, 'index']);
            Route::get('/vacancies/{vacancy}', [\App\Http\Controllers\Api\Admin\EmploymentHub\JobVacancyController::class, 'show']);
        });

        Route::middleware('admin.permission:system_reports')->group(function () {
            Route::get('/analytics/options', [AdminAnalyticsController::class, 'options']);
            Route::get('/analytics', [AdminAnalyticsController::class, 'index']);
            Route::get('/sms-notifications', [AdminSmsNotificationController::class, 'index']);
            Route::post('/sms-notifications/{smsNotification}/retry', [AdminSmsNotificationController::class, 'retry']);
            Route::get('/location-data-quality/metrics', [LocationDataQualityController::class, 'metrics']);
            Route::get('/location-data-quality/analytics', [LocationDataQualityController::class, 'analytics']);
            Route::get('/activity-logs', [AdminActivityController::class, 'index']);
        });

        Route::middleware('admin.permission:constituent_crm')->group(function () {
            // Seekers
            Route::get('/seekers/summary', [AdminSeekerController::class, 'summary']);
            Route::get('/seekers/export', [AdminSeekerController::class, 'export']);
            Route::get('/seekers', [AdminSeekerController::class, 'index']);
            Route::get('/seekers/{id}', [AdminSeekerController::class, 'show']);
            Route::get('/job-seekers/{id}/export-nsrp-pdf', [NSRPPdfExportController::class, 'exportNSRPPdf']);
            Route::get('/occupation-mappings/pending', [OccupationMappingController::class, 'pending']);
            Route::post('/occupation-mappings/{preference}/map', [OccupationMappingController::class, 'map']);
            Route::get('/occupation-title-candidates', [OccupationMappingController::class, 'candidates']);
            Route::post('/occupation-title-candidates/{candidate}/map', [OccupationMappingController::class, 'mapCandidate']);
            Route::post('/occupation-title-candidates/{candidate}/reject', [OccupationMappingController::class, 'rejectCandidate']);

            // Employers (Verification)
            Route::get('/employers/pending', [EmployerVerificationController::class, 'getPendingEmployers']);
            Route::post('/employers/bulk-approve', [EmployerVerificationController::class, 'bulkApproveEmployers']);
            Route::get('/employers/{id}/review', [EmployerVerificationController::class, 'reviewEmployer']);
            Route::post('/employers/{id}/approve', [EmployerVerificationController::class, 'approveEmployer']);
            Route::post('/employers/{id}/reject', [EmployerVerificationController::class, 'rejectEmployer']);
            Route::post('/employers/{id}/finalize', [EmployerVerificationController::class, 'finalizeVerification']);
            Route::get('/documents/{document}/view', [EmployerVerificationController::class, 'viewDocument']);
            Route::post('/documents/{document}/download', [EmployerVerificationController::class, 'downloadDocument']);
            Route::post('/documents/{id}/review', [EmployerVerificationController::class, 'reviewDocument']);
            Route::get('/employers/stats', [EmployerVerificationController::class, 'getStats']);

            // Legacy employer endpoints
            Route::get('/employers/summary', [AdminEmployerController::class, 'summary']);
            Route::get('/employers/export', [AdminEmployerController::class, 'export']);
            Route::get('/employers', [AdminEmployerController::class, 'index']);
            Route::get('/employers/{id}', [AdminEmployerController::class, 'show']);

            // Employer Reports (seeker-filed complaints about employers)
            Route::get('/employer-reports', [AdminEmployerReportController::class, 'index']);
            Route::get('/employer-reports/summary', [AdminEmployerReportController::class, 'summary']);
            Route::get('/employer-reports/{employerReport}', [AdminEmployerReportController::class, 'show']);
            Route::put('/employer-reports/{employerReport}', [AdminEmployerReportController::class, 'update']);
        });

        Route::middleware('admin.permission:government_dole')->group(function () {
            // Government Programs / Upskill Hub
            Route::get('/government-programs/analytics', [AdminGovernmentProgramController::class, 'analytics']);
            Route::get('/government-programs', [AdminGovernmentProgramController::class, 'index']);
            Route::post('/government-programs', [AdminGovernmentProgramController::class, 'store']);
            Route::get('/government-programs/{governmentProgram}', [AdminGovernmentProgramController::class, 'show']);
            Route::put('/government-programs/{governmentProgram}', [AdminGovernmentProgramController::class, 'update']);
            Route::post('/government-programs/{governmentProgram}', [AdminGovernmentProgramController::class, 'update']);
            Route::delete('/government-programs/{governmentProgram}', [AdminGovernmentProgramController::class, 'destroy']);
            Route::get('/government-programs/{governmentProgram}/attachment', [AdminGovernmentProgramController::class, 'attachment']);


            // Backward-compatible aliases for the original Government Programs API.
            Route::get('/programs', [AdminGovernmentProgramController::class, 'index']);
            Route::post('/programs', [AdminGovernmentProgramController::class, 'store']);
            Route::get('/programs/{governmentProgram}', [AdminGovernmentProgramController::class, 'show']);
            Route::put('/programs/{governmentProgram}', [AdminGovernmentProgramController::class, 'update']);
            Route::delete('/programs/{governmentProgram}', [AdminGovernmentProgramController::class, 'destroy']);


            // Citizen Charter
            Route::get('/citizen-charter', [AdminCitizenCharterController::class, 'index']);
            Route::post('/citizen-charter', [AdminCitizenCharterController::class, 'store']);
            Route::get('/citizen-charter/{citizenCharter}', [AdminCitizenCharterController::class, 'show']);
            Route::put('/citizen-charter/{citizenCharter}', [AdminCitizenCharterController::class, 'update']);
            Route::delete('/citizen-charter/{citizenCharter}', [AdminCitizenCharterController::class, 'destroy']);

            // Job Fairs
            Route::get('/job-fairs', [AdminJobFairController::class, 'index']);
            Route::post('/job-fairs', [AdminJobFairController::class, 'store']);
            Route::get('/job-fairs/{id}', [AdminJobFairController::class, 'show']);
            Route::put('/job-fairs/{id}', [AdminJobFairController::class, 'update']);
            Route::delete('/job-fairs/{id}', [AdminJobFairController::class, 'destroy']);
            Route::post('/job-fairs/{jobFair}/publish', [AdminJobFairController::class, 'publish']);
            Route::post('/job-fairs/{jobFair}/invite', [AdminJobFairController::class, 'invite']);
            Route::patch('/job-fairs/{jobFair}/participants/{participation}', [AdminJobFairController::class, 'participationStatus']);
            Route::patch('/job-fair-requirements/{submission}/review', [AdminJobFairController::class, 'reviewRequirement']);
            Route::get('/job-fair-requirements/{submission}/view', [AdminJobFairController::class, 'viewRequirement']);
            Route::post('/job-fairs/{jobFair}/proxy-results', [AdminJobFairController::class, 'proxyResults']);
            Route::post('/job-fairs/{jobFair}/proxy-confirmation-slip', [AdminJobFairController::class, 'proxyConfirmation']);
            Route::get('/job-fair-results/{resultReport}/roi-form-3', [AdminJobFairController::class, 'downloadResult']);
            Route::get('/job-fairs/{jobFair}/export-sprs', [AdminJobFairController::class, 'exportSprs']);
            Route::get('/job-fairs/{jobFair}/invitation-letter', [AdminJobFairController::class, 'invitation']);

            // Reports
            Route::get('/reports/establishment-report/preview', [AdminEstablishmentReportController::class, 'preview']);
            Route::post('/reports/establishment-report/export', [AdminEstablishmentReportController::class, 'export']);

            // Placement Report review + approval (employer-submitted spreadsheet imports)
            Route::get('/placement-reports', [AdminPlacementReportController::class, 'index']);
            Route::get('/placement-reports/compliance', [AdminPlacementReportController::class, 'compliance']);
            Route::get('/placement-reports/{placementReport}', [AdminPlacementReportController::class, 'show']);
            Route::get('/placement-reports/{placementReport}/records/{record}/candidates', [AdminPlacementReportController::class, 'recordCandidates']);
            Route::post('/placement-reports/{placementReport}/records/{record}/link', [AdminPlacementReportController::class, 'linkRecord']);
            Route::get('/placement-reports/{placementReport}/export', [AdminPlacementReportController::class, 'exportCsv']);
            Route::post('/placement-reports/{placementReport}/approve', [AdminPlacementReportController::class, 'approve']);
            Route::post('/placement-reports/{placementReport}/reject', [AdminPlacementReportController::class, 'reject']);

            Route::get('/reports', [AdminReportController::class, 'index']);
            Route::post('/reports/generate', [AdminReportController::class, 'generate']);
            Route::post('/reports/generate-sprs', [AdminReportController::class, 'generateSPRS']);
            Route::put('/reports/{id}/sprs', [AdminReportController::class, 'updateSprs']);
            Route::get('/reports/{id}/export-sprs-pdf', [AdminReportController::class, 'exportSprsPdf']);
            Route::get('/reports/{id}', [AdminReportController::class, 'show']);
            Route::delete('/reports/{id}', [AdminReportController::class, 'destroy']);
        });

        Route::middleware('admin.permission:configuration')->group(function () {
            Route::get('/staff', [AdminStaffController::class, 'index']);
            Route::post('/staff', [AdminStaffController::class, 'store']);
            Route::put('/staff/{staffMember}', [AdminStaffController::class, 'update']);
            Route::delete('/staff/{staffMember}', [AdminStaffController::class, 'destroy']);

            Route::get('/roles', [AdminRoleController::class, 'index']);
            Route::post('/roles', [AdminRoleController::class, 'store']);
            Route::put('/roles/{role}', [AdminRoleController::class, 'update']);
            Route::delete('/roles/{role}', [AdminRoleController::class, 'destroy']);
        });
    });
});
