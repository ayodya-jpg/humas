
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_schedule_requests', function (Blueprint $table) {
            $table->string('rundown_path')->nullable();
            $table->string('rundown_name')->nullable();
            $table->string('tor_path')->nullable();
            $table->string('tor_name')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('event_schedule_requests', function (Blueprint $table) {
            $table->dropColumn([
                'rundown_path',
                'rundown_name',
                'tor_path',
                'tor_name',
            ]);
        });
    }
};
