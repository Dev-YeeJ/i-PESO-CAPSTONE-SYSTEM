<?php

namespace App\Http\Controllers\Api\Admin\Configuration;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Services\ActivityLogger;
use App\Services\Sms\SmsService;
use App\Services\SystemSettings;
use App\Services\SystemStatusService;
use App\Services\VertexAiSuggestionService;
use App\Support\SystemSettingsRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Configuration → System Settings. Anyone with Configuration access can look;
 * only the system administrator (PESO Office Manager) can change settings or
 * send test messages (admin.system on those routes).
 */
class SystemSettingsController extends Controller
{
    public function __construct(private readonly SystemSettings $settings)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $values = $this->settings->all();
        $audit = $this->settings->audit();

        return response()->json([
            'groups' => SystemSettingsRegistry::GROUPS,
            'settings' => collect(SystemSettingsRegistry::definitions())->map(fn (array $definition, string $key) => [
                'key' => $key,
                ...collect($definition)->except('config')->all(),
                'value' => $values[$key],
                'changed' => array_key_exists($key, $this->settings->saved()),
                'updated_at' => $audit[$key]['updated_at'] ?? null,
                'updated_by' => $audit[$key]['updated_by'] ?? null,
            ])->values(),
            'can_edit' => $this->admin($request)->isSystemAdministrator(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $admin = $this->admin($request);
        $input = $request->validate(['values' => ['required', 'array', 'min:1']])['values'];

        $unknown = array_diff(array_keys($input), array_keys(SystemSettingsRegistry::definitions()));
        if ($unknown) {
            throw ValidationException::withMessages(['values' => 'Unknown setting: '.implode(', ', $unknown).'.']);
        }

        // Each setting is checked on its own so errors name it plainly
        // ("Placement report due day must not be greater than 28").
        $errors = [];
        foreach ($input as $key => $value) {
            $definition = SystemSettingsRegistry::definitions()[$key];
            $rules = ['value' => SystemSettingsRegistry::rules($key)];
            if ($definition['type'] === 'int_list') {
                $rules['value.*'] = SystemSettingsRegistry::itemRules($key);
            }
            $validator = Validator::make(['value' => $value], $rules, [], ['value' => $definition['label'], 'value.*' => $definition['label']]);
            if ($validator->fails()) {
                $errors["values.{$key}"] = $validator->errors()->first();
            }
        }
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }

        $changes = $this->settings->save($input, $admin);

        foreach ($changes as $key => [$before, $after]) {
            ActivityLogger::logAs($admin, 'system_setting_changed', sprintf(
                'Changed “%s” from %s to %s.',
                SystemSettingsRegistry::definitions()[$key]['label'],
                $this->describe($before),
                $this->describe($after)
            ));
        }

        return response()->json([
            'message' => $changes ? 'Settings saved. They apply right away.' : 'Nothing changed.',
            'changed' => array_keys($changes),
        ]);
    }

    public function status(SystemStatusService $status): JsonResponse
    {
        return response()->json($status->report());
    }

    public function testEmail(Request $request): JsonResponse
    {
        $admin = $this->admin($request);

        try {
            Mail::raw(
                "This is a test email from i-PESO System Settings.\n\nIf you can read this, email delivery is working.\n\nSent ".now()->timezone('Asia/Manila')->format('F j, Y g:i A').'.',
                fn ($message) => $message->to($admin->email)->subject('i-PESO test email')
            );
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json(['message' => 'The email could not be sent: '.class_basename($exception).'. Check the mail settings in the server .env.'], 502);
        }

        ActivityLogger::logAs($admin, 'system_test_email', 'Sent a test email to their own address.');
        $mailer = (string) config('mail.default');

        return response()->json(['message' => in_array($mailer, ['log', 'array'], true)
            ? "Test email written to the server log (mailer is “{$mailer}”, so nothing was delivered)."
            : "Test email sent to {$admin->email}. Check the inbox (and spam folder)."]);
    }

    public function testSms(Request $request, SmsService $sms): JsonResponse
    {
        $admin = $this->admin($request);
        $phone = $request->validate(['phone' => ['required', 'regex:/^(09|\+639)\d{9}$/']], [
            'phone.regex' => 'Enter a Philippine mobile number like 09171234567.',
        ])['phone'];

        $result = $sms->send($admin, $phone, 'i-PESO test message: SMS sending is working. Walang kailangang gawin.', 'system_test');
        ActivityLogger::logAs($admin, 'system_test_sms', sprintf('Sent a test SMS (%s).', $result->status));

        return response()->json([
            'status' => $result->status,
            'message' => match ($result->status) {
                'sent' => 'Test SMS sent. It should arrive within a minute (uses one UniSMS credit).',
                'log_only' => 'SMS is in test mode: the message was written to the server log, not sent.',
                default => 'The SMS was not sent'.($result->error ? ': '.$result->error : '.'),
            },
        ], in_array($result->status, ['sent', 'log_only'], true) ? 200 : 502);
    }

    public function testAi(Request $request, VertexAiSuggestionService $ai): JsonResponse
    {
        $admin = $this->admin($request);

        try {
            $reply = $ai->generateText('Reply with the single word OK.', 10, 0.0);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 503);
        }

        ActivityLogger::logAs($admin, 'system_test_ai', 'Tested the AI service.');

        return response()->json(['message' => $reply !== '' ? 'The AI service answered: “'.mb_substr($reply, 0, 40).'”.' : 'The AI service answered with an empty reply.']);
    }

    private function describe(mixed $value): string
    {
        return match (true) {
            is_bool($value) => $value ? 'on' : 'off',
            is_array($value) => $value ? implode(', ', $value) : 'none',
            is_string($value) => '“'.mb_strimwidth($value, 0, 60, '…').'”',
            default => (string) $value,
        };
    }

    private function admin(Request $request): Administrator
    {
        $admin = $request->user();
        abort_unless($admin instanceof Administrator, 403, 'Administrator account required.');

        return $admin;
    }
}
