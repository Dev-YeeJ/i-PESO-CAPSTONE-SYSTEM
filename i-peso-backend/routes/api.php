<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SeekerController;
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
});