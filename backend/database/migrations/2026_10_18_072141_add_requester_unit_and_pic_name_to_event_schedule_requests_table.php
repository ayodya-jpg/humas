<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_schedule_requests', function (Blueprint $table) {
            $table->string('requester_unit', 255)->nullable();
            $table->string('pic_name', 255)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('event_schedule_requests', function (Blueprint $table) {
            $table->dropColumn([
                'requester_unit',
                'pic_name',
            ]);
        });
    }
};