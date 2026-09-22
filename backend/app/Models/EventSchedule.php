<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventSchedule extends Model
{
    protected $fillable = [
        'title',
        'description',
        'event_date',
        'start_time',
        'end_time',
        'all_day',
        'location',
        'agenda_type',
        'color',
        'is_public',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'event_date' => 'date:Y-m-d',
        'all_day' => 'boolean',
        'is_public' => 'boolean',
    ];

    /*
    |--------------------------------------------------------------------------
    | CREATED BY
    |--------------------------------------------------------------------------
    */

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATED BY
    |--------------------------------------------------------------------------
    */

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'updated_by'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | HISTORIES
    |--------------------------------------------------------------------------
    */

    public function histories(): HasMany
    {
        return $this
            ->hasMany(
                EventScheduleHistory::class,
                'event_schedule_id'
            )
            ->latest();
    }
}