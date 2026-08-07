<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    /**
     * Daftar seluruh permission yang tersedia pada sistem.
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
        | Approval Layanan Humas
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

    /**
     * Permission turunan.
     *
     * Ketika user mempunyai permission di sebelah kiri,
     * user otomatis memperoleh permission di sebelah kanan.
     *
     * Contoh:
     * products.manage otomatis mempunyai products.view.
     */
    public const IMPLIED_PERMISSIONS = [
        'approval.merchandise.process' => [
            'approval.merchandise.view',
        ],

        'approval.humas.process' => [
            'approval.humas.view',
        ],

        'approval.borrowing.process' => [
            'approval.borrowing.view',
        ],

        'categories.manage' => [
            'categories.view',
        ],

        'products.manage' => [
            'products.view',
        ],

        'users.manage' => [
            'users.view',
        ],
    ];

    /**
     * Field yang dapat diisi secara mass assignment.
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'permissions',
    ];

    /**
     * Field yang disembunyikan saat model dikonversi menjadi JSON.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Cast atribut model.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'permissions' => 'array',
        ];
    }

    /**
     * Memeriksa apakah akun merupakan superadmin.
     */
    public function isSuperadmin(): bool
    {
        return $this->role === 'superadmin';
    }

    /**
     * Mengambil permission mentah yang tersimpan di database.
     *
     * Method ini tetap aman ketika:
     * - permission bernilai null;
     * - permission berupa array;
     * - data lama masih berupa JSON string;
     * - terdapat permission yang tidak lagi terdaftar.
     */
    public function getStoredPermissionList(): array
    {
        if ($this->isSuperadmin()) {
            return self::AVAILABLE_PERMISSIONS;
        }

        $permissions = $this->permissions;

        /*
         * Fallback untuk data lama apabila cast tidak menghasilkan array.
         */
        if (is_string($permissions)) {
            $decodedPermissions = json_decode(
                $permissions,
                true
            );

            $permissions = is_array($decodedPermissions)
                ? $decodedPermissions
                : [];
        }

        if (!is_array($permissions)) {
            return [];
        }

        $permissions = array_filter(
            $permissions,
            static fn (mixed $permission): bool =>
                is_string($permission) &&
                trim($permission) !== ''
        );

        $permissions = array_map(
            static fn (string $permission): string =>
                trim($permission),
            $permissions
        );

        return array_values(
            array_unique(
                array_intersect(
                    self::AVAILABLE_PERMISSIONS,
                    $permissions
                )
            )
        );
    }

    /**
     * Mengambil permission efektif user.
     *
     * Permission efektif mencakup:
     * - permission yang tersimpan;
     * - permission turunan dari manage/process;
     * - seluruh permission untuk superadmin.
     */
    public function getPermissionList(): array
    {
        if ($this->isSuperadmin()) {
            return self::AVAILABLE_PERMISSIONS;
        }

        return self::expandImpliedPermissions(
            $this->getStoredPermissionList()
        );
    }

    /**
     * Memeriksa apakah user mempunyai satu permission.
     */
    public function hasPermission(
        string $permission
    ): bool {
        if ($this->isSuperadmin()) {
            return true;
        }

        $permission = trim($permission);

        if ($permission === '') {
            return false;
        }

        if (
            !in_array(
                $permission,
                self::AVAILABLE_PERMISSIONS,
                true
            )
        ) {
            return false;
        }

        return in_array(
            $permission,
            $this->getPermissionList(),
            true
        );
    }

    /**
     * Memeriksa apakah user mempunyai salah satu permission.
     *
     * Logika yang digunakan adalah OR.
     */
    public function hasAnyPermission(
        array $permissions
    ): bool {
        if ($this->isSuperadmin()) {
            return true;
        }

        $permissions = self::cleanPermissionInput(
            $permissions
        );

        if (empty($permissions)) {
            return false;
        }

        $userPermissions = $this->getPermissionList();

        foreach ($permissions as $permission) {
            if (
                in_array(
                    $permission,
                    $userPermissions,
                    true
                )
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Memeriksa apakah user mempunyai seluruh permission.
     *
     * Logika yang digunakan adalah AND.
     */
    public function hasAllPermissions(
        array $permissions
    ): bool {
        if ($this->isSuperadmin()) {
            return true;
        }

        $permissions = self::cleanPermissionInput(
            $permissions
        );

        if (empty($permissions)) {
            return false;
        }

        $userPermissions = $this->getPermissionList();

        foreach ($permissions as $permission) {
            if (
                !in_array(
                    $permission,
                    $userPermissions,
                    true
                )
            ) {
                return false;
            }
        }

        return true;
    }

    /**
     * Permission awal berdasarkan role.
     *
     * Nilai ini dipakai ketika:
     * - superadmin memilih role pada form user;
     * - field permissions tidak dikirim saat membuat akun;
     * - data permission akun lama masih null.
     */
    public static function defaultPermissionsForRole(
        string $role
    ): array {
        $permissions = match ($role) {
            'superadmin' => self::AVAILABLE_PERMISSIONS,

            /*
             * Role admin umum.
             */
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

            /*
             * Admin Humas.
             */
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

                'categories.view',
                'categories.manage',

                'products.view',
                'products.manage',
            ],

            /*
             * Admin SEKPiM.
             */
            'admin_sekpim' => [
                'dashboard.view',

                'request.merchandise.create',
                'request.humas.create',
                'request.borrowing.create',
                'request.history.view',

                'approval.borrowing.view',
                'approval.borrowing.process',

                'categories.view',
                'categories.manage',

                'products.view',
                'products.manage',
            ],

            /*
             * User biasa.
             */
            default => [
                'dashboard.view',

                'request.merchandise.create',
                'request.humas.create',
                'request.borrowing.create',
                'request.history.view',
            ],
        };

        return self::expandImpliedPermissions(
            $permissions
        );
    }

    /**
     * Menormalisasi permission sebelum disimpan.
     *
     * Aturan:
     * - superadmin selalu mempunyai seluruh permission;
     * - permission yang tidak terdaftar dibuang;
     * - permission duplikat dibuang;
     * - manage/process otomatis menambahkan view;
     * - array kosong tetap dianggap pilihan yang sah.
     */
    public static function normalizePermissions(
        ?array $permissions,
        string $role
    ): array {
        if ($role === 'superadmin') {
            return self::AVAILABLE_PERMISSIONS;
        }

        /*
         * Null berarti field permission tidak dikirim.
         * Gunakan permission bawaan role.
         *
         * Array kosong berarti superadmin memang tidak memilih
         * permission apa pun untuk akun tersebut.
         */
        if ($permissions === null) {
            return self::defaultPermissionsForRole(
                $role
            );
        }

        $permissions = self::cleanPermissionInput(
            $permissions
        );

        return self::expandImpliedPermissions(
            $permissions
        );
    }

    /**
     * Menambahkan permission turunan dari manage/process.
     */
    public static function expandImpliedPermissions(
        array $permissions
    ): array {
        $permissions = self::cleanPermissionInput(
            $permissions
        );

        $expandedPermissions = $permissions;

        /*
         * Perulangan dilakukan sampai tidak ada perubahan lagi.
         * Dengan begitu method tetap aman apabila nanti terdapat
         * permission turunan bertingkat.
         */
        do {
            $beforeCount = count(
                $expandedPermissions
            );

            foreach (
                self::IMPLIED_PERMISSIONS
                as $parentPermission => $impliedPermissions
            ) {
                if (
                    !in_array(
                        $parentPermission,
                        $expandedPermissions,
                        true
                    )
                ) {
                    continue;
                }

                foreach (
                    $impliedPermissions
                    as $impliedPermission
                ) {
                    $expandedPermissions[] =
                        $impliedPermission;
                }
            }

            $expandedPermissions = self::cleanPermissionInput(
                $expandedPermissions
            );

            $afterCount = count(
                $expandedPermissions
            );
        } while (
            $afterCount >
            $beforeCount
        );

        /*
         * Susun berdasarkan urutan AVAILABLE_PERMISSIONS.
         * Ini membuat response API dan checkbox frontend konsisten.
         */
        return array_values(
            array_intersect(
                self::AVAILABLE_PERMISSIONS,
                $expandedPermissions
            )
        );
    }

    /**
     * Membersihkan input permission.
     */
    private static function cleanPermissionInput(
        array $permissions
    ): array {
        $cleanPermissions = [];

        foreach ($permissions as $permission) {
            if (!is_string($permission)) {
                continue;
            }

            /*
             * Tetap pecah tanda koma untuk mengantisipasi
             * input seperti "products.view,products.manage".
             */
            $permissionParts = explode(
                ',',
                $permission
            );

            foreach (
                $permissionParts
                as $permissionPart
            ) {
                $permissionPart = trim(
                    $permissionPart
                );

                if ($permissionPart === '') {
                    continue;
                }

                if (
                    !in_array(
                        $permissionPart,
                        self::AVAILABLE_PERMISSIONS,
                        true
                    )
                ) {
                    continue;
                }

                $cleanPermissions[] =
                    $permissionPart;
            }
        }

        return array_values(
            array_unique(
                $cleanPermissions
            )
        );
    }
}