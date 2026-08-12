<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'borrow_requests',
            function (Blueprint $table): void {
                $table
                    ->string('handover_evidence_path')
                    ->nullable()
                    ->after('admin_note');

                $table
                    ->string('handover_evidence_name')
                    ->nullable()
                    ->after('handover_evidence_path');

                $table
                    ->string('handover_evidence_mime')
                    ->nullable()
                    ->after('handover_evidence_name');

                $table
                    ->string('return_evidence_path')
                    ->nullable()
                    ->after('handover_evidence_mime');

                $table
                    ->string('return_evidence_name')
                    ->nullable()
                    ->after('return_evidence_path');

                $table
                    ->string('return_evidence_mime')
                    ->nullable()
                    ->after('return_evidence_name');
            }
        );
    }

    public function down(): void
    {
        Schema::table(
            'borrow_requests',
            function (Blueprint $table): void {
                $table->dropColumn([
                    'handover_evidence_path',
                    'handover_evidence_name',
                    'handover_evidence_mime',

                    'return_evidence_path',
                    'return_evidence_name',
                    'return_evidence_mime',
                ]);
            }
        );
    }
};