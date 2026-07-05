<?php

namespace App\Notifications;

class InterviewScheduledNotification extends InterviewBaseNotification
{
    protected function notificationType(): string
    {
        return 'scheduled';
    }
}
