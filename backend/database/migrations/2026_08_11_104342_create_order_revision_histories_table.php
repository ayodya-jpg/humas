<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'order_revision_histories',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->foreignId('order_id')
                    ->constrained('orders')
                    ->cascadeOnDelete();

                $table
                    ->foreignId('requested_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->text(
                    'revision_note'
                );

                $table
                    ->timestamp(
                        'requested_at'
                    )
                    ->nullable();

                $table
                    ->timestamp(
                        'resubmitted_at'
                    )
                    ->nullable();

                $table->timestamps();

                $table->index([
                    'order_id',
                    'requested_at',
                ]);

                $table->index([
                    'order_id',
                    'resubmitted_at',
                ]);
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'order_revision_histories'
        );
    }
};