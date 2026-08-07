<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    /**
     * Field yang boleh diisi melalui mass assignment.
     */
    protected $fillable = [
        'category_id',
        'name',
        'slug',
        'description',
        'stock',
        'type',
        'image',
        'status',
    ];

    /**
     * Cast atribut model.
     */
    protected $casts = [
        'id' => 'integer',
        'category_id' => 'integer',
        'stock' => 'integer',
    ];

    /**
     * Relasi produk dengan kategori.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(
            Category::class,
            'category_id'
        );
    }
}