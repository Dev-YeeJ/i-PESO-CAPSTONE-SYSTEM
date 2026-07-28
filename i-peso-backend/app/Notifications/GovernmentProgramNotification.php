<?php

namespace App\Notifications;

use App\Models\GovernmentProgram;
use App\Models\ProgramApplication;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class GovernmentProgramNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly GovernmentProgram $program,
        private readonly string $event,
        private readonly ?ProgramApplication $application = null,
        private readonly ?string $message = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $status = $this->application?->application_status;
        $content = $this->message ?? match ($this->event) {
            'application_submitted' => "A new application was submitted for {$this->program->program_name}.",
            'application_status_changed' => "Your application for {$this->program->program_name} is now ".str_replace('_', ' ', (string) $status).'.',
            'recommendation_opened' => "A training program aligned with your career goals is now open: {$this->program->program_name}.",
            'employer_recommendation' => "An employer recommended {$this->program->program_name} to help strengthen your application.",
            default => "There is an update for {$this->program->program_name}.",
        };

        return [
            'type' => 'government_program',
            'event' => $this->event,
            'title' => match ($this->event) {
                'application_submitted' => 'New program application',
                'application_status_changed' => 'Program application updated',
                'recommendation_opened' => 'Recommended training is open',
                'employer_recommendation' => 'Employer upskill recommendation',
                default => 'Government program update',
            },
            'message' => $content,
            'program_id' => $this->program->program_id,
            'application_id' => $this->application?->prog_apply_id,
            'status' => $status,
            'action_url' => $this->event === 'application_submitted'
                ? "/admin/government-programs/{$this->program->program_id}/applications"
                : "/seeker/government-programs/{$this->program->program_id}",
        ];
    }
}
