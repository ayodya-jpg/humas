<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class HumasSeeder extends Seeder
{
    /**
     * Jalankan seeder data awal HUMAS.
     */
    public function run(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Superadmin Default
        |--------------------------------------------------------------------------
        */
        User::updateOrCreate(
            ['username' => 'superadmin'],
            [
                'name' => 'Super Administrator',
                'email' => 'superadmin@humas.test',
                'password' => 'password123',
                'role' => 'superadmin',
            ]
        );

        User::updateOrCreate(
            ['username' => 'admin'],
            [
                'name' => 'Administrator',
                'email' => 'admin@humas.test',
                'password' => 'password123',
                'role' => 'admin',
            ]
        );

        User::updateOrCreate(
            ['username' => 'user'],
            [
                'name' => 'User Pemohon',
                'email' => 'user@humas.test',
                'password' => 'password123',
                'role' => 'user',
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | Categories
        |--------------------------------------------------------------------------
        */
        $merchandise = Category::updateOrCreate(
            ['slug' => Str::slug('Merchandise')],
            [
                'name' => 'Merchandise',
                'description' => 'Kategori untuk paket merchandise dan buah tangan Telkom.',
            ]
        );

        $alatSekpim = Category::updateOrCreate(
            ['slug' => Str::slug('Alat Sekpim')],
            [
                'name' => 'Alat Sekpim',
                'description' => 'Kategori untuk alat pendukung kegiatan Sekpim.',
            ]
        );

        $atk = Category::updateOrCreate(
            ['slug' => Str::slug('ATK')],
            [
                'name' => 'ATK',
                'description' => 'Kategori untuk alat tulis kantor dan kebutuhan administrasi.',
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | Merchandise Packages & Borrowing Items
        |--------------------------------------------------------------------------
        */
        Product::updateOrCreate(
            ['slug' => Str::slug('Paket Merchandise VIP')],
            [
                'category_id' => $merchandise->id,
                'name' => 'Paket Merchandise VIP',
                'description' => 'Paket merchandise untuk tamu penting, pejabat, atau mitra kerja sama strategis.',
                'stock' => 20,
                'type' => 'checkout',
                'image' => null,
                'status' => 'active',
            ]
        );

        Product::updateOrCreate(
            ['slug' => Str::slug('Paket Merchandise Reguler')],
            [
                'category_id' => $merchandise->id,
                'name' => 'Paket Merchandise Reguler',
                'description' => 'Paket merchandise standar untuk kegiatan kunjungan dan kerja sama eksternal.',
                'stock' => 50,
                'type' => 'checkout',
                'image' => null,
                'status' => 'active',
            ]
        );

        Product::updateOrCreate(
            ['slug' => Str::slug('Taplak Meja')],
            [
                'category_id' => $alatSekpim->id,
                'name' => 'Taplak Meja',
                'description' => 'Taplak meja untuk kebutuhan kegiatan resmi atau rapat.',
                'stock' => 10,
                'type' => 'borrow',
                'image' => null,
                'status' => 'active',
            ]
        );

        Product::updateOrCreate(
            ['slug' => Str::slug('Almamater')],
            [
                'category_id' => $alatSekpim->id,
                'name' => 'Almamater',
                'description' => 'Almamater untuk kebutuhan kegiatan protokoler atau representatif.',
                'stock' => 15,
                'type' => 'borrow',
                'image' => null,
                'status' => 'active',
            ]
        );

        Product::updateOrCreate(
            ['slug' => Str::slug('Kertas A4')],
            [
                'category_id' => $atk->id,
                'name' => 'Kertas A4',
                'description' => 'Kertas A4 untuk kebutuhan administrasi dan dokumen.',
                'stock' => 100,
                'type' => 'checkout',
                'image' => null,
                'status' => 'active',
            ]
        );
    }
}