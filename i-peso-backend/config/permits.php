<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Mayor's Permit expiry reminders
    |--------------------------------------------------------------------------
    |
    | Days before expiry on which `permits:notify-expiring` reminds the
    | employer (0 = on the expiry day). Fixed offsets keep the daily job
    | idempotent without a "notified_at" column. PESO can change this list in
    | Configuration → System Settings → Employer rules, which overrides it.
    |
    */
    'reminder_days' => [30, 14, 7, 1, 0],
];
