<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'event_schedule_histories',
            function (Blueprint $table) {
                $table->id();

                /*
                |--------------------------------------------------------------------------
                | EVENT
                |--------------------------------------------------------------------------
                |
                | nullable karena ketika agenda dihapus,
                | history tetap disimpan.
                |
                */

                $table
                    ->foreignId(
                        'event_schedule_id'
                    )
                    ->nullable()
                    ->constrained(
                        'event_schedules'
                    )
                    ->nullOnDelete();

                /*
                |--------------------------------------------------------------------------
                | USER
                |--------------------------------------------------------------------------
                |
                | nullable agar history tetap tersimpan
                | apabila akun admin suatu saat dihapus.
                |
                */

                $table
                    ->foreignId(
                        'user_id'
                    )
                    ->nullable()
                    ->constrained(
                        'users'
                    )
                    ->nullOnDelete();

                /*
                |--------------------------------------------------------------------------
                | ACTION
                |--------------------------------------------------------------------------
                |
                | created
                | updated
                | deleted
                |
                */

                $table
                    ->string(
                        'action',
                        30
                    );

                /*
                |--------------------------------------------------------------------------
                | EVENT TITLE
                |--------------------------------------------------------------------------
                |
                | Disimpan terpisah agar nama agenda
                | masih diketahui setelah agenda dihapus.
                |
                */

                $table
                    ->string(
                        'event_title',
                        255
                    )
                    ->nullable();

                /*
                |--------------------------------------------------------------------------
                | CHANGES
                |--------------------------------------------------------------------------
                */

                $table
                    ->json(
                        'old_values'
                    )
                    ->nullable();

                $table
                    ->json(
                        'new_values'
                    )
                    ->nullable();

                /*
                |--------------------------------------------------------------------------
                | DESCRIPTION
                |--------------------------------------------------------------------------
                */

                $table
                    ->text(
                        'description'
                    )
                    ->nullable();

                $table->timestamps();

                /*
                |--------------------------------------------------------------------------
                | INDEX
                |--------------------------------------------------------------------------
                */

                $table->index([
                    'event_schedule_id',
                    'created_at',
                ]);

                $table->index([
                    'user_id',
                    'created_at',
                ]);

                $table->index(
                    'action'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'event_schedule_histories'
        );
    }
};