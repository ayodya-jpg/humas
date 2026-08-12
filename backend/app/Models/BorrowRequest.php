<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class BorrowRequest extends Model
{
    protected $fillable = [
        'user_id',
        'borrow_code',

        'purpose',
        'borrow_date',
        'return_date',

        'status',
        'admin_note',

        'handover_evidence_path',
        'handover_evidence_name',
        'handover_evidence_mime',

        'return_evidence_path',
        'return_evidence_name',
        'return_evidence_mime',

        'submitted_at',
        'approved_at',
        'rejected_at',
        'borrowed_at',
        'returned_at',
    ];

    protected $casts = [
        'id' => 'integer',
        'user_id' => 'integer',

        'borrow_date' => 'date:Y-m-d',
        'return_date' => 'date:Y-m-d',

        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'borrowed_at' => 'datetime',
        'returned_at' => 'datetime',
    ];

    protected $appends = [
        'handover_evidence_url',
        'return_evidence_url',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(
            User::class
        );
    }

    public function items(): HasMany
    {
        return $this->hasMany(
            BorrowRequestItem::class
        );
    }

    public function getHandoverEvidenceUrlAttribute(): ?string
    {
        if (
            !$this->handover_evidence_path
        ) {
            return null;
        }

        return asset(
            Storage::url(
                $this->handover_evidence_path
            )
        );
    }

    public function getReturnEvidenceUrlAttribute(): ?string
    {
        if (
            !$this->return_evidence_path
        ) {
            return null;
        }

        return asset(
            Storage::url(
                $this->return_evidence_path
            )
        );
    }
}