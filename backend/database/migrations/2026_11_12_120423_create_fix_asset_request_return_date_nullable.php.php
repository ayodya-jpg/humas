
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Memperbaiki struktur tabel borrow_requests.
     *
     * Peminjaman Barang:
     * - return_date tetap wajib melalui validasi controller.
     *
     * Request Aset:
     * - return_date tidak diperlukan karena barang
     *   tidak melalui proses pengembalian.
     */
    public function up(): void
    {
        if (!Schema::hasTable('borrow_requests')) {
            return;
        }

        if (!Schema::hasColumn(
            'borrow_requests',
            'return_date'
        )) {
            return;
        }

        Schema::table(
            'borrow_requests',
            function (Blueprint $table): void {
                $table
                    ->date('return_date')
                    ->nullable()
                    ->change();
            }
        );
    }

    /**
     * Tidak mengembalikan kolom menjadi NOT NULL
     * ketika rollback.
     *
     * Hal ini untuk melindungi Request Aset
     * yang sudah disimpan tanpa tanggal kembali.
     */
    public function down(): void
    {
        // Tidak mengubah data maupun kolom.
    }
};
