@extends('emails.layouts.premium')

@section('content')

@if($status === 'pending')
    <span class="badge badge-blue">Application Sent</span>
    <h1>Your application is on its way!</h1>
    <p>Hello {{ $seekerName }},</p>
    <p>Your NSRP Profile has been securely forwarded to <strong>{{ $companyName }}</strong> for the <strong>{{ $jobTitle }}</strong> position.</p>
    
    <div class="card-inner text-center">
        <p style="margin-bottom: 8px; color: #64748b; font-size: 14px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Smart Match Score</p>
        <div style="font-size: 36px; font-weight: 700; color: #0284c7;">{{ $matchScore }}%</div>
        <p style="margin-top: 8px; font-size: 14px;">Your skills strongly align with this position.</p>
    </div>
    
    <p>We will notify you the moment the employer reviews your application.</p>

@elseif($status === 'reviewed')
    <span class="badge badge-purple">Under Review</span>
    <h1>Your profile is being reviewed</h1>
    <p>Good news, {{ $seekerName }}!</p>
    <p>The HR team at <strong>{{ $companyName }}</strong> has opened your application and is currently reviewing your profile for the <strong>{{ $jobTitle }}</strong> position.</p>
    <p>Fingers crossed! We will let you know if you are shortlisted.</p>

@elseif($status === 'shortlisted')
    <span class="badge badge-yellow" style="background-color: #fef9c3; color: #a16207;">Shortlisted</span>
    <h1>You made the shortlist! 🎉</h1>
    <p>Congratulations, {{ $seekerName }}!</p>
    <p><strong>{{ $companyName }}</strong> was impressed by your profile and has shortlisted your application for <strong>{{ $jobTitle }}</strong>. Your skills really stood out!</p>
    <p>Keep your lines open as they may schedule an interview soon.</p>

@elseif($status === 'interview')
    <span class="badge badge-blue" style="background-color: #e0e7ff; color: #4338ca;">Interview Scheduled</span>
    <h1>It's time for your interview!</h1>
    <p>Hello {{ $seekerName }},</p>
    <p><strong>{{ $companyName }}</strong> has invited you for an interview for the <strong>{{ $jobTitle }}</strong> position.</p>
    
    <div class="card-inner" style="border-left: 4px solid #4338ca;">
        <h3 style="margin-top: 0; color: #1e1b4b; font-size: 18px;">Interview Details</h3>
        <p style="margin-bottom: 8px;"><strong>Date & Time:</strong> {{ $interviewDate }}</p>
        <p style="margin-bottom: 8px;"><strong>Mode:</strong> {{ $interviewMode }}</p>
        
        @if($interviewVenue)
            <p style="margin-bottom: 8px;"><strong>Venue/Link:</strong> <a href="{{ $interviewVenue }}" style="color: #0284c7;">{{ $interviewVenue }}</a></p>
        @endif
        
        @if($interviewInstructions)
            <p style="margin-top: 16px; margin-bottom: 0;"><strong>Instructions:</strong><br/>{{ $interviewInstructions }}</p>
        @endif
    </div>
    <p>Please prepare accordingly and arrive (or log in) at least 10 minutes early. Good luck!</p>

@elseif($status === 'hired')
    <span class="badge badge-green">Hired</span>
    <h1 style="color: #15803d;">You got the job! 🎊</h1>
    <p>Congratulations, {{ $seekerName }}!</p>
    <p><strong>{{ $companyName }}</strong> has officially recorded your placement for <strong>{{ $jobTitle }}</strong>.</p>
    <p>Your active job seeker status has been updated in our system. The Urdaneta City PESO wishes you the absolute best in your new career journey!</p>

@elseif($status === 'rejected')
    <span class="badge badge-red">Status Update</span>
    <h1>Update on your application</h1>
    <p>Hello {{ $seekerName }},</p>
    <p>Thank you for your interest in the <strong>{{ $jobTitle }}</strong> role at <strong>{{ $companyName }}</strong>.</p>
    <p>Unfortunately, the position has been filled or you were not selected at this time.</p>
    <div class="card-inner">
        <p><strong>Don't give up!</strong> We've found new jobs that match your skills. Click below to view your latest Smart Matches.</p>
    </div>

@endif

<div class="text-center mt-8">
    <a href="{{ $url }}" class="button">
        {{ $status === 'rejected' ? 'View Smart Matches' : 'View Dashboard' }}
    </a>
</div>

@endsection
