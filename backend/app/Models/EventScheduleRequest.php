<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class EventScheduleRequest extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'requested_by',
        'requester_unit',
        'pic_name',
        'directorate',
        'title',
        'description',
        'event_date',
        'start_time',
        'end_time',
        'all_day',
        'location',
        'agenda_type',
        'is_public',

        'rundown_path',
        'rundown_name',
        'tor_path',
        'tor_name',

        'status',
        'approved_schedule_id',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'edited_by',
        'edited_at',
    ];

    protected $casts = [
        'event_date' => 'date:Y-m-d',
        'all_day' => 'boolean',
        'is_public' => 'boolean',
        'reviewed_at' => 'datetime',
        'edited_at' => 'datetime',
    ];

    protected $appends = [
        'rundown_url',
        'tor_url',
    ];

    public function requester(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'requested_by'
        );
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'reviewed_by'
        );
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'edited_by'
        );
    }

    public function approvedSchedule(): BelongsTo
    {
        return $this->belongsTo(
            EventSchedule::class,
            'approved_schedule_id'
        );
    }

    public function getRundownUrlAttribute(): ?string
    {
    if (!$this->rundown_path) {
        return null;
        }

    return url(
        Storage::disk('public')->url(
            $this->rundown_path
        )
        );
    }

    public function getTorUrlAttribute(): ?string
    {
        if (!$this->tor_path) {
            return null;
        }

        return asset(
            Storage::disk('public')->url(
                $this->tor_path
            )
        );
    }
}
