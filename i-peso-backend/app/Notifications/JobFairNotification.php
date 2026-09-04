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
        $companyName = $notifiable->company_name ?: $notifiable->trade_name ?: 'Sir/Madam';
        $venue = collect([$this->fair->venue, $this->fair->specific_address, $this->fair->barangay, $this->fair->city_municipality, $this->fair->province])
            ->filter()->unique()->join(', ');
        $contactEmail = $this->fair->contact_email ?: config('peso_knowledge.office.email');
        $deadline = $this->fair->submission_deadline?->format('F j, Y');
        $maxReps = $this->fair->maximum_representatives ?? 2;

        $requirementLines = ($this->outstandingRequirements ?? collect())->pluck('label');

        $mail = (new MailMessage)
            ->subject("Invitation: {$this->fair->title}")
            ->greeting("Dear {$companyName},")
            ->line('The City Government of Urdaneta thru the Public Employment Services Office (PESO), in partnership '
                .'with the Department of Labor and Employment (DOLE)'.$this->partnerAgenciesClause().', will be holding '
                ."\"{$this->fair->title}\" on {$this->eventDateLine()} from ".$this->formatTime($this->fair->start_time)
                .' to '.$this->formatTime($this->fair->end_time)." at {$venue}.")
            ->line('In line with this, we would like to invite your company to participate and conduct recruitment '
                .'activities and on-the-spot interviews during the event. To confirm your participation, kindly '
                .'coordinate with our PESO representative through the i-PESO employer portal.');

        if ($requirementLines->isNotEmpty()) {
            $mail->line('Please prepare and submit the following documentary requirements'
                .($deadline ? " on or before {$deadline}" : '').':');
            foreach ($requirementLines as $line) {
                $mail->line("- {$line}");
            }
        } else {
            $mail->line('Your accreditation documents already on file with PESO cover every requirement for this '
                .'event — nothing further to submit.');
        }

        $mail->line('Additionally, we request that you bring two (2) printed copies of your job vacancy listings on '
                .'the day of the job fair for posting in the job shopping area. Please note that snacks and lunch '
                .'will be provided for a maximum of '.$maxReps.' company representative'.($maxReps == 1 ? '' : 's').'.')
            ->action('Respond in i-PESO', rtrim(config('app.frontend_url', config('app.url')), '/').'/employer/job-fairs')
            ->line("We would greatly appreciate your participation. Thank you and more power.")
            ->salutation("Very truly yours,\nPESO Urdaneta City ({$contactEmail})");

        return $mail;
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
