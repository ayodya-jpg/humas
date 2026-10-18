<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventScheduleRequest extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'requested_by',
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
}