<?php

use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\ApplicationController as AdminApplicationController;
use App\Http\Controllers\Api\Admin\ConstituentCRM\EmployerController as AdminEmployerController;
use App\Http\Controllers\Api\Admin\ConstituentCRM\SeekerController as AdminSeekerController;
use App\Http\Controllers\Api\Admin\EmployerVerificationController;
use App\Http\Controllers\Api\Admin\GovernmentDole\JobFairController as AdminJobFairController;
use App\Http\Controllers\Api\Admin\AdminCitizenCharterController;
use App\Http\Controllers\Api\Admin\AdminEmployerSkillDemandController;
use App\Http\Controllers\Api\Admin\AdminEstablishmentReportController;
use App\Http\Controllers\Api\Admin\AdminGovernmentProgramApplicationController;
use App\Http\Controllers\Api\Admin\AdminGovernmentProgramController;
use App\Http\Controllers\Api\Admin\LocationDataQualityController;
use App\Http\Controllers\Api\Admin\NSRPPdfExportController;
use App\Http\Controllers\Api\Admin\OccupationMappingController;
use App\Http\Controllers\Api\Admin\SystemReports\ActivityController as AdminActivityController;
use App\Http\Controllers\Api\Admin\SystemReports\ReportController as AdminReportController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmployerApplicationController;
use App\Http\Controllers\Api\EmployerJobVacancyController;
use App\Http\Controllers\Api\EmployerGovernmentProgramController;
use App\Http\Controllers\Api\EmployerEstablishmentReportController;
use App\Http\Controllers\Api\EmployerNotificationController;
use App\Http\Controllers\Api\EmployerRegistrationController;
use App\Http\Controllers\Api\EmployerUpskillNeedController;
use App\Http\Controllers\Api\GoogleCalendarController;
use App\Http\Controllers\Api\GoogleMapsController;
use App\Http\Controllers\Api\JobFairController;
use App\Http\Controllers\Api\OccupationController;
use App\Http\Controllers\Api\SeekerAiSuggestionController;
use App\Http\Controllers\Api\SeekerAnalyticsController;
use App\Http\Controllers\Api\SeekerApplicationController;
use App\Http\Controllers\Api\SeekerCertificateController;
use App\Http\Controllers\Api\SeekerController;
use App\Http\Controllers\Api\SeekerGovernmentProgramApplicationController;
use App\Http\Controllers\Api\SeekerNearbyJobController;
use App\Http\Controllers\Api\SeekerProfileImageController;
use App\Http\Controllers\Api\SeekerResumeController;
use App\Http\Controllers\Api\SeekerUpskillHubController;
use App\Http\Controllers\Api\SkillCatalogController;
use App\Http\Controllers\Api\SkillRecommendationController;
use Illuminate\Support\Facades\Route;

Route::get('/occupations', [OccupationController::class, 'index'])->middleware('throttle:60,1');
Route::get('/skills', [SkillCatalogController::class, 'index'])->middleware('throttle:60,1');

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:10,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('/resend-otp', [AuthController::class, 'resendOtp'])->middleware('throttle:5,1');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
});

// Public callback for Google Calendar (Google browser redirect does not have Bearer token)
Route::get('/employer/calendar/callback', [GoogleCalendarController::class, 'callback']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/job-fairs', [JobFairController::class, 'index']);
    Route::post('/job-fairs/{id}/rsvp', [JobFairController::class, 'rsvp'])->middleware('throttle:20,1');
    Route::post('/job-fairs/{id}/employer-join', [JobFairController::class, 'employerJoin'])->middleware('verified.employer');
    Route::post('/job-fairs/scan-qr', [JobFairController::class, 'scanQr'])
        ->middleware(['verified.employer', 'throttle:30,1']);
    Route::post('/job-fairs/applications/fast-track', [JobFairController::class, 'fastTrack'])
        ->middleware(['verified.employer', 'throttle:60,1']);
    Route::get('/job-fairs/{id}/export-roi-form-3', [JobFairController::class, 'exportRoiForm3'])
        ->middleware('verified.employer');
    Route::get('/job-fairs/{id}/export-sprs', [JobFairController::class, 'exportSprs']);

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
        Route::patch('/notifications/read-all', [EmployerNotificationController::class, 'markAllAsRead']);
        Route::patch('/notifications/{notification}/read', [EmployerNotificationController::class, 'markAsRead']);

        Route::middleware('verified.employer')->group(function () {
            Route::get('/reports/establishment-report/preview', [EmployerEstablishmentReportController::class, 'preview']);
            Route::post('/reports/establishment-report/export', [EmployerEstablishmentReportController::class, 'export']);
            Route::apiResource('vacancies', EmployerJobVacancyController::class);
            Route::get('/upskill-hub/programs', [EmployerGovernmentProgramController::class, 'index']);
            Route::post('/upskill-hub/recommend-applicant', [EmployerGovernmentProgramController::class, 'recommendApplicant']);
            Route::get('/upskill-needs', [EmployerUpskillNeedController::class, 'index']);
            Route::post('/upskill-needs', [EmployerUpskillNeedController::class, 'store']);
            Route::put('/upskill-needs/{employerSkillDemand}', [EmployerUpskillNeedController::class, 'update']);
            Route::delete('/upskill-needs/{employerSkillDemand}', [EmployerUpskillNeedController::class, 'destroy']);
            Route::get('/applications', [EmployerApplicationController::class, 'index']);
            Route::get('/applications/{application}', [EmployerApplicationController::class, 'show']);
            Route::patch('/applications/{application}/status', [EmployerApplicationController::class, 'updateStatus']);
            
            // Google Calendar
            Route::get('/calendar/connect', [GoogleCalendarController::class, 'connect']);
            Route::post('/calendar/generate-meet-link', [GoogleCalendarController::class, 'generateMeetLink']);
            Route::get('/calendar/events', [GoogleCalendarController::class, 'events']);
        });
    });

    // Seeker profile endpoints (step-by-step completion)
    Route::prefix('seeker')->group(function () {
        Route::get('/profile', [SeekerController::class, 'getProfile']);
        Route::get('/upskill-hub', [SeekerUpskillHubController::class, 'index']);
        Route::get('/upskill-hub/recommended', [SeekerUpskillHubController::class, 'recommended']);
        Route::get('/citizen-charter', [SeekerUpskillHubController::class, 'citizenCharter']);
        Route::get('/government-programs/{governmentProgram}', [SeekerUpskillHubController::class, 'show']);
        Route::get('/government-programs/{governmentProgram}/attachment', [SeekerUpskillHubController::class, 'attachment']);
        Route::post('/government-programs/{governmentProgram}/apply', [SeekerGovernmentProgramApplicationController::class, 'apply'])
            ->middleware('throttle:10,1');
        Route::get('/government-program-applications', [SeekerGovernmentProgramApplicationController::class, 'index']);
        Route::post('/government-program-applications/{programApplication}/documents', [SeekerGovernmentProgramApplicationController::class, 'uploadDocument'])
            ->middleware('throttle:10,1');
        Route::get('/government-program-applications/{programApplication}/documents/{document}', [SeekerGovernmentProgramApplicationController::class, 'document']);
        Route::get('/nearby-jobs', [SeekerNearbyJobController::class, 'getNearbyJobs'])
            ->middleware('throttle:60,1');
        Route::get('/job-map', [SeekerNearbyJobController::class, 'getNearbyJobs'])
            ->middleware('throttle:60,1');
        Route::get('/applications', [SeekerApplicationController::class, 'index']);
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
        Route::post('/certificates', [SeekerCertificateController::class, 'store']);
        Route::get('/certificates/{certificate}/view', [SeekerCertificateController::class, 'view']);
        Route::delete('/certificates/{certificate}', [SeekerCertificateController::class, 'destroy']);
        Route::post('/ai-profile-suggestions', [SeekerAiSuggestionController::class, 'suggest'])
            ->middleware('throttle:10,1');
        Route::post('/ai-occupation-classification', [SeekerAiSuggestionController::class, 'classifyOccupation'])
            ->middleware('throttle:20,1');
        Route::post('/classify-occupation', [\App\Http\Controllers\Api\OccupationClassificationController::class, 'classify'])
            ->middleware('throttle:30,1');
        Route::post('/nearby-jobs/ai-parse', [SeekerAiSuggestionController::class, 'parseMapQuery'])
            ->middleware('throttle:10,1');
        Route::get('/skill-recommendations', [SkillRecommendationController::class, 'getRecommendations'])
            ->middleware('throttle:20,1');
        Route::post('/skill-gap-analysis', [SkillRecommendationController::class, 'analyzeGaps'])
            ->middleware('throttle:20,1');
        Route::get('/learning-resources/{skill}', [SkillRecommendationController::class, 'getLearningResources'])
            ->middleware('throttle:30,1');
        Route::post('/resume/generate', [SeekerResumeController::class, 'generate'])
            ->middleware('throttle:5,1');
        Route::get('/analytics', [SeekerAnalyticsController::class, 'index']);
        Route::get('/notifications', [\App\Http\Controllers\Api\SeekerNotificationController::class, 'index']);
        Route::patch('/notifications/read-all', [\App\Http\Controllers\Api\SeekerNotificationController::class, 'markAllAsRead']);
        Route::patch('/notifications/{notification}/read', [\App\Http\Controllers\Api\SeekerNotificationController::class, 'markAsRead']);
    });

    // Admin endpoints (protected by auth:sanctum + Administrator model check)
    Route::prefix('admin')->middleware('admin')->group(function () {
        // Dashboard
        Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats']);
        Route::get('/applications', [AdminApplicationController::class, 'index']);

        // Seekers
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
        Route::get('/employers/{id}/review', [EmployerVerificationController::class, 'reviewEmployer']);
        Route::post('/employers/{id}/approve', [EmployerVerificationController::class, 'approveEmployer']);
        Route::post('/employers/{id}/reject', [EmployerVerificationController::class, 'rejectEmployer']);
        Route::get('/documents/{document}/view', [EmployerVerificationController::class, 'viewDocument']);
        Route::post('/documents/{document}/download', [EmployerVerificationController::class, 'downloadDocument']);
        Route::post('/documents/{id}/review', [EmployerVerificationController::class, 'reviewDocument']);
        Route::get('/employers/stats', [EmployerVerificationController::class, 'getStats']);

        // Legacy employer endpoints
        Route::get('/employers', [AdminEmployerController::class, 'index']);
        Route::get('/employers/{id}', [AdminEmployerController::class, 'show']);

        // Government Programs / Upskill Hub
        Route::get('/government-programs/analytics', [AdminGovernmentProgramController::class, 'analytics']);
        Route::get('/government-programs', [AdminGovernmentProgramController::class, 'index']);
        Route::post('/government-programs', [AdminGovernmentProgramController::class, 'store']);
        Route::get('/government-programs/{governmentProgram}', [AdminGovernmentProgramController::class, 'show']);
        Route::put('/government-programs/{governmentProgram}', [AdminGovernmentProgramController::class, 'update']);
        Route::post('/government-programs/{governmentProgram}', [AdminGovernmentProgramController::class, 'update']);
        Route::delete('/government-programs/{governmentProgram}', [AdminGovernmentProgramController::class, 'destroy']);
        Route::get('/government-programs/{governmentProgram}/attachment', [AdminGovernmentProgramController::class, 'attachment']);
        Route::get('/government-programs/{governmentProgram}/applications', [AdminGovernmentProgramApplicationController::class, 'index']);
        Route::post('/government-program-applications/{programApplication}/status', [AdminGovernmentProgramApplicationController::class, 'updateStatus']);
        Route::get('/government-program-applications/{programApplication}/documents/{document}', [AdminGovernmentProgramApplicationController::class, 'document']);

        // Backward-compatible aliases for the original Government Programs API.
        Route::get('/programs', [AdminGovernmentProgramController::class, 'index']);
        Route::post('/programs', [AdminGovernmentProgramController::class, 'store']);
        Route::get('/programs/{governmentProgram}', [AdminGovernmentProgramController::class, 'show']);
        Route::put('/programs/{governmentProgram}', [AdminGovernmentProgramController::class, 'update']);
        Route::delete('/programs/{governmentProgram}', [AdminGovernmentProgramController::class, 'destroy']);
        Route::get('/programs/{governmentProgram}/applicants', [AdminGovernmentProgramApplicationController::class, 'index']);
        Route::post('/programs/{governmentProgram}/applicants/{programApplication}/review', [AdminGovernmentProgramApplicationController::class, 'legacyReview']);
        Route::post('/programs/{governmentProgram}/applicants/bulk-review', [AdminGovernmentProgramApplicationController::class, 'legacyBulkReview']);

        // Citizen Charter
        Route::get('/citizen-charter', [AdminCitizenCharterController::class, 'index']);
        Route::post('/citizen-charter', [AdminCitizenCharterController::class, 'store']);
        Route::get('/citizen-charter/{citizenCharter}', [AdminCitizenCharterController::class, 'show']);
        Route::put('/citizen-charter/{citizenCharter}', [AdminCitizenCharterController::class, 'update']);
        Route::delete('/citizen-charter/{citizenCharter}', [AdminCitizenCharterController::class, 'destroy']);

        // Employer skill demand review
        Route::get('/employer-skill-demands', [AdminEmployerSkillDemandController::class, 'index']);
        Route::post('/employer-skill-demands/{employerSkillDemand}/status', [AdminEmployerSkillDemandController::class, 'updateStatus']);

        // Job Fairs
        Route::get('/job-fairs', [AdminJobFairController::class, 'index']);
        Route::post('/job-fairs', [AdminJobFairController::class, 'store']);
        Route::get('/job-fairs/{id}', [AdminJobFairController::class, 'show']);
        Route::put('/job-fairs/{id}', [AdminJobFairController::class, 'update']);
        Route::delete('/job-fairs/{id}', [AdminJobFairController::class, 'destroy']);
        Route::get('/job-fairs/{id}/export-sprs', [JobFairController::class, 'exportSprs']);

        // Reports
        Route::get('/reports/establishment-report/preview', [AdminEstablishmentReportController::class, 'preview']);
        Route::post('/reports/establishment-report/export', [AdminEstablishmentReportController::class, 'export']);
        Route::get('/reports', [AdminReportController::class, 'index']);
        Route::post('/reports/generate', [AdminReportController::class, 'generate']);
        Route::post('/reports/generate-sprs', [AdminReportController::class, 'generateSPRS']);
        Route::get('/reports/{id}', [AdminReportController::class, 'show']);
        Route::delete('/reports/{id}', [AdminReportController::class, 'destroy']);

        // Location Data Quality
        Route::get('/location-data-quality/metrics', [LocationDataQualityController::class, 'metrics']);
        Route::get('/location-data-quality/analytics', [LocationDataQualityController::class, 'analytics']);

        // Activity Logs
        Route::get('/activity-logs', [AdminActivityController::class, 'index']);
    });
});
