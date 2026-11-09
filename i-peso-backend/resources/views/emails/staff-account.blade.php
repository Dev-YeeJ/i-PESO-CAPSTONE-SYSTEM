@extends('emails.layouts.premium')

@section('title', $kind === 'reset' ? 'Your new i-PESO staff password' : 'Your i-PESO staff account')
@section('preheader', $kind === 'reset'
    ? 'The PESO system administrator issued you a new temporary password.'
    : 'Your i-PESO staff account is ready. Sign in and set your own password.')

@section('content')
    @if($kind === 'reset')
        <span class="eyebrow eyebrow-warning">New temporary password</span>
        <h1>Your password was reset</h1>
        <p>Hello {{ $recipientName }},</p>
        <p>The PESO system administrator issued you a new temporary password for i-PESO. Your previous password no longer works, and you have been signed out of every device.</p>
    @else
        <span class="eyebrow">Staff account</span>
        <h1>Welcome to i-PESO</h1>
        <p>Hello {{ $recipientName }},</p>
        <p>An i-PESO staff account has been created for you{{ $positionLabel ? ' as '.$positionLabel : '' }} at the Urdaneta City Public Employment Service Office.</p>
    @endif

    <div class="panel panel-accent">
        <p class="detail-label">Sign-in page</p>
        <p class="detail-value" style="font-size:15px;"><a href="{{ $signInUrl }}" style="color:#1d4ed8;">{{ $signInUrl }}</a></p>
        <p class="detail-label" style="margin-top:16px;">Email</p>
        <p class="detail-value" style="font-size:15px;">{{ $email }}</p>
        <p class="detail-label" style="margin-top:16px;">Temporary password</p>
        <p class="detail-value" style="font-family:Consolas,'Courier New',monospace;font-size:20px;letter-spacing:1px;">{{ $temporaryPassword }}</p>
    </div>

    <div class="panel panel-warning">
        <p style="margin:0;color:#78350f;">
            <strong>Expires {{ $expiresAt->timezone('Asia/Manila')->format('F j, Y \a\t g:i A') }}.</strong>
            When you sign in, you will be asked to set your own password before you can continue.
        </p>
    </div>

    <div class="button-wrap">
        <a href="{{ $signInUrl }}" class="button">Sign in to i-PESO</a>
    </div>
    <p class="helper"><strong>Keep this password private.</strong> PESO staff will never ask you for your password. If you weren't expecting this email, contact the PESO office.</p>
@endsection
