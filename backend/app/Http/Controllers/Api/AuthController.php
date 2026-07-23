<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    /**
     * Login menggunakan username dan password.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => [
                'required',
                'string',
            ],

            'password' => [
                'required',
                'string',
            ],
        ]);

        if (!Auth::attempt([
            'username' => $validated['username'],
            'password' => $validated['password'],
        ])) {
            return response()->json([
                'success' => false,
                'message' => 'Username atau password salah.',
                'data' => null,
            ], 401);
        }

        /** @var User $user */
        $user = $request->user();

        /*
        |--------------------------------------------------------------------------
        | Hapus token lama
        |--------------------------------------------------------------------------
        */

        $user->tokens()->delete();

        /*
        |--------------------------------------------------------------------------
        | Buat token baru
        |--------------------------------------------------------------------------
        */

        $tokenName =
            $user->role.'-token';

        $token = $user
            ->createToken($tokenName)
            ->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil.',
            'data' => [
                'user' => $this->transformUser($user),
                'token' => $token,
            ],
        ]);
    }

    /**
     * Mengambil data user yang sedang login.
     */
    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'success' => true,
            'message' => 'Data user berhasil diambil.',
            'data' => $this->transformUser($user),
        ]);
    }

    /**
     * Logout user.
     */
    public function logout(Request $request): JsonResponse
    {
        $currentToken =
            $request
                ->user()
                ?->currentAccessToken();

        if ($currentToken) {
            $currentToken->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.',
            'data' => null,
        ]);
    }

    /**
     * Format data user untuk response authentication.
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