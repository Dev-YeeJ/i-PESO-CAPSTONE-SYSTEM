<?php
// i-peso-backend/app/Services/ActivityLogger.php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Single entry point for writing to the audit trail.
 *
 * Every write is best-effort: a failure to record an event must never break the
 * business action that triggered it, so problems are reported to the app log
 * instead of bubbling up as an exception.
 */
class ActivityLogger
{
    /** Log an event for the currently authenticated user, falling back to a guest entry. */
    public static function log(string $action, string $description = ''): ?ActivityLog
    {
        $actor = auth()->user();

        return $actor instanceof Model
            ? self::logAs($actor, $action, $description)
            : self::logGuest($action, $description);
    }

    /** Log an event for a specific actor — used when the actor is not (yet) authenticated. */
    public static function logAs(Model $actor, string $action, string $description = ''): ?ActivityLog
    {
        return self::write($actor::class, (int) $actor->getKey(), $action, $description);
    }

    /** Log an event with no identifiable actor, e.g. a login attempt for an unknown email. */
    public static function logGuest(string $action, string $description = ''): ?ActivityLog
    {
        return self::write(ActivityLog::TYPE_GUEST, 0, $action, $description);
    }

    private static function write(string $userType, int $userId, string $action, string $description): ?ActivityLog
    {
        try {
            return ActivityLog::create([
                'user_type' => $userType,
                'user_id' => $userId,
                'action' => Str::limit($action, 100, ''),
                'description' => $description !== '' ? $description : null,
                'ip_address' => self::clientIp(),
            ]);
        } catch (Throwable $exception) {
            Log::warning('Activity log write failed.', [
                'action' => $action,
                'user_type' => $userType,
                'user_id' => $userId,
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    private static function clientIp(): ?string
    {
        // Naturally null under queued jobs and console commands, where REMOTE_ADDR is unset.
        $ip = app()->bound('request') ? request()->ip() : null;

        return filled($ip) ? Str::limit((string) $ip, 45, '') : null;
    }
}
