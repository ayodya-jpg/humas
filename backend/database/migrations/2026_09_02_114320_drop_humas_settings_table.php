<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (
            Schema::hasTable(
                'humas_settings'
            )
        ) {
            Schema::drop(
                'humas_settings'
            );
        }
    }

    public function down(): void
    {
        if (
            !Schema::hasTable(
                'humas_settings'
            )
        ) {
            Schema::create(
                'humas_settings',
                function (
                    Blueprint $table
                ): void {
                    $table->id();

                    $table
                        ->unsignedInteger(
                            'min_submission_days'
                        )
                        ->default(
                            4
                        );

                    $table
                        ->foreignId(
                            'updated_by'
                        )
                        ->nullable()
                        ->constrained(
                            'users'
                        )
                        ->nullOnDelete();

                    $table
                        ->timestamps();
                }
            );
        }
    }
};