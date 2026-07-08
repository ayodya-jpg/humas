<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jalankan migration.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'proof_file_path')) {
                $table->string('proof_file_path')->nullable()->after('proof_link');
            }

            if (!Schema::hasColumn('orders', 'proof_file_name')) {
                $table->string('proof_file_name')->nullable()->after('proof_file_path');
            }

            if (!Schema::hasColumn('orders', 'proof_file_mime')) {
                $table->string('proof_file_mime')->nullable()->after('proof_file_name');
            }
        });
    }

    /**
     * Rollback migration.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'proof_file_path')) {
                $table->dropColumn('proof_file_path');
            }

            if (Schema::hasColumn('orders', 'proof_file_name')) {
                $table->dropColumn('proof_file_name');
            }

            if (Schema::hasColumn('orders', 'proof_file_mime')) {
                $table->dropColumn('proof_file_mime');
            }
        });
    }
};