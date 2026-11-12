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
use App\Http\Controllers\Api\Admin\SafetyReportController as AdminSafetyReportController;
use App\Http\Controllers\Api\Admin\AdminReviewController;
use App\Http\Controllers\Api\Admin\AdminEstablishmentReportController;
use App\Http\Controllers\Api\Admin\AdminGovernmentProgramController;
use App\Http\Controllers\Api\Admin\AdminHiringActivityReportController;
use App\Http\Controllers\Api\Admin\AdminPlacementReportController;
use App\Http\Controllers\Api\Admin\AdminAccountController;
use App\Http\Controllers\Api\Admin\AdminOjtController;
use App\Http\Controllers\Api\Admin\OjtTimeLogController;
use App\Http\Controllers\Api\Admin\AdminRoleController;
use App\Http\Controllers\Api\Admin\AdminStaffController;
use App\Http\Controllers\Api\Admin\LocationDataQualityController;
use App\Http\Controllers\Api\Admin\NSRPPdfExportController;
use App\Http\Controllers\Api\Admin\OccupationMappingController;
use App\Http\Controllers\Api\Admin\SystemReports\ActivityController as AdminActivityController;
use App\Http\Controllers\Api\Admin\SystemReports\ReportController as AdminReportController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmployerAiSuggestionController;
use App\Http\Controllers\Api\EmployerApplicationController;
use App\Http\Controllers\Api\EmployerJobVacancyController;
use App\Http\Controllers\Api\EmployerHiringActivityReportController;
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
use App\Http\Controllers\Api\SafetyReportController;
use App\Http\Controllers\Api\SeekerReviewController;
use App\Http\Controllers\Api\EmployerFeedbackController;
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
Route::get('/public/government-programs', [\App\Http\Controllers\Api\PublicGovernmentProgramController::class, 'index'])->middleware('throttle:60,1');
// Landing page: live announcements addressed to the Public audience.
Route::get('/public/announcements', [\App\Http\Controllers\Api\PublicAnnouncementController::class, 'index'])->middleware('throttle:60,1');
Route::get('/public/announcements/{announcement}/attachment', [\App\Http\Controllers\Api\PublicAnnouncementController::class, 'attachment'])->middleware('throttle:60,1');
// Site Content: landing text + office details, the public Help page, and the versioned policy pages.
Route::controller(\App\Http\Controllers\Api\PublicSiteContentController::class)->middleware('throttle:60,1')->group(function () {
    Route::get('/public/site-content', 'show');
    Route::get('/public/faqs', 'faqs');
    Route::get('/public/policies/{policy}', 'policy');
    Route::get('/public/policies/{policy}/versions/{version}', 'policyVersion')->whereNumber('version');
});
// Help-page readers: "Was this helpful?" and searches that found nothing (Content Modules → Insights).
Route::controller(\App\Http\Controllers\Api\HelpFeedbackController::class)->middleware('throttle:30,1')->group(function () {
    Route::post('/public/faqs/{faq}/feedback', 'vote');
    Route::post('/public/help/search-misses', 'searchMiss');
});
Route::post('/cookie-consent', [\App\Http\Controllers\Api\CookieConsentController::class, 'store'])->middleware('throttle:20,1');

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

    // PESO announcements for the signed-in job seeker or employer (web + seeker app).
    Route::prefix('announcements')->controller(\App\Http\Controllers\Api\AnnouncementFeedController::class)->group(function () {
        Route::get('/', 'index');
        Route::get('/banner', 'banner');
        Route::get('/unread-count', 'unread');
        Route::post('/read-all', 'readAll')->middleware('throttle:20,1');
        Route::get('/{announcement}', 'show');
        Route::post('/{announcement}/dismiss', 'dismiss')->middleware('throttle:60,1');
        Route::get('/{announcement}/attachment', 'attachment');
    });

    // Help page (FAQs for Everyone + the reader's role, office contact) — web and seeker app.
    Route::get('/help', \App\Http\Controllers\Api\HelpController::class);

    Route::get('/job-fairs', [JobFairController::class, 'index']);
    Route::post('/job-fairs/{id}/rsvp', [JobFairController::class, 'rsvp']);
    Route::get('/job-fairs/posters', [JobFairController::class, 'posters']);
    Route::get('/job-fairs/{jobFair}/employers/{employer}', [JobFairController::class, 'employerBooth']);
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
        Route::put('/profile', [\App\Http\Controllers\Api\EmployerProfileController::class, 'update']);
        Route::post('/profile/logo', [\App\Http\Controllers\Api\EmployerProfileController::class, 'updateLogo']);
        Route::post('/profile/photo', [\App\Http\Controllers\Api\EmployerProfileController::class, 'updateRepresentativeImage']);
        Route::post('/register/step-2', [EmployerRegistrationController::class, 'registerStep2']);
        Route::post('/register/step-3', [EmployerRegistrationController::class, 'registerStep3']);
        Route::delete('/register/document/{documentType}', [EmployerRegistrationController::class, 'deleteDocument']);
        Route::post('/register/step-4', [EmployerRegistrationController::class, 'registerStep4']);
        Route::get('/required-documents', [EmployerRegistrationController::class, 'getRequiredDocuments']);
        Route::post('/register/company-type', [EmployerRegistrationController::class, 'setCompanyType']);
        Route::get('/notifications', [EmployerNotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [EmployerNotificationController::class, 'unreadCount']);
        Route::patch('/notifications/read-all', [EmployerNotificationController::class, 'markAllAsRead']);
        Route::patch('/notifications/{notification}/read', [EmployerNotificationController::class, 'markAsRead']);

        Route::middleware('verified.employer')->group(function () {
            Route::get('/dashboard-stats', [\App\Http\Controllers\Api\EmployerDashboardController::class, 'stats']);

            // Reviews of the company (read, reply once, dispute) and private feedback about hires.
            Route::get('/reviews', [EmployerFeedbackController::class, 'reviews']);
            Route::post('/reviews/{review}/reply', [EmployerFeedbackController::class, 'reply'])->middleware('throttle:10,1');
            Route::delete('/reviews/{review}/reply', [EmployerFeedbackController::class, 'deleteReply']);
            Route::post('/reviews/{review}/dispute', [EmployerFeedbackController::class, 'dispute'])->middleware('throttle:10,1');
            Route::get('/hires', [EmployerFeedbackController::class, 'hires']);
            Route::post('/worker-feedback', [EmployerFeedbackController::class, 'saveWorkerFeedback'])->middleware('throttle:20,1');

            // Report & Safety: reporting a job seeker who applied to this employer.
            Route::get('/safety-reports/options', [SafetyReportController::class, 'options']);
            Route::get('/safety-reports', [SafetyReportController::class, 'index']);
            Route::post('/safety-reports', [SafetyReportController::class, 'store'])->middleware('throttle:5,1');
            Route::get('/safety-reports/{safetyReport}', [SafetyReportController::class, 'show']);
            Route::post('/safety-reports/{safetyReport}/details', [SafetyReportController::class, 'addDetails'])->middleware('throttle:10,1');
            Route::get('/job-fairs', [EmployerJobFairController::class, 'index']);
            Route::post('/job-fairs/{jobFair}/interest', [EmployerJobFairController::class, 'interest']);
            Route::post('/job-fairs/{jobFair}/respond', [EmployerJobFairController::class, 'respond']);
            Route::post('/job-fairs/{jobFair}/requirements/{requirement}', [EmployerJobFairController::class, 'uploadRequirement']);
            Route::delete('/job-fair-requirements/{submission}', [EmployerJobFairController::class, 'deleteRequirement']);
            Route::get('/job-fair-requirements/{submission}/view', [EmployerJobFairController::class, 'viewRequirement']);
            Route::post('/job-fairs/{jobFair}/confirmation-slip', [EmployerJobFairController::class, 'confirmation']);
            Route::post('/job-fairs/{jobFair}/results', [EmployerJobFairController::class, 'results']);
            Route::get('/applicant-suggestions', [EmployerJobFairController::class, 'applicantSuggestions']);
            Route::get('/job-fair-results/{resultReport}/roi-form-3', [EmployerJobFairController::class, 'downloadReport']);
            Route::get('/reports/hiring-activity/preview', [EmployerHiringActivityReportController::class, 'preview']);
            Route::post('/reports/hiring-activity/export', [EmployerHiringActivityReportController::class, 'export']);

            // Placement Report — flexible spreadsheet import (upload -> map -> preview -> submit)
            Route::get('/placement-reports/applicant-suggestions', [EmployerPlacementReportController::class, 'applicantSuggestions']);
            Route::get('/placement-reports', [EmployerPlacementReportController::class, 'index']);
            Route::post('/placement-reports', [EmployerPlacementReportController::class, 'store'])->middleware('throttle:20,1');
            Route::post('/placement-reports/nil', [EmployerPlacementReportController::class, 'storeNil']);
            Route::post('/placement-reports/manual', [EmployerPlacementReportController::class, 'storeManual']);
            Route::get('/placement-reports/{placementReport}', [EmployerPlacementReportController::class, 'show']);
            Route::post('/placement-reports/{placementReport}/sheet', [EmployerPlacementReportController::class, 'selectSheet']);
            Route::post('/placement-reports/{placementReport}/preview', [EmployerPlacementReportController::class, 'preview']);
            Route::put('/placement-reports/{placementReport}/records', [EmployerPlacementReportController::class, 'replaceManualRecords']);
            Route::post('/placement-reports/{placementReport}/submit', [EmployerPlacementReportController::class, 'submit']);
            Route::delete('/placement-reports/{placementReport}', [EmployerPlacementReportController::class, 'destroy']);

            Route::post('/vacancies/ai-suggest', [EmployerAiSuggestionController::class, 'suggestJobPosting'])
                ->middleware('throttle:10,1');
            Route::apiResource('vacancies', EmployerJobVacancyController::class);
            Route::get('/applications', [EmployerApplicationController::class, 'index']);
            Route::get('/applications/{application}', [EmployerApplicationController::class, 'show']);
            Route::get('/applications/{application}/seeker-profile-image', [EmployerApplicationController::class, 'seekerProfileImage']);
            Route::get('/applications/{application}/resume', [EmployerApplicationController::class, 'seekerResume']);
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
        Route::patch('/work-experiences/{workExperience}/responsibilities', [SeekerController::class, 'updateWorkExperienceResponsibilities']);
        Route::post('/profile', [SeekerController::class, 'saveProfile']); // Legacy single-submit endpoint
        Route::post('/profile-image', [SeekerProfileImageController::class, 'store']);
        Route::get('/profile-image', [SeekerProfileImageController::class, 'show']);
        Route::delete('/profile-image', [SeekerProfileImageController::class, 'destroy']);
        // Public Employer Profile for Job Seekers
        Route::get('/employers/{employer}', [SeekerController::class, 'getPublicEmployerProfile']);
        // Verified reviews of employers (Recruitment / Employment Experience).
        Route::get('/reviews', [SeekerReviewController::class, 'index']);
        Route::post('/reviews', [SeekerReviewController::class, 'store'])->middleware('throttle:10,1');
        Route::put('/reviews/{review}', [SeekerReviewController::class, 'update'])->middleware('throttle:10,1');
        Route::delete('/reviews/{review}', [SeekerReviewController::class, 'destroy']);
        Route::get('/employers/{employer}/reviews', [SeekerReviewController::class, 'employerReviews']);
        Route::post('/reviews/{review}/report', [SeekerReviewController::class, 'report'])->middleware('throttle:10,1');
        Route::get('/employer-ratings', [SeekerReviewController::class, 'ratings']);

        // Report & Safety: reporting an employer, company or job vacancy.
        Route::get('/safety-reports/options', [SafetyReportController::class, 'options']);
        Route::get('/safety-reports', [SafetyReportController::class, 'index']);
        Route::post('/safety-reports', [SafetyReportController::class, 'store'])->middleware('throttle:5,1');
        Route::get('/safety-reports/{safetyReport}', [SafetyReportController::class, 'show']);
        Route::post('/safety-reports/{safetyReport}/details', [SafetyReportController::class, 'addDetails'])->middleware('throttle:10,1');
        // Original endpoint, kept for installed copies of the mobile app.
        Route::post('/employers/{employer}/report', [SafetyReportController::class, 'legacyEmployerReport'])
            ->middleware('throttle:5,1');
        Route::post('/certificates', [SeekerCertificateController::class, 'store']);
        Route::get('/certificates/{certificate}/view', [SeekerCertificateController::class, 'view']);
        Route::delete('/certificates/{certificate}', [SeekerCertificateController::class, 'destroy']);
        Route::get('/skill-recommendations', [SeekerController::class, 'getSkillRecommendations']);
        Route::get('/learning-resources/{skill}', [SeekerController::class, 'getLearningResources']);
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
        // The signed-in staff member's own password — the only admin route
        // open while a temporary password is still in use.
        Route::post('/account/password', [AdminAccountController::class, 'changePassword'])
            ->middleware('throttle:10,1')
            ->name('admin.account.password');

        // An OJT intern's own daily time record (the controller checks the position).
        Route::get('/ojt/me', [OjtTimeLogController::class, 'me']);
        Route::post('/ojt/me/time-in', [OjtTimeLogController::class, 'timeIn'])->middleware('throttle:10,1');
        Route::post('/ojt/me/time-out', [OjtTimeLogController::class, 'timeOut'])->middleware('throttle:10,1');

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
            Route::delete('/sms-notifications', [AdminSmsNotificationController::class, 'clearAll']);
            Route::post('/sms-notifications/{smsNotification}/retry', [AdminSmsNotificationController::class, 'retry']);
            Route::get('/location-data-quality/metrics', [LocationDataQualityController::class, 'metrics']);
            Route::get('/location-data-quality/analytics', [LocationDataQualityController::class, 'analytics']);
        });

        // Its own module so aides with Reports access don't see everyone's
        // activity; the Office Manager gets view, the system administrator all.
        Route::middleware('admin.permission:activity_logs')->group(function () {
            Route::get('/activity-logs', [AdminActivityController::class, 'index']);
            Route::get('/activity-logs/export', [AdminActivityController::class, 'export']);
        });

        Route::middleware('admin.permission:constituent_crm')->group(function () {
            // Seekers
            Route::get('/seekers/summary', [AdminSeekerController::class, 'summary']);
            Route::get('/seekers/export', [AdminSeekerController::class, 'export']);
            Route::get('/seekers', [AdminSeekerController::class, 'index']);
            Route::get('/seekers/{id}', [AdminSeekerController::class, 'show']);
            Route::get('/seekers/{id}/profile-image', [AdminSeekerController::class, 'profileImage']);
            Route::get('/job-seekers/{id}/export-nsrp-pdf', [NSRPPdfExportController::class, 'exportNSRPPdf']);
            Route::get('/occupation-mappings/pending', [OccupationMappingController::class, 'pending']);
            Route::post('/occupation-mappings/{preference}/map', [OccupationMappingController::class, 'map']);
            Route::get('/occupation-title-candidates', [OccupationMappingController::class, 'candidates']);
            Route::post('/occupation-title-candidates/{candidate}/map', [OccupationMappingController::class, 'mapCandidate']);
            Route::post('/occupation-title-candidates/{candidate}/reject', [OccupationMappingController::class, 'rejectCandidate']);

            // Employers (Verification)
            Route::get('/employers/pending', [EmployerVerificationController::class, 'getPendingEmployers']);
            Route::get('/employers/{id}/review', [EmployerVerificationController::class, 'reviewEmployer']);
            Route::post('/employers/{id}/approve', [EmployerVerificationController::class, 'approveEmployer']);
            Route::post('/employers/{id}/reject', [EmployerVerificationController::class, 'rejectEmployer']);
            Route::post('/employers/{id}/finalize', [EmployerVerificationController::class, 'finalizeVerification']);
            Route::get('/documents/{document}/view', [EmployerVerificationController::class, 'viewDocument']);
            // Downloads through POST, but only reads: view-only accounts may use it.
            Route::post('/documents/{document}/download', [EmployerVerificationController::class, 'downloadDocument'])
                ->withoutMiddleware('admin.permission:constituent_crm')
                ->middleware('admin.permission:constituent_crm,view');
            Route::post('/documents/{id}/review', [EmployerVerificationController::class, 'reviewDocument']);
            Route::get('/employers/stats', [EmployerVerificationController::class, 'getStats']);

            // Legacy employer endpoints
            Route::get('/employers/summary', [AdminEmployerController::class, 'summary']);
            Route::get('/employers/export', [AdminEmployerController::class, 'export']);
            Route::get('/employers', [AdminEmployerController::class, 'index']);
            Route::get('/employers/{id}', [AdminEmployerController::class, 'show']);

            // Reviews & feedback moderation (Verified Mutual Feedback System).
            Route::get('/reviews/summary', [AdminReviewController::class, 'summary']);
            Route::get('/reviews', [AdminReviewController::class, 'index']);
            Route::get('/reviews/{review}', [AdminReviewController::class, 'show']);
            Route::post('/reviews/{review}/publish', [AdminReviewController::class, 'publish']);
            Route::post('/reviews/{review}/hide', [AdminReviewController::class, 'hide']);
            Route::post('/reviews/{review}/reply-visibility', [AdminReviewController::class, 'setReplyVisibility']);
            Route::post('/reviews/{review}/escalate', [AdminReviewController::class, 'escalate']);
            Route::get('/seekers/{id}/worker-feedback', [AdminReviewController::class, 'seekerWorkerFeedback']);
            Route::post('/worker-feedback/{feedback}/visibility', [AdminReviewController::class, 'setWorkerFeedbackVisibility']);

            // Reports & Safety — every safety report, in both directions.
            Route::get('/safety-reports/options', [AdminSafetyReportController::class, 'options']);
            Route::get('/safety-reports/summary', [AdminSafetyReportController::class, 'summary']);
            Route::get('/safety-reports/subjects/{type}/{id}', [AdminSafetyReportController::class, 'subject'])->whereNumber('id');
            Route::get('/safety-reports', [AdminSafetyReportController::class, 'index']);
            Route::get('/safety-reports/{safetyReport}', [AdminSafetyReportController::class, 'show']);
            Route::patch('/safety-reports/{safetyReport}', [AdminSafetyReportController::class, 'update']);
            Route::post('/safety-reports/{safetyReport}/notes', [AdminSafetyReportController::class, 'note']);
            Route::post('/safety-reports/{safetyReport}/actions', [AdminSafetyReportController::class, 'action']);
            Route::get('/safety-reports/{safetyReport}/attachments/{attachment}', [AdminSafetyReportController::class, 'attachment']);
        });

        Route::middleware('admin.permission:government_dole')->group(function () {
            // Government Programs / Upskill Hub
            Route::get('/government-programs/analytics', [AdminGovernmentProgramController::class, 'analytics']);
            // Registered before the {governmentProgram} routes so "presets" is
            // not swallowed as a program id.
            Route::get('/government-programs/presets', [AdminGovernmentProgramController::class, 'presets']);
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
            Route::get('/job-fairs/summary', [AdminJobFairController::class, 'summary']);
            Route::post('/job-fairs', [AdminJobFairController::class, 'store']);
            Route::post('/job-fairs/{id}/banner', [AdminJobFairController::class, 'uploadBanner']);
            Route::get('/job-fairs/{id}', [AdminJobFairController::class, 'show']);
            Route::put('/job-fairs/{id}', [AdminJobFairController::class, 'update']);
            Route::delete('/job-fairs/{id}', [AdminJobFairController::class, 'destroy']);
            Route::post('/job-fairs/{jobFair}/publish', [AdminJobFairController::class, 'publish']);
            Route::post('/job-fairs/{jobFair}/resend-invitations', [AdminJobFairController::class, 'resendInvitations']);
            Route::post('/job-fairs/{jobFair}/invite', [AdminJobFairController::class, 'invite']);
            Route::patch('/job-fairs/{jobFair}/participants/{participation}', [AdminJobFairController::class, 'participationStatus']);
            Route::post('/job-fairs/{jobFair}/check-in', [AdminJobFairController::class, 'checkIn']);
            Route::get('/job-fairs/{jobFair}/attendees', [AdminJobFairController::class, 'attendees']);
            Route::post('/job-fairs/{jobFair}/walk-ins', [AdminJobFairController::class, 'encodeWalkIn']);
            Route::patch('/job-fair-requirements/{submission}/review', [AdminJobFairController::class, 'reviewRequirement']);
            Route::get('/job-fair-requirements/{submission}/view', [AdminJobFairController::class, 'viewRequirement']);
            Route::post('/job-fairs/{jobFair}/proxy-results', [AdminJobFairController::class, 'proxyResults']);
            Route::get('/applicant-suggestions', [AdminJobFairController::class, 'applicantSuggestions']);
            Route::post('/job-fairs/{jobFair}/proxy-confirmation-slip', [AdminJobFairController::class, 'proxyConfirmation']);
            Route::patch('/job-fair-results/{resultReport}/review', [AdminJobFairController::class, 'reviewResult']);
            Route::patch('/job-fair-confirmation-slips/{confirmationSlip}/review', [AdminJobFairController::class, 'reviewConfirmationSlip']);
            Route::get('/job-fair-results/{resultReport}/roi-form-3', [AdminJobFairController::class, 'downloadResult']);
            Route::get('/job-fairs/{jobFair}/export-sprs', [AdminJobFairController::class, 'exportSprs']);
            Route::get('/job-fairs/{jobFair}/download-attendance-pdf', [AdminJobFairController::class, 'downloadAttendancePdf']);
            Route::get('/job-fairs/{jobFair}/download-attendance-excel', [AdminJobFairController::class, 'downloadAttendanceExcel']);
            Route::get('/job-fairs/{jobFair}/invitation-letter', [AdminJobFairController::class, 'invitation']);

            // Reports
            Route::get('/reports/establishment-report/preview', [AdminEstablishmentReportController::class, 'preview']);
            Route::get('/reports/hiring-activity/preview', [AdminHiringActivityReportController::class, 'preview']);
            Route::post('/reports/hiring-activity/export', [AdminHiringActivityReportController::class, 'export'])
                ->withoutMiddleware('admin.permission:government_dole')
                ->middleware('admin.permission:government_dole,view');

            // Placement Report review + approval (employer-submitted spreadsheet imports)
            Route::get('/placement-reports/compliance', [AdminPlacementReportController::class, 'compliance']);
            Route::get('/placement-reports', [AdminPlacementReportController::class, 'index']);
            Route::get('/placement-reports/{placementReport}', [AdminPlacementReportController::class, 'show']);
            Route::get('/placement-reports/{placementReport}/export', [AdminPlacementReportController::class, 'exportCsv']);
            Route::get('/placement-reports/{placementReport}/export-pdf', [AdminPlacementReportController::class, 'exportPdf']);
            Route::post('/placement-reports/{placementReport}/approve', [AdminPlacementReportController::class, 'approve']);
            Route::post('/placement-reports/{placementReport}/reject', [AdminPlacementReportController::class, 'reject']);
            Route::get('/placement-reports/{placementReport}/records/{record}/candidates', [AdminPlacementReportController::class, 'candidates']);
            Route::post('/placement-reports/{placementReport}/records/{record}/link', [AdminPlacementReportController::class, 'linkRecord']);

            Route::get('/reports', [AdminReportController::class, 'index']);
            Route::post('/reports/generate', [AdminReportController::class, 'generate']);
            Route::post('/reports/generate-sprs', [AdminReportController::class, 'generateSPRS']);
            Route::put('/reports/{id}/sprs', [AdminReportController::class, 'updateSprs']);
            Route::get('/reports/{id}/export-sprs-pdf', [AdminReportController::class, 'exportSprsPdf']);
            Route::get('/reports/{id}/export', [AdminReportController::class, 'export']);
            Route::get('/reports/{id}', [AdminReportController::class, 'show']);
            Route::delete('/reports/{id}', [AdminReportController::class, 'destroy']);
        });

        // Announcements (Configuration → Announcements). Reading needs view,
        // anything that changes an announcement needs full access.
        Route::middleware('admin.permission:configuration')
            ->prefix('announcements')
            ->controller(\App\Http\Controllers\Api\Admin\Configuration\AnnouncementController::class)
            ->group(function () {
                Route::get('/', 'index');
                Route::get('/options', 'options');
                Route::post('/', 'store');
                Route::get('/{announcement}', 'show');
                Route::put('/{announcement}', 'update');
                Route::post('/{announcement}/publish', 'publish');
                Route::post('/{announcement}/unpublish', 'unpublish');
                Route::post('/{announcement}/archive', 'archive');
                Route::post('/{announcement}/restore', 'restore');
                Route::delete('/{announcement}', 'destroy');
                Route::get('/{announcement}/attachment', 'attachment');
            });

        // Site Content (Configuration → Site Content): Office info, Landing page
        // text and the versioned Policy pages need Configuration access.
        Route::middleware('admin.permission:configuration')->group(function () {
            Route::controller(\App\Http\Controllers\Api\Admin\Configuration\SiteContentController::class)
                ->prefix('site-content')
                ->group(function () {
                    Route::get('/', 'index');
                    Route::put('/{key}', 'update');
                    Route::post('/{key}/reset', 'reset');
                    Route::get('/{key}/revisions', 'revisions');
                    Route::post('/{key}/revisions/{revision}/restore', 'restore');
                });

            Route::controller(\App\Http\Controllers\Api\Admin\Configuration\PolicyController::class)
                ->prefix('policies')
                ->group(function () {
                    Route::get('/', 'index');
                    Route::get('/{policy}', 'show');
                    Route::get('/{policy}/versions/{version}', 'version')->whereNumber('version');
                    Route::post('/{policy}/draft', 'startDraft');
                    Route::put('/{policy}/draft', 'saveDraft');
                    Route::post('/{policy}/draft/publish', 'publish');
                    Route::delete('/{policy}/draft', 'discardDraft');
                });
        });

        // Content Modules → Overview, Insights and the AI writing helper: anyone who keeps FAQs.
        Route::middleware('admin.permission:configuration|constituent_crm')
            ->prefix('content-modules')
            ->controller(\App\Http\Controllers\Api\Admin\Configuration\ContentInsightController::class)
            ->group(function () {
                Route::get('/health', 'health');
                Route::get('/insights', 'insights');
                Route::post('/insights/resolve', 'resolve');
                // Only staff who can edit have a reason to draft text, so this POST keeps full access.
                Route::post('/ai-assist', 'assist')->middleware('throttle:20,1');
            });

        // FAQs are kept up to date by Configuration OR Constituent CRM (front desk) staff.
        Route::middleware('admin.permission:configuration|constituent_crm')
            ->prefix('faqs')
            ->controller(\App\Http\Controllers\Api\Admin\Configuration\FaqController::class)
            ->group(function () {
                Route::get('/', 'index');
                Route::post('/', 'store');
                Route::put('/reorder', 'reorder');
                Route::post('/starter-pack', 'starterPack');
                Route::put('/{faq}', 'update');
                Route::post('/{faq}/publish', 'publish');
                Route::post('/{faq}/unpublish', 'unpublish');
                Route::post('/{faq}/feature', 'feature');
                Route::get('/{faq}/revisions', 'revisions');
                Route::delete('/{faq}', 'destroy');
            });

        // Viewing staff, roles and the org chart: Configuration access
        // (the Office Manager has view).
        Route::middleware('admin.permission:configuration')->group(function () {
            Route::get('/staff', [AdminStaffController::class, 'index']);
            Route::get('/staff/org-chart', [AdminStaffController::class, 'orgChart']);
            Route::get('/roles', [AdminRoleController::class, 'index']);
            Route::get('/ojt/interns', [AdminOjtController::class, 'interns']);
            Route::get('/ojt/interns/{intern}/logs', [AdminOjtController::class, 'logs']);
        });

        // Changing accounts or roles is reserved for the system administrator,
        // whatever their Configuration access. Staff are deactivated, never
        // deleted, so the job fairs, programs and reports they created are kept.
        Route::middleware('admin.system')->group(function () {
            Route::post('/staff', [AdminStaffController::class, 'store']);
            Route::put('/staff/{staffMember}', [AdminStaffController::class, 'update']);
            Route::post('/staff/{staffMember}/deactivate', [AdminStaffController::class, 'deactivate']);
            Route::post('/staff/{staffMember}/reactivate', [AdminStaffController::class, 'reactivate']);
            Route::post('/staff/{staffMember}/send-password', [AdminStaffController::class, 'sendPassword'])
                ->middleware('throttle:10,1');

            Route::post('/roles', [AdminRoleController::class, 'store']);
            Route::put('/roles/{role}', [AdminRoleController::class, 'update']);
            Route::delete('/roles/{role}', [AdminRoleController::class, 'destroy']);

            Route::post('/ojt/interns/{intern}/logs', [AdminOjtController::class, 'store']);
            Route::post('/ojt/interns/{intern}/approve-pending', [AdminOjtController::class, 'approvePending']);
            Route::put('/ojt/logs/{log}', [AdminOjtController::class, 'update']);
            Route::post('/ojt/logs/{log}/approve', [AdminOjtController::class, 'approve']);
            Route::post('/ojt/logs/{log}/reject', [AdminOjtController::class, 'reject']);
        });
    });
});
