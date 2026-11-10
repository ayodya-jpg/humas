<?php

use App\Http\Controllers\Api\DashboardDirectorateController;
use App\Http\Controllers\Api\NotificationReadController;
use App\Http\Middleware\ForceJsonResponse;
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
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',

        then: function (): void {
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

                    Route::get('/notification-reads', [
                        NotificationReadController::class,
                        'index',
                    ]);

                    Route::post('/notification-reads', [
                        NotificationReadController::class,
                        'store',
                    ]);

                    /*
                    |--------------------------------------------------------------------------
                    | REKAP DIREKTORAT DI DASHBOARD EXISTING
                    |--------------------------------------------------------------------------
                    */

                    Route::get('/dashboard/directorate-summary', [
                        DashboardDirectorateController::class,
                        'index',
                    ]);
                });
        }
    )
    ->withMiddleware(
        function (Middleware $middleware): void {
            $middleware->prependToGroup('api', [
                ForceJsonResponse::class,
            ]);

            $middleware->alias([
                'role' => RoleMiddleware::class,
                'permission' => PermissionMiddleware::class,
            ]);
        }
    )
    ->withExceptions(
        function (Exceptions $exceptions): void {

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

            $exceptions->render(
                function (
                    HttpExceptionInterface $exception,
                    Request $request
                ) {
                    if (!$request->is('api/*')) {
                        return null;
                    }

                    $statusCode = $exception->getStatusCode();

                    $message = match ($statusCode) {
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
                    ], $statusCode);
                }
            );

            $exceptions->render(
                function (
                    \Throwable $exception,
                    Request $request
                ) {
                    if (!$request->is('api/*')) {
                        return null;
                    }

                    if (
                        $exception instanceof AuthenticationException ||
                        $exception instanceof HttpExceptionInterface
                    ) {
                        return null;
                    }

                    $data = null;

                    if (config('app.debug')) {
                        $data = [
                            'exception' =>
                                class_basename($exception),

                            'error' =>
                                $exception->getMessage(),

                            'file' =>
                                $exception->getFile(),

                            'line' =>
                                $exception->getLine(),
                        ];
                    }

                    return response()->json([
                        'success' => false,
                        'message' =>
                            'Terjadi kesalahan pada server.',
                        'data' => $data,
                    ], 500);
                }
            );
        }
    )
    ->create();
