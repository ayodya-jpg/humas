
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TABLE_NAME = 'event_schedule_requests';

    private const COLUMNS = [
        'rundown_path',
        'rundown_name',
        'tor_path',
        'tor_name',
    ];

    public function up(): void
    {
        if (!Schema::hasTable(self::TABLE_NAME)) {
            return;
        }

        foreach (self::COLUMNS as $column) {
            if (Schema::hasColumn(self::TABLE_NAME, $column)) {
                continue;
            }

            Schema::table(
                self::TABLE_NAME,
                function (Blueprint $table) use ($column) {
                    $table->string($column, 255)->nullable();
                }
            );
        }
    }

    public function down(): void
    {
        // Sengaja tidak menghapus kolom karena dapat
        // menghilangkan referensi dokumen yang sudah tersimpan.
    }
};
