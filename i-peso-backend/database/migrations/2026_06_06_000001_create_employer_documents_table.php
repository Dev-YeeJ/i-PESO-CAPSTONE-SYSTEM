<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('employer_documents', function (Blueprint $table) {
            $table->id('document_id');
            $table->unsignedBigInteger('employer_id');
            
            // Document type - matches Step 3 requirements
            $table->enum('document_type', [
                'mayors_permit',
                'bir_certificate',
                'philJobnet_proof',
                'dti_certificate',
                'sec_certificate',
                'prpa_license',
                'dme_poea_license',
                'no_pending_case_certificate',
                'company_logo',
                'government_id',
                'authorization_letter',
                'other'
            ]);

            $table->string('document_path'); // Storage path
            $table->string('original_filename');
            $table->integer('file_size'); // in bytes
            $table->string('mime_type'); // PDF, image/jpeg, etc.
            $table->timestamp('uploaded_at');

            // Verification tracking
            $table->enum('verification_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('admin_notes')->nullable(); // For rejection reason or comments

            $table->foreign('employer_id')
                ->references('employer_id')
                ->on('employers')
                ->onDelete('cascade');

            $table->timestamps();
            $table->index(['employer_id', 'document_type']);
            $table->index(['verification_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employer_documents');
    }
};
