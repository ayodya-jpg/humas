<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class HumasServiceRequest extends Model
{
    protected $fillable = [
        'user_id',
        'service_code',

        'applicant_name',
        'unit_name',
        'other_unit_name',
        'pic_whatsapp',

        'activity_detail',
        'coverage_type',
        'event_location',
        'event_date',

        'reference_link',

        'article_draft_path',
        'article_draft_name',
        'article_draft_mime',

        'result_link',
        'result_file_path',
        'result_file_name',
        'result_file_mime',
        'result_note',

        'status',
        'admin_note',

        'submitted_at',
        'approved_at',
        'rejected_at',
        'completed_at',
    ];

    protected $casts = [
        'id' => 'integer',
        'user_id' => 'integer',

        'event_date' => 'date:Y-m-d',

        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    protected $appends = [
        'article_draft_url',
        'result_file_url',
        'resolved_unit_name',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(
            User::class
        );
    }

    public function getArticleDraftUrlAttribute(): ?string
    {
        if (
            !$this->article_draft_path
        ) {
            return null;
        }

        return asset(
            Storage::url(
                $this->article_draft_path
            )
        );
    }

    public function getResultFileUrlAttribute(): ?string
    {
        if (
            !$this->result_file_path
        ) {
            return null;
        }

        return asset(
            Storage::url(
                $this->result_file_path
            )
        );
    }

    public function getResolvedUnitNameAttribute(): ?string
    {
        if (
            $this->unit_name ===
            'Lainnya'
        ) {
            return $this->other_unit_name
                ?: 'Lainnya';
        }

        return $this->unit_name;
    }
}