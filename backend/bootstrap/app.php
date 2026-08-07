<?php

use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\PermissionMiddleware;
use App\Http\Middleware\RoleMiddleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

return Application::configure(
    basePath: dirname(__DIR__)
)
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(
        function (Middleware $middleware): void {
            /*
            |--------------------------------------------------------------------------
            | Paksa seluruh route API mengembalikan JSON
            |--------------------------------------------------------------------------
            */

            $middleware->prependToGroup('api', [
                ForceJsonResponse::class,
            ]);

            /*
            |--------------------------------------------------------------------------
            | Alias Middleware
            |--------------------------------------------------------------------------
            */

            $middleware->alias([
                'role' =>
                    RoleMiddleware::class,

                'permission' =>
                    PermissionMiddleware::class,
            ]);
        }
    )
    ->withExceptions(
        function (Exceptions $exceptions): void {
            /*
            |--------------------------------------------------------------------------
            | Authentication Exception
            |--------------------------------------------------------------------------
            */

            $exceptions->render(
                function (
                    AuthenticationException $exception,
                    Request $request
                ) {
                    if (
                        !$request->is('api/*')
                    ) {
                        return null;
                    }

                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthenticated. Silakan login terlebih dahulu.',
                        'data' => null,
                    ], 401);
                }
            );

            /*
            |--------------------------------------------------------------------------
            | HTTP Exception untuk API
            |--------------------------------------------------------------------------
            |
            | Contoh:
            | - 403 Forbidden
            | - 404 Not Found
            | - 405 Method Not Allowed
            |
            */

            $exceptions->render(
                function (
                    HttpExceptionInterface $exception,
                    Request $request
                ) {
                    if (
                        !$request->is('api/*')
                    ) {
                        return null;
                    }

                    $statusCode =
                        $exception->getStatusCode();

                    $message =
                        match ($statusCode) {
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

            /*
            |--------------------------------------------------------------------------
            | Server Error API
            |--------------------------------------------------------------------------
            |
            | Detail error hanya ditampilkan ketika APP_DEBUG=true.
            |
            */

            $exceptions->render(
                function (
                    Throwable $exception,
                    Request $request
                ) {
                    if (
                        !$request->is('api/*')
                    ) {
                        return null;
                    }

                    /*
                     * AuthenticationException dan HttpExceptionInterface
                     * telah ditangani oleh renderer sebelumnya.
                     */
                    if (
                        $exception instanceof
                            AuthenticationException ||
                        $exception instanceof
                            HttpExceptionInterface
                    ) {
                        return null;
                    }

                    $data = null;

                    if (
                        config('app.debug')
                    ) {
                        $data = [
                            'exception' =>
                                class_basename(
                                    $exception
                                ),

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
                        'message' => 'Terjadi kesalahan pada server.',
                        'data' => $data,
                    ], 500);
                }
            );
        }
    )
    ->create();