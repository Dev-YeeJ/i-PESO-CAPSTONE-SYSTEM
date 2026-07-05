<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interview Update</title>
</head>
<body style="font-family: Arial, sans-serif; background:#f5f7fb; padding:24px; color:#111827;">
    <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 35px rgba(15,23,42,0.08);">
        <div style="background:linear-gradient(135deg, #2563eb, #1d4ed8); padding:24px 32px; color:white;">
            <h1 style="margin:0; font-size:24px;">Interview Update</h1>
            <p style="margin:8px 0 0; opacity:0.95;">{{ $bodyMessage }}</p>
        </div>
        <div style="padding:28px 32px;">
            <p style="margin:0 0 12px;">Hello {{ $recipientName }},</p>
            <p style="margin:0 0 16px; line-height:1.6;">This message is to keep you informed about your upcoming interview.</p>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:16px;">
                <p style="margin:0 0 6px; font-weight:bold;">Job title</p>
                <p style="margin:0 0 12px;">{{ $jobTitle }}</p>
                <p style="margin:0 0 6px; font-weight:bold;">Employer</p>
                <p style="margin:0 0 12px;">{{ $companyName }}</p>
                <p style="margin:0 0 6px; font-weight:bold;">Applicant</p>
                <p style="margin:0 0 12px;">{{ $applicantName }}</p>
                <p style="margin:0 0 6px; font-weight:bold;">Scheduled at</p>
                <p style="margin:0 0 12px;">{{ $scheduledAt }}</p>
                <p style="margin:0 0 6px; font-weight:bold;">Mode</p>
                <p style="margin:0 0 12px;">{{ $mode }}</p>
                <p style="margin:0 0 6px; font-weight:bold;">Location / link</p>
                <p style="margin:0 0 12px;">{{ $location }}</p>
                <p style="margin:0 0 6px; font-weight:bold;">Notes</p>
                <p style="margin:0;">{{ $notes }}</p>
            </div>
            <p style="margin:0 0 16px; line-height:1.6;">Please prepare your resume, certificates, and valid ID before the interview.</p>
            <a href="{{ $url }}" style="display:inline-block; padding:12px 18px; background:#2563eb; color:white; text-decoration:none; border-radius:999px; font-weight:bold;">View application</a>
        </div>
    </div>
</body>
</html>
