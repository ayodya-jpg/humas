<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('humas_settings', function (Blueprint $table) {
            $table->id();

            /*
             * Minimal jarak antara hari pengajuan
             * dengan tanggal pelaksanaan kegiatan.
             *
             * 4 = H-4
             * 1 = H-1
             * 0 = H-0 / hari yang sama
             */
            $table
                ->unsignedInteger('min_submission_days')
                ->default(4);

            $table
                ->foreignId('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();
        });

        /*
         * Sistem hanya membutuhkan satu record pengaturan global.
         */
        DB::table('humas_settings')->insert([
            'min_submission_days' => 4,
            'updated_by' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('humas_settings');
    }
};