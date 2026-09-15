<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    
    public function up(): void
    {
        DB::table('job_fair_employers')->whereIn('participation_status', ['interested', 'accepted', 'requirements_pending'])->update(['participation_status' => 'requirements_pending']);
        DB::table('job_fair_employers')->where('participation_status', 'requirements_submitted')->update(['participation_status' => 'under_review']);
        DB::table('job_fair_employers')->where('participation_status', 'called_peso')->update(['participation_status' => 'invited']);
        DB::table('job_fair_employers')->where('participation_status', 'pending_response')->update(['participation_status' => 'invited']);
    }

    
    public function down(): void
    {
       
    }
};
