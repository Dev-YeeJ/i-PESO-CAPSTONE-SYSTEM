<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\EmployerReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminEmployerReportController extends Controller
{
    /**
     * GET /api/admin/employer-reports — paginated, filterable list.
     */
    public function index(Request $request): JsonResponse
    {
        $query = EmployerReport::query()
            ->with([
                'employer:employer_id,company_name,email',
                'seeker:seeker_id,first_name,last_name,email',
                'resolver:admin_id,first_name,last_name',
            ]);

        $query->when($request->string('status')->toString(), function ($query, $status) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        });
        $query->when($request->string('reason')->toString(), fn ($query, $reason) => $query->where('reason', $reason));
        $query->when($request->string('search')->toString(), function ($query, $search) {
            $query->where(function ($nested) use ($search) {
                $nested->where('description', 'like', "%{$search}%")
                    ->orWhereHas('employer', fn ($employer) => $employer->where('company_name', 'like', "%{$search}%"))
                    ->orWhereHas('seeker', function ($seeker) use ($search) {
                        $seeker->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        });

        $reports = $query->latest()->paginate($request->integer('per_page', 15));
        $reports->through(fn (EmployerReport $report) => $this->formatReport($report));

        return response()->json($reports);
    }

    /**
     * GET /api/admin/employer-reports/summary — status counts for stat cards.
     */
    public function summary(): JsonResponse
    {
        $counts = EmployerReport::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'total' => (int) $counts->sum(),
            'pending' => (int) $counts->get('pending', 0),
            'investigating' => (int) $counts->get('investigating', 0),
            'resolved' => (int) $counts->get('resolved', 0),
            'dismissed' => (int) $counts->get('dismissed', 0),
        ]);
    }

    /**
     * GET /api/admin/employer-reports/{employerReport}
     */
    public function show(EmployerReport $employerReport): JsonResponse
    {
        $employerReport->load([
            'employer:employer_id,company_name,email,verification_status',
            'seeker:seeker_id,first_name,last_name,email,mobile_number',
            'resolver:admin_id,first_name,last_name',
        ]);

        return response()->json(['report' => $this->formatReport($employerReport, detailed: true)]);
    }

    /**
     * PUT /api/admin/employer-reports/{employerReport} — update status / notes.
     */
    public function update(Request $request, EmployerReport $employerReport): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(EmployerReport::STATUSES)],
            'admin_notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $isClosed = in_array($validated['status'], EmployerReport::RESOLVED_STATUSES, true);

        $employerReport->update([
            'status' => $validated['status'],
            'admin_notes' => $validated['admin_notes'] ?? $employerReport->admin_notes,
            'resolved_by' => $isClosed ? $this->admin($request)->admin_id : null,
            'resolved_at' => $isClosed ? now() : null,
        ]);

        $employerReport->load([
            'employer:employer_id,company_name,email,verification_status',
            'seeker:seeker_id,first_name,last_name,email,mobile_number',
            'resolver:admin_id,first_name,last_name',
        ]);

        return response()->json([
            'message' => 'Report updated.',
            'report' => $this->formatReport($employerReport, detailed: true),
        ]);
    }

    private function formatReport(EmployerReport $report, bool $detailed = false): array
    {
        $payload = [
            'id' => $report->id,
            'reason' => $report->reason,
            'status' => $report->status,
            'description' => $report->description,
            'admin_notes' => $report->admin_notes,
            'created_at' => $report->created_at,
            'resolved_at' => $report->resolved_at,
            'employer' => $report->employer ? [
                'employer_id' => $report->employer->employer_id,
                'company_name' => $report->employer->company_name,
                'email' => $report->employer->email,
                'verification_status' => $report->employer->verification_status ?? null,
            ] : null,
            'seeker' => $report->seeker ? [
                'seeker_id' => $report->seeker->seeker_id,
                'name' => trim("{$report->seeker->first_name} {$report->seeker->last_name}") ?: 'Unnamed seeker',
                'email' => $report->seeker->email,
                'mobile_number' => $report->seeker->mobile_number ?? null,
            ] : null,
            'resolved_by' => $report->resolver
                ? trim("{$report->resolver->first_name} {$report->resolver->last_name}")
                : null,
        ];

        return $payload;
    }

    private function admin(Request $request): Administrator
    {
        /** @var Administrator $admin */
        $admin = $request->user();

        return $admin;
    }
}
