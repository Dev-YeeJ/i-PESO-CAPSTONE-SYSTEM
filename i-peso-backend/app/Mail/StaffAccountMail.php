<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

/**
 * Sign-in details for a staff account: sent when the account is created
 * ("invite") and when the system administrator issues a new temporary
 * password ("reset").
 *
 * Deliberately not queued: this host runs no queue worker, and the admin's
 * screen must know right away whether the email went out, so it can show
 * the password instead when it didn't.
 */
class StaffAccountMail extends Mailable
{
    use Queueable, SerializesModels;

    public const INVITE = 'invite';

    public const RESET = 'reset';

    public string $signInUrl;

    public function __construct(
        public string $recipientName,
        public ?string $positionLabel,
        public string $email,
        public string $temporaryPassword,
        public Carbon $expiresAt,
        public string $kind = self::INVITE,
    ) {
        $this->signInUrl = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/').'/administrator';
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->kind === self::RESET
                ? 'Your new i-PESO staff password'
                : 'Your i-PESO staff account',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.staff-account');
    }
}
