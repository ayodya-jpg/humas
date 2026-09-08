<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'service_submission_settings',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->string('service_key')
                    ->unique();

                $table
                    ->unsignedInteger('min_submission_days')
                    ->default(4);

                $table
                    ->foreignId('updated_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->timestamps();
            }
        );

        /*
         * Ambil aturan Humas lama jika tabel humas_settings
         * sudah tersedia.
         */
        $humasMinimumDays = 4;

        if (
            Schema::hasTable(
                'humas_settings'
            )
        ) {
            $existingHumasSetting =
                DB::table(
                    'humas_settings'
                )
                    ->orderBy('id')
                    ->first();

            if (
                $existingHumasSetting &&
                isset(
                    $existingHumasSetting
                        ->min_submission_days
                )
            ) {
                $humasMinimumDays =
                    (int)
                        $existingHumasSetting
                            ->min_submission_days;
            }
        }

        $now = now();

        DB::table(
            'service_submission_settings'
        )->insert([
            [
                'service_key' =>
                    'merchandise',

                'min_submission_days' =>
                    4,

                'updated_by' =>
                    null,

                'created_at' =>
                    $now,

                'updated_at' =>
                    $now,
            ],

            [
                'service_key' =>
                    'humas',

                /*
                 * Mempertahankan nilai Humas
                 * yang sebelumnya sudah disimpan.
                 */
                'min_submission_days' =>
                    $humasMinimumDays,

                'updated_by' =>
                    null,

                'created_at' =>
                    $now,

                'updated_at' =>
                    $now,
            ],

            [
                'service_key' =>
                    'sekpim_borrow',

                'min_submission_days' =>
                    4,

                'updated_by' =>
                    null,

                'created_at' =>
                    $now,

                'updated_at' =>
                    $now,
            ],

            [
                'service_key' =>
                    'sekpim_asset_request',

                'min_submission_days' =>
                    4,

                'updated_by' =>
                    null,

                'created_at' =>
                    $now,

                'updated_at' =>
                    $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'service_submission_settings'
        );
    }
};