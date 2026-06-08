<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>i-PESO Account Verification</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;background:#f1f5f9;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
                    <tr>
                        <td style="background:#1d4ed8;padding:28px 36px;text-align:center;color:#ffffff;">
                            <div style="font-size:26px;font-weight:700;">i-PESO</div>
                            <div style="margin-top:5px;font-size:13px;color:#bfdbfe;">Urdaneta City Public Employment Service Office</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 36px;">
                            <p style="margin:0 0 16px;">Hello {{ $recipientName }},</p>

                            @if ($status === 'verified')
                                <h1 style="margin:0 0 12px;font-size:22px;color:#15803d;">Your {{ strtolower($accountType) }} account is approved</h1>
                                <p style="margin:0 0 16px;line-height:1.6;color:#475569;">
                                    PESO has completed the review of your account. You may now use the verified features available to your account.
                                </p>
                            @else
                                <h1 style="margin:0 0 12px;font-size:22px;color:#b91c1c;">Your {{ strtolower($accountType) }} account needs attention</h1>
                                <p style="margin:0 0 16px;line-height:1.6;color:#475569;">
                                    PESO could not approve your account at this time. Please review the reason below and update or clarify your information with PESO.
                                </p>
                            @endif

                            @if ($remarks)
                                <div style="margin:20px 0;padding:16px;border-left:4px solid {{ $status === 'verified' ? '#22c55e' : '#ef4444' }};background:#f8fafc;">
                                    <strong>PESO remarks</strong>
                                    <p style="margin:8px 0 0;line-height:1.5;color:#334155;">{{ $remarks }}</p>
                                </div>
                            @endif

                            <p style="margin:20px 0 0;line-height:1.6;color:#475569;">
                                Sign in to i-PESO to view your current account status. Contact Urdaneta City PESO if you need assistance.
                            </p>
                            <p style="margin:24px 0 0;text-align:center;">
                                <a href="{{ $portalUrl }}" style="display:inline-block;padding:12px 22px;border-radius:8px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;">
                                    Open i-PESO
                                </a>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:18px 36px;background:#f8fafc;text-align:center;font-size:12px;color:#64748b;">
                            This is an automated account-status notification from i-PESO.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
