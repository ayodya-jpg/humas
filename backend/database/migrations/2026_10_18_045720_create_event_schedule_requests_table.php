<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'event_schedule_requests',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->foreignId('requested_by')
                    ->constrained('users')
                    ->restrictOnDelete();

                $table->string(
                    'directorate',
                    50
                );

                $table->string(
                    'title',
                    255
                );

                $table->text(
                    'description'
                )->nullable();

                $table->date(
                    'event_date'
                );

                $table->time(
                    'start_time'
                )->nullable();

                $table->time(
                    'end_time'
                )->nullable();

                $table->boolean(
                    'all_day'
                )->default(false);

                $table->string(
                    'location',
                    255
                )->nullable();

                $table->string(
                    'agenda_type',
                    50
                )->default('Rapat');

                $table->boolean(
                    'is_public'
                )->default(false);

                /*
                 * Hanya:
                 * pending, approved, rejected.
                 * Tidak ada status revision.
                 */
                $table->string(
                    'status',
                    20
                )->default('pending');

                /*
                 * Pengajuan terhubung ke agenda
                 * setelah disetujui.
                 */
                $table
                    ->foreignId('approved_schedule_id')
                    ->nullable()
                    ->unique()
                    ->constrained('event_schedules')
                    ->nullOnDelete();

                $table
                    ->foreignId('reviewed_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->timestamp(
                    'reviewed_at'
                )->nullable();

                $table->text(
                    'rejection_reason'
                )->nullable();

                /*
                 * Mengetahui admin yang terakhir
                 * mengedit pengajuan.
                 */
                $table
                    ->foreignId('edited_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->timestamp(
                    'edited_at'
                )->nullable();

                $table->timestamps();

                $table->index([
                    'status',
                    'event_date',
                ]);

                $table->index([
                    'directorate',
                    'event_date',
                ]);

                $table->index([
                    'requested_by',
                    'created_at',
                ]);
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'event_schedule_requests'
        );
    }
};