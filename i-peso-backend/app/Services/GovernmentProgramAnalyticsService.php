<?php

namespace App\Services;

use App\Models\GovernmentProgram;
use App\Models\GovernmentProgramSkill;
use App\Models\JobFair;
use App\Models\ProgramApplication;
use Illuminate\Support\Facades\Schema;

class GovernmentProgramAnalyticsService
{
    public function summary(): array
    {
        $linkedSkillCount = Schema::hasTable('government_program_skills')
            ? GovernmentProgramSkill::query()
                ->whereHas('program', fn ($query) => $query->where('program_status', 'open'))
                ->distinct('skill_name')
                ->count('skill_name')
            : 0;

        return [
            'active_programs' => GovernmentProgram::whereIn('program_status', ['open', 'closed'])->count(),
            'total_applicants' => ProgramApplication::count(),
            'open_programs' => GovernmentProgram::where('program_status', 'open')->count(),
            'closed_programs' => GovernmentProgram::where('program_status', 'closed')->count(),
            'approved_beneficiaries' => ProgramApplication::where('application_status', 'approved')->count(),
            'completed_participants' => ProgramApplication::where('application_status', 'completed')->count(),
            'training_skills_linked' => $linkedSkillCount,
            'job_fairs' => Schema::hasTable('job_fairs') ? JobFair::count() : 0,
            'top_requested_skills' => collect(),
            'upcoming_deadlines' => GovernmentProgram::query()
                ->where('program_status', 'open')
                ->whereBetween('application_deadline', [today(), today()->addDays(30)])
                ->orderBy('application_deadline')
                ->limit(8)
                ->get(['program_id', 'program_name', 'application_deadline', 'available_slots']),
            'categories' => GovernmentProgram::query()
                ->selectRaw('category, COUNT(*) as programs_count')
                ->groupBy('category')
                ->orderByDesc('programs_count')
                ->get(),
        ];
    }
}
