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
            if (!Schema::hasColumn('orders', 'event_name')) {
                $table->string('event_name')->nullable()->after('order_code');
            }

            if (!Schema::hasColumn('orders', 'institution_name')) {
                $table->string('institution_name')->nullable()->after('event_name');
            }

            if (!Schema::hasColumn('orders', 'guest_name')) {
                $table->string('guest_name')->nullable()->after('institution_name');
            }

            if (!Schema::hasColumn('orders', 'guest_position')) {
                $table->string('guest_position')->nullable()->after('guest_name');
            }

            if (!Schema::hasColumn('orders', 'activity_date')) {
                $table->date('activity_date')->nullable()->after('guest_position');
            }

            if (!Schema::hasColumn('orders', 'proof_link')) {
                $table->text('proof_link')->nullable()->after('activity_date');
            }

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
            if (Schema::hasColumn('orders', 'proof_file_mime')) {
                $table->dropColumn('proof_file_mime');
            }

            if (Schema::hasColumn('orders', 'proof_file_name')) {
                $table->dropColumn('proof_file_name');
            }

            if (Schema::hasColumn('orders', 'proof_file_path')) {
                $table->dropColumn('proof_file_path');
            }

            if (Schema::hasColumn('orders', 'proof_link')) {
                $table->dropColumn('proof_link');
            }

            if (Schema::hasColumn('orders', 'activity_date')) {
                $table->dropColumn('activity_date');
            }

            if (Schema::hasColumn('orders', 'guest_position')) {
                $table->dropColumn('guest_position');
            }

            if (Schema::hasColumn('orders', 'guest_name')) {
                $table->dropColumn('guest_name');
            }

            if (Schema::hasColumn('orders', 'institution_name')) {
                $table->dropColumn('institution_name');
            }

            if (Schema::hasColumn('orders', 'event_name')) {
                $table->dropColumn('event_name');
            }
        });
    }
};