<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    public const SEKPIM_TYPE_BORROW = 'borrow';

    public const SEKPIM_TYPE_ASSET_REQUEST = 'asset_request';

    public const SEKPIM_TYPE_BOTH = 'both';

    protected $fillable = [
        'category_id',
        'name',
        'slug',
        'description',
        'stock',
        'type',
        'sekpim_item_type',
        'image',
        'status',
    ];

    protected $casts = [
        'id' => 'integer',
        'category_id' => 'integer',
        'stock' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(
            Category::class,
            'category_id'
        );
    }
}
