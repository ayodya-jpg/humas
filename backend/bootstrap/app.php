<?php

use App\Http\Controllers\Api\DashboardDirectorateController;
use App\Http\Controllers\Api\NotificationReadController;
use App\Http\Controllers\Api\PasswordRecoveryController;
use App\Http\Controllers\Api\SecurityRecoveryController;
use App\Http\Middleware\ForceJsonResponse;
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

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function (): void {

            // Endpoint email lama dipertahankan agar
            // tidak memutus fitur existing.

            Route::middleware(['api', 'throttle:3,1'])
                ->prefix('api')
                ->group(function (): void {
                    Route::post('/admin/forgot-password', [
                        PasswordRecoveryController::class,
                        'forgotPassword',
                    ]);
                });

            Route::middleware(['api', 'throttle:5,1'])
                ->prefix('api')
                ->group(function (): void {
                    Route::post('/admin/reset-password', [
                        PasswordRecoveryController::class,
                        'resetPassword',
                    ]);
                });

            /*
            |--------------------------------------------------------------------------
            | PEMULIHAN TANPA EMAIL - PUBLIC
            |--------------------------------------------------------------------------
            */

            Route::middleware(['api', 'throttle:3,1'])
                ->prefix('api/account/recovery')
                ->group(function (): void {
                    Route::post('/request', [
                        SecurityRecoveryController::class,
                        'submit',
                    ]);
                });

            Route::middleware(['api', 'throttle:15,1'])
                ->prefix('api/account/recovery')
                ->group(function (): void {
                    Route::post('/status', [
                        SecurityRecoveryController::class,
                        'status',
                    ]);
                });

            Route::middleware(['api', 'throttle:5,1'])
                ->prefix('api/account/recovery')
                ->group(function (): void {
                    Route::post('/reset', [
                        SecurityRecoveryController::class,
                        'reset',
                    ]);
                });

            /*
            |--------------------------------------------------------------------------
            | ENDPOINT AUTHENTICATED
            |--------------------------------------------------------------------------
            */

            Route::middleware(['api', 'auth:sanctum'])
                ->prefix('api')
                ->group(function (): void {

                    Route::get('/notification-reads', [
                        NotificationReadController::class,
                        'index',
                    ]);

                    Route::post('/notification-reads', [
                        NotificationReadController::class,
                        'store',
                    ]);

                    Route::get('/dashboard/directorate-summary', [
                        DashboardDirectorateController::class,
                        'index',
                    ]);

                    Route::get('/account/security-question', [
                        SecurityRecoveryController::class,
                        'settings',
                    ]);

                    Route::post('/account/security-question', [
                        SecurityRecoveryController::class,
                        'saveQuestion',
                    ])->middleware('throttle:5,1');

                    Route::get('/admin/recovery-requests', [
                        SecurityRecoveryController::class,
                        'adminIndex',
                    ]);

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
    ->withMiddleware(function (Middleware $middleware): void {

        $middleware->prependToGroup('api', [
            ForceJsonResponse::class,
            LimitUploadFileSize::class,
        ]);

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {

        $exceptions->render(function (
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
        });

        $exceptions->render(function (
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
        });

        $exceptions->render(function (
            \Throwable $exception,
            Request $request
        ) {
            if (!$request->is('api/*')) {
                return null;
            }

            // Tetap gunakan error validasi bawaan Laravel (422).
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
                'message' => 'Terjadi kesalahan pada server.',
                'data' => config('app.debug') ? [
                    'exception' => class_basename($exception),
                    'error' => $exception->getMessage(),
                    'file' => $exception->getFile(),
                    'line' => $exception->getLine(),
                ] : null,
            ], 500);
        });
    })
    ->create();
