<?php

namespace App\Notifications;

use App\Notifications\Channels\SmsChannel;
use App\Services\Sms\SmsMessageTemplates;
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
    }

    public function via(object $notifiable): array
    {
        return ['database', 'mail', SmsChannel::class];
    }

    public function toSms(object $notifiable): array
    {
        return [
            'phone_number' => $notifiable->representative_contact_number ?: $notifiable->mobile_number,
            'content' => SmsMessageTemplates::employerVerification($this->status),
            'purpose' => 'employer_verification',
            'metadata' => ['verification_status' => $this->status],
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $approved = $this->status === 'verified';
        $title = $approved ? 'Your i-PESO employer account is verified' : 'Update on your i-PESO employer application';
        $message = $approved
            ? 'PESO has verified your employer account. You can now access the verified employer features and post job vacancies.'
            : 'PESO reviewed your employer application and it requires changes before it can be verified.';
        
        return (new MailMessage)
            ->subject($title)
            ->view('emails.employer-verification', [
                'title' => $title,
                'message' => $message,
                'status' => $approved ? 'progress' : 'action_required',
                'documentType' => null,
                'documentLabel' => null,
                'remarks' => $this->remarks,
                'actionLabel' => 'Open i-PESO',
                'actionUrl' => $this->actionUrl(),
            ]);
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
