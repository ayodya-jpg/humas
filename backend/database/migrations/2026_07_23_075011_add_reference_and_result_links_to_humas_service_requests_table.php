<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('humas_service_requests')) {
            return;
        }

        Schema::table('humas_service_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('humas_service_requests', 'reference_link')) {
                $table
                    ->string('reference_link', 2000)
                    ->nullable()
                    ->after('event_date');
            }

            if (!Schema::hasColumn('humas_service_requests', 'result_link')) {
                $table
                    ->string('result_link', 2000)
                    ->nullable()
                    ->after('article_draft_mime');
            }

            if (!Schema::hasColumn('humas_service_requests', 'result_note')) {
                $table
                    ->text('result_note')
                    ->nullable()
                    ->after('result_link');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('humas_service_requests')) {
            return;
        }

        Schema::table('humas_service_requests', function (Blueprint $table) {
            $columns = [];

            if (Schema::hasColumn('humas_service_requests', 'reference_link')) {
                $columns[] = 'reference_link';
            }

            if (Schema::hasColumn('humas_service_requests', 'result_link')) {
                $columns[] = 'result_link';
            }

            if (Schema::hasColumn('humas_service_requests', 'result_note')) {
                $columns[] = 'result_note';
            }

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};