<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sms_notifications', function (Blueprint $table) {
            if (! Schema::hasColumn('sms_notifications', 'normalized_phone_number')) {
                $table->string('normalized_phone_number', 20)->nullable()->after('phone_number');
            }
            if (! Schema::hasColumn('sms_notifications', 'purpose')) {
                $table->string('purpose', 100)->nullable()->after('message_type');
            }
            if (! Schema::hasColumn('sms_notifications', 'provider')) {
                $table->string('provider', 50)->nullable()->after('status');
            }
            if (! Schema::hasColumn('sms_notifications', 'provider_message_id')) {
                $table->string('provider_message_id')->nullable()->after('provider');
            }
            if (! Schema::hasColumn('sms_notifications', 'provider_reference_id')) {
                $table->string('provider_reference_id')->nullable()->after('provider_message_id');
            }
            if (! Schema::hasColumn('sms_notifications', 'provider_error')) {
                $table->text('provider_error')->nullable()->after('provider_reference_id');
            }
            if (! Schema::hasColumn('sms_notifications', 'error_message')) {
                $table->text('error_message')->nullable()->after('provider_error');
            }
            if (! Schema::hasColumn('sms_notifications', 'metadata')) {
                $table->json('metadata')->nullable()->after('error_message');
            }
            if (! Schema::hasColumn('sms_notifications', 'gateway_status')) {
                $table->string('gateway_status', 30)->nullable()->after('status');
            }
            if (! Schema::hasColumn('sms_notifications', 'sent_at')) {
                $table->timestamp('sent_at')->nullable();
            }
        });

        if (! Schema::hasIndex('sms_notifications', 'sms_gateway_status_index')) {
            Schema::table('sms_notifications', fn (Blueprint $table) => $table->index('gateway_status', 'sms_gateway_status_index'));
        }
        if (! Schema::hasIndex('sms_notifications', 'sms_purpose_created_index')) {
            Schema::table('sms_notifications', fn (Blueprint $table) => $table->index(['purpose', 'created_at'], 'sms_purpose_created_index'));
        }
    }

    public function down(): void
    {
        Schema::table('sms_notifications', function (Blueprint $table) {
            if (Schema::hasIndex('sms_notifications', 'sms_gateway_status_index')) {
                $table->dropIndex('sms_gateway_status_index');
            }
            if (Schema::hasIndex('sms_notifications', 'sms_purpose_created_index')) {
                $table->dropIndex('sms_purpose_created_index');
            }

            foreach ([
                'normalized_phone_number', 'purpose', 'provider', 'provider_message_id',
                'provider_reference_id', 'provider_error', 'error_message', 'metadata', 'gateway_status',
            ] as $column) {
                if (Schema::hasColumn('sms_notifications', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
