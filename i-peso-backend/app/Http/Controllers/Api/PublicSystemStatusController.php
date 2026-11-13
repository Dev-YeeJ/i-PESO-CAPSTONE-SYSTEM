<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SystemSettings;
use Illuminate\Http\JsonResponse;

/**
 * What the website and app need to know before showing anything: is the
 * portal in maintenance, is registration open, is the assistant on.
 * Always reachable, even during maintenance.
 */
class PublicSystemStatusController extends Controller
{
    public function __invoke(SystemSettings $settings): JsonResponse
    {
        return response()->json([
            'maintenance' => [
                'enabled' => $settings->maintenanceOn(),
                'message' => $settings->maintenanceOn() ? (string) $settings->get('maintenance.message') : null,
            ],
            'registration' => [
                'seekers_open' => $settings->registrationOpen('seeker'),
                'employers_open' => $settings->registrationOpen('employer'),
                'closed_message' => (string) $settings->get('registration.closed_message'),
            ],
            'chatbot_enabled' => $settings->bool('chatbot.enabled'),
        ]);
    }
}
