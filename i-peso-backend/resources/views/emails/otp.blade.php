<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>i-PESO Email Verification</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          {{-- ── HEADER ── --}}
          <tr>
            <td style="background-color:#1e40af;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:2px;color:#93c5fd;text-transform:uppercase;">
                Republic of the Philippines
              </p>
              <h1 style="margin:8px 0 4px;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                i-PESO
              </h1>
              <p style="margin:0;font-size:13px;color:#bfdbfe;font-weight:400;">
                Public Employment Service Office — Urdaneta City
              </p>
            </td>
          </tr>

          {{-- ── BODY ── --}}
          <tr>
            <td style="background-color:#ffffff;padding:40px 40px 32px;">

              <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1e293b;">
                Email Verification
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">
                Please use the 6-digit code below to verify your i-PESO account.
                This code is valid for <strong style="color:#1e40af;">10 minutes</strong>.
              </p>

              {{-- OTP Display --}}
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:28px 0;">
                    <div style="display:inline-block;background-color:#eff6ff;border:2px solid #bfdbfe;border-radius:12px;padding:20px 40px;">
                      <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:2px;color:#3b82f6;text-transform:uppercase;">
                        Your Verification Code
                      </p>
                      <p style="margin:0;font-size:44px;font-weight:700;color:#1e40af;letter-spacing:10px;font-family:'Courier New',Courier,monospace;">
                        {{ $otpCode }}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;line-height:1.6;">
                If you did not create an i-PESO account, you can safely ignore this email.
                Do not share this code with anyone.
              </p>

            </td>
          </tr>

          {{-- ── FOOTER ── --}}
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">
                This is an automated message from the i-PESO System.
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Urdaneta City PESO — DOLE Region I &bull; Pangasinan, Philippines
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>