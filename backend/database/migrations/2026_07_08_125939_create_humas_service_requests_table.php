<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('humas_service_requests', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('service_code')->unique();

            $table->string('service_type');
            $table->string('title');
            $table->date('activity_date')->nullable();
            $table->string('location')->nullable();

            $table->text('description');
            $table->text('user_note')->nullable();
            $table->text('admin_note')->nullable();

            $table->string('attachment_file_path')->nullable();
            $table->string('attachment_file_name')->nullable();
            $table->string('attachment_file_mime')->nullable();

            $table->enum('status', [
                'pending',
                'approved',
                'revision',
                'rejected',
                'completed',
            ])->default('pending');

            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['service_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('humas_service_requests');
    }
};