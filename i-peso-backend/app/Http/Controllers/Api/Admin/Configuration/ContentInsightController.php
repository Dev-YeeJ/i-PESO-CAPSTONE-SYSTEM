<?php

namespace App\Http\Controllers\Api\Admin\Configuration;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Services\ActivityLogger;
use App\Services\ContentAiService;
use App\Services\ContentInsightService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;

/**
 * Content Modules → Overview (health check), Insights (what readers need)
 * and the AI writing helper. Open to Configuration or Constituent CRM staff:
 * admin.permission:configuration|constituent_crm.
 */
class ContentInsightController extends Controller
{
    public function __construct(private readonly ContentInsightService $insights)
    {
    }

    public function health(): JsonResponse
    {
        return response()->json($this->insights->health());
    }

    public function insights(Request $request): JsonResponse
    {
        $days = (int) ($request->validate(['days' => ['nullable', Rule::in([7, 30, 90])]])['days'] ?? 30);

        return response()->json($this->insights->insights($days));
    }

    /** Mark a missed search or chatbot question as dealt with. */
    public function resolve(Request $request): JsonResponse
    {
        $admin = $this->admin($request);
        $data = $request->validate([
            'kind' => ['required', Rule::in(['search', 'gap'])],
            'normalized' => ['required', 'string', 'max:191'],
        ]);

        $count = $this->insights->resolve($data['kind'], $data['normalized']);
        ActivityLogger::logAs($admin, 'content_insight_resolved', sprintf(
            'Marked %s “%s” as dealt with (%d report%s).',
            $data['kind'] === 'gap' ? 'the assistant question' : 'the Help search',
            $data['normalized'],
            $count,
            $count === 1 ? '' : 's'
        ));

        return response()->json(['message' => 'Marked as dealt with.', 'resolved' => $count]);
    }

    public function assist(Request $request, ContentAiService $ai): JsonResponse
    {
        $data = $request->validate([
            'task' => ['required', Rule::in(ContentAiService::TASKS)],
            'question' => ['required_if:task,draft_answer', 'nullable', 'string', 'max:200'],
            'audience' => ['nullable', Rule::in(['everyone', 'seekers', 'employers'])],
            'text' => ['required_unless:task,draft_answer', 'nullable', 'string', 'max:8000'],
        ]);

        try {
            return response()->json($ai->assist($data['task'], $data));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 503);
        }
    }

    private function admin(Request $request): Administrator
    {
        $admin = $request->user();
        abort_unless($admin instanceof Administrator, 403, 'Administrator account required.');

        return $admin;
    }
}
