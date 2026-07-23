<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('humas_service_requests')) {
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Normalisasi status lama
        |--------------------------------------------------------------------------
        |
        | Apabila masih ada data revision dari struktur sebelumnya,
        | data tersebut diubah menjadi rejected.
        |
        */

        DB::table('humas_service_requests')
            ->where('status', 'revision')
            ->update([
                'status' => 'rejected',
                'rejected_at' => DB::raw(
                    'COALESCE(rejected_at, updated_at, created_at, NOW())'
                ),
                'approved_at' => null,
                'completed_at' => null,
                'updated_at' => now(),
            ]);

        /*
        |--------------------------------------------------------------------------
        | Tambahkan field Form Request Liputan HUMAS TUS
        |--------------------------------------------------------------------------
        */

        Schema::table('humas_service_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('humas_service_requests', 'applicant_name')) {
                $table
                    ->string('applicant_name')
                    ->nullable()
                    ->after('service_code');
            }

            if (!Schema::hasColumn('humas_service_requests', 'unit_name')) {
                $table
                    ->string('unit_name')
                    ->nullable()
                    ->after('applicant_name');
            }

            if (!Schema::hasColumn('humas_service_requests', 'other_unit_name')) {
                $table
                    ->string('other_unit_name')
                    ->nullable()
                    ->after('unit_name');
            }

            if (!Schema::hasColumn('humas_service_requests', 'pic_whatsapp')) {
                $table
                    ->string('pic_whatsapp', 30)
                    ->nullable()
                    ->after('other_unit_name');
            }

            if (!Schema::hasColumn('humas_service_requests', 'activity_detail')) {
                $table
                    ->text('activity_detail')
                    ->nullable()
                    ->after('pic_whatsapp');
            }

            if (!Schema::hasColumn('humas_service_requests', 'coverage_type')) {
                $table
                    ->string('coverage_type')
                    ->nullable()
                    ->after('activity_detail');
            }

            if (!Schema::hasColumn('humas_service_requests', 'event_location')) {
                $table
                    ->string('event_location')
                    ->nullable()
                    ->after('coverage_type');
            }

            if (!Schema::hasColumn('humas_service_requests', 'event_date')) {
                $table
                    ->date('event_date')
                    ->nullable()
                    ->after('event_location');
            }

            if (!Schema::hasColumn('humas_service_requests', 'article_draft_path')) {
                $table
                    ->string('article_draft_path')
                    ->nullable()
                    ->after('event_date');
            }

            if (!Schema::hasColumn('humas_service_requests', 'article_draft_name')) {
                $table
                    ->string('article_draft_name')
                    ->nullable()
                    ->after('article_draft_path');
            }

            if (!Schema::hasColumn('humas_service_requests', 'article_draft_mime')) {
                $table
                    ->string('article_draft_mime')
                    ->nullable()
                    ->after('article_draft_name');
            }
        });

        /*
        |--------------------------------------------------------------------------
        | Status final tanpa revision
        |--------------------------------------------------------------------------
        */

        DB::statement("
            ALTER TABLE humas_service_requests
            MODIFY COLUMN status ENUM(
                'pending',
                'approved',
                'rejected',
                'completed'
            ) NOT NULL DEFAULT 'pending'
        ");

        /*
        |--------------------------------------------------------------------------
        | Index tambahan
        |--------------------------------------------------------------------------
        */

        try {
            Schema::table('humas_service_requests', function (Blueprint $table) {
                $table->index(
                    ['coverage_type', 'event_date'],
                    'humas_coverage_event_index'
                );
            });
        } catch (\Throwable $error) {
            /*
             * Abaikan apabila index sudah pernah dibuat.
             */
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('humas_service_requests')) {
            return;
        }

        DB::statement("
            ALTER TABLE humas_service_requests
            MODIFY COLUMN status ENUM(
                'pending',
                'approved',
                'revision',
                'rejected',
                'completed'
            ) NOT NULL DEFAULT 'pending'
        ");

        try {
            Schema::table('humas_service_requests', function (Blueprint $table) {
                $table->dropIndex('humas_coverage_event_index');
            });
        } catch (\Throwable $error) {
            /*
             * Abaikan apabila index tidak tersedia.
             */
        }

        Schema::table('humas_service_requests', function (Blueprint $table) {
            $columns = [
                'applicant_name',
                'unit_name',
                'other_unit_name',
                'pic_whatsapp',
                'activity_detail',
                'coverage_type',
                'event_location',
                'event_date',
                'article_draft_path',
                'article_draft_name',
                'article_draft_mime',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('humas_service_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};