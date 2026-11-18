
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Menambahkan penyimpanan galeri gambar produk.
     *
     * Kolom image yang sudah ada tetap digunakan
     * sebagai gambar utama produk.
     *
     * Kolom gallery_images digunakan untuk menyimpan
     * beberapa gambar tambahan dalam format JSON.
     */
    public function up(): void
    {
        if (!Schema::hasTable('products')) {
            return;
        }

        if (Schema::hasColumn('products', 'gallery_images')) {
            return;
        }

        Schema::table('products', function (Blueprint $table): void {
            $table
                ->json('gallery_images')
                ->nullable()
                ->after('image');
        });
    }

    /**
     * Tidak menghapus kolom ketika rollback
     * untuk mencegah hilangnya referensi gambar
     * yang sudah diunggah oleh admin.
     */
    public function down(): void
    {
        // Kolom dan data galeri tetap dipertahankan.
    }
};
