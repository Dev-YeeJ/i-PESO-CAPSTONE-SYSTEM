@extends('emails.layouts.premium')

@section('title', $title)
@section('preheader', $summary)

@section('content')
    <span class="eyebrow {{ $severe ? 'eyebrow-danger' : '' }}">PESO notice</span>
    <h1>{{ $title }}</h1>
    <p>Hello {{ $recipientName }},</p>
    <p>{{ $summary }}</p>

    <div class="panel {{ $severe ? 'panel-danger' : 'panel-warning' }}">
        <p class="detail-label">Notice from PESO Urdaneta</p>
        <p style="margin:6px 0 0;">{{ $notice }}</p>
    </div>

    @if($canSignIn)
        <div class="button-wrap">
            <a href="{{ $portalUrl }}" class="button button-gold">Open i-PESO</a>
        </div>
    @endif
    <p class="helper text-center">
        This decision was made by an authorized PESO administrator after a review.
        @php($office = app(\App\Services\SiteContentService::class)->office())
        For questions or to respond, visit the PESO office{{ $office['address'] ? ' at '.$office['address'] : '' }}@if($office['email']) or email {{ $office['email'] }}@endif.
    </p>
@endsection
