<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'humas_service_requests',
            function (Blueprint $table): void {
                $table
                    ->string('result_file_path')
                    ->nullable()
                    ->after('result_link');

                $table
                    ->string('result_file_name')
                    ->nullable()
                    ->after('result_file_path');

                $table
                    ->string('result_file_mime')
                    ->nullable()
                    ->after('result_file_name');
            }
        );
    }

    public function down(): void
    {
        Schema::table(
            'humas_service_requests',
            function (Blueprint $table): void {
                $table->dropColumn([
                    'result_file_path',
                    'result_file_name',
                    'result_file_mime',
                ]);
            }
        );
    }
};