
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meeting_records', function (Blueprint $table) {
            $table->id();

            $table->foreignId('event_schedule_id')
                ->nullable()
                ->unique()
                ->constrained('event_schedules')
                ->nullOnDelete();

            $table->string('title', 255);
            $table->string('directorate', 50);
            $table->date('meeting_date');

            $table->enum('realization_status', [
                'held',
                'postponed',
                'cancelled',
            ])->default('held');

            $table->unsignedInteger('participants_count')
                ->default(0);

            $table->text('notes')->nullable();
            $table->text('decisions')->nullable();
            $table->text('follow_up')->nullable();

            $table->string('follow_up_pic', 255)->nullable();
            $table->date('follow_up_due_date')->nullable();

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index([
                'directorate',
                'meeting_date',
            ]);

            $table->index([
                'meeting_date',
                'realization_status',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_records');
    }
};
