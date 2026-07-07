@extends('emails.layouts.premium')

@section('title', $title)
@section('preheader', $bodyMessage)

@section('content')
    @if($status === 'action_required')
        <span class="eyebrow eyebrow-danger">Action required</span>
    @elseif($status === 'progress')
        <span class="eyebrow eyebrow-success">Verification progress</span>
    @else
        <span class="eyebrow">Application update</span>
    @endif

    <h1>{{ $title }}</h1>
    <p>{{ $bodyMessage }}</p>

    @if($documentType && $documentLabel)
        <div class="panel {{ $status === 'action_required' ? 'panel-danger' : ($status === 'progress' ? 'panel-success' : 'panel-accent') }}">
            <p class="detail-label">Document reviewed</p>
            <p class="detail-value">{{ $documentLabel }}</p>
            @if($status === 'action_required')
                <p style="margin:8px 0 0;color:#b91c1c;font-size:13px;font-weight:700;">Correction required</p>
            @elseif($status === 'progress')
                <p style="margin:8px 0 0;color:#047857;font-size:13px;font-weight:700;">Successfully verified</p>
            @endif
        </div>
    @endif

    @if($remarks)
        <div class="panel panel-warning">
            <p class="detail-label">PESO administrator remarks</p>
            <p style="margin:6px 0 0;color:#78350f;">{{ $remarks }}</p>
        </div>
    @endif

    <div class="button-wrap">
        <a href="{{ $actionUrl }}" class="button button-gold">{{ $actionLabel ?? 'View dashboard' }}</a>
    </div>
    <p class="helper text-center">Your employer dashboard contains the latest verification state and available next steps.</p>
@endsection
