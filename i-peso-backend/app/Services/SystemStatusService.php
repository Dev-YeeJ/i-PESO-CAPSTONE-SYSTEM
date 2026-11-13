<?php

namespace App\Services;

use App\Services\Sms\SmsProviderInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * System Settings → System status: whether each outside service and each
 * background job is really working. Read-only; never shows a secret, only
 * whether one is set.
 *
 * The scheduler and queue worker report in through heartbeats written by
 * routes/console.php, because on shared hosting a stopped cron job fails
 * silently — reminders and queued emails simply stop.
 */
class SystemStatusService
{
    public const SCHEDULER_HEARTBEAT = 'system:scheduler-heartbeat';
    public const QUEUE_HEARTBEAT = 'system:queue-heartbeat';

    /** A heartbeat older than this means the cron job has stopped. */
    private const STALE_MINUTES = 5;

    public function __construct(private readonly SystemSettings $settings)
    {
    }

    /** @return array{checked_at: string, overall: string, checks: array<int, array<string, mixed>>} */
    public function report(): array
    {
        $checks = [
            $this->scheduler(),
            $this->queue(),
            $this->sms(),
            $this->email(),
            $this->push(),
            $this->ai(),
            $this->chatbot(),
            $this->maps(),
            $this->psoc(),
            $this->environment(),
            $this->storage(),
        ];

        $overall = collect($checks)->contains('status', 'error') ? 'error' : (collect($checks)->contains('status', 'warn') ? 'warn' : 'ok');

        return ['checked_at' => now()->toIso8601String(), 'overall' => $overall, 'checks' => $checks];
    }

    private function check(string $id, string $label, string $status, string $summary, array $details = [], ?string $test = null, ?string $fix = null): array
    {
        return compact('id', 'label', 'status', 'summary', 'details', 'test', 'fix');
    }

    private function scheduler(): array
    {
        $last = $this->heartbeat(self::SCHEDULER_HEARTBEAT);

        if (! $last) {
            return $this->check('scheduler', 'Scheduler (cron)', 'error', 'No sign of the scheduler running.', [],
                fix: 'Reminders, scheduled announcements and queued emails depend on it. On Hostinger, add a cron job that runs `php artisan schedule:run` every minute.');
        }

        $stale = $last->lt(now()->subMinutes(self::STALE_MINUTES));

        return $this->check('scheduler', 'Scheduler (cron)', $stale ? 'error' : 'ok',
            $stale ? 'Stopped — last ran '.$last->diffForHumans().'.' : 'Running — last ran '.$last->diffForHumans().'.',
            ['Last run' => $last->toIso8601String()],
            fix: $stale ? 'Check the Hostinger cron job that runs `php artisan schedule:run` every minute.' : null);
    }

    private function queue(): array
    {
        $last = $this->heartbeat(self::QUEUE_HEARTBEAT);
        $pending = $this->safeCount('jobs');
        $failed = Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->where('failed_at', '>=', now()->subDays(7))->count() : 0;
        $oldest = Schema::hasTable('jobs') ? DB::table('jobs')->min('created_at') : null;
        $oldestAt = $oldest ? Carbon::createFromTimestamp((int) $oldest) : null;
        $backedUp = $oldestAt && $oldestAt->lt(now()->subMinutes(15));

        $status = match (true) {
            ! $last || $last->lt(now()->subMinutes(self::STALE_MINUTES)) => 'error',
            $backedUp || $failed > 0 => 'warn',
            default => 'ok',
        };

        $summary = match ($status) {
            'error' => $last ? 'The queue worker stopped '.$last->diffForHumans().'.' : 'No sign of the queue worker running.',
            'warn' => $backedUp ? "{$pending} waiting, the oldest since ".$oldestAt->diffForHumans().'.' : "{$failed} job(s) failed in the last 7 days.",
            default => $pending ? "{$pending} waiting — being processed." : 'Nothing waiting.',
        };

        return $this->check('queue', 'Queue worker', $status, $summary, [
            'Waiting' => $pending,
            'Failed (7 days)' => $failed,
            'Last run' => $last?->toIso8601String(),
        ], fix: $status === 'error' ? 'Queued emails and notifications only go out while the scheduler runs the worker each minute.' : null);
    }

    private function sms(): array
    {
        $provider = app(SmsProviderInterface::class)->name();
        $live = $provider !== 'log_only';
        $month = Schema::hasTable('sms_notifications')
            ? DB::table('sms_notifications')->where('created_at', '>=', now()->startOfMonth())
                ->selectRaw("SUM(CASE WHEN gateway_status = 'sent' THEN 1 ELSE 0 END) as sent, SUM(CASE WHEN gateway_status = 'failed' THEN 1 ELSE 0 END) as failed, SUM(CASE WHEN gateway_status = 'skipped' THEN 1 ELSE 0 END) as skipped")
                ->first()
            : null;
        $sent = (int) ($month->sent ?? 0);
        $failed = (int) ($month->failed ?? 0);
        $cap = (int) $this->settings->get('sms.monthly_cap');
        $switchedOff = ! $this->settings->bool('sms.enabled');

        $status = match (true) {
            ! $live => 'warn',
            $switchedOff => 'warn',
            $cap > 0 && $sent >= $cap => 'error',
            $failed > 0 || ($cap > 0 && $sent >= 0.8 * $cap) => 'warn',
            default => 'ok',
        };

        $summary = match (true) {
            ! $live => 'Test mode — messages are written to the log, not sent to phones.',
            $switchedOff => 'Connected to UniSMS, but SMS is switched off below.',
            $cap > 0 && $sent >= $cap => "Monthly limit reached ({$sent}/{$cap}) — no more SMS until next month.",
            default => "Live (UniSMS) — {$sent} sent this month".($cap ? " of {$cap}" : '').($failed ? ", {$failed} failed" : '').'.',
        };

        return $this->check('sms', 'SMS (UniSMS)', $status, $summary, [
            'Mode' => $live ? 'Live' : 'Test (log only)',
            'Sent this month' => $sent,
            'Failed this month' => $failed,
            'Skipped this month' => (int) ($month->skipped ?? 0),
        ], test: 'sms', fix: $live ? null : 'Set SMS_DRIVER=unisms with the UniSMS secret key and sender ID in the server .env to send real messages.');
    }

    private function email(): array
    {
        $mailer = (string) config('mail.default');
        $sending = ! in_array($mailer, ['log', 'array'], true);

        return $this->check('email', 'Email', $sending ? 'ok' : 'warn',
            $sending ? 'Sending through '.strtoupper($mailer).' as '.config('mail.from.address').'.' : 'Test mode — emails are written to the log, not delivered.',
            ['Mailer' => $mailer, 'From' => config('mail.from.address')],
            test: 'email',
            fix: $sending ? null : 'Set MAIL_MAILER and the mail server details in the server .env.');
    }

    private function push(): array
    {
        $devices = $this->safeCount('push_tokens');

        return $this->check('push', 'Mobile push (Expo)', 'ok',
            $devices ? "Ready — {$devices} phone(s) registered for notifications." : 'Ready — no phones registered yet.',
            ['Registered phones' => $devices, 'Access token' => filled(config('services.expo.access_token')) ? 'Set' : 'Not set (optional)']);
    }

    private function ai(): array
    {
        $enabled = (bool) config('services.vertex_ai.enabled');
        $credentials = filled(config('services.vertex_ai.gemini_api_key')) || filled(config('services.vertex_ai.project_id'));

        $status = $enabled && $credentials ? 'ok' : 'warn';

        return $this->check('ai', 'AI suggestions', $status,
            match (true) {
                ! $enabled => 'Off — job posting drafts, profile suggestions and the content writing helper are unavailable.',
                ! $credentials => 'Switched on but no AI key is set.',
                default => 'On — model '.config('services.vertex_ai.model').'.',
            },
            ['Model' => config('services.vertex_ai.model')],
            test: $enabled && $credentials ? 'ai' : null,
            fix: $status === 'ok' ? null : 'Set GOOGLE_VERTEX_AI_ENABLED=true and GEMINI_API_KEY in the server .env.');
    }

    private function chatbot(): array
    {
        $key = filled(config('services.gemini.key'));
        $on = $this->settings->bool('chatbot.enabled');

        return $this->check('chatbot', 'Assistant (chatbot)', ! $key ? 'warn' : 'ok',
            match (true) {
                ! $key => 'No Gemini key set — the assistant cannot answer.',
                ! $on => 'Ready, but switched off below.',
                default => 'Answering — model '.config('services.gemini.model').'.',
            },
            ['Model' => config('services.gemini.model'), 'Fallback model' => config('services.gemini.fallback_model')],
            fix: $key ? null : 'Set GEMINI_API_KEY in the server .env.');
    }

    private function maps(): array
    {
        $key = filled(config('services.google_maps.server_key'));

        return $this->check('maps', 'Google Maps', $key ? 'ok' : 'warn',
            $key ? 'Configured — addresses and job fair pins can be located.' : 'No server key — new addresses can’t be placed on the map.',
            fix: $key ? null : 'Set GOOGLE_MAPS_SERVER_API_KEY in the server .env.');
    }

    private function psoc(): array
    {
        $token = filled(config('services.psoc.token'));

        return $this->check('psoc', 'PSA occupation codes (PSOC)', $token ? 'ok' : 'warn',
            $token ? 'Configured.' : 'No PSOC token — occupation lookup falls back to the local list.',
            fix: $token ? null : 'Set PSOC_API_TOKEN in the server .env.');
    }

    private function environment(): array
    {
        $production = app()->isProduction();
        $debug = (bool) config('app.debug');
        $unsafe = $production && $debug;

        return $this->check('environment', 'Server', $unsafe ? 'error' : 'ok',
            $unsafe ? 'Debug mode is ON in production — error pages can expose server details.' : ucfirst((string) config('app.env')).' · PHP '.PHP_VERSION.' · Laravel '.app()->version().'.',
            ['Environment' => config('app.env'), 'Debug mode' => $debug ? 'On' : 'Off', 'API URL' => config('app.url'), 'Website URL' => config('app.frontend_url')],
            fix: $unsafe ? 'Set APP_DEBUG=false in the server .env.' : null);
    }

    private function storage(): array
    {
        $free = @disk_free_space(storage_path());
        if ($free === false) {
            return $this->check('storage', 'File storage', 'ok', 'Free space could not be measured on this host.');
        }

        $gb = round($free / 1024 ** 3, 1);

        return $this->check('storage', 'File storage', $gb < 1 ? 'warn' : 'ok', "{$gb} GB free for uploaded documents.",
            fix: $gb < 1 ? 'Uploads (permits, IDs, attachments) will fail when the disk is full.' : null);
    }

    private function heartbeat(string $key): ?Carbon
    {
        $value = Cache::get($key);

        return $value ? Carbon::parse($value) : null;
    }

    private function safeCount(string $table): int
    {
        try {
            return Schema::hasTable($table) ? DB::table($table)->count() : 0;
        } catch (\Throwable) {
            return 0;
        }
    }
}
