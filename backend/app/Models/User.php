<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    /**
     * Daftar seluruh permission yang tersedia dalam sistem.
     */
    public const AVAILABLE_PERMISSIONS = [
        /*
        |--------------------------------------------------------------------------
        | Dashboard
        |--------------------------------------------------------------------------
        */

        'dashboard.view',

        /*
        |--------------------------------------------------------------------------
        | Pengajuan
        |--------------------------------------------------------------------------
        */

        'request.merchandise.create',
        'request.humas.create',
        'request.borrowing.create',
        'request.history.view',

        /*
        |--------------------------------------------------------------------------
        | Approval Merchandise
        |--------------------------------------------------------------------------
        */

        'approval.merchandise.view',
        'approval.merchandise.process',

        /*
        |--------------------------------------------------------------------------
        | Approval Liputan Humas
        |--------------------------------------------------------------------------
        */

        'approval.humas.view',
        'approval.humas.process',

        /*
        |--------------------------------------------------------------------------
        | Approval Peminjaman SEKPiM
        |--------------------------------------------------------------------------
        */

        'approval.borrowing.view',
        'approval.borrowing.process',

        /*
        |--------------------------------------------------------------------------
        | Master Kategori
        |--------------------------------------------------------------------------
        */

        'categories.view',
        'categories.manage',

        /*
        |--------------------------------------------------------------------------
        | Master Produk
        |--------------------------------------------------------------------------
        */

        'products.view',
        'products.manage',

        /*
        |--------------------------------------------------------------------------
        | Manajemen User
        |--------------------------------------------------------------------------
        */

        'users.view',
        'users.manage',
    ];

    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'permissions',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'permissions' => 'array',
        ];
    }

    /**
     * Superadmin selalu mempunyai seluruh permission.
     */
    public function isSuperadmin(): bool
    {
        return $this->role === 'superadmin';
    }

    /**
     * Mengambil permission yang tersimpan dan memastikan hasilnya berupa array.
     */
    public function getPermissionList(): array
    {
        if ($this->isSuperadmin()) {
            return self::AVAILABLE_PERMISSIONS;
        }

        if (!is_array($this->permissions)) {
            return [];
        }

        return array_values(
            array_intersect(
                self::AVAILABLE_PERMISSIONS,
                $this->permissions
            )
        );
    }

    /**
     * Memeriksa apakah user mempunyai sebuah permission.
     */
    public function hasPermission(string $permission): bool
    {
        if ($this->isSuperadmin()) {
            return true;
        }

        return in_array(
            $permission,
            $this->getPermissionList(),
            true
        );
    }

    /**
     * Memeriksa apakah user mempunyai salah satu permission.
     */
    public function hasAnyPermission(array $permissions): bool
    {
        if ($this->isSuperadmin()) {
            return true;
        }

        foreach ($permissions as $permission) {
            if ($this->hasPermission($permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Memeriksa apakah user mempunyai seluruh permission yang diminta.
     */
    public function hasAllPermissions(array $permissions): bool
    {
        if ($this->isSuperadmin()) {
            return true;
        }

        foreach ($permissions as $permission) {
            if (!$this->hasPermission($permission)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Permission awal berdasarkan role.
     *
     * Nilai ini digunakan ketika superadmin memilih role pada form user.
     */
    public static function defaultPermissionsForRole(string $role): array
    {
        return match ($role) {
            'superadmin' => self::AVAILABLE_PERMISSIONS,

            'admin' => [
                'dashboard.view',

                'request.merchandise.create',
                'request.humas.create',
                'request.borrowing.create',
                'request.history.view',

                'approval.merchandise.view',
                'approval.merchandise.process',

                'approval.humas.view',
                'approval.humas.process',

                'approval.borrowing.view',
                'approval.borrowing.process',

                'products.view',
            ],

            'admin_humas' => [
                'dashboard.view',

                'request.merchandise.create',
                'request.humas.create',
                'request.borrowing.create',
                'request.history.view',

                'approval.merchandise.view',
                'approval.merchandise.process',

                'approval.humas.view',
                'approval.humas.process',

                'products.view',
                'products.manage',
            ],

            'admin_sekpim' => [
                'dashboard.view',

                'request.merchandise.create',
                'request.humas.create',
                'request.borrowing.create',
                'request.history.view',

                'approval.borrowing.view',
                'approval.borrowing.process',

                'products.view',
                'products.manage',
            ],

            default => [
                'dashboard.view',

                'request.merchandise.create',
                'request.humas.create',
                'request.borrowing.create',
                'request.history.view',
            ],
        };
    }

    /**
     * Menormalisasi permission sebelum disimpan.
     */
    public static function normalizePermissions(
        ?array $permissions,
        string $role
    ): array {
        if ($role === 'superadmin') {
            return self::AVAILABLE_PERMISSIONS;
        }

        if (!is_array($permissions)) {
            return self::defaultPermissionsForRole($role);
        }

        return array_values(
            array_unique(
                array_intersect(
                    self::AVAILABLE_PERMISSIONS,
                    $permissions
                )
            )
        );
    }
}