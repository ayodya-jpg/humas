<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    /**
     * Login admin menggunakan username dan password.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
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

        $user = $request->user();

        if ($user->role !== 'admin') {
            $user->tokens()->delete();

            return response()->json([
                'success' => false,
                'message' => 'Akun ini tidak memiliki akses admin.',
                'data' => null,
            ], 403);
        }

        $user->tokens()->delete();

        $token = $user->createToken('admin-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login admin berhasil.',
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
        ]);
    }

    /**
     * Mengambil data admin yang sedang login.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Data user berhasil diambil.',
            'data' => $request->user(),
        ]);
    }

    /**
     * Logout admin.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.',
            'data' => null,
        ]);
    }
}