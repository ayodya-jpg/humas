<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('humas_service_requests')) {
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Ubah data revision lama menjadi rejected
        |--------------------------------------------------------------------------
        */

        DB::table('humas_service_requests')
            ->where('status', 'revision')
            ->update([
                'status' => 'rejected',
                'rejected_at' => DB::raw(
                    'COALESCE(rejected_at, updated_at, created_at, NOW())'
                ),
                'approved_at' => null,
                'completed_at' => null,
                'updated_at' => now(),
            ]);

        /*
        |--------------------------------------------------------------------------
        | Tambahkan field detail layanan
        |--------------------------------------------------------------------------
        */

        $hasActivityStartTime = Schema::hasColumn(
            'humas_service_requests',
            'activity_start_time'
        );

        $hasActivityEndTime = Schema::hasColumn(
            'humas_service_requests',
            'activity_end_time'
        );

        $hasTargetAudience = Schema::hasColumn(
            'humas_service_requests',
            'target_audience'
        );

        $hasPublicationChannel = Schema::hasColumn(
            'humas_service_requests',
            'publication_channel'
        );

        $hasPublishDate = Schema::hasColumn(
            'humas_service_requests',
            'publish_date'
        );

        $hasCaption = Schema::hasColumn(
            'humas_service_requests',
            'caption'
        );

        $hasReferenceLink = Schema::hasColumn(
            'humas_service_requests',
            'reference_link'
        );

        $hasDocumentationType = Schema::hasColumn(
            'humas_service_requests',
            'documentation_type'
        );

        $hasOutputRequirements = Schema::hasColumn(
            'humas_service_requests',
            'output_requirements'
        );

        $hasDesignType = Schema::hasColumn(
            'humas_service_requests',
            'design_type'
        );

        $hasDesignSize = Schema::hasColumn(
            'humas_service_requests',
            'design_size'
        );

        $hasDesignDeadline = Schema::hasColumn(
            'humas_service_requests',
            'design_deadline'
        );

        $hasWebsiteType = Schema::hasColumn(
            'humas_service_requests',
            'website_type'
        );

        $hasWebsiteFeatures = Schema::hasColumn(
            'humas_service_requests',
            'website_features'
        );

        $hasRundownFilePath = Schema::hasColumn(
            'humas_service_requests',
            'rundown_file_path'
        );

        $hasRundownFileName = Schema::hasColumn(
            'humas_service_requests',
            'rundown_file_name'
        );

        $hasRundownFileMime = Schema::hasColumn(
            'humas_service_requests',
            'rundown_file_mime'
        );

        Schema::table('humas_service_requests', function (Blueprint $table) use (
            $hasActivityStartTime,
            $hasActivityEndTime,
            $hasTargetAudience,
            $hasPublicationChannel,
            $hasPublishDate,
            $hasCaption,
            $hasReferenceLink,
            $hasDocumentationType,
            $hasOutputRequirements,
            $hasDesignType,
            $hasDesignSize,
            $hasDesignDeadline,
            $hasWebsiteType,
            $hasWebsiteFeatures,
            $hasRundownFilePath,
            $hasRundownFileName,
            $hasRundownFileMime
        ) {
            if (!$hasActivityStartTime) {
                $table
                    ->time('activity_start_time')
                    ->nullable()
                    ->after('activity_date');
            }

            if (!$hasActivityEndTime) {
                $table
                    ->time('activity_end_time')
                    ->nullable()
                    ->after('activity_start_time');
            }

            if (!$hasTargetAudience) {
                $table
                    ->string('target_audience')
                    ->nullable()
                    ->after('location');
            }

            if (!$hasPublicationChannel) {
                $table
                    ->string('publication_channel')
                    ->nullable()
                    ->after('target_audience');
            }

            if (!$hasPublishDate) {
                $table
                    ->date('publish_date')
                    ->nullable()
                    ->after('publication_channel');
            }

            if (!$hasCaption) {
                $table
                    ->text('caption')
                    ->nullable()
                    ->after('publish_date');
            }

            if (!$hasReferenceLink) {
                $table
                    ->string('reference_link', 1000)
                    ->nullable()
                    ->after('caption');
            }

            if (!$hasDocumentationType) {
                $table
                    ->string('documentation_type')
                    ->nullable()
                    ->after('reference_link');
            }

            if (!$hasOutputRequirements) {
                $table
                    ->text('output_requirements')
                    ->nullable()
                    ->after('documentation_type');
            }

            if (!$hasDesignType) {
                $table
                    ->string('design_type')
                    ->nullable()
                    ->after('output_requirements');
            }

            if (!$hasDesignSize) {
                $table
                    ->string('design_size')
                    ->nullable()
                    ->after('design_type');
            }

            if (!$hasDesignDeadline) {
                $table
                    ->date('design_deadline')
                    ->nullable()
                    ->after('design_size');
            }

            if (!$hasWebsiteType) {
                $table
                    ->string('website_type')
                    ->nullable()
                    ->after('design_deadline');
            }

            if (!$hasWebsiteFeatures) {
                $table
                    ->text('website_features')
                    ->nullable()
                    ->after('website_type');
            }

            if (!$hasRundownFilePath) {
                $table
                    ->string('rundown_file_path')
                    ->nullable()
                    ->after('attachment_file_mime');
            }

            if (!$hasRundownFileName) {
                $table
                    ->string('rundown_file_name')
                    ->nullable()
                    ->after('rundown_file_path');
            }

            if (!$hasRundownFileMime) {
                $table
                    ->string('rundown_file_mime')
                    ->nullable()
                    ->after('rundown_file_name');
            }
        });

        /*
        |--------------------------------------------------------------------------
        | Hapus status revision dari ENUM
        |--------------------------------------------------------------------------
        */

        DB::statement("
            ALTER TABLE humas_service_requests
            MODIFY COLUMN status ENUM(
                'pending',
                'approved',
                'rejected',
                'completed'
            ) NOT NULL DEFAULT 'pending'
        ");
    }

    public function down(): void
    {
        if (!Schema::hasTable('humas_service_requests')) {
            return;
        }

        DB::statement("
            ALTER TABLE humas_service_requests
            MODIFY COLUMN status ENUM(
                'pending',
                'approved',
                'revision',
                'rejected',
                'completed'
            ) NOT NULL DEFAULT 'pending'
        ");

        Schema::table('humas_service_requests', function (Blueprint $table) {
            $columns = [
                'activity_start_time',
                'activity_end_time',
                'target_audience',
                'publication_channel',
                'publish_date',
                'caption',
                'reference_link',
                'documentation_type',
                'output_requirements',
                'design_type',
                'design_size',
                'design_deadline',
                'website_type',
                'website_features',
                'rundown_file_path',
                'rundown_file_name',
                'rundown_file_mime',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('humas_service_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};