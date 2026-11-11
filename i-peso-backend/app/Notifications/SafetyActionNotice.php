<?php

namespace App\Notifications;

use App\Models\Employer;
use App\Notifications\Channels\ExpoPushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;

/**
 * Tells a reported employer or job seeker about an administrative action that
 * directly affects their account or vacancy. Only sent when PESO records such
 * an action — never because a report was filed. It never names the reporter
 * or quotes the report; the message is the notice PESO wrote for them.
 *
 * Email goes out too: a suspended user cannot sign in to read the bell.
 */
class SafetyActionNotice extends Notification
{
    use Queueable;

    public function __construct(
        public string $action,
        public string $notice,
        public ?Carbon $endsAt = null,
        public ?string $vacancyTitle = null,
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (filled($notifiable->email ?? null)) {
            $channels[] = 'mail';
        }
        if (! $notifiable instanceof Employer) {
            $channels[] = ExpoPushChannel::class;
        }

        return $channels;
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'safety_action_notice',
            'action' => $this->action,
            'title' => $this->title(),
            'message' => $this->summary().' '.$this->notice,
            'action_url' => $notifiable instanceof Employer ? '/employer/dashboard' : '/seeker/dashboard',
        ];
    }

    public function toExpoPush(object $notifiable): array
    {
        return [
            'title' => $this->title(),
            'body' => $this->summary(),
            'data' => ['type' => 'safety_action_notice', 'action' => $this->action],
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $name = $notifiable instanceof Employer
            ? ($notifiable->company_name ?: 'Employer')
            : (trim(($notifiable->first_name ?? '').' '.($notifiable->last_name ?? '')) ?: 'Job seeker');

        return (new MailMessage)
            ->subject($this->title().' — i-PESO Urdaneta')
            ->view('emails.safety-notice', [
                'title' => $this->title(),
                'recipientName' => $name,
                'summary' => $this->summary(),
                'notice' => $this->notice,
                'severe' => in_array($this->action, ['suspend_account', 'restrict_account', 'hide_vacancy'], true),
                'portalUrl' => rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/'),
                'canSignIn' => $this->action !== 'suspend_account',
            ]);
    }

    private function title(): string
    {
        return match ($this->action) {
            'warning' => 'Notice from PESO Urdaneta',
            'request_verification' => 'PESO requests additional verification',
            'request_clarification' => 'PESO requests clarification on your profile',
            'hide_vacancy' => 'A job vacancy was temporarily hidden',
            'restore_vacancy' => 'Your job vacancy can be reopened',
            'restrict_account' => 'Some account activities are restricted',
            'suspend_account' => 'Your i-PESO account is suspended',
            'lift_restriction' => 'Your account restriction has been lifted',
            default => 'Notice from PESO Urdaneta',
        };
    }

    private function summary(): string
    {
        $until = $this->endsAt ? ' until '.$this->endsAt->timezone('Asia/Manila')->format('F j, Y') : '';
        $vacancy = $this->vacancyTitle ? "\"{$this->vacancyTitle}\"" : 'One of your job vacancies';

        return match ($this->action) {
            'hide_vacancy' => "{$vacancy} is hidden from job seekers while PESO reviews a concern.",
            'restore_vacancy' => "{$vacancy} is no longer on hold. You can reopen it from your vacancies.",
            'restrict_account' => "PESO has restricted some activities on your account{$until} following a review.",
            'suspend_account' => "PESO has suspended your account{$until} following a review.",
            'lift_restriction' => 'You can use all i-PESO features again.',
            default => 'PESO Urdaneta has sent you a notice following a review.',
        };
    }
}
