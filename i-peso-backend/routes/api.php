<?php

use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\ConstituentCRM\EmployerController as AdminEmployerController;
use App\Http\Controllers\Api\Admin\ConstituentCRM\SeekerController as AdminSeekerController;
use App\Http\Controllers\Api\Admin\EmployerVerificationController;
use App\Http\Controllers\Api\Admin\GovernmentDole\JobFairController as AdminJobFairController;
use App\Http\Controllers\Api\Admin\GovernmentDole\ProgramController as AdminProgramController;
use App\Http\Controllers\Api\Admin\NSRPPdfExportController;
use App\Http\Controllers\Api\Admin\SystemReports\ActivityController as AdminActivityController;
use App\Http\Controllers\Api\Admin\SystemReports\ReportController as AdminReportController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmployerJobVacancyController;
use App\Http\Controllers\Api\EmployerNotificationController;
use App\Http\Controllers\Api\EmployerRegistrationController;
use App\Http\Controllers\Api\GeoapifyController;
use App\Http\Controllers\Api\OccupationController;
use App\Http\Controllers\Api\SeekerCertificateController;
use App\Http\Controllers\Api\SeekerController;
use App\Http\Controllers\Api\SeekerProfileImageController;
use App\Http\Controllers\Api\SeekerResumeController;
use Illuminate\Support\Facades\Route;

Route::get('/occupations', [OccupationController::class, 'index'])->middleware('throttle:60,1');

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

    Route::prefix('geo')->group(function () {
        Route::get('/autocomplete', [GeoapifyController::class, 'autocomplete'])->middleware('throttle:30,1');
        Route::get('/geocode', [GeoapifyController::class, 'geocode'])->middleware('throttle:20,1');
        Route::get('/reverse', [GeoapifyController::class, 'reverse'])->middleware('throttle:20,1');
        Route::post('/route', [GeoapifyController::class, 'route'])->middleware('throttle:15,1');
        Route::post('/matrix', [GeoapifyController::class, 'matrix'])->middleware('throttle:5,1');
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
            Route::apiResource('vacancies', EmployerJobVacancyController::class);
        });
    });

    // Seeker profile endpoints (step-by-step completion)
    Route::prefix('seeker')->group(function () {
        Route::get('/profile', [SeekerController::class, 'getProfile']);
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
        Route::post('/resume/generate', [SeekerResumeController::class, 'generate'])
            ->middleware('throttle:5,1');
    });

    // Admin endpoints (protected by auth:sanctum + Administrator model check)
    Route::prefix('admin')->middleware('admin')->group(function () {
        // Dashboard
        Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats']);

        // Seekers
        Route::get('/seekers', [AdminSeekerController::class, 'index']);
        Route::get('/seekers/{id}', [AdminSeekerController::class, 'show']);
        Route::get('/job-seekers/{id}/export-nsrp-pdf', [NSRPPdfExportController::class, 'exportNSRPPdf']);

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

        // Programs
        Route::get('/programs', [AdminProgramController::class, 'index']);
        Route::post('/programs', [AdminProgramController::class, 'store']);
        Route::get('/programs/{id}', [AdminProgramController::class, 'show']);
        Route::put('/programs/{id}', [AdminProgramController::class, 'update']);
        Route::delete('/programs/{id}', [AdminProgramController::class, 'destroy']);
        Route::get('/programs/{programId}/applicants', [AdminProgramController::class, 'applicants']);
        Route::post('/programs/{programId}/applicants/{applicantId}/review', [AdminProgramController::class, 'reviewApplicant']);
        Route::post('/programs/{programId}/applicants/bulk-review', [AdminProgramController::class, 'bulkReview']);

        // Job Fairs
        Route::get('/job-fairs', [AdminJobFairController::class, 'index']);
        Route::post('/job-fairs', [AdminJobFairController::class, 'store']);
        Route::get('/job-fairs/{id}', [AdminJobFairController::class, 'show']);
        Route::put('/job-fairs/{id}', [AdminJobFairController::class, 'update']);
        Route::delete('/job-fairs/{id}', [AdminJobFairController::class, 'destroy']);

        // Reports
        Route::get('/reports', [AdminReportController::class, 'index']);
        Route::post('/reports/generate', [AdminReportController::class, 'generate']);
        Route::get('/reports/{id}', [AdminReportController::class, 'show']);
        Route::delete('/reports/{id}', [AdminReportController::class, 'destroy']);

        // Activity Logs
        Route::get('/activity-logs', [AdminActivityController::class, 'index']);
    });
});
