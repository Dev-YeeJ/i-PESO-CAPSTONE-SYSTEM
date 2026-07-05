<!DOCTYPE html>
<html lang="en">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>@yield('title', 'i-PESO Notification')</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
        table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
        table { border-collapse:collapse !important; }
        img { -ms-interpolation-mode:bicubic; }
        body { width:100% !important; margin:0 !important; padding:0 !important; background:#eef2f7; color:#334155; font-family:Arial,Helvetica,sans-serif; }
        .shell { width:100%; background:#eef2f7; padding:32px 12px; }
        .container { width:100%; max-width:620px; overflow:hidden; border:1px solid #dbe3ef; border-radius:18px; background:#ffffff; box-shadow:0 10px 30px rgba(15,23,42,.08); }
        .brand-header { padding:28px 36px 24px; background:#0a192f; text-align:center; }
        .brand-name { margin-top:10px; color:#ffffff; font-size:24px; font-weight:800; letter-spacing:-.4px; }
        .brand-name span { color:#fbbf24; }
        .brand-subtitle { margin-top:5px; color:#bfdbfe; font-size:12px; font-weight:600; line-height:18px; }
        .gold-line { height:4px; background:#fbbf24; font-size:0; line-height:0; }
        .content { padding:36px 40px; }
        h1 { margin:0 0 16px; color:#0f172a; font-size:26px; font-weight:800; line-height:34px; letter-spacing:-.4px; }
        h2, h3 { color:#0f172a; }
        p { margin:0 0 20px; color:#475569; font-size:15px; line-height:24px; }
        strong { color:#0f172a; }
        .eyebrow { display:inline-block; margin-bottom:16px; padding:6px 12px; border-radius:999px; background:#eff6ff; color:#1d4ed8; font-size:11px; font-weight:800; letter-spacing:.8px; text-transform:uppercase; }
        .eyebrow-success { background:#ecfdf5; color:#047857; }
        .eyebrow-warning { background:#fffbeb; color:#b45309; }
        .eyebrow-danger { background:#fef2f2; color:#b91c1c; }
        .eyebrow-purple { background:#f5f3ff; color:#6d28d9; }
        .panel { margin:24px 0; padding:20px; border:1px solid #dbe3ef; border-radius:14px; background:#f8fafc; }
        .panel-accent { border-left:4px solid #1d4ed8; }
        .panel-success { border-left:4px solid #10b981; background:#f0fdf4; }
        .panel-warning { border-left:4px solid #f59e0b; background:#fffbeb; }
        .panel-danger { border-left:4px solid #ef4444; background:#fef2f2; }
        .panel p:last-child { margin-bottom:0; }
        .detail-label { margin:0 0 4px; color:#64748b; font-size:11px; font-weight:800; letter-spacing:.7px; text-transform:uppercase; }
        .detail-value { margin:0; color:#0f172a; font-size:17px; font-weight:800; line-height:24px; }
        .button-wrap { margin:28px 0 8px; text-align:center; }
        .button { display:inline-block; padding:14px 24px; border-radius:10px; background:#1d4ed8; color:#ffffff !important; font-size:14px; font-weight:800; line-height:18px; text-decoration:none; }
        .button-gold { background:#fbbf24; color:#0a192f !important; }
        .helper { color:#64748b; font-size:13px; line-height:21px; }
        .footer { padding:24px 36px; border-top:1px solid #e2e8f0; background:#f8fafc; text-align:center; }
        .footer p { margin:0 0 6px; color:#64748b; font-size:12px; line-height:18px; }
        .footer a { color:#1d4ed8; font-weight:700; text-decoration:none; }
        .text-center { text-align:center; }
        @media only screen and (max-width:620px) {
            .shell { padding:0 !important; }
            .container { border-radius:0 !important; border-left:0 !important; border-right:0 !important; }
            .brand-header { padding:24px 20px 20px !important; }
            .content { padding:28px 22px !important; }
            .footer { padding:22px 20px !important; }
            h1 { font-size:23px !important; line-height:30px !important; }
        }
    </style>
</head>
<body>
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">@yield('preheader', 'An update from i-PESO Urdaneta City.')</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="shell">
        <tr>
            <td align="center">
                <table role="presentation" width="620" cellpadding="0" cellspacing="0" class="container">
                    <tr>
                        <td class="brand-header">
                            @include('emails.partials.brand-logo')
                            <div class="brand-name">i-<span>PESO</span></div>
                            <div class="brand-subtitle">Urdaneta City Public Employment Service Office</div>
                        </td>
                    </tr>
                    <tr><td class="gold-line">&nbsp;</td></tr>
                    <tr><td class="content">@yield('content')</td></tr>
                    <tr>
                        <td class="footer">
                            <p><strong>i-PESO Employment Portal</strong></p>
                            <p>Urdaneta City Public Employment Service Office</p>
                            <p><a href="{{ rtrim((string) config('app.frontend_url'), '/') }}">Open the i-PESO website</a></p>
                            <p style="margin-top:10px;">This is an automated service notification. Please do not reply.</p>
                            <p>&copy; {{ date('Y') }} i-PESO Urdaneta City</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
