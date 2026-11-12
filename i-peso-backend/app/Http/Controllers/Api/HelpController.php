<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Models\JobSeeker;
use App\Services\SiteContentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The Help page inside the seeker and employer portals (and the seeker app):
 * FAQs for Everyone plus the reader's own role, and the office contact card.
 * Pending employers can open it too — they ask the most questions.
 */
class HelpController extends Controller
{
    public function __invoke(Request $request, SiteContentService $content): JsonResponse
    {
        $user = $request->user();
        $role = match (true) {
            $user instanceof JobSeeker => 'seeker',
            $user instanceof Employer => 'employer',
            default => null,
        };

        return response()->json([
            'role' => $role,
            'office' => $content->office(),
            'faqs' => $content->faqsFor($role),
            'topics' => $content->topics(),
        ]);
    }
}
