<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Monthly submission deadline
    |--------------------------------------------------------------------------
    |
    | Employers report the previous month's hires by this day of the following
    | month. A report covering March with a deadline day of 10 is due 10 April;
    | anything not submitted by then counts as overdue in the PESO compliance
    | view and triggers the reminder command.
    |
    */
    'deadline_day' => (int) env('PLACEMENT_REPORT_DEADLINE_DAY', 10),

    /*
    |--------------------------------------------------------------------------
    | Reminder schedule
    |--------------------------------------------------------------------------
    |
    | Days relative to the deadline on which employers with no submission for
    | the covered month are nudged. Positive numbers are days before the
    | deadline, 0 is the deadline itself, negative numbers are days after it.
    | Fixed offsets keep `placements:notify-missing` idempotent without needing
    | a "last notified" column.
    |
    */
    'reminder_offsets' => [3, 0, -7],

    /*
    |--------------------------------------------------------------------------
    | Compliance scope
    |--------------------------------------------------------------------------
    |
    | Only employers in these verification states are expected to report. Anyone
    | still pending or rejected has no obligation and is left out of the
    | overdue list so PESO is not chasing accounts that cannot post jobs.
    |
    */
    'reporting_statuses' => ['approved', 'verified'],
];
