<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationReadController extends Controller
{
    /**
     * GET /api/notification-reads
     *
     * Mengambil semua notification key yang telah dibaca
     * oleh pengguna yang sedang login.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $keys = DB::table('notification_reads')
            ->where('user_id', $userId)
            ->pluck('notification_key')
            ->all();

        return response()->json([
            'success' => true,
            'message' => 'Status baca notifikasi berhasil diambil.',
            'data' => $keys,
        ]);
    }

    /**
     * POST /api/notification-reads
     *
     * Body:
     * {
     *     "keys": ["humas-10-approved-123456789"]
     * }
     *
     * Endpoint ini bersifat idempotent:
     * pemanggilan berulang tidak membuat data ganda.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'keys' => [
                'required',
                'array',
                'min:1',
                'max:100',
            ],
            'keys.*' => [
                'required',
                'string',
                'max:191',
                'regex:/^[a-zA-Z0-9_.:-]+$/',
            ],
        ]);

        $userId = $request->user()->id;

        $keys = array_values(
            array_unique($validated['keys'])
        );

        $now = now();

        $rows = array_map(
            fn (string $key): array => [
                'user_id' => $userId,
                'notification_key' => $key,
                'read_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            $keys
        );

        DB::table('notification_reads')->upsert(
            $rows,
            ['user_id', 'notification_key'],
            ['read_at', 'updated_at']
        );

        return response()->json([
            'success' => true,
            'message' => 'Notifikasi berhasil ditandai sudah dibaca.',
            'data' => [
                'count' => count($keys),
                'keys' => $keys,
            ],
        ]);
    }
}
