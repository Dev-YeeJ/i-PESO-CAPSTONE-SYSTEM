@extends('emails.layouts.premium')

@section('content')

@if($status === 'action_required')
    <span class="badge badge-red">Action Required</span>
@elseif($status === 'progress')
    <span class="badge badge-green">Approved</span>
@else
    <span class="badge badge-blue">Update</span>
@endif

<h1>{{ $title }}</h1>
<p>{{ $message }}</p>

@if($documentType && $documentLabel)
    <div class="card-inner text-center">
        <p style="margin-bottom: 8px; color: #64748b; font-size: 14px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Document Checked</p>
        <div style="font-size: 24px; font-weight: 700; color: #0f172a;">{{ $documentLabel }}</div>
        
        @if($status === 'action_required')
            <p style="margin-top: 8px; font-size: 14px; color: #b91c1c;"><strong>Rejected</strong> - Needs Correction</p>
        @elseif($status === 'progress')
            <p style="margin-top: 8px; font-size: 14px; color: #15803d;"><strong>Verified</strong> - Successfully Checked</p>
        @endif
    </div>
@endif

@if($remarks)
    <div class="card-inner" style="border-left: 4px solid #f59e0b; background-color: #fffbeb;">
        <h3 style="margin-top: 0; color: #b45309; font-size: 16px;">PESO Admin Remarks:</h3>
        <p style="margin-bottom: 0; color: #92400e;">{{ $remarks }}</p>
    </div>
@endif

<p>You can monitor the full status of your verification application by logging into your dashboard.</p>

<div class="text-center mt-8">
    <a href="{{ $actionUrl }}" class="button">
        {{ $actionLabel ?? 'View Dashboard' }}
    </a>
</div>

@endsection
