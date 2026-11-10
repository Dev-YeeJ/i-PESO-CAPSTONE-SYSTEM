<?php

namespace App\Listeners;

use App\Events\ApplicationStatusChanged;
use App\Services\Feedback\ReviewInvitations;
use App\Support\FeedbackAspects;

/**
 * Once the employer decides (Hired or Rejected), invite the applicant to
 * rate how the hiring was handled. Reviews are possible earlier too, from
 * My Applications; the decision is just the natural moment to ask.
 */
class SendReviewInvitation
{
    public function __construct(private readonly ReviewInvitations $invitations) {}

    public function handle(ApplicationStatusChanged $event): void
    {
        $application = $event->application;

        if (! in_array($application->status, ['hired', 'rejected'], true)) {
            return;
        }

        try {
            $this->invitations->inviteForApplication($application, FeedbackAspects::RECRUITMENT);
        } catch (\Throwable $exception) {
            report($exception);
        }
    }
}
