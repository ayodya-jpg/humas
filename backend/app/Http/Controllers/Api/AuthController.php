<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | BATAS SESI AKTIF
    |--------------------------------------------------------------------------
    |
    | Satu akun dapat digunakan di beberapa perangkat.
    | Maksimal 5 sesi/token aktif.
    | Jika melebihi batas, sesi paling lama dihapus.
    |
    */

    private const MAX_ACTIVE_SESSIONS = 5;

    /*
    |--------------------------------------------------------------------------
    | LOGIN
    |--------------------------------------------------------------------------
    */

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => [
                'required',
                'string',
                'max:100',
            ],
            'password' => [
                'required',
                'string',
                'max:255',
            ],
        ], [
            'username.required' => 'Username wajib diisi.',
            'username.string' => 'Format username tidak valid.',
            'username.max' => 'Username maksimal 100 karakter.',
            'password.required' => 'Password wajib diisi.',
            'password.string' => 'Format password tidak valid.',
            'password.max' => 'Password maksimal 255 karakter.',
        ]);

        if (!Auth::attempt([
            'username' => trim($validated['username']),
            'password' => $validated['password'],
        ])) {
            return response()->json([
                'success' => false,
                'message' => 'Username atau password salah.',
                'data' => null,
            ], 401);
        }

        /** @var User|null $user */
        $user = Auth::user();

        if (!$user) {
            Auth::logout();

            return response()->json([
                'success' => false,
                'message' => 'Data akun tidak ditemukan.',
                'data' => null,
            ], 401);
        }

        /*
        |--------------------------------------------------------------------------
        | TOKEN MULTI-DEVICE
        |--------------------------------------------------------------------------
        |
        | Jangan hapus seluruh token lama ketika login.
        | Dengan begitu PC dan laptop tetap bisa login
        | pada akun yang sama.
        |
        */

        $tokenName = sprintf(
            '%s-%s-%s',
            $user->role,
            $user->id,
            Str::lower(Str::random(8))
        );

        $token = $user
            ->createToken($tokenName)
            ->plainTextToken;

        /*
        |--------------------------------------------------------------------------
        | BATASI JUMLAH TOKEN
        |--------------------------------------------------------------------------
        */

        $tokenIds = $user->tokens()
            ->orderBy('created_at')
            ->orderBy('id')
            ->pluck('id');

        $excess = $tokenIds->count() - self::MAX_ACTIVE_SESSIONS;

        if ($excess > 0) {
            $user->tokens()
                ->whereIn(
                    'id',
                    $tokenIds->take($excess)->all()
                )
                ->delete();
        }

        $user->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil.',
            'data' => [
                'user' => $this->transformUser($user),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | CURRENT USER
    |--------------------------------------------------------------------------
    */

    public function me(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi login tidak valid.',
                'data' => null,
            ], 401);
        }

        $user->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Data user berhasil diambil.',
            'data' => $this->transformUser($user),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | LOGOUT
    |--------------------------------------------------------------------------
    |
    | Hanya token perangkat yang logout dihapus.
    | Token perangkat lain tidak ikut terhapus.
    |
    */

    public function logout(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => true,
                'message' => 'Sesi sudah berakhir.',
                'data' => null,
            ]);
        }

        $currentToken = $user->currentAccessToken();

        if ($currentToken) {
            $currentToken->delete();
        }

        Auth::guard('web')->logout();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.',
            'data' => null,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | FORMAT RESPONSE USER
    |--------------------------------------------------------------------------
    */

    private function transformUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,

            'stored_permissions' =>
                $user->getStoredPermissionList(),

            'permissions' =>
                $user->getPermissionList(),

            'is_superadmin' =>
                $user->isSuperadmin(),

            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ];
    }
}
