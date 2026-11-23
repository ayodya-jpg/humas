
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
        | ACCOUNT AUDIT LOGS
        |--------------------------------------------------------------------------
        |
        | Mencatat aktivitas perubahan data akun pengguna.
        |
        | Data yang disimpan:
        | - Siapa yang melakukan perubahan
        | - Akun yang diubah
        | - Jenis aktivitas
        | - Nama field yang berubah
        | - Alamat IP
        | - Informasi perangkat/browser
        | - Waktu perubahan
        |
        | Password, token, dan jawaban keamanan
        | tidak boleh dicatat dalam audit log.
        |
        */

        if (Schema::hasTable('account_audit_logs')) {
            return;
        }

        Schema::create('account_audit_logs', function (Blueprint $table): void {

            $table->id();

            /*
             * Pengguna atau Superadmin
             * yang melakukan perubahan.
             */
            $table->foreignId('actor_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            /*
             * Akun pengguna yang datanya diubah.
             */
            $table->foreignId('subject_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            /*
             * Jenis aktivitas.
             */
            $table->string('event', 80);

            /*
             * Nama kolom yang mengalami perubahan.
             * Tidak menyimpan nilai rahasia.
             */
            $table->json('changed_fields');

            /*
             * Informasi koneksi.
             */
            $table->ipAddress('ip_address')
                ->nullable();

            $table->string('user_agent', 255)
                ->nullable();

            /*
             * Waktu aktivitas.
             */
            $table->timestamp('created_at')
                ->useCurrent();

            /*
             * Index untuk mempercepat
             * pencarian riwayat aktivitas.
             */
            $table->index([
                'subject_user_id',
                'created_at',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_audit_logs');
    }
};
