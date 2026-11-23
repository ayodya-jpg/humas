<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class LimitLoginAttempts
{
    /**
     * Maksimal percobaan gagal
     * untuk kombinasi username dan IP.
     */
    private const MAX_ACCOUNT_ATTEMPTS = 5;

    /**
     * Maksimal percobaan gagal
     * dari satu alamat IP.
     */
    private const MAX_IP_ATTEMPTS = 30;

    /**
     * Periode pembatasan dalam detik.
     * 600 detik = 10 menit.
     */
    private const DECAY_SECONDS = 600;

    public function handle(
        Request $request,
        Closure $next
    ): Response {
        $usernameInput = $request->input('username');

        $username = is_string($usernameInput)
            ? Str::lower(
                trim(substr($usernameInput, 0, 100))
            )
            : '';

        $ip = (string) ($request->ip() ?? 'unknown');

        /*
         * Gunakan hash agar username dan IP
         * tidak ditulis langsung dalam cache key.
         */
        $accountKey = 'login:account:' . hash(
            'sha256',
            $username . '|' . $ip
        );

        $ipKey = 'login:ip:' . hash(
            'sha256',
            $ip
        );

        /*
         * Pemeriksaan pembatasan dilakukan
         * sebelum AuthController dijalankan.
         */
        $accountBlocked = RateLimiter::tooManyAttempts(
            $accountKey,
            self::MAX_ACCOUNT_ATTEMPTS
        );

        $ipBlocked = RateLimiter::tooManyAttempts(
            $ipKey,
            self::MAX_IP_ATTEMPTS
        );

        if ($accountBlocked || $ipBlocked) {
            $retryAfter = max(
                $accountBlocked
                    ? RateLimiter::availableIn($accountKey)
                    : 0,

                $ipBlocked
                    ? RateLimiter::availableIn($ipKey)
                    : 0
            );

            $retryAfter = max(1, $retryAfter);

            return response()->json([
                'success' => false,
                'message' =>
                    'Terlalu banyak percobaan login. '
                    . 'Silakan coba kembali beberapa saat lagi.',
                'retry_after' => $retryAfter,
            ], 429)->withHeaders([
                'Retry-After' => (string) $retryAfter,
                'Cache-Control' => 'no-store',
            ]);
        }

        /*
         * Lanjutkan request ke AuthController.
         */
        $response = $next($request);

        /*
         * HTTP 401 berarti autentikasi gagal.
         * Hanya kegagalan autentikasi yang
         * menambah penghitung.
         */
        if ($response->getStatusCode() === 401) {
            RateLimiter::hit(
                $accountKey,
                self::DECAY_SECONDS
            );

            RateLimiter::hit(
                $ipKey,
                self::DECAY_SECONDS
            );

            return $response;
        }

        /*
         * Login berhasil.
         *
         * Reset penghitung untuk kombinasi
         * username dan IP tersebut.
         *
         * Penghitung global IP tidak direset,
         * agar penyerang tidak bisa menghapus
         * riwayat kegagalan melalui login
         * menggunakan akun lain.
         */
        if ($response->getStatusCode() === 200) {
            RateLimiter::clear($accountKey);
        }

        return $response;
    }
}
