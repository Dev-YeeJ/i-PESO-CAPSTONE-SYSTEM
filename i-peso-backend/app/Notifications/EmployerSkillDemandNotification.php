<?php

namespace App\Notifications;

use App\Models\EmployerSkillDemand;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class EmployerSkillDemandNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly EmployerSkillDemand $demand,
        private readonly string $event,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $submitted = $this->event === 'submitted';

        return [
            'type' => 'employer_skill_demand',
            'event' => $this->event,
            'title' => $submitted ? 'New employer skill demand' : 'Skill demand updated',
            'message' => $submitted
                ? "{$this->demand->employer?->company_name} requested training support for {$this->demand->skill_name}."
                : "PESO marked your {$this->demand->skill_name} demand as ".str_replace('_', ' ', $this->demand->status).'.',
            'demand_id' => $this->demand->demand_id,
            'status' => $this->demand->status,
            'linked_program_id' => $this->demand->linked_program_id,
            'action_url' => $submitted ? '/admin/employer-skill-demands' : '/employer/upskill-needs',
        ];
    }
}
