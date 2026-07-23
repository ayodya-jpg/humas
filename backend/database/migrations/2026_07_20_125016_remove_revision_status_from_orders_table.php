<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Menghapus status revision dari tabel orders.
     */
    public function up(): void
    {
        if (!Schema::hasTable('orders')) {
            return;
        }

        /*
         * Data lama dengan status revision tidak boleh tersisa
         * sebelum struktur ENUM diubah.
         *
         * Catatan admin tetap dipertahankan sebagai alasan penolakan.
         */
        DB::table('orders')
            ->where('status', 'revision')
            ->update([
                'status' => 'rejected',
                'rejected_at' => DB::raw('COALESCE(rejected_at, updated_at, created_at, NOW())'),
                'approved_at' => null,
                'completed_at' => null,
                'updated_at' => now(),
            ]);

        /*
         * Status final merchandise:
         *
         * pending   -> menunggu keputusan admin
         * approved  -> pengajuan disetujui
         * rejected  -> pengajuan ditolak
         * completed -> proses merchandise selesai
         */
        DB::statement("
            ALTER TABLE orders
            MODIFY COLUMN status ENUM(
                'pending',
                'approved',
                'rejected',
                'completed'
            ) NOT NULL DEFAULT 'pending'
        ");
    }

    /**
     * Mengembalikan struktur ENUM lama apabila migration di-rollback.
     *
     * Data rejected tidak otomatis dikembalikan menjadi revision karena
     * database sudah tidak dapat membedakan penolakan asli dan revisi lama.
     */
    public function down(): void
    {
        if (!Schema::hasTable('orders')) {
            return;
        }

        DB::statement("
            ALTER TABLE orders
            MODIFY COLUMN status ENUM(
                'pending',
                'approved',
                'revision',
                'rejected',
                'completed'
            ) NOT NULL DEFAULT 'pending'
        ");
    }
};