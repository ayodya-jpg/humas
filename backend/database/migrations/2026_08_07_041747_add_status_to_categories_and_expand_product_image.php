<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Menambahkan status kategori dan memperbesar kolom gambar produk.
     */
    public function up(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Tambahkan status kategori
        |--------------------------------------------------------------------------
        */

        if (
            Schema::hasTable('categories') &&
            !Schema::hasColumn(
                'categories',
                'status'
            )
        ) {
            Schema::table(
                'categories',
                function (
                    Blueprint $table
                ): void {
                    $table
                        ->enum(
                            'status',
                            [
                                'active',
                                'inactive',
                            ]
                        )
                        ->default('active')
                        ->after('description');

                    $table->index(
                        'status',
                        'categories_status_index'
                    );
                }
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Perbesar kolom URL gambar produk
        |--------------------------------------------------------------------------
        |
        | Migration awal menggunakan string/VARCHAR.
        | Controller menerima URL sampai 2.000 karakter sehingga lebih aman
        | menggunakan TEXT.
        |
        */

        if (
            Schema::hasTable('products') &&
            Schema::hasColumn(
                'products',
                'image'
            )
        ) {
            DB::statement(
                'ALTER TABLE products MODIFY image TEXT NULL'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Tambahkan index produk
        |--------------------------------------------------------------------------
        */

        if (
            Schema::hasTable('products')
        ) {
            Schema::table(
                'products',
                function (
                    Blueprint $table
                ): void {
                    /*
                     * Nama index dibuat eksplisit agar mudah dihapus
                     * pada method down().
                     */

                    $table->index(
                        'status',
                        'products_status_index'
                    );

                    $table->index(
                        'type',
                        'products_type_index'
                    );

                    $table->index(
                        'stock',
                        'products_stock_index'
                    );
                }
            );
        }
    }

    /**
     * Mengembalikan perubahan migration.
     */
    public function down(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Hapus index produk
        |--------------------------------------------------------------------------
        */

        if (
            Schema::hasTable('products')
        ) {
            Schema::table(
                'products',
                function (
                    Blueprint $table
                ): void {
                    $table->dropIndex(
                        'products_status_index'
                    );

                    $table->dropIndex(
                        'products_type_index'
                    );

                    $table->dropIndex(
                        'products_stock_index'
                    );
                }
            );

            /*
             * Kembalikan image menjadi VARCHAR 255.
             *
             * Rollback dapat gagal apabila terdapat URL lebih dari 255 karakter.
             */
            DB::statement(
                'ALTER TABLE products MODIFY image VARCHAR(255) NULL'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Hapus status kategori
        |--------------------------------------------------------------------------
        */

        if (
            Schema::hasTable('categories') &&
            Schema::hasColumn(
                'categories',
                'status'
            )
        ) {
            Schema::table(
                'categories',
                function (
                    Blueprint $table
                ): void {
                    $table->dropIndex(
                        'categories_status_index'
                    );

                    $table->dropColumn(
                        'status'
                    );
                }
            );
        }
    }
};