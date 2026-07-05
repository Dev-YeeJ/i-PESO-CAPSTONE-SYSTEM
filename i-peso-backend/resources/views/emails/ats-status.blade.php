@extends('emails.layouts.premium')

@section('title', 'i-PESO application status update')
@section('preheader', 'There is an update for your '.$jobTitle.' application at '.$companyName.'.')

@section('content')
    @if($status === 'pending')
        <span class="eyebrow">Application submitted</span>
        <h1>Your application was sent</h1>
        <p>Hello {{ $seekerName }},</p>
        <p>Your i-PESO profile was securely sent to <strong>{{ $companyName }}</strong> for the <strong>{{ $jobTitle }}</strong> position.</p>
        <div class="panel panel-accent text-center">
            <p class="detail-label">Smart match score</p>
            <div style="color:#1d4ed8;font-size:38px;font-weight:800;line-height:46px;">{{ $matchScore }}%</div>
            <p class="helper" style="margin-top:6px;">Calculated from your current profile and the vacancy requirements.</p>
        </div>
        <p>We will notify you when the employer reviews or updates your application.</p>
    @elseif($status === 'reviewed')
        <span class="eyebrow eyebrow-purple">Under review</span>
        <h1>Your profile is being reviewed</h1>
        <p>Hello {{ $seekerName }},</p>
        <p><strong>{{ $companyName }}</strong> has opened your application for <strong>{{ $jobTitle }}</strong> and is reviewing your qualifications.</p>
        <div class="panel panel-accent"><p>Your application remains active. Keep your contact information current so the employer can reach you.</p></div>
    @elseif($status === 'shortlisted')
        <span class="eyebrow eyebrow-warning">Shortlisted</span>
        <h1>You made the shortlist</h1>
        <p>Congratulations, {{ $seekerName }}.</p>
        <p><strong>{{ $companyName }}</strong> shortlisted your application for <strong>{{ $jobTitle }}</strong>.</p>
        <div class="panel panel-warning"><p>Keep your phone and email available. The employer may schedule an interview next.</p></div>
    @elseif($status === 'interview')
        <span class="eyebrow">Interview scheduled</span>
        <h1>Your interview details are ready</h1>
        <p>Hello {{ $seekerName }},</p>
        <p><strong>{{ $companyName }}</strong> invited you to interview for <strong>{{ $jobTitle }}</strong>.</p>
        <div class="panel panel-accent">
            <p class="detail-label">Date and time</p>
            <p class="detail-value">{{ $interviewDate }}</p>
            <p class="detail-label" style="margin-top:16px;">Interview mode</p>
            <p class="detail-value">{{ $interviewMode }}</p>
            @if($interviewVenue)
                <p class="detail-label" style="margin-top:16px;">Venue or meeting link</p>
                @if(filter_var($interviewVenue, FILTER_VALIDATE_URL))
                    <p style="margin:4px 0 0;word-break:break-word;"><a href="{{ $interviewVenue }}" style="color:#1d4ed8;font-weight:700;">{{ $interviewVenue }}</a></p>
                @else
                    <p class="detail-value" style="margin-top:4px;">{{ $interviewVenue }}</p>
                @endif
            @endif
            @if($interviewInstructions)
                <p class="detail-label" style="margin-top:16px;">Employer instructions</p>
                <p style="margin:4px 0 0;">{{ $interviewInstructions }}</p>
            @endif
        </div>
        <p>Please prepare early and arrive or join at least ten minutes before the scheduled time.</p>
    @elseif($status === 'hired')
        <span class="eyebrow eyebrow-success">Placement confirmed</span>
        <h1>You have been hired</h1>
        <p>Congratulations, {{ $seekerName }}.</p>
        <p><strong>{{ $companyName }}</strong> recorded your placement for <strong>{{ $jobTitle }}</strong>.</p>
        <div class="panel panel-success"><p>Your employment placement is now reflected in i-PESO. Urdaneta City PESO wishes you success in your new role.</p></div>
    @elseif($status === 'rejected')
        <span class="eyebrow eyebrow-danger">Application update</span>
        <h1>An update on your application</h1>
        <p>Hello {{ $seekerName }},</p>
        <p>You were not selected for the <strong>{{ $jobTitle }}</strong> position at <strong>{{ $companyName }}</strong> at this time.</p>
        <div class="panel"><p><strong>Keep going.</strong> Your i-PESO profile can be reused for other active vacancies that match your skills.</p></div>
    @else
        <span class="eyebrow">Application update</span>
        <h1>Your application status changed</h1>
        <p>Hello {{ $seekerName }},</p>
        <p>Open i-PESO to review the latest status of your application for <strong>{{ $jobTitle }}</strong> at <strong>{{ $companyName }}</strong>.</p>
    @endif

    <div class="button-wrap">
        <a href="{{ $url }}" class="button button-gold">{{ $status === 'rejected' ? 'Find other vacancies' : 'Track application' }}</a>
    </div>
@endsection
