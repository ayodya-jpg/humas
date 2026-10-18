<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_schedules', function (Blueprint $table) {
            $table
                ->string('directorate', 50)
                ->default('direktur')
                ->after('id');

            $table->index([
                'directorate',
                'event_date',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('event_schedules', function (Blueprint $table) {
            $table->dropIndex([
                'directorate',
                'event_date',
            ]);

            $table->dropColumn(
                'directorate'
            );
        });
    }
};