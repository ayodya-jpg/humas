<?php

use App\Http\Controllers\Api\AccountProfileController;
use App\Http\Controllers\Api\DashboardDirectorateController;
use App\Http\Controllers\Api\NotificationReadController;
use App\Http\Controllers\Api\PasswordRecoveryController;
use App\Http\Controllers\Api\SecurityRecoveryController;

use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\LimitLoginAttempts;
use App\Http\Middleware\LimitUploadFileSize;
use App\Http\Middleware\PermissionMiddleware;
use App\Http\Middleware\RoleMiddleware;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(
    basePath: dirname(__DIR__)
)

    /*
    |--------------------------------------------------------------------------
    | ROUTING
    |--------------------------------------------------------------------------
    */

    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',

        then: function (): void {

            /*
            |--------------------------------------------------------------------------
            | PEMULIHAN PASSWORD LAMA
            |--------------------------------------------------------------------------
            |
            | Endpoint lama tetap dipertahankan
            | agar fitur yang sudah berjalan
            | tidak terganggu.
            |
            */

            Route::middleware([
                'api',
                'throttle:3,1',
            ])
                ->prefix('api')
                ->group(function (): void {

                    Route::post(
                        '/admin/forgot-password',
                        [
                            PasswordRecoveryController::class,
                            'forgotPassword',
                        ]
                    );

                });

            Route::middleware([
                'api',
                'throttle:5,1',
            ])
                ->prefix('api')
                ->group(function (): void {

                    Route::post(
                        '/admin/reset-password',
                        [
                            PasswordRecoveryController::class,
                            'resetPassword',
                        ]
                    );

                });

            /*
            |--------------------------------------------------------------------------
            | PEMULIHAN AKUN TANPA EMAIL
            |--------------------------------------------------------------------------
            |
            | Endpoint publik untuk:
            |
            | 1. Mengajukan pemulihan password
            | 2. Memeriksa status pengajuan
            | 3. Membuat password baru
            |
            | Pembatasan request diterapkan
            | pada masing-masing endpoint.
            |
            */

            Route::middleware([
                'api',
                'throttle:3,1',
            ])
                ->prefix('api/account/recovery')
                ->group(function (): void {

                    Route::post(
                        '/request',
                        [
                            SecurityRecoveryController::class,
                            'submit',
                        ]
                    );

                });

            Route::middleware([
                'api',
                'throttle:15,1',
            ])
                ->prefix('api/account/recovery')
                ->group(function (): void {

                    Route::post(
                        '/status',
                        [
                            SecurityRecoveryController::class,
                            'status',
                        ]
                    );

                });

            Route::middleware([
                'api',
                'throttle:5,1',
            ])
                ->prefix('api/account/recovery')
                ->group(function (): void {

                    Route::post(
                        '/reset',
                        [
                            SecurityRecoveryController::class,
                            'reset',
                        ]
                    );

                });

            /*
            |--------------------------------------------------------------------------
            | ENDPOINT YANG MEMERLUKAN LOGIN
            |--------------------------------------------------------------------------
            |
            | Semua endpoint dalam grup ini
            | membutuhkan token autentikasi
            | Laravel Sanctum yang valid.
            |
            */

            Route::middleware([
                'api',
                'auth:sanctum',
            ])
                ->prefix('api')
                ->group(function (): void {

                    /*
                    |--------------------------------------------------------------------------
                    | NOTIFIKASI
                    |--------------------------------------------------------------------------
                    */

                    Route::get(
                        '/notification-reads',
                        [
                            NotificationReadController::class,
                            'index',
                        ]
                    );

                    Route::post(
                        '/notification-reads',
                        [
                            NotificationReadController::class,
                            'store',
                        ]
                    );

                    /*
                    |--------------------------------------------------------------------------
                    | DASHBOARD DIREKTORAT
                    |--------------------------------------------------------------------------
                    */

                    Route::get(
                        '/dashboard/directorate-summary',
                        [
                            DashboardDirectorateController::class,
                            'index',
                        ]
                    );

                    /*
                    |--------------------------------------------------------------------------
                    | PROFIL AKUN SENDIRI
                    |--------------------------------------------------------------------------
                    |
                    | Semua pengguna yang sudah login
                    | dapat membaca profilnya sendiri.
                    |
                    | Perubahan profil membutuhkan
                    | password akun saat ini dan
                    | divalidasi kembali oleh controller.
                    |
                    */

                    Route::get(
                        '/account/profile',
                        [
                            AccountProfileController::class,
                            'showMine',
                        ]
                    );

                    Route::put(
                        '/account/profile',
                        [
                            AccountProfileController::class,
                            'updateMine',
                        ]
                    )
                        ->middleware('throttle:10,1');

                    /*
                    |--------------------------------------------------------------------------
                    | MANAJEMEN PROFIL USER
                    |--------------------------------------------------------------------------
                    |
                    | Endpoint ini hanya boleh digunakan
                    | oleh Superadmin.
                    |
                    | Pemeriksaan role wajib dilakukan
                    | di backend melalui controller.
                    |
                    | Menyembunyikan tombol di frontend
                    | saja tidak cukup untuk keamanan.
                    |
                    */

                    Route::get(
                        '/admin/user-profiles',
                        [
                            AccountProfileController::class,
                            'index',
                        ]
                    );

                    Route::put(
                        '/admin/user-profiles/{user}',
                        [
                            AccountProfileController::class,
                            'updateUser',
                        ]
                    )
                        ->whereNumber('user')
                        ->middleware('throttle:10,1');

                    /*
                    |--------------------------------------------------------------------------
                    | PERTANYAAN KEAMANAN AKUN
                    |--------------------------------------------------------------------------
                    |
                    | Pengguna hanya dapat mengelola
                    | pertanyaan keamanan miliknya.
                    |
                    */

                    Route::get(
                        '/account/security-question',
                        [
                            SecurityRecoveryController::class,
                            'settings',
                        ]
                    );

                    Route::post(
                        '/account/security-question',
                        [
                            SecurityRecoveryController::class,
                            'saveQuestion',
                        ]
                    )
                        ->middleware('throttle:5,1');

                    /*
                    |--------------------------------------------------------------------------
                    | PERSETUJUAN PEMULIHAN PASSWORD
                    |--------------------------------------------------------------------------
                    |
                    | Hanya Superadmin yang berhak
                    | melihat dan memproses pengajuan.
                    |
                    | Pemeriksaan Superadmin juga
                    | harus tetap ada di controller.
                    |
                    */

                    Route::get(
                        '/admin/recovery-requests',
                        [
                            SecurityRecoveryController::class,
                            'adminIndex',
                        ]
                    );

                    Route::post(
                        '/admin/recovery-requests/{id}/decide',
                        [
                            SecurityRecoveryController::class,
                            'decide',
                        ]
                    )
                        ->middleware('throttle:10,1')
                        ->whereUuid('id');

                });

        }
    )

    /*
    |--------------------------------------------------------------------------
    | MIDDLEWARE
    |--------------------------------------------------------------------------
    */

    ->withMiddleware(
        function (Middleware $middleware): void {

            /*
            |--------------------------------------------------------------------------
            | MIDDLEWARE API
            |--------------------------------------------------------------------------
            |
            | Tetap mempertahankan:
            |
            | - Respons JSON
            | - Pembatasan ukuran upload
            |
            */

            $middleware->prependToGroup(
                'api',
                [
                    ForceJsonResponse::class,
                    LimitUploadFileSize::class,
                ]
            );

            /*
            |--------------------------------------------------------------------------
            | ALIAS MIDDLEWARE
            |--------------------------------------------------------------------------
            |
            | login.attempts dipasang khusus
            | pada route POST /api/admin/login.
            |
            */

            $middleware->alias([
                'role' => RoleMiddleware::class,

                'permission' =>
                    PermissionMiddleware::class,

                'login.attempts' =>
                    LimitLoginAttempts::class,
            ]);

        }
    )

    /*
    |--------------------------------------------------------------------------
    | PENANGANAN ERROR
    |--------------------------------------------------------------------------
    */

    ->withExceptions(
        function (Exceptions $exceptions): void {

            /*
            |--------------------------------------------------------------------------
            | ERROR AUTENTIKASI
            |--------------------------------------------------------------------------
            */

            $exceptions->render(
                function (
                    AuthenticationException $exception,
                    Request $request
                ) {

                    if (!$request->is('api/*')) {
                        return null;
                    }

                    return response()->json([
                        'success' => false,

                        'message' =>
                            'Unauthenticated. Silakan login terlebih dahulu.',

                        'data' => null,

                    ], 401);
                }
            );

            /*
            |--------------------------------------------------------------------------
            | ERROR HTTP
            |--------------------------------------------------------------------------
            */

            $exceptions->render(
                function (
                    HttpExceptionInterface $exception,
                    Request $request
                ) {

                    if (!$request->is('api/*')) {
                        return null;
                    }

                    $status = $exception->getStatusCode();

                    $message = match ($status) {

                        403 =>
                            'Akun tidak memiliki izin untuk mengakses fitur ini.',

                        404 =>
                            'Endpoint API tidak ditemukan.',

                        405 =>
                            'Method request tidak diizinkan untuk endpoint ini.',

                        419 =>
                            'Sesi telah kedaluwarsa.',

                        429 =>
                            'Terlalu banyak request. Silakan coba kembali.',

                        default =>
                            $exception->getMessage() !== ''
                                ? $exception->getMessage()
                                : 'Terjadi kesalahan pada request.',
                    };

                    return response()->json([
                        'success' => false,
                        'message' => $message,
                        'data' => null,

                    ], $status);
                }
            );

            /*
            |--------------------------------------------------------------------------
            | ERROR SERVER
            |--------------------------------------------------------------------------
            |
            | Detail exception hanya boleh muncul
            | ketika APP_DEBUG aktif.
            |
            | Pada production:
            |
            | APP_DEBUG=false
            |
            */

            $exceptions->render(
                function (
                    \Throwable $exception,
                    Request $request
                ) {

                    if (!$request->is('api/*')) {
                        return null;
                    }

                    /*
                     * Validasi Laravel tetap
                     * menggunakan respons 422.
                     */

                    if (
                        $exception instanceof
                        \Illuminate\Validation\ValidationException
                    ) {
                        return null;
                    }

                    if (
                        $exception instanceof AuthenticationException ||
                        $exception instanceof HttpExceptionInterface
                    ) {
                        return null;
                    }

                    return response()->json([
                        'success' => false,

                        'message' =>
                            'Terjadi kesalahan pada server.',

                        'data' => config('app.debug')
                            ? [
                                'exception' =>
                                    class_basename($exception),

                                'error' =>
                                    $exception->getMessage(),

                                'file' =>
                                    $exception->getFile(),

                                'line' =>
                                    $exception->getLine(),
                            ]
                            : null,

                    ], 500);
                }
            );

        }
    )

    ->create();
