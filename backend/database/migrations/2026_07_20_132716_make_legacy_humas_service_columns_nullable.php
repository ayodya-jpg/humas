<?php

use Illuminate\Database\Migrations\Migration;
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
         * Kolom ini berasal dari rancangan Layanan Humas sebelumnya.
         * Sekarang modul berubah menjadi Form Request Liputan Humas.
         *
         * Kolom lama tetap dipertahankan agar data lama tidak hilang,
         * tetapi dibuat nullable agar request baru dapat disimpan.
         */

        if (Schema::hasColumn('humas_service_requests', 'service_type')) {
            DB::statement("
                ALTER TABLE humas_service_requests
                MODIFY COLUMN service_type VARCHAR(255) NULL
            ");
        }

        if (Schema::hasColumn('humas_service_requests', 'title')) {
            DB::statement("
                ALTER TABLE humas_service_requests
                MODIFY COLUMN title VARCHAR(255) NULL
            ");
        }

        if (Schema::hasColumn('humas_service_requests', 'description')) {
            DB::statement("
                ALTER TABLE humas_service_requests
                MODIFY COLUMN description TEXT NULL
            ");
        }

        /*
         * Kolom tambahan dari rancangan lama juga dibuat nullable
         * apabila sebelumnya sudah pernah ditambahkan.
         */

        $nullableStringColumns = [
            'activity_start_time',
            'activity_end_time',
            'target_audience',
            'publication_channel',
            'reference_link',
            'documentation_type',
            'design_type',
            'design_size',
            'website_type',
        ];

        foreach ($nullableStringColumns as $column) {
            if (!Schema::hasColumn('humas_service_requests', $column)) {
                continue;
            }

            if (in_array($column, ['activity_start_time', 'activity_end_time'], true)) {
                DB::statement("
                    ALTER TABLE humas_service_requests
                    MODIFY COLUMN {$column} TIME NULL
                ");

                continue;
            }

            if ($column === 'reference_link') {
                DB::statement("
                    ALTER TABLE humas_service_requests
                    MODIFY COLUMN reference_link VARCHAR(1000) NULL
                ");

                continue;
            }

            DB::statement("
                ALTER TABLE humas_service_requests
                MODIFY COLUMN {$column} VARCHAR(255) NULL
            ");
        }

        $nullableTextColumns = [
            'caption',
            'output_requirements',
            'website_features',
        ];

        foreach ($nullableTextColumns as $column) {
            if (Schema::hasColumn('humas_service_requests', $column)) {
                DB::statement("
                    ALTER TABLE humas_service_requests
                    MODIFY COLUMN {$column} TEXT NULL
                ");
            }
        }

        $nullableDateColumns = [
            'activity_date',
            'publish_date',
            'design_deadline',
        ];

        foreach ($nullableDateColumns as $column) {
            if (Schema::hasColumn('humas_service_requests', $column)) {
                DB::statement("
                    ALTER TABLE humas_service_requests
                    MODIFY COLUMN {$column} DATE NULL
                ");
            }
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('humas_service_requests')) {
            return;
        }

        /*
         * Rollback hanya mengembalikan tiga kolom utama lama.
         * Pastikan tidak ada nilai null sebelum rollback.
         */

        DB::table('humas_service_requests')
            ->whereNull('service_type')
            ->update([
                'service_type' => 'coverage',
            ]);

        DB::table('humas_service_requests')
            ->whereNull('title')
            ->update([
                'title' => 'Request Liputan Humas',
            ]);

        DB::table('humas_service_requests')
            ->whereNull('description')
            ->update([
                'description' => 'Data request liputan Humas.',
            ]);

        DB::statement("
            ALTER TABLE humas_service_requests
            MODIFY COLUMN service_type VARCHAR(255) NOT NULL
        ");

        DB::statement("
            ALTER TABLE humas_service_requests
            MODIFY COLUMN title VARCHAR(255) NOT NULL
        ");

        DB::statement("
            ALTER TABLE humas_service_requests
            MODIFY COLUMN description TEXT NOT NULL
        ");
    }
};