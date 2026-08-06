<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\SmsNotification;
use App\Services\ActivityLogger;
use App\Services\Sms\PhoneNumberNormalizer;
use App\Services\Sms\SmsService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminSmsNotificationController extends Controller
{
    /**
     * Re-send a message that failed at the gateway.
     * POST /api/admin/sms-notifications/{smsNotification}/retry
     *
     * The original record is kept untouched and the retry is written as its own
     * entry, so the delivery history stays a truthful record of every attempt.
     */
    public function retry(
        Request $request,
        SmsNotification $smsNotification,
        SmsService $sms,
        PhoneNumberNormalizer $normalizer,
    ): JsonResponse {
        abort_unless($request->user() instanceof Administrator, 403, 'Unauthorized');

        $status = $smsNotification->gateway_status ?: $smsNotification->status;

        if ($status !== 'failed') {
            return response()->json([
                'message' => 'Only messages that failed at the gateway can be retried.',
            ], 422);
        }

        $recipient = $this->resolveRecipient($smsNotification);

        if (! $recipient) {
            return response()->json([
                'message' => 'The original recipient no longer exists, so this message cannot be re-sent.',
            ], 422);
        }

        $result = $sms->send(
            $recipient,
            $smsNotification->phone_number,
            (string) $smsNotification->content,
            $smsNotification->purpose ?: $smsNotification->message_type ?: 'manual_retry',
            ['retry_of' => $smsNotification->getKey()],
        );

        ActivityLogger::log('retried_sms', sprintf(
            'Retried SMS #%s to %s — result: %s.',
            $smsNotification->getKey(),
            $normalizer->mask($smsNotification->normalized_phone_number ?: $smsNotification->phone_number),
            $result->status
        ));

        return response()->json([
            'message' => $result->status === 'failed'
                ? 'The retry also failed at the gateway.'
                : 'Message queued for delivery.',
            'status' => $result->status,
            'provider' => $result->provider,
            'error' => $result->error,
        ], $result->status === 'failed' ? 422 : 200);
    }

    private function resolveRecipient(SmsNotification $log): ?Model
    {
        $type = $log->recipient_type;

        if (! $type || ! class_exists($type) || ! is_subclass_of($type, Model::class)) {
            return null;
        }

        return $type::find($log->recipient_id);
    }

    public function index(Request $request, PhoneNumberNormalizer $normalizer): JsonResponse
    {
        abort_unless($request->user() instanceof Administrator, 403, 'Unauthorized');

        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'sent', 'failed', 'skipped', 'log_only', 'retrying'])],
            'purpose' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:50'],
        ]);

        $query = SmsNotification::query()
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where(function ($statusQuery) use ($status) {
                $statusQuery->where('gateway_status', $status)
                    ->orWhere(fn ($legacy) => $legacy->whereNull('gateway_status')->where('status', $status));
            }))
            ->when($filters['purpose'] ?? null, fn ($q, $purpose) => $q->where(function ($purposeQuery) use ($purpose) {
                $purposeQuery->where('purpose', $purpose)
                    ->orWhere(fn ($legacy) => $legacy->whereNull('purpose')->where('message_type', $purpose));
            }))
            ->latest('created_at');

        $logs = $query->paginate($filters['per_page'] ?? 15);
        $logs->through(fn (SmsNotification $log) => [
            'id' => $log->getKey(),
            'created_at' => $log->created_at,
            'recipient_type' => class_basename($log->recipient_type),
            'phone_number' => $normalizer->mask($log->normalized_phone_number ?: $log->phone_number),
            'purpose' => $log->purpose ?: $log->message_type,
            'status' => $log->gateway_status ?: $log->status,
            'provider' => $log->provider ?: 'legacy',
            'provider_reference_id' => $log->provider_reference_id ?: $log->provider_message_id,
            'message_preview' => Str::limit($log->content, 100),
            'error_message' => $log->error_message ?: $log->provider_error,
            'sent_at' => $log->sent_at,
        ]);

        $counts = SmsNotification::query()
            ->selectRaw("COALESCE(gateway_status, status, 'pending') as effective_status, COUNT(*) as total")
            ->groupByRaw("COALESCE(gateway_status, status, 'pending')")
            ->pluck('total', 'effective_status');

        $configuredDriver = (string) config('services.sms.driver', 'log_only');
        $configuredProvider = (string) config('services.sms.provider', 'unisms');
        $forcedLogOnly = (bool) config('services.sms.log_only', true);
        $credentialsConfigured = filled(config('services.sms.secret_key')) && filled(config('services.sms.sender_id'));
        $liveRequested = $configuredDriver === 'unisms' && $configuredProvider === 'unisms' && ! $forcedLogOnly;
        $live = $liveRequested && $credentialsConfigured;

        return response()->json([
            'gateway' => [
                'configured_driver' => $configuredDriver,
                'effective_mode' => $live ? 'unisms' : 'log_only',
                'provider' => $configuredProvider,
                'sender_id_configured' => filled(config('services.sms.sender_id')),
                'credentials_configured' => $credentialsConfigured,
                'log_only' => ! $live,
                'notice' => $live
                    ? 'UniSMS live mode is enabled. Messages may consume SMS credits.'
                    : ($liveRequested && ! $credentialsConfigured
                        ? 'UniSMS live mode was requested, but credentials are incomplete. Safe log-only fallback is active.'
                        : 'Log-only mode does not send real SMS. Live SMS requires UniSMS credentials and SMS_LOG_ONLY=false.'),
            ],
            'summary' => [
                'total' => (int) $counts->sum(),
                'sent' => (int) ($counts['sent'] ?? 0),
                'pending' => (int) ($counts['pending'] ?? 0),
                'retrying' => (int) ($counts['retrying'] ?? 0),
                'failed' => (int) ($counts['failed'] ?? 0),
                'skipped' => (int) ($counts['skipped'] ?? 0),
                'log_only' => (int) ($counts['log_only'] ?? 0),
            ],
            'operations' => [
                'queue_connection' => (string) config('queue.default'),
                'queue_command' => 'php artisan queue:work',
                'scheduler_command' => 'php artisan schedule:run',
                'reminder_command' => 'php artisan interviews:send-reminders',
                'config_commands' => ['php artisan config:clear', 'php artisan config:cache'],
            ],
            'purposes' => SmsNotification::query()
                ->selectRaw('COALESCE(purpose, message_type) as value')
                ->whereRaw('COALESCE(purpose, message_type) IS NOT NULL')
                ->distinct()->orderBy('value')->pluck('value'),
            'logs' => $logs,
        ]);
    }
}
