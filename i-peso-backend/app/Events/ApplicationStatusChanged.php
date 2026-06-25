<?php

namespace App\Events;

use App\Models\Application;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ApplicationStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $application;

    /**
     * Create a new event instance.
     */
    public function __construct(Application $application)
    {
        $this->application = $application;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('seeker.' . $this->application->seeker_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'application_id' => $this->application->apply_id,
            'job_title' => $this->application->jobVacancy->job_title ?? 'A job',
            'company_name' => $this->application->jobVacancy->employer->company_name ?? 'A company',
            'status' => $this->application->status,
        ];
    }
}
