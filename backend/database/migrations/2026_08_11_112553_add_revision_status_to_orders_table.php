<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE orders
            MODIFY COLUMN status
            ENUM(
                'pending',
                'revision',
                'approved',
                'rejected',
                'completed'
            )
            NOT NULL
            DEFAULT 'pending'
        ");
    }

    public function down(): void
    {
        /*
         * Pastikan tidak ada data berstatus revision
         * sebelum menghapus opsi revision dari ENUM.
         */
        DB::table('orders')
            ->where(
                'status',
                'revision'
            )
            ->update([
                'status' =>
                    'pending',
            ]);

        DB::statement("
            ALTER TABLE orders
            MODIFY COLUMN status
            ENUM(
                'pending',
                'approved',
                'rejected',
                'completed'
            )
            NOT NULL
            DEFAULT 'pending'
        ");
    }
};