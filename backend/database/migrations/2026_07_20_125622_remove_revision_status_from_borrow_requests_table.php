<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Menghapus status revision dari tabel borrow_requests.
     */
    public function up(): void
    {
        if (!Schema::hasTable('borrow_requests')) {
            return;
        }

        /*
         * Data revision lama diubah menjadi rejected.
         * Catatan admin tetap dipertahankan sebagai alasan penolakan.
         */
        DB::table('borrow_requests')
            ->where('status', 'revision')
            ->update([
                'status' => 'rejected',
                'rejected_at' => DB::raw(
                    'COALESCE(rejected_at, updated_at, created_at, NOW())'
                ),
                'approved_at' => null,
                'borrowed_at' => null,
                'returned_at' => null,
                'updated_at' => now(),
            ]);

        DB::statement("
            ALTER TABLE borrow_requests
            MODIFY COLUMN status ENUM(
                'pending',
                'approved',
                'rejected',
                'borrowed',
                'returned'
            ) NOT NULL DEFAULT 'pending'
        ");
    }

    /**
     * Mengembalikan struktur enum lama ketika rollback.
     */
    public function down(): void
    {
        if (!Schema::hasTable('borrow_requests')) {
            return;
        }

        DB::statement("
            ALTER TABLE borrow_requests
            MODIFY COLUMN status ENUM(
                'pending',
                'approved',
                'revision',
                'rejected',
                'borrowed',
                'returned'
            ) NOT NULL DEFAULT 'pending'
        ");
    }
};