<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jalankan migration.
     */
    public function up(): void
    {
        Schema::create('borrow_requests', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('borrow_code')->unique();

            $table->text('purpose')->nullable();

            $table->date('borrow_date');
            $table->date('return_date');

            $table->enum('status', [
                'pending',
                'approved',
                'revision',
                'rejected',
                'borrowed',
                'returned'
            ])->default('pending');

            $table->text('admin_note')->nullable();

            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('borrowed_at')->nullable();
            $table->timestamp('returned_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Rollback migration.
     */
    public function down(): void
    {
        Schema::dropIfExists('borrow_requests');
    }
};