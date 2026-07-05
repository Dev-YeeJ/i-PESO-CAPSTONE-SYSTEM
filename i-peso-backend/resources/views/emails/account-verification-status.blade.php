@extends('emails.layouts.premium')

@section('title', 'i-PESO account verification update')
@section('preheader', $status === 'verified' ? 'Your i-PESO account has been approved.' : 'Your i-PESO account needs your attention.')

@section('content')
    @if($status === 'verified')
        <span class="eyebrow eyebrow-success">Account approved</span>
        <h1>Your {{ strtolower($accountType) }} account is ready</h1>
        <p>Hello {{ $recipientName }},</p>
        <p>PESO has completed its review and approved your account. You can now use the verified features available in the i-PESO portal.</p>
        <div class="panel panel-success">
            <p class="detail-label">Verification status</p>
            <p class="detail-value" style="color:#047857;">Verified</p>
        </div>
    @else
        <span class="eyebrow eyebrow-danger">Action required</span>
        <h1>Your {{ strtolower($accountType) }} account needs attention</h1>
        <p>Hello {{ $recipientName }},</p>
        <p>PESO could not approve the account yet. Review the information below, then open i-PESO to update or clarify your requirements.</p>
        <div class="panel panel-danger">
            <p class="detail-label">Verification status</p>
            <p class="detail-value" style="color:#b91c1c;">Needs attention</p>
        </div>
    @endif

    @if($remarks)
        <div class="panel panel-warning">
            <p class="detail-label">PESO remarks</p>
            <p style="margin:6px 0 0;color:#78350f;">{{ $remarks }}</p>
        </div>
    @endif

    <div class="button-wrap">
        <a href="{{ $portalUrl }}" class="button button-gold">Open i-PESO</a>
    </div>
    <p class="helper text-center">Sign in to view your current status and next required action.</p>
@endsection
