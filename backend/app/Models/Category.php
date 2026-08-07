<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    /**
     * Field yang boleh diisi melalui mass assignment.
     */
    protected $fillable = [
        'name',
        'slug',
        'description',
        'status',
    ];

    /**
     * Cast atribut model.
     */
    protected $casts = [
        'id' => 'integer',
    ];

    /**
     * Relasi kategori dengan produk.
     */
    public function products(): HasMany
    {
        return $this->hasMany(
            Product::class,
            'category_id'
        );
    }
}