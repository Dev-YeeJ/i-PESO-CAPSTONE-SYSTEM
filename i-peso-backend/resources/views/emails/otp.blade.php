@extends('emails.layouts.premium')

@section('content')

<span class="badge badge-purple">Security Verification</span>
<h1>Your Verification Code</h1>
<p>Hello,</p>
<p>You requested a One-Time Password (OTP) to securely log in or verify your i-PESO account. Please use the verification code below:</p>

<div class="text-center mt-8 mb-4">
    <div style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px 48px; letter-spacing: 6px; font-size: 36px; font-weight: 800; color: #0f172a;">
        {{ $otpCode }}
    </div>
</div>

<p class="text-center" style="color: #ef4444; font-size: 14px; font-weight: 600;">This code will expire in 10 minutes.</p>

<div class="card-inner mt-8" style="background-color: transparent; border: none; padding: 0;">
    <p style="font-size: 14px; color: #64748b;">If you did not request this code, you can safely ignore this email. Your account remains secure.</p>
</div>

@endsection