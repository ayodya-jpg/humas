
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Menambahkan status completed untuk Request Aset SEKPiM.
     *
     * Status yang didukung:
     * - pending   : Menunggu persetujuan
     * - approved  : Disetujui
     * - rejected  : Ditolak
     * - borrowed  : Barang sedang dipinjam
     * - returned  : Barang sudah dikembalikan
     * - completed : Request Aset selesai diserahkan
     */
    public function up(): void
    {
        if (!Schema::hasTable('borrow_requests')) {
            return;
        }

        if (!Schema::hasColumn('borrow_requests', 'status')) {
            return;
        }

        DB::statement("
            ALTER TABLE `borrow_requests`
            MODIFY COLUMN `status` ENUM(
                'pending',
                'approved',
                'rejected',
                'borrowed',
                'returned',
                'completed'
            ) NOT NULL DEFAULT 'pending'
        ");
    }

    /**
     * Tidak menghapus status completed ketika rollback,
     * karena pengajuan yang sudah selesai mungkin telah
     * menggunakan status tersebut.
     */
    public function down(): void
    {
        // Tidak mengubah status atau data pengajuan.
    }
};
