<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderRevisionHistory extends Model
{
    protected $fillable = [
        'order_id',
        'requested_by',
        'revision_note',
        'requested_at',
        'resubmitted_at',
    ];

    protected $casts = [
        'id' => 'integer',
        'order_id' => 'integer',
        'requested_by' => 'integer',

        'requested_at' => 'datetime',
        'resubmitted_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(
            Order::class
        );
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'requested_by'
        );
    }
}