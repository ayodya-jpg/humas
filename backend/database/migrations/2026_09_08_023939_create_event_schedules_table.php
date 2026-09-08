<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'event_schedules',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->string(
                        'title',
                        255
                    );

                $table
                    ->text(
                        'description'
                    )
                    ->nullable();

                $table
                    ->date(
                        'event_date'
                    );

                $table
                    ->time(
                        'start_time'
                    )
                    ->nullable();

                $table
                    ->time(
                        'end_time'
                    )
                    ->nullable();

                $table
                    ->boolean(
                        'all_day'
                    )
                    ->default(
                        false
                    );

                $table
                    ->string(
                        'location',
                        255
                    )
                    ->nullable();

                $table
                    ->string(
                        'agenda_type',
                        100
                    )
                    ->nullable();

                /*
                 * Hex color.
                 *
                 * Contoh:
                 * #2563EB
                 */
                $table
                    ->string(
                        'color',
                        20
                    )
                    ->default(
                        '#7F1D1D'
                    );

                /*
                 * true:
                 * tampil di halaman login/public.
                 *
                 * false:
                 * hanya user yang sudah login.
                 */
                $table
                    ->boolean(
                        'is_public'
                    )
                    ->default(
                        true
                    );

                $table
                    ->foreignId(
                        'created_by'
                    )
                    ->nullable()
                    ->constrained(
                        'users'
                    )
                    ->nullOnDelete();

                $table
                    ->foreignId(
                        'updated_by'
                    )
                    ->nullable()
                    ->constrained(
                        'users'
                    )
                    ->nullOnDelete();

                $table->timestamps();

                $table->index(
                    'event_date'
                );

                $table->index([
                    'event_date',
                    'is_public',
                ]);

                $table->index(
                    'agenda_type'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'event_schedules'
        );
    }
};