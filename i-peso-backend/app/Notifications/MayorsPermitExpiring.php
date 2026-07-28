<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MayorsPermitExpiring extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $daysLeft,
        public ?string $expirationDate = null,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $expired = $this->daysLeft <= 0;
        $when = $expired
            ? 'has expired'
            : "expires in {$this->daysLeft} day".($this->daysLeft === 1 ? '' : 's');

        $mail = (new MailMessage)
            ->subject($expired ? "Your Mayor's Permit has expired" : "Your Mayor's Permit is expiring soon")
            ->greeting('Hello '.($notifiable->company_name ?: 'Employer').',')
            ->line("Your registered Mayor's Permit on file with i-PESO {$when}.");

        if ($this->expirationDate) {
            $mail->line('Expiration date: '.$this->expirationDate);
        }

        return $mail
            ->line('Please upload a renewed permit to keep your employer account in good standing and avoid interruptions to your job postings.')
            ->action('Update your documents', $this->actionUrl())
            ->line('Thank you for keeping your records up to date.');
    }

    public function toArray(object $notifiable): array
    {
        $expired = $this->daysLeft <= 0;

        return [
            'title' => $expired ? "Mayor's Permit expired" : "Mayor's Permit expiring soon",
            'message' => $expired
                ? "Your Mayor's Permit has expired. Upload a renewed permit to keep your account active."
                : "Your Mayor's Permit expires in {$this->daysLeft} day".($this->daysLeft === 1 ? '' : 's').'. Please upload a renewed permit.',
            'days_left' => $this->daysLeft,
            'expiration_date' => $this->expirationDate,
            'action_url' => '/employer/dashboard',
            'employer_id' => $notifiable->getKey(),
        ];
    }

    private function actionUrl(): string
    {
        return rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/').'/employer/dashboard';
    }
}
