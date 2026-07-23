<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Menampilkan daftar user.
     */
    public function index(Request $request): JsonResponse
    {
        if (!$this->canManageUsers($request)) {
            return $this->forbiddenResponse();
        }

        $users = User::query()
            ->latest()
            ->get()
            ->map(
                fn (User $user): array => $this->transformUser($user)
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
     */
    public function show(Request $request, string $id): JsonResponse
    {
        if (!$this->canManageUsers($request)) {
            return $this->forbiddenResponse();
        }

        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail user berhasil diambil.',
            'data' => $this->transformUser($user),
        ]);
    }

    /**
     * Membuat user baru.
     */
    public function store(Request $request): JsonResponse
    {
        if (!$this->canManageUsers($request)) {
            return $this->forbiddenResponse();
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'username' => [
                'required',
                'string',
                'max:100',
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
                'confirmed',
            ],

            'role' => [
                'required',
                Rule::in([
                    'superadmin',
                    'admin',
                    'admin_humas',
                    'admin_sekpim',
                    'user',
                ]),
            ],

            'permissions' => [
                'nullable',
                'array',
            ],

            'permissions.*' => [
                'string',
                Rule::in(
                    User::AVAILABLE_PERMISSIONS
                ),
            ],
        ]);

        $permissions = User::normalizePermissions(
            $validated['permissions'] ?? null,
            $validated['role']
        );

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => $validated['role'],
            'permissions' => $permissions,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User berhasil ditambahkan.',
            'data' => $this->transformUser($user),
        ], 201);
    }

    /**
     * Memperbarui user.
     */
    public function update(
        Request $request,
        string $id
    ): JsonResponse {
        if (!$this->canManageUsers($request)) {
            return $this->forbiddenResponse();
        }

        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'username' => [
                'required',
                'string',
                'max:100',
                Rule::unique(
                    'users',
                    'username'
                )->ignore($user->id),
            ],

            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique(
                    'users',
                    'email'
                )->ignore($user->id),
            ],

            'password' => [
                'nullable',
                'string',
                'min:6',
                'confirmed',
            ],

            'role' => [
                'required',
                Rule::in([
                    'superadmin',
                    'admin',
                    'admin_humas',
                    'admin_sekpim',
                    'user',
                ]),
            ],

            'permissions' => [
                'nullable',
                'array',
            ],

            'permissions.*' => [
                'string',
                Rule::in(
                    User::AVAILABLE_PERMISSIONS
                ),
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | Perlindungan akun superadmin yang sedang login
        |--------------------------------------------------------------------------
        */

        if (
            $request->user()->id === $user->id &&
            $validated['role'] !== 'superadmin'
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Role akun superadmin yang sedang digunakan tidak dapat diturunkan.',
                'data' => null,
            ], 422);
        }

        $permissions = User::normalizePermissions(
            $validated['permissions'] ?? null,
            $validated['role']
        );

        $payload = [
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'permissions' => $permissions,
        ];

        if (!empty($validated['password'])) {
            $payload['password'] =
                $validated['password'];
        }

        $user->update($payload);

        $user->refresh();

        return response()->json([
            'success' => true,
            'message' => 'User berhasil diperbarui.',
            'data' => $this->transformUser($user),
        ]);
    }

    /**
     * Menghapus user.
     */
    public function destroy(
        Request $request,
        string $id
    ): JsonResponse {
        if (!$this->canManageUsers($request)) {
            return $this->forbiddenResponse();
        }

        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        if (
            $request->user()->id ===
            $user->id
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Akun yang sedang login tidak bisa dihapus.',
                'data' => null,
            ], 422);
        }

        if (
            $user->role === 'superadmin' &&
            User::where(
                'role',
                'superadmin'
            )->count() <= 1
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Superadmin terakhir tidak dapat dihapus.',
                'data' => null,
            ], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User berhasil dihapus.',
            'data' => null,
        ]);
    }

    /**
     * Mengembalikan daftar permission yang tersedia.
     */
    public function permissions(
        Request $request
    ): JsonResponse {
        if (!$this->canManageUsers($request)) {
            return $this->forbiddenResponse();
        }

        return response()->json([
            'success' => true,
            'message' => 'Daftar permission berhasil diambil.',
            'data' => [
                'available_permissions' =>
                    User::AVAILABLE_PERMISSIONS,

                'default_permissions' => [
                    'superadmin' =>
                        User::defaultPermissionsForRole(
                            'superadmin'
                        ),

                    'admin' =>
                        User::defaultPermissionsForRole(
                            'admin'
                        ),

                    'admin_humas' =>
                        User::defaultPermissionsForRole(
                            'admin_humas'
                        ),

                    'admin_sekpim' =>
                        User::defaultPermissionsForRole(
                            'admin_sekpim'
                        ),

                    'user' =>
                        User::defaultPermissionsForRole(
                            'user'
                        ),
                ],
            ],
        ]);
    }

    /**
     * Memastikan hanya superadmin yang dapat mengelola user.
     */
    private function canManageUsers(
        Request $request
    ): bool {
        return $request->user()?->role ===
            'superadmin';
    }

    /**
     * Response ketika tidak mempunyai akses.
     */
    private function forbiddenResponse(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Hanya superadmin yang dapat mengelola akun dan hak akses.',
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
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,

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