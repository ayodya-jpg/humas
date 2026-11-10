<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeetingRecord extends Model
{
    protected $fillable = [
        'event_schedule_id',
        'title',
        'directorate',
        'meeting_date',
        'realization_status',
        'participants_count',
        'notes',
        'decisions',
        'follow_up',
        'follow_up_pic',
        'follow_up_due_date',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'meeting_date' => 'date:Y-m-d',
        'follow_up_due_date' => 'date:Y-m-d',
        'participants_count' => 'integer',
    ];

    public function eventSchedule(): BelongsTo
    {
        return $this->belongsTo(
            EventSchedule::class,
            'event_schedule_id'
        );
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'updated_by'
        );
    }
}
