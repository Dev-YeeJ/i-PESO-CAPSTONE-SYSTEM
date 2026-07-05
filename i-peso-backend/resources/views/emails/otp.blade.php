@extends('emails.layouts.premium')

@section('title', 'Your i-PESO verification code')
@section('preheader', 'Use this secure code to continue to your i-PESO account. It expires in 10 minutes.')

@section('content')
    <span class="eyebrow eyebrow-purple">Security verification</span>
    <h1>Your verification code</h1>
    <p>Hello,</p>
    <p>Use the one-time password below to continue signing in or verifying your i-PESO account.</p>

    <div class="panel text-center" style="padding:26px 18px;border:2px dashed #bfdbfe;background:#eff6ff;">
        <div style="color:#0a192f;font-size:38px;font-weight:800;line-height:46px;letter-spacing:9px;">{{ $otpCode }}</div>
        <div style="margin-top:8px;color:#1d4ed8;font-size:12px;font-weight:700;">Valid for 10 minutes</div>
    </div>

    <div class="panel panel-warning">
        <p class="helper"><strong>Keep this code private.</strong> i-PESO staff will never ask you to send your OTP by email, text message, or chat.</p>
    </div>

    <p class="helper">If you did not request this code, you can safely ignore this message. No account changes will be made without the code.</p>
@endsection
