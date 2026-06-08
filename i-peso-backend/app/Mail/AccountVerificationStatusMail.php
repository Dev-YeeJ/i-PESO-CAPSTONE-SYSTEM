<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AccountVerificationStatusMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $recipientName,
        public string $accountType,
        public string $status,
        public ?string $remarks = null,
        public string $portalUrl = '',
    ) {
        $this->portalUrl = $portalUrl ?: rtrim(
            (string) config('app.frontend_url', 'http://localhost:5173'),
            '/'
        ).'/login';
    }

    public function envelope(): Envelope
    {
        $label = $this->status === 'verified' ? 'Approved' : 'Needs Attention';

        return new Envelope(
            subject: "i-PESO {$this->accountType} Verification: {$label}",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.account-verification-status');
    }
}
