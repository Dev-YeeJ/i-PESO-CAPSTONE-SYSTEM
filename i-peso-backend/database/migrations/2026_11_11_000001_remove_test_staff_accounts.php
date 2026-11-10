<?php

use App\Models\Administrator;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * One-time cleanup before go-live: permanently removes every staff account
 * except the PESO system administrator (pesourdaneta@gmail.com), as asked by
 * the office. Everything a removed account created or reviewed (job fairs,
 * programs, reports, approvals) is handed over to the system administrator
 * first, so the cascade rules on some of those tables can't delete real
 * records along with the account. Activity-log entries are kept; they show
 * the removed person as a deleted account.
 *
 * Does nothing (and logs why) unless pesourdaneta@gmail.com is an
 * administrator account, so the office can never be left with no admin.
 */
return new class extends Migration
{
    private const KEEP_EMAIL = 'pesourdaneta@gmail.com';

    public function up(): void
    {
        $keep = DB::table('administrators')->where('email', self::KEEP_EMAIL)->first();

        if (! $keep) {
            Log::warning('Test staff cleanup skipped: '.self::KEEP_EMAIL.' is not an administrator account, so no accounts were removed.');

            return;
        }

        $removeIds = DB::table('administrators')->where('admin_id', '!=', $keep->admin_id)->pluck('admin_id')->all();

        DB::transaction(function () use ($keep, $removeIds) {
            // The one account left must be a working system administrator.
            $adminRoleId = Schema::hasTable('admin_roles')
                ? DB::table('admin_roles')->where('slug', 'administrator')->value('id')
                : null;
            $fixes = ['role' => 'administrator', 'status' => 'active'];
            if ($adminRoleId) {
                $fixes['admin_role_id'] = $adminRoleId;
            }
            if (Schema::hasColumn('administrators', 'position')) {
                $fixes['position'] = 'peso_office_manager';
            }
            if (Schema::hasColumn('administrators', 'deactivated_reason')) {
                $fixes['deactivated_reason'] = null;
            }
            DB::table('administrators')->where('admin_id', $keep->admin_id)->update($fixes);

            if ($removeIds === []) {
                return;
            }

            $this->handOverRecords($removeIds, (int) $keep->admin_id);

            foreach (['personal_access_tokens' => 'tokenable', 'notifications' => 'notifiable'] as $table => $morph) {
                if (Schema::hasTable($table)) {
                    DB::table($table)
                        ->where("{$morph}_type", Administrator::class)
                        ->whereIn("{$morph}_id", $removeIds)
                        ->delete();
                }
            }

            // A removed intern's own time record goes with them.
            if (Schema::hasTable('ojt_time_logs')) {
                DB::table('ojt_time_logs')->whereIn('admin_id', $removeIds)->delete();
            }

            DB::table('administrators')->whereIn('admin_id', $removeIds)->delete();
        });

        Log::info(sprintf('Test staff cleanup: removed %d staff account(s); kept %s.', count($removeIds), self::KEEP_EMAIL));
    }

    /**
     * Points every column that references a removed account at the system
     * administrator instead. Found from the database's own foreign keys, so
     * no table is missed.
     */
    private function handOverRecords(array $removeIds, int $keepId): void
    {
        foreach (Schema::getTables() as $table) {
            $name = $table['name'];
            if ($name === 'administrators') {
                continue;
            }

            foreach (Schema::getForeignKeys($name) as $foreignKey) {
                if ($foreignKey['foreign_table'] !== 'administrators' || count($foreignKey['columns']) !== 1) {
                    continue;
                }

                $column = $foreignKey['columns'][0];

                // An intern's own time record belongs to them; it goes with the account.
                if ($name === 'ojt_time_logs' && $column === 'admin_id') {
                    continue;
                }

                DB::table($name)->whereIn($column, $removeIds)->update([$column => $keepId]);
            }
        }
    }

    public function down(): void
    {
        // Deleted accounts can't be restored.
    }
};
