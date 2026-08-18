<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table
                ->string('sekpim_item_type', 30)
                ->nullable()
                ->after('type');

            $table
                ->index(
                    [
                        'sekpim_item_type',
                        'status',
                    ],
                    'products_sekpim_type_status_index'
                );
        });

        /*
         * Produk lama yang memang bertipe borrow kita anggap
         * sebagai barang Peminjaman SEKPiM.
         *
         * Produk type=both juga tetap tersedia untuk peminjaman.
         *
         * Produk checkout sengaja TIDAK otomatis dijadikan
         * asset_request agar barang Merchandise tidak ikut
         * muncul pada katalog Request Barang SEKPiM.
         */
        DB::table('products')
            ->where('type', 'borrow')
            ->update([
                'sekpim_item_type' => 'borrow',
            ]);

        DB::table('products')
            ->where('type', 'both')
            ->update([
                'sekpim_item_type' => 'borrow',
            ]);
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(
                'products_sekpim_type_status_index'
            );

            $table->dropColumn(
                'sekpim_item_type'
            );
        });
    }
};