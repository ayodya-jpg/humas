
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_reads', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('notification_key', 191);

            $table->timestamp('read_at')
                ->nullable();

            $table->timestamps();

            $table->unique(
                ['user_id', 'notification_key'],
                'notification_reads_user_key_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_reads');
    }
};
