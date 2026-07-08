<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed database aplikasi HUMAS.
     */
    public function run(): void
    {
        $this->call([
            HumasSeeder::class,
        ]);
    }
}