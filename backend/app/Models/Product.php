<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    public const SEKPIM_TYPE_BORROW =
        'borrow';

    public const SEKPIM_TYPE_ASSET_REQUEST =
        'asset_request';

    public const SEKPIM_TYPE_BOTH =
        'both';

    public const SEKPIM_TYPES = [
        self::SEKPIM_TYPE_BORROW,
        self::SEKPIM_TYPE_ASSET_REQUEST,
        self::SEKPIM_TYPE_BOTH,
    ];

    protected $fillable = [
        'category_id',
        'name',
        'slug',
        'description',
        'stock',

        /*
         * Field type lama tetap dipertahankan karena digunakan
         * oleh modul produk lain seperti Merchandise.
         */
        'type',

        /*
         * Menentukan penggunaan produk khusus SEKPiM:
         *
         * borrow
         * asset_request
         * both
         * null = bukan produk SEKPiM
         */
        'sekpim_item_type',

        'image',
        'status',
    ];

    protected $casts = [
        'id' =>
            'integer',

        'category_id' =>
            'integer',

        'stock' =>
            'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(
            Category::class,
            'category_id'
        );
    }

    public function canBeBorrowed(): bool
    {
        return in_array(
            $this->sekpim_item_type,
            [
                self::SEKPIM_TYPE_BORROW,
                self::SEKPIM_TYPE_BOTH,
            ],
            true
        );
    }

    public function canBeRequested(): bool
    {
        return in_array(
            $this->sekpim_item_type,
            [
                self::SEKPIM_TYPE_ASSET_REQUEST,
                self::SEKPIM_TYPE_BOTH,
            ],
            true
        );
    }
}