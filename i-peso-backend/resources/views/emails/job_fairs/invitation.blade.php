@extends('emails.layouts.premium')

@section('title', 'Invitation: ' . $fair->title)
@section('preheader', $fair->title . ' — ' . $dateLine . '. PESO invites your company to participate.')

@section('content')
    <span class="eyebrow">Job Fair Invitation</span>
    <p class="helper" style="margin:-6px 0 24px;">{{ now()->format('F j, Y') }}</p>

    <p style="margin:0 0 4px;">{{ $recipientName }}@if($recipientDesignation), {{ $recipientDesignation }}@endif</p>
    <p style="margin:0 0 28px;font-weight:800;color:#0f172a;">{{ $companyName }}</p>

    <p>Dear {{ $greetingName }},</p>

    <p>
        The City Government of Urdaneta thru the Public Employment Service Office (PESO), in partnership with the
        Department of Labor and Employment (DOLE){{ $partnerAgenciesClause }}, will be holding
        <strong>&ldquo;{{ $fair->title }}&rdquo;</strong> on <strong>{{ $dateLine }}</strong> from
        <strong>{{ $startTime }}</strong> to <strong>{{ $endTime }}</strong> at <strong>{{ $venue }}</strong>.
    </p>

    <p>
        In line with this, we would like to invite your company to participate and conduct recruitment activities
        and on-the-spot interviews during the event. To confirm your participation, kindly coordinate with our PESO
        representative through the i-PESO employer portal.
    </p>

    @if($requirementLines->isNotEmpty())
        <div class="panel panel-accent">
            <p class="detail-label">Documentary requirements{{ $deadline ? ' — due ' . $deadline : '' }}</p>
            <p style="margin:0;">
                @foreach($requirementLines as $line)
                    &bull; {{ $line }}@if(!$loop->last)<br>@endif
                @endforeach
            </p>
        </div>
    @else
        <div class="panel panel-success">
            <p style="margin:0;">Your accreditation documents already on file with PESO cover every requirement for
                this event — there is nothing further to submit.</p>
        </div>
    @endif

    <p>
        Additionally, we request that you bring two (2) printed copies of your job vacancy listings on the day of
        the job fair for posting in the job shopping area. Please note that snacks and lunch will be provided for a
        maximum of <strong>{{ $maxReps }}</strong> company representative{{ $maxReps == 1 ? '' : 's' }}.
    </p>

    <div class="button-wrap">
        <a href="{{ $actionUrl }}" class="button button-gold">Respond in i-PESO</a>
    </div>

    <p>We would greatly appreciate your participation. Thank you and more power.</p>

    <p style="margin-bottom:0;">Very truly yours,</p>
    <p style="margin-top:2px;font-weight:800;color:#0f172a;">PESO Urdaneta City</p>
    <p class="helper" style="margin-top:-14px;">{{ $contactEmail }}</p>
@endsection
