<?php

return [
    /*
    | Abuse protection. A reporter may file this many new reports in any
    | rolling 24 hours; anything beyond that is refused with guidance to add
    | details to an existing case instead.
    */
    'daily_limit' => (int) env('SAFETY_REPORTS_DAILY_LIMIT', 5),

    /*
    | Supporting evidence: screenshots or documents, stored on the private
    | disk and only ever served to authorized PESO staff.
    */
    'max_attachments' => 5,
    'max_attachment_kb' => 5120,
    'attachment_types' => ['jpg', 'jpeg', 'png', 'webp', 'pdf'],

    /*
    | Longest restriction or suspension PESO can set with an end date, in days.
    | Leaving the end date empty means "until lifted".
    */
    'max_restriction_days' => 365,
];
