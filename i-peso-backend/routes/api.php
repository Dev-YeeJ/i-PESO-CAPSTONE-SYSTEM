<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SeekerController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\ConstituentCRM\SeekerController as AdminSeekerController;
use App\Http\Controllers\Api\Admin\ConstituentCRM\EmployerController as AdminEmployerController;
use App\Http\Controllers\Api\Admin\GovernmentDole\ProgramController as AdminProgramController;
use App\Http\Controllers\Api\Admin\GovernmentDole\JobFairController as AdminJobFairController;
use App\Http\Controllers\Api\Admin\SystemReports\ReportController as AdminReportController;
use App\Http\Controllers\Api\Admin\SystemReports\ActivityController as AdminActivityController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register',        [AuthController::class, 'register']);
    Route::post('/verify-otp',      [AuthController::class, 'verifyOtp']);
    Route::post('/login',           [AuthController::class, 'login']);
    Route::post('/resend-otp',      [AuthController::class, 'resendOtp']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password',  [AuthController::class, 'resetPassword']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get( '/auth/me',     [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Seeker profile endpoints (step-by-step completion)
    Route::prefix('seeker')->group(function () {
        Route::get ('/profile',       [SeekerController::class, 'getProfile']);
        Route::post('/step-1',        [SeekerController::class, 'saveStep1']);
        Route::post('/step-2',        [SeekerController::class, 'saveStep2']);
        Route::post('/step-3',        [SeekerController::class, 'saveStep3']);
        Route::post('/step-4',        [SeekerController::class, 'saveStep4']);
        Route::post('/profile',       [SeekerController::class, 'saveProfile']); // Legacy single-submit endpoint
    });

    // Admin endpoints (protected by auth:sanctum + Administrator model check)
    Route::prefix('admin')->group(function () {
        // Dashboard
        Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats']);

        // Seekers
        Route::get('/seekers', [AdminSeekerController::class, 'index']);
        Route::get('/seekers/{id}', [AdminSeekerController::class, 'show']);
        Route::post('/seekers/{id}/verify', [AdminSeekerController::class, 'verify']);
        Route::get('/seekers/verification-queue', [AdminSeekerController::class, 'verificationQueue']);

        // Employers
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