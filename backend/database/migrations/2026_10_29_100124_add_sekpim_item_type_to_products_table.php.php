
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('products', 'sekpim_item_type')) {
            Schema::table('products', function (Blueprint $table) {
                $table->string('sekpim_item_type', 30)
                    ->nullable()
                    ->index();
            });
        }
    }

    public function down(): void
    {
        // Sengaja tidak menghapus kolom otomatis karena mungkin
        // sudah ada pada database dari pembaruan sebelumnya.
    }
};
