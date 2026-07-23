<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Menambahkan kolom permissions ke tabel users.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table
                ->json('permissions')
                ->nullable()
                ->after('role');
        });
    }

    /**
     * Menghapus kolom permissions dari tabel users.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('permissions');
        });
    }
};