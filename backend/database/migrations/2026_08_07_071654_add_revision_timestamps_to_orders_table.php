<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            if (
                !Schema::hasColumn(
                    'orders',
                    'revision_requested_at'
                )
            ) {
                $table
                    ->timestamp('revision_requested_at')
                    ->nullable()
                    ->after('submitted_at');
            }

            if (
                !Schema::hasColumn(
                    'orders',
                    'resubmitted_at'
                )
            ) {
                $table
                    ->timestamp('resubmitted_at')
                    ->nullable()
                    ->after('revision_requested_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $columns = [];

            if (
                Schema::hasColumn(
                    'orders',
                    'revision_requested_at'
                )
            ) {
                $columns[] =
                    'revision_requested_at';
            }

            if (
                Schema::hasColumn(
                    'orders',
                    'resubmitted_at'
                )
            ) {
                $columns[] =
                    'resubmitted_at';
            }

            if (!empty($columns)) {
                $table->dropColumn(
                    $columns
                );
            }
        });
    }
};