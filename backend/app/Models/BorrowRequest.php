<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class BorrowRequest extends Model
{
    public const TYPE_BORROW =
        'borrow';

    public const TYPE_ASSET_REQUEST =
        'asset_request';

    public const TYPES = [
        self::TYPE_BORROW,
        self::TYPE_ASSET_REQUEST,
    ];

    protected $fillable = [
        'user_id',
        'borrow_code',

        'request_type',

        'pic_name',
        'pic_phone',

        'purpose',
        'activity_date',

        /*
         * Field borrow_date tetap digunakan sebagai
         * tanggal pengambilan agar kompatibel dengan data lama.
         */
        'borrow_date',

        /*
         * Hanya digunakan untuk request_type = borrow.
         */
        'return_date',

        'status',
        'admin_note',

        /*
         * BORROW:
         * bukti penyerahan saat masuk status borrowed.
         *
         * ASSET_REQUEST:
         * bukti penyerahan saat masuk status completed.
         */
        'handover_evidence_path',
        'handover_evidence_name',
        'handover_evidence_mime',

        /*
         * Hanya digunakan untuk BORROW.
         */
        'return_evidence_path',
        'return_evidence_name',
        'return_evidence_mime',

        'submitted_at',
        'approved_at',
        'rejected_at',
        'borrowed_at',
        'returned_at',
        'completed_at',
    ];

    protected $casts = [
        'id' =>
            'integer',

        'user_id' =>
            'integer',

        'activity_date' =>
            'date:Y-m-d',

        'borrow_date' =>
            'date:Y-m-d',

        'return_date' =>
            'date:Y-m-d',

        'submitted_at' =>
            'datetime',

        'approved_at' =>
            'datetime',

        'rejected_at' =>
            'datetime',

        'borrowed_at' =>
            'datetime',

        'returned_at' =>
            'datetime',

        'completed_at' =>
            'datetime',
    ];

    protected $appends = [
        'handover_evidence_url',
        'return_evidence_url',
        'request_type_label',
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

    public function getRequestTypeLabelAttribute(): string
    {
        return match (
            $this->request_type
        ) {
            self::TYPE_ASSET_REQUEST =>
                'Request Barang',

            self::TYPE_BORROW =>
                'Peminjaman Barang',

            default =>
                'Peminjaman Barang',
        };
    }

    public function isBorrowRequest(): bool
    {
        return $this->request_type ===
            self::TYPE_BORROW;
    }

    public function isAssetRequest(): bool
    {
        return $this->request_type ===
            self::TYPE_ASSET_REQUEST;
    }
}