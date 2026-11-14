<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PolicyService;
use App\Services\SiteContentService;
use App\Support\PolicyRegistry;
use App\Support\SiteContentRegistry;
use Illuminate\Http\JsonResponse;

/**
 * Public (no sign-in) reads of Site Content: the landing page text, office
 * details for the footer, the About page and the policy pages.
 */
class PublicSiteContentController extends Controller
{
    public function __construct(
        private readonly SiteContentService $content,
        private readonly PolicyService $policies,
    ) {
    }

    /**
     * Everything public in one cached call: the landing page and footer,
     * and the About page.
     */
    public function show(): JsonResponse
    {
        return response()->json([
            'office' => $this->content->office(),
            'landing' => $this->content->landing(),
            'about' => $this->content->get(SiteContentRegistry::ABOUT),
        ]);
    }

    public function policy(string $policy): JsonResponse
    {
        abort_unless(PolicyRegistry::exists($policy), 404);

        return response()->json($this->policies->publicPayload($policy));
    }

    public function policyVersion(string $policy, int $version): JsonResponse
    {
        abort_unless(PolicyRegistry::exists($policy), 404);
        $row = $this->policies->version($policy, $version);
        abort_unless($row, 404, 'That version does not exist.');

        return response()->json([
            ...$this->policies->publicPayload($policy),
            'requested' => $this->policies->present($row),
        ]);
    }
}
