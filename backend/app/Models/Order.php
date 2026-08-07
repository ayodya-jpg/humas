<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'order_code',
        'event_name',
        'institution_name',
        'guest_name',
        'guest_position',
        'activity_date',
        'proof_link',
        'proof_file_path',
        'proof_file_name',
        'proof_file_mime',
        'status',
        'user_note',
        'admin_note',
        'submitted_at',
        'revision_requested_at',
        'resubmitted_at',
        'approved_at',
        'rejected_at',
        'completed_at',
    ];

    protected $appends = [
        'proof_file_url',
    ];

    protected $casts = [
        'id' => 'integer',
        'user_id' => 'integer',
        'activity_date' => 'date:Y-m-d',
        'submitted_at' => 'datetime',
        'revision_requested_at' => 'datetime',
        'resubmitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function getProofFileUrlAttribute(): ?string
    {
        if (!$this->proof_file_path) {
            return null;
        }

        return asset(
            Storage::url(
                $this->proof_file_path
            )
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(
            User::class
        );
    }

    public function items(): HasMany
    {
        return $this->hasMany(
            OrderItem::class
        );
    }
}