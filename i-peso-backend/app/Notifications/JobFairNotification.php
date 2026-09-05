<?php

namespace App\Notifications;

use App\Models\JobFair;
use App\Models\JobFairEmployer;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;

class JobFairNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly JobFair $fair,
        private readonly string $event,
        private readonly ?JobFairEmployer $participation = null,
        /** Employer-specific, already trimmed for company type + documents on file. Only used for the 'invited' email. */
        private readonly ?Collection $outstandingRequirements = null,
    ) {}

    public function via(object $notifiable): array
    {
        // Only the formal invitation is worth a full email — the other
        // events (interest submitted, results submitted, etc.) stay
        // database + SMS, matching how they already behaved.
        return $this->event === 'invited'
            ? ['database', SmsChannel::class, 'mail']
            : ['database', SmsChannel::class];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $companyName = $notifiable->company_name ?: $notifiable->trade_name ?: 'Your Company';
        $venue = collect([$this->fair->venue, $this->fair->specific_address, $this->fair->barangay, $this->fair->city_municipality, $this->fair->province])
            ->filter()->unique()->join(', ');

        // The registered representative's name/designation are on file from
        // employer registration — use them instead of a blank "HR Manager"
        // line whenever the employer actually named one.
        $representativeName = trim(collect([
            $notifiable->representative_first_name, $notifiable->representative_middle_name, $notifiable->representative_last_name,
        ])->filter()->join(' ')) ?: $notifiable->representative_name;
        $recipientName = $representativeName ?: 'The HR Manager';
        $greetingName = $representativeName ?: 'Sir/Madam';

        return (new MailMessage)
            ->subject("Invitation: {$this->fair->title}")
            ->view('emails.job_fairs.invitation', [
                'fair' => $this->fair,
                'companyName' => $companyName,
                'recipientName' => $recipientName,
                'recipientDesignation' => $notifiable->representative_designation,
                'greetingName' => $greetingName,
                'venue' => $venue,
                'dateLine' => $this->eventDateLine(),
                'startTime' => $this->formatTime($this->fair->start_time),
                'endTime' => $this->formatTime($this->fair->end_time),
                'partnerAgenciesClause' => $this->partnerAgenciesClause(),
                'requirementLines' => ($this->outstandingRequirements ?? collect())->pluck('label'),
                'deadline' => $this->fair->submission_deadline?->format('F j, Y'),
                'maxReps' => $this->fair->maximum_representatives ?? 2,
                'contactEmail' => $this->fair->contact_email ?: config('peso_knowledge.office.email'),
                'actionUrl' => rtrim(config('app.frontend_url', config('app.url')), '/').'/employer/job-fairs',
            ]);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'job_fair', 'event' => $this->event, 'title' => $this->title(),
            'message' => $this->message(), 'job_fair_id' => $this->fair->job_fair_id,
            'participation_id' => $this->participation?->id,
            'action_url' => $notifiable instanceof \App\Models\Administrator
                ? '/admin/job-fairs/'.$this->fair->job_fair_id
                : '/employer/job-fairs',
        ];
    }

    public function toSms(object $notifiable): array
    {
        return [
            'phone_number' => $notifiable->mobile_number ?? $notifiable->representative_contact_number ?? null,
            'content' => $this->message(), 'purpose' => 'job_fair_'.$this->event,
            'metadata' => ['job_fair_id' => $this->fair->job_fair_id],
        ];
    }

    private function title(): string
    {
        return match ($this->event) {
            'invited' => 'Job Fair invitation', 'interest_submitted' => 'Employer expressed interest',
            'requirements_submitted' => 'Job Fair requirements submitted', 'results_submitted' => 'Job Fair results submitted',
            'participation_approved' => 'Job Fair participation approved', 'participation_rejected' => 'Job Fair participation update',
            default => 'Job Fair update',
        };
    }

    private function message(): string
    {
        return match ($this->event) {
            'invited' => "You are invited to {$this->fair->title}. Review the event requirements in i-PESO.",
            'interest_submitted' => "An employer expressed interest in {$this->fair->title}.",
            'requirements_submitted' => "Employer requirements were submitted for {$this->fair->title}.",
            'results_submitted' => "Post-event results were submitted for {$this->fair->title}.",
            'participation_approved' => "Your participation in {$this->fair->title} was approved.",
            'participation_rejected' => "Your participation in {$this->fair->title} requires review. Check PESO remarks.",
            default => "There is an update for {$this->fair->title}.",
        };
    }

    /** ", and The CB Mall Urdaneta City" style clause built from partner_agencies, DOLE excluded (already named). */
    private function partnerAgenciesClause(): string
    {
        $others = collect($this->fair->partner_agencies ?? [])
            ->filter(fn ($name) => stripos((string) $name, 'dole') === false)
            ->filter();

        return $others->isEmpty() ? '' : ' and '.$others->join(', ');
    }

    /** "May 1, 2026, Friday" for a single-day event, "May 1 to May 3, 2026" for a multi-day one. */
    private function eventDateLine(): string
    {
        $start = $this->fair->start_date ?? $this->fair->event_date;
        $end = $this->fair->end_date ?? $start;

        if (! $start) {
            return 'a date to be announced';
        }

        if (! $end || $start->isSameDay($end)) {
            return $start->format('F j, Y, l');
        }

        return $start->format('F j').' to '.$end->format('F j, Y');
    }

    private function formatTime(?string $time): string
    {
        if (! $time) {
            return 'a time to be announced';
        }

        try {
            return \Illuminate\Support\Carbon::createFromFormat('H:i:s', strlen($time) > 5 ? $time : $time.':00')->format('g:i A');
        } catch (\Throwable) {
            return $time;
        }
    }
}
