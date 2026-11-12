<?php

namespace App\Http\Controllers\Api\Admin\Configuration;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\Faq;
use App\Models\SiteContentRevision;
use App\Services\ActivityLogger;
use App\Services\SiteContentService;
use App\Support\FaqStarterPack;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Site Content → FAQs. Managed by Configuration or Constituent CRM (front
 * desk) staff: admin.permission:configuration|constituent_crm.
 */
class FaqController extends Controller
{
    /** Same rule as announcement links: an internal path or an https:// link. */
    private const LINK_PATTERN = '#^(/(?!/)[^\s]*|https://[^\s]+)$#i';

    public function __construct(private readonly SiteContentService $content)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'audience' => ['nullable', Rule::in(array_keys(Faq::AUDIENCES))],
            'topic' => ['nullable', Rule::in(array_keys(Faq::TOPICS))],
            'status' => ['nullable', Rule::in(['published', 'unpublished'])],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $query = Faq::query()->with('editor:admin_id,first_name,last_name');
        if (! empty($filters['audience'])) {
            $query->where('audience', $filters['audience']);
        }
        if (! empty($filters['topic'])) {
            $query->where('topic', $filters['topic']);
        }
        if (! empty($filters['status'])) {
            $query->where('is_published', $filters['status'] === 'published');
        }
        if (! empty($filters['search'])) {
            $term = '%'.$filters['search'].'%';
            $query->where(fn ($q) => $q->where('question', 'like', $term)->orWhere('answer', 'like', $term));
        }

        $all = Faq::query()->get(['id', 'is_published', 'is_featured', 'audience']);
        $chatbotLimit = SiteContentService::CHATBOT_FAQ_LIMIT;

        return response()->json([
            'data' => Faq::sortForDisplay($query->get())->map(fn (Faq $faq) => $this->present($faq))->values(),
            'summary' => [
                'total' => $all->count(),
                'published' => $all->where('is_published', true)->count(),
                'unpublished' => $all->where('is_published', false)->count(),
                'featured' => $all->where('is_featured', true)->count(),
                'in_assistant' => min($all->where('is_published', true)->count(), $chatbotLimit),
                'assistant_limit' => $chatbotLimit,
                'max_featured' => Faq::MAX_FEATURED,
            ],
            'topics' => $this->content->topics(),
            'audiences' => collect(Faq::AUDIENCES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            'can_add_starter_pack' => $all->isEmpty(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $admin = $this->admin($request);
        $data = $this->validated($request);

        $faq = Faq::create([
            ...$data,
            'is_published' => false,
            'is_featured' => false,
            'sort_order' => (int) Faq::query()->where('topic', $data['topic'])->max('sort_order') + 1,
            'created_by' => $admin->admin_id,
            'updated_by' => $admin->admin_id,
        ]);

        $this->content->recordRevision(SiteContentRevision::TYPE_FAQ, $faq->id, $faq->snapshot(), [], 'created', $admin);
        $this->content->flush();
        ActivityLogger::logAs($admin, 'faq_created', sprintf('Added FAQ #%d "%s" (unpublished).', $faq->id, $faq->question));

        return response()->json([
            'message' => 'FAQ saved as unpublished. Publish it when it is ready.',
            'faq' => $this->present($faq->fresh('editor')),
        ], 201);
    }

    public function update(Request $request, Faq $faq): JsonResponse
    {
        $admin = $this->admin($request);
        $data = $this->validated($request);

        $before = $faq->snapshot();
        $topicChanged = $data['topic'] !== $faq->topic;
        $faq->fill([...$data, 'updated_by' => $admin->admin_id]);
        if ($topicChanged) {
            $faq->sort_order = (int) Faq::query()->where('topic', $data['topic'])->max('sort_order') + 1;
        }
        // Only Everyone FAQs can be featured on the (public) landing page.
        if ($faq->audience !== Faq::AUDIENCE_EVERYONE) {
            $faq->is_featured = false;
        }
        $faq->save();

        $changed = array_keys(array_diff_assoc(array_map('strval', $faq->snapshot()), array_map('strval', $before)));
        if ($changed) {
            $this->content->recordRevision(SiteContentRevision::TYPE_FAQ, $faq->id, $faq->snapshot(), $changed, 'saved', $admin);
        }
        $this->content->flush();
        ActivityLogger::logAs($admin, 'faq_updated', sprintf('Edited FAQ #%d "%s".', $faq->id, $faq->question));

        return response()->json(['message' => 'FAQ saved.', 'faq' => $this->present($faq->fresh('editor'))]);
    }

    public function publish(Request $request, Faq $faq): JsonResponse
    {
        return $this->setPublished($request, $faq, true);
    }

    public function unpublish(Request $request, Faq $faq): JsonResponse
    {
        return $this->setPublished($request, $faq, false);
    }

    public function feature(Request $request, Faq $faq): JsonResponse
    {
        $admin = $this->admin($request);
        $featured = (bool) $request->validate(['featured' => ['required', 'boolean']])['featured'];

        if ($featured) {
            if ($faq->audience !== Faq::AUDIENCE_EVERYONE) {
                throw ValidationException::withMessages(['featured' => 'Only FAQs for Everyone can be shown on the landing page.']);
            }
            $current = Faq::query()->where('is_featured', true)->whereKeyNot($faq->id)->get(['id', 'question']);
            if ($current->count() >= Faq::MAX_FEATURED) {
                throw ValidationException::withMessages(['featured' => sprintf(
                    'The landing page already shows %d questions: %s. Remove one first.',
                    Faq::MAX_FEATURED,
                    $current->pluck('question')->map(fn ($q) => '"'.$q.'"')->implode(', ')
                )]);
            }
        }

        $faq->forceFill(['is_featured' => $featured, 'updated_by' => $admin->admin_id])->save();
        $this->content->flush();
        ActivityLogger::logAs($admin, 'faq_featured', sprintf('%s FAQ #%d "%s" %s the landing page.', $featured ? 'Showed' : 'Removed', $faq->id, $faq->question, $featured ? 'on' : 'from'));

        return response()->json([
            'message' => $featured ? ($faq->is_published ? 'Shown on the landing page.' : 'Will show on the landing page once published.') : 'Removed from the landing page.',
            'faq' => $this->present($faq->fresh('editor')),
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $admin = $this->admin($request);
        $ids = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:200'],
            'ids.*' => ['integer', 'distinct', 'exists:faqs,id'],
        ])['ids'];

        DB::transaction(function () use ($ids) {
            foreach (array_values($ids) as $index => $id) {
                Faq::query()->whereKey($id)->update(['sort_order' => $index + 1]);
            }
        });
        $this->content->flush();
        ActivityLogger::logAs($admin, 'faq_reordered', sprintf('Reordered %d FAQs.', count($ids)));

        return response()->json(['message' => 'Order saved.']);
    }

    public function revisions(Faq $faq): JsonResponse
    {
        return response()->json([
            'revisions' => $this->content->revisions(SiteContentRevision::TYPE_FAQ, $faq->id)->map(fn (SiteContentRevision $revision) => [
                'id' => $revision->id,
                'action' => $revision->action,
                'changed_fields' => $revision->changed_fields ?? [],
                'value' => $revision->value,
                'created_at' => $revision->created_at?->toIso8601String(),
                'author' => $revision->author ? trim($revision->author->first_name.' '.$revision->author->last_name) : null,
            ])->values(),
        ]);
    }

    public function destroy(Request $request, Faq $faq): JsonResponse
    {
        $admin = $this->admin($request);
        $question = $faq->question;
        $id = $faq->id;

        $faq->delete();
        SiteContentRevision::query()->where('content_type', SiteContentRevision::TYPE_FAQ)->where('content_key', (string) $id)->delete();
        $this->content->flush();
        ActivityLogger::logAs($admin, 'faq_deleted', sprintf('Deleted FAQ #%d "%s".', $id, $question));

        return response()->json(['message' => 'FAQ deleted.']);
    }

    /** One-time suggested drafts, only while the FAQ list is empty. */
    public function starterPack(Request $request): JsonResponse
    {
        $admin = $this->admin($request);

        if (Faq::query()->exists()) {
            throw ValidationException::withMessages(['starter_pack' => 'Suggested FAQs can only be added while the FAQ list is empty.']);
        }

        $order = [];
        DB::transaction(function () use ($admin, &$order) {
            foreach (FaqStarterPack::items() as $item) {
                $order[$item['topic']] = ($order[$item['topic']] ?? 0) + 1;
                $faq = Faq::create([
                    'link_label' => null,
                    'link_url' => null,
                    ...$item,
                    'is_published' => false,
                    'sort_order' => $order[$item['topic']],
                    'created_by' => $admin->admin_id,
                    'updated_by' => $admin->admin_id,
                ]);
                $this->content->recordRevision(SiteContentRevision::TYPE_FAQ, $faq->id, $faq->snapshot(), [], 'created', $admin);
            }
        });
        $this->content->flush();

        $count = array_sum($order);
        ActivityLogger::logAs($admin, 'faq_starter_pack', sprintf('Added %d suggested FAQs (unpublished) for review.', $count));

        return response()->json(['message' => "{$count} suggested FAQs added as unpublished drafts. Review each one, then publish it."], 201);
    }

    private function setPublished(Request $request, Faq $faq, bool $published): JsonResponse
    {
        $admin = $this->admin($request);
        $faq->forceFill(['is_published' => $published, 'updated_by' => $admin->admin_id])->save();
        $this->content->flush();

        ActivityLogger::logAs($admin, $published ? 'faq_published' : 'faq_unpublished', sprintf(
            '%s FAQ #%d "%s".',
            $published ? 'Published' : 'Unpublished',
            $faq->id,
            $faq->question
        ));

        return response()->json([
            'message' => $published ? 'Published. It is on the Help pages now.' : 'Unpublished. It is hidden from readers.',
            'faq' => $this->present($faq->fresh('editor')),
        ]);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'question' => ['required', 'string', 'max:200'],
            'answer' => ['required', 'string', 'max:2000'],
            'audience' => ['required', Rule::in(array_keys(Faq::AUDIENCES))],
            'topic' => ['required', Rule::in(array_keys(Faq::TOPICS))],
            'link_label' => ['nullable', 'string', 'max:60', 'required_with:link_url'],
            'link_url' => ['nullable', 'string', 'max:500', 'regex:'.self::LINK_PATTERN, 'required_with:link_label'],
        ], [
            'link_url.regex' => 'Use a page path that starts with / (e.g. /seeker/job-fairs) or a full https:// link.',
        ]);

        $data['question'] = trim($data['question']);
        $data['answer'] = trim(str_replace(["\r\n", "\r"], "\n", $data['answer']));
        $data['link_label'] ??= null;
        $data['link_url'] ??= null;

        return $data;
    }

    private function present(Faq $faq): array
    {
        return [
            ...$faq->toReaderArray(),
            'is_published' => $faq->is_published,
            'audience_label' => Faq::AUDIENCES[$faq->audience] ?? $faq->audience,
            'updated_at' => $faq->updated_at?->toIso8601String(),
            'updated_by' => $faq->editor ? trim($faq->editor->first_name.' '.$faq->editor->last_name) : null,
        ];
    }

    private function admin(Request $request): Administrator
    {
        $admin = $request->user();
        abort_unless($admin instanceof Administrator, 403, 'Administrator account required.');

        return $admin;
    }
}
