<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'orders',
            function (Blueprint $table): void {
                $table
                    ->string('pic_name')
                    ->nullable()
                    ->after('event_name');

                $table
                    ->string('pic_phone', 30)
                    ->nullable()
                    ->after('pic_name');

                $table
                    ->date('pickup_date')
                    ->nullable()
                    ->after('activity_date');
            }
        );
    }

    public function down(): void
    {
        Schema::table(
            'orders',
            function (Blueprint $table): void {
                $table->dropColumn([
                    'pic_name',
                    'pic_phone',
                    'pickup_date',
                ]);
            }
        );
    }
};