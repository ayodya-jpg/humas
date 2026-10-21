
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tambahkan identitas pengaju dan PIC
     * pada kalender Direktorat.
     */
    public function up(): void
    {
        Schema::table('event_schedules', function (Blueprint $table) {
            $table->string('requester_unit', 255)->nullable();
            $table->string('pic_name', 255)->nullable();
        });
    }

    /**
     * Kembalikan struktur database sebelumnya.
     */
    public function down(): void
    {
        Schema::table('event_schedules', function (Blueprint $table) {
            $table->dropColumn([
                'requester_unit',
                'pic_name',
            ]);
        });
    }
};
