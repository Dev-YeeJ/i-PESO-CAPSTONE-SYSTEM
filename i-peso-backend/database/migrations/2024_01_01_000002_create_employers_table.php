<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employers', function (Blueprint $table) {
            $table->id('employer_id');
            $table->string('company_name', 255);
            $table->string('representative_name', 255);
            $table->string('email', 255)->unique();
            $table->string('password');
            $table->string('mobile_number', 20);
            $table->string('complete_address', 500);
            $table->string('industry_type', 100);
            $table->string('profile_image', 500)->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employers');
    }
};