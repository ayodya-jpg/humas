<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Throwable;

class UserController extends Controller
{
    /**
     * Daftar role yang diperbolehkan.
     */
    private const AVAILABLE_ROLES = [
        'superadmin',
        'admin',
        'admin_humas',
        'admin_sekpim',
        'user',
    ];

    /**
     * Menampilkan daftar user.
     *
     * Dapat diakses oleh:
     * - superadmin;
     * - akun dengan users.view;
     * - akun dengan users.manage.
     */
    public function index(
        Request $request
    ): JsonResponse {
        if (
            !$this->canViewUsers(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Akun tidak memiliki izin melihat daftar user.'
            );
        }

        $users = User::query()
            ->latest('created_at')
            ->get()
            ->map(
                fn (User $user): array =>
                    $this->transformUser(
                        $user
                    )
            )
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Daftar user berhasil diambil.',
            'data' => $users,
        ]);
    }

    /**
     * Menampilkan detail user.
     *
     * Dapat diakses oleh:
     * - superadmin;
     * - akun dengan users.view;
     * - akun dengan users.manage.
     */
    public function show(
        Request $request,
        User $user
    ): JsonResponse {
        if (
            !$this->canViewUsers(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Akun tidak memiliki izin melihat detail user.'
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail user berhasil diambil.',
            'data' => $this->transformUser(
                $user
            ),
        ]);
    }

    /**
     * Membuat user baru.
     *
     * Pengelolaan akun hanya boleh dilakukan oleh superadmin.
     */
    public function store(
        Request $request
    ): JsonResponse {
        if (
            !$this->canManageUsers(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Hanya superadmin yang dapat menambahkan akun.'
            );
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'min:3',
                'max:255',
            ],

            'username' => [
                'required',
                'string',
                'min:3',
                'max:100',
                'regex:/^[a-zA-Z0-9._-]+$/',
                'unique:users,username',
            ],

            'email' => [
                'required',
                'email',
                'max:255',
                'unique:users,email',
            ],

            'password' => [
                'required',
                'string',
                'min:6',
                'max:255',
                'confirmed',
            ],

            'role' => [
                'required',
                Rule::in(
                    self::AVAILABLE_ROLES
                ),
            ],

            'permissions' => [
                'sometimes',
                'array',
            ],

            'permissions.*' => [
                'required',
                'string',
                Rule::in(
                    User::AVAILABLE_PERMISSIONS
                ),
            ],
        ], [
            'name.required' => 'Nama user wajib diisi.',
            'name.min' => 'Nama user minimal tiga karakter.',
            'name.max' => 'Nama user maksimal 255 karakter.',

            'username.required' => 'Username wajib diisi.',
            'username.min' => 'Username minimal tiga karakter.',
            'username.max' => 'Username maksimal 100 karakter.',
            'username.regex' => 'Username hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung.',
            'username.unique' => 'Username sudah digunakan oleh akun lain.',

            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.max' => 'Email maksimal 255 karakter.',
            'email.unique' => 'Email sudah digunakan oleh akun lain.',

            'password.required' => 'Password wajib diisi.',
            'password.min' => 'Password minimal enam karakter.',
            'password.max' => 'Password maksimal 255 karakter.',
            'password.confirmed' => 'Konfirmasi password tidak sesuai.',

            'role.required' => 'Role wajib dipilih.',
            'role.in' => 'Role yang dipilih tidak valid.',

            'permissions.array' => 'Format permission tidak valid.',
            'permissions.*.required' => 'Permission tidak boleh kosong.',
            'permissions.*.in' => 'Terdapat permission yang tidak valid.',
        ]);

        /*
         * Gunakan array_key_exists agar:
         *
         * - field tidak dikirim:
         *   gunakan permission default role;
         *
         * - field dikirim sebagai []:
         *   simpan benar-benar kosong.
         */
        $permissionInput =
            array_key_exists(
                'permissions',
                $validated
            )
                ? $validated['permissions']
                : null;

        $permissions =
            User::normalizePermissions(
                $permissionInput,
                $validated['role']
            );

        try {
            $user = DB::transaction(
                function () use (
                    $validated,
                    $permissions
                ): User {
                    return User::query()->create([
                        'name' => trim(
                            $validated['name']
                        ),

                        'username' => trim(
                            $validated['username']
                        ),

                        'email' => strtolower(
                            trim(
                                $validated['email']
                            )
                        ),

                        'password' =>
                            $validated['password'],

                        'role' =>
                            $validated['role'],

                        'permissions' =>
                            $permissions,
                    ]);
                }
            );

            return response()->json([
                'success' => true,
                'message' => 'User berhasil ditambahkan.',
                'data' => $this->transformUser(
                    $user
                ),
            ], 201);
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'User gagal ditambahkan.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Memperbarui user.
     *
     * Pengelolaan akun hanya boleh dilakukan oleh superadmin.
     */
    public function update(
        Request $request,
        User $user
    ): JsonResponse {
        if (
            !$this->canManageUsers(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Hanya superadmin yang dapat memperbarui akun.'
            );
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'min:3',
                'max:255',
            ],

            'username' => [
                'required',
                'string',
                'min:3',
                'max:100',
                'regex:/^[a-zA-Z0-9._-]+$/',

                Rule::unique(
                    'users',
                    'username'
                )->ignore(
                    $user->id
                ),
            ],

            'email' => [
                'required',
                'email',
                'max:255',

                Rule::unique(
                    'users',
                    'email'
                )->ignore(
                    $user->id
                ),
            ],

            'password' => [
                'nullable',
                'string',
                'min:6',
                'max:255',
                'confirmed',
            ],

            'role' => [
                'required',
                Rule::in(
                    self::AVAILABLE_ROLES
                ),
            ],

            'permissions' => [
                'sometimes',
                'array',
            ],

            'permissions.*' => [
                'required',
                'string',
                Rule::in(
                    User::AVAILABLE_PERMISSIONS
                ),
            ],
        ], [
            'name.required' => 'Nama user wajib diisi.',
            'name.min' => 'Nama user minimal tiga karakter.',
            'name.max' => 'Nama user maksimal 255 karakter.',

            'username.required' => 'Username wajib diisi.',
            'username.min' => 'Username minimal tiga karakter.',
            'username.max' => 'Username maksimal 100 karakter.',
            'username.regex' => 'Username hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung.',
            'username.unique' => 'Username sudah digunakan oleh akun lain.',

            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.max' => 'Email maksimal 255 karakter.',
            'email.unique' => 'Email sudah digunakan oleh akun lain.',

            'password.min' => 'Password minimal enam karakter.',
            'password.max' => 'Password maksimal 255 karakter.',
            'password.confirmed' => 'Konfirmasi password tidak sesuai.',

            'role.required' => 'Role wajib dipilih.',
            'role.in' => 'Role yang dipilih tidak valid.',

            'permissions.array' => 'Format permission tidak valid.',
            'permissions.*.required' => 'Permission tidak boleh kosong.',
            'permissions.*.in' => 'Terdapat permission yang tidak valid.',
        ]);

        $authenticatedUser =
            $request->user();

        /*
         * Superadmin yang sedang login tidak boleh
         * menurunkan role akunnya sendiri.
         */
        if (
            (int) $authenticatedUser->id ===
                (int) $user->id &&
            $user->role ===
                'superadmin' &&
            $validated['role'] !==
                'superadmin'
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Role akun superadmin yang sedang digunakan tidak dapat diturunkan.',
                'data' => null,
            ], 422);
        }

        /*
         * Superadmin terakhir tidak boleh diturunkan menjadi role lain,
         * meskipun yang mengubah adalah superadmin berbeda.
         */
        if (
            $user->role ===
                'superadmin' &&
            $validated['role'] !==
                'superadmin' &&
            $this->isLastSuperadmin(
                $user
            )
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Superadmin terakhir tidak dapat diturunkan role-nya.',
                'data' => null,
            ], 422);
        }

        $permissionInput =
            array_key_exists(
                'permissions',
                $validated
            )
                ? $validated['permissions']
                : null;

        $permissions =
            User::normalizePermissions(
                $permissionInput,
                $validated['role']
            );

        $payload = [
            'name' => trim(
                $validated['name']
            ),

            'username' => trim(
                $validated['username']
            ),

            'email' => strtolower(
                trim(
                    $validated['email']
                )
            ),

            'role' =>
                $validated['role'],

            'permissions' =>
                $permissions,
        ];

        /*
         * Password tidak berubah apabila kosong atau tidak dikirim.
         */
        if (
            isset(
                $validated['password']
            ) &&
            trim(
                $validated['password']
            ) !== ''
        ) {
            $payload['password'] =
                $validated['password'];
        }

        try {
            DB::transaction(
                function () use (
                    $user,
                    $payload,
                    $authenticatedUser
                ): void {
                    $roleChanged =
                        $user->role !==
                        $payload['role'];

                    $permissionsChanged =
                        $user->getStoredPermissionList() !==
                        User::normalizePermissions(
                            $payload['permissions'],
                            $payload['role']
                        );

                    $passwordChanged =
                        array_key_exists(
                            'password',
                            $payload
                        );

                    $user->update(
                        $payload
                    );

                    /*
                     * Hapus token akun yang diubah apabila terjadi
                     * perubahan keamanan penting.
                     *
                     * Token akun superadmin yang sedang login tidak dihapus
                     * supaya tidak langsung logout dari sesi aktif.
                     */
                    if (
                        (
                            $roleChanged ||
                            $permissionsChanged ||
                            $passwordChanged
                        ) &&
                        (int) $user->id !==
                            (int) $authenticatedUser->id
                    ) {
                        $user->tokens()->delete();
                    }
                }
            );

            $user->refresh();

            return response()->json([
                'success' => true,
                'message' => 'User berhasil diperbarui.',
                'data' => $this->transformUser(
                    $user
                ),
            ]);
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'User gagal diperbarui.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Menghapus user.
     *
     * Pengelolaan akun hanya boleh dilakukan oleh superadmin.
     */
    public function destroy(
        Request $request,
        User $user
    ): JsonResponse {
        if (
            !$this->canManageUsers(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Hanya superadmin yang dapat menghapus akun.'
            );
        }

        $authenticatedUser =
            $request->user();

        /*
         * Akun yang sedang login tidak boleh menghapus dirinya sendiri.
         */
        if (
            (int) $authenticatedUser->id ===
            (int) $user->id
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Akun yang sedang login tidak dapat dihapus.',
                'data' => null,
            ], 422);
        }

        /*
         * Superadmin terakhir tidak boleh dihapus.
         */
        if (
            $user->role ===
                'superadmin' &&
            $this->isLastSuperadmin(
                $user
            )
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Superadmin terakhir tidak dapat dihapus.',
                'data' => null,
            ], 422);
        }

        try {
            DB::transaction(
                function () use (
                    $user
                ): void {
                    $user->tokens()->delete();
                    $user->delete();
                }
            );

            return response()->json([
                'success' => true,
                'message' => 'User berhasil dihapus.',
                'data' => null,
            ]);
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'User gagal dihapus. Akun mungkin masih terhubung dengan data pengajuan.',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Mengembalikan daftar permission, role,
     * permission turunan, dan permission bawaan setiap role.
     *
     * Hanya superadmin yang dapat mengakses endpoint ini karena
     * data digunakan pada form pengelolaan akun.
     */
    public function permissions(
        Request $request
    ): JsonResponse {
        if (
            !$this->canManageUsers(
                $request
            )
        ) {
            return $this->forbiddenResponse(
                'Hanya superadmin yang dapat melihat konfigurasi hak akses.'
            );
        }

        $defaultPermissions = [];

        foreach (
            self::AVAILABLE_ROLES
            as $role
        ) {
            $defaultPermissions[$role] =
                User::defaultPermissionsForRole(
                    $role
                );
        }

        return response()->json([
            'success' => true,
            'message' => 'Daftar permission berhasil diambil.',
            'data' => [
                'available_roles' =>
                    self::AVAILABLE_ROLES,

                'available_permissions' =>
                    User::AVAILABLE_PERMISSIONS,

                'implied_permissions' =>
                    User::IMPLIED_PERMISSIONS,

                'default_permissions' =>
                    $defaultPermissions,
            ],
        ]);
    }

    /**
     * Memeriksa izin melihat user.
     */
    private function canViewUsers(
        Request $request
    ): bool {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        if (
            $user->isSuperadmin()
        ) {
            return true;
        }

        return $user->hasAnyPermission([
            'users.view',
            'users.manage',
        ]);
    }

    /**
     * Memastikan hanya superadmin yang dapat
     * membuat, mengubah, dan menghapus akun.
     */
    private function canManageUsers(
        Request $request
    ): bool {
        $user = $request->user();

        return (
            $user !== null &&
            $user->isSuperadmin()
        );
    }

    /**
     * Memeriksa apakah user merupakan satu-satunya superadmin.
     */
    private function isLastSuperadmin(
        User $user
    ): bool {
        if (
            $user->role !==
            'superadmin'
        ) {
            return false;
        }

        return User::query()
            ->where(
                'role',
                'superadmin'
            )
            ->count() <= 1;
    }

    /**
     * Response ketika tidak mempunyai akses.
     */
    private function forbiddenResponse(
        string $message
    ): JsonResponse {
        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => null,
        ], 403);
    }

    /**
     * Format data user untuk response API.
     */
    private function transformUser(
        User $user
    ): array {
        return [
            'id' =>
                $user->id,

            'name' =>
                $user->name,

            'username' =>
                $user->username,

            'email' =>
                $user->email,

            'role' =>
                $user->role,

            /*
             * Permission yang benar-benar tersimpan.
             * Berguna untuk menampilkan centang asli pada form.
             */
            'stored_permissions' =>
                $user->getStoredPermissionList(),

            /*
             * Permission efektif setelah implied permission diterapkan.
             */
            'permissions' =>
                $user->getPermissionList(),

            'is_superadmin' =>
                $user->isSuperadmin(),

            'created_at' =>
                $user->created_at,

            'updated_at' =>
                $user->updated_at,
        ];
    }
}