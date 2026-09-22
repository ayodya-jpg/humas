<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_schedule_histories', function (Blueprint $table) {
            $table->id();

            $table
                ->foreignId('event_schedule_id')
                ->nullable()
                ->constrained('event_schedules')
                ->nullOnDelete();

            $table
                ->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('action', 30);

            $table
                ->string('event_title', 255)
                ->nullable();

            $table
                ->json('old_values')
                ->nullable();

            $table
                ->json('new_values')
                ->nullable();

            $table
                ->text('description')
                ->nullable();

            $table->timestamps();

            $table->index([
                'event_schedule_id',
                'created_at',
            ]);

            $table->index([
                'user_id',
                'created_at',
            ]);

            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'event_schedule_histories'
        );
    }
};