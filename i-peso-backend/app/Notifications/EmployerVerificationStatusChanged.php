<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmployerVerificationStatusChanged extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $status,
        public ?string $remarks = null,
    ) {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $approved = $this->status === 'verified';
        $message = (new MailMessage)
            ->subject($approved ? 'Your i-PESO employer account is verified' : 'Update on your i-PESO employer application')
            ->greeting('Hello '.($notifiable->company_name ?: 'Employer').',')
            ->line(
                $approved
                    ? 'PESO has verified your employer account. You can now access the verified employer features and post job vacancies.'
                    : 'PESO reviewed your employer application and it requires changes before it can be verified.'
            );

        if ($this->remarks) {
            $message->line(($approved ? 'Admin remarks: ' : 'Reason: ').$this->remarks);
        }

        return $message
            ->action('Open i-PESO', $this->actionUrl())
            ->line('Sign in to your employer dashboard to view your current verification status.');
    }

    public function toArray(object $notifiable): array
    {
        $approved = $this->status === 'verified';

        return [
            'title' => $approved ? 'Employer account verified' : 'Employer application needs changes',
            'message' => $approved
                ? 'Your employer account has been verified. You can now post job vacancies.'
                : 'Your employer application was not approved. Review the reason and update your requirements.',
            'status' => $this->status,
            'remarks' => $this->remarks,
            'action_url' => '/employer/dashboard',
            'employer_id' => $notifiable->getKey(),
        ];
    }

    private function actionUrl(): string
    {
        return rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/').'/employer/dashboard';
    }
}
