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
            'humas_service_availabilities',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->string('coverage_type')
                    ->unique();

                $table
                    ->boolean('is_active')
                    ->default(true);

                $table
                    ->foreignId('updated_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->timestamps();
            }
        );

        $now = now();

        DB::table(
            'humas_service_availabilities'
        )->insert([
            [
                'coverage_type' =>
                    'REQUEST DESIGN INSTAGRAM',

                'is_active' =>
                    true,

                'updated_by' =>
                    null,

                'created_at' =>
                    $now,

                'updated_at' =>
                    $now,
            ],

            [
                'coverage_type' =>
                    'DOKUMENTASI',

                'is_active' =>
                    true,

                'updated_by' =>
                    null,

                'created_at' =>
                    $now,

                'updated_at' =>
                    $now,
            ],

            [
                'coverage_type' =>
                    'PUBLIKASI WEBSITE',

                'is_active' =>
                    true,

                'updated_by' =>
                    null,

                'created_at' =>
                    $now,

                'updated_at' =>
                    $now,
            ],

            [
                'coverage_type' =>
                    'PUBLIKASI MEDIA MASSA',

                'is_active' =>
                    true,

                'updated_by' =>
                    null,

                'created_at' =>
                    $now,

                'updated_at' =>
                    $now,
            ],

            [
                'coverage_type' =>
                    'YOUTUBE',

                'is_active' =>
                    true,

                'updated_by' =>
                    null,

                'created_at' =>
                    $now,

                'updated_at' =>
                    $now,
            ],

            [
                'coverage_type' =>
                    'VIDEO REELS',

                'is_active' =>
                    true,

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
            'humas_service_availabilities'
        );
    }
};