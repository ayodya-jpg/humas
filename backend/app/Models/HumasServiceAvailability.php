<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HumasServiceAvailability extends Model
{
    public const COVERAGE_TYPES = [
        'REQUEST DESIGN INSTAGRAM',
        'DOKUMENTASI',
        'PUBLIKASI WEBSITE',
        'PUBLIKASI MEDIA MASSA',
        'YOUTUBE',
        'VIDEO REELS',
    ];

    protected $fillable = [
        'coverage_type',
        'is_active',
        'updated_by',
    ];

    protected $casts = [
        'id' =>
            'integer',

        'is_active' =>
            'boolean',

        'updated_by' =>
            'integer',
    ];

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'updated_by'
        );
    }

    public static function ensureDefaults(): void
    {
        foreach (
            self::COVERAGE_TYPES as
            $coverageType
        ) {
            self::query()
                ->firstOrCreate(
                    [
                        'coverage_type' =>
                            $coverageType,
                    ],
                    [
                        'is_active' =>
                            true,

                        'updated_by' =>
                            null,
                    ]
                );
        }
    }
}