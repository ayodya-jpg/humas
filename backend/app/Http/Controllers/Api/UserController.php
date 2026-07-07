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
    public function index(): JsonResponse
    {
        $users = User::latest()->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar user berhasil diambil.',
            'data' => $users,
        ]);
    }

    /**
     * Menampilkan detail user.
     */
    public function show(string $id): JsonResponse
    {
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
            'data' => $user,
        ]);
    }

    /**
     * Membuat user baru.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:100', 'unique:users,username'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', Rule::in(['admin', 'user'])],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'] ?? null,
            'password' => $validated['password'],
            'role' => $validated['role'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User berhasil ditambahkan.',
            'data' => $user,
        ], 201);
    }

    /**
     * Memperbarui user.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => [
                'required',
                'string',
                'max:100',
                Rule::unique('users', 'username')->ignore($user->id),
            ],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['required', Rule::in(['admin', 'user'])],
        ]);

        $payload = [
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'] ?? null,
            'role' => $validated['role'],
        ];

        if (!empty($validated['password'])) {
            $payload['password'] = $validated['password'];
        }

        $user->update($payload);

        return response()->json([
            'success' => true,
            'message' => 'User berhasil diperbarui.',
            'data' => $user,
        ]);
    }

    /**
     * Menghapus user.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        if ($request->user()->id === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Akun yang sedang login tidak bisa dihapus.',
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
}