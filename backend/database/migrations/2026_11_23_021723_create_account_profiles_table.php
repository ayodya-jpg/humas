
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /*
        |--------------------------------------------------------------------------
        | TABEL PROFIL PENGGUNA
        |--------------------------------------------------------------------------
        |
        | Data tambahan akun dipisahkan dari tabel users.
        |
        | Satu user hanya memiliki satu profil.
        | Jika user dihapus, profil ikut dihapus.
        |
        */

        if (Schema::hasTable('account_profiles')) {
            return;
        }

        Schema::create('account_profiles', function (Blueprint $table): void {

            $table->foreignId('user_id')
                ->primary()
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('phone_number', 30)
                ->nullable();

            $table->string('unit_name', 150)
                ->nullable();

            $table->string('job_title', 150)
                ->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_profiles');
    }
};
