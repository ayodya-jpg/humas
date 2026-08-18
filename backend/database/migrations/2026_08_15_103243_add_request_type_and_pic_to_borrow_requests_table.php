<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('borrow_requests', function (Blueprint $table) {
            $table
                ->string('request_type', 30)
                ->default('borrow')
                ->after('borrow_code');

            $table
                ->string('pic_name')
                ->nullable()
                ->after('request_type');

            $table
                ->string('pic_phone', 30)
                ->nullable()
                ->after('pic_name');

            $table
                ->date('activity_date')
                ->nullable()
                ->after('purpose');

            $table
                ->timestamp('completed_at')
                ->nullable()
                ->after('returned_at');

            $table
                ->index(
                    [
                        'user_id',
                        'request_type',
                        'status',
                    ],
                    'borrow_request_user_type_status_index'
                );
        });

        /*
         * Seluruh data lama merupakan peminjaman biasa.
         */
        DB::table('borrow_requests')
            ->whereNull('request_type')
            ->orWhere('request_type', '')
            ->update([
                'request_type' => 'borrow',
            ]);
    }

    public function down(): void
    {
        Schema::table('borrow_requests', function (Blueprint $table) {
            $table->dropIndex(
                'borrow_request_user_type_status_index'
            );

            $table->dropColumn([
                'request_type',
                'pic_name',
                'pic_phone',
                'activity_date',
                'completed_at',
            ]);
        });
    }
};