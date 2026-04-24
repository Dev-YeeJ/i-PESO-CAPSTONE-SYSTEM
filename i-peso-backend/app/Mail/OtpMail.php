<?php
// i-peso-backend/app/Mail/OtpMail.php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * The 6-digit OTP code to embed in the email.
     * Public so the Blade template can access it directly.
     */
    public string $otpCode;

    /**
     * @param string $otpCode  The 6-digit numeric verification code.
     */
    public function __construct(string $otpCode)
    {
        $this->otpCode = $otpCode;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your i-PESO Verification Code',
        );
    }

    public function content(): Content
    {
        return new Content(
            // Points to: resources/views/emails/otp.blade.php
            view: 'emails.otp',
        );
    }
}