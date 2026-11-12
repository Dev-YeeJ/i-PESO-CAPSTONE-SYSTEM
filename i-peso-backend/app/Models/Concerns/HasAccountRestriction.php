<?php

namespace App\Models\Concerns;

/**
 * Account restriction set by a PESO administrator after reviewing a safety
 * report. Shared by employers and job seekers.
 *
 *  - limited:   can sign in, but cannot start new activity (employers: no new
 *               or reopened vacancies; job seekers: no new applications)
 *  - suspended: cannot sign in at all
 *
 * A restriction with an end date lapses on its own once that date passes, so
 * nothing has to run on a schedule to release it.
 */
trait HasAccountRestriction
{
    public const RESTRICTION_LIMITED = 'limited';

    public const RESTRICTION_SUSPENDED = 'suspended';

    public function initializeHasAccountRestriction(): void
    {
        $this->mergeCasts([
            'restriction_ends_at' => 'datetime',
            'restricted_at' => 'datetime',
        ]);

        // PESO's internal justification and case link never go out with the
        // account's own profile or any other serialized copy of the model.
        $this->hidden = array_values(array_unique([...$this->hidden, 'restriction_reason', 'restriction_report_id']));
    }

    /** The restriction in force right now, or null. */
    public function activeRestriction(): ?string
    {
        $restriction = $this->account_restriction ?? null;
        if (! $restriction) {
            return null;
        }

        if ($this->restriction_ends_at && $this->restriction_ends_at->isPast()) {
            return null;
        }

        return $restriction;
    }

    public function isSuspended(): bool
    {
        return $this->activeRestriction() === self::RESTRICTION_SUSPENDED;
    }

    /** Limited or suspended — either way, no new activity. */
    public function isRestricted(): bool
    {
        return $this->activeRestriction() !== null;
    }

    public function restrictionSummary(): ?array
    {
        $restriction = $this->activeRestriction();
        if (! $restriction) {
            return null;
        }

        return [
            'type' => $restriction,
            'label' => $restriction === self::RESTRICTION_SUSPENDED ? 'Suspended' : 'Restricted',
            'ends_at' => $this->restriction_ends_at?->toIso8601String(),
            'reason' => $this->restriction_reason,
            'restricted_at' => $this->restricted_at?->toIso8601String(),
            'report_id' => $this->restriction_report_id,
        ];
    }

    /** The message shown when a suspended account tries to sign in. */
    public function suspensionMessage(): string
    {
        $until = $this->restriction_ends_at
            ? ' until '.$this->restriction_ends_at->timezone('Asia/Manila')->format('F j, Y')
            : '';

        $email = app(\App\Services\SiteContentService::class)->office()['email'] ?? null;

        return "This account has been suspended by PESO Urdaneta{$until} following a review. "
            .'For questions, contact the PESO office'.($email ? " or email {$email}" : '').'.';
    }
}
