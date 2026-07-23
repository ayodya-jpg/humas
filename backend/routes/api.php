<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BorrowRequestController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\HumasServiceRequestController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::post(
    '/admin/login',
    [AuthController::class, 'login']
);

/*
|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')
    ->group(function (): void {
        /*
        |--------------------------------------------------------------------------
        | Authentication
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/admin/me',
            [AuthController::class, 'me']
        );

        Route::post(
            '/admin/logout',
            [AuthController::class, 'logout']
        );

        /*
        |--------------------------------------------------------------------------
        | Kategori - Read
        |--------------------------------------------------------------------------
        |
        | Kategori dapat dibaca oleh:
        | - akun yang melihat kategori;
        | - akun yang mengelola kategori;
        | - akun yang mengelola produk;
        | - akun yang membuat pengajuan merchandise;
        | - akun yang membuat pengajuan peminjaman.
        |
        */

        Route::middleware(
            'permission:categories.view,categories.manage,products.manage,request.merchandise.create,request.borrowing.create'
        )->group(function (): void {
            Route::get(
                '/categories',
                [CategoryController::class, 'index']
            );

            Route::get(
                '/categories/{category}',
                [CategoryController::class, 'show']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Produk - Read
        |--------------------------------------------------------------------------
        |
        | Produk dapat dibaca oleh:
        | - akun yang melihat produk;
        | - akun yang mengelola produk;
        | - akun yang membuat pengajuan merchandise;
        | - akun yang membuat pengajuan peminjaman.
        |
        */

        Route::middleware(
            'permission:products.view,products.manage,request.merchandise.create,request.borrowing.create'
        )->group(function (): void {
            Route::get(
                '/products',
                [ProductController::class, 'index']
            );

            Route::get(
                '/products/{product}',
                [ProductController::class, 'show']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Riwayat Pengajuan Pribadi
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:request.history.view'
        )->group(function (): void {
            Route::get(
                '/my-orders',
                [OrderController::class, 'myOrders']
            );

            Route::get(
                '/my-humas-service-requests',
                [
                    HumasServiceRequestController::class,
                    'myHumasServiceRequests',
                ]
            );

            Route::get(
                '/my-borrow-requests',
                [BorrowRequestController::class, 'myBorrowRequests']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Pengajuan Merchandise
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:request.merchandise.create'
        )->group(function (): void {
            Route::post(
                '/orders',
                [OrderController::class, 'store']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Detail Merchandise
        |--------------------------------------------------------------------------
        |
        | Detail dapat dibuka oleh:
        | - pemilik akses riwayat pribadi;
        | - admin approval merchandise.
        |
        | Controller tetap harus membatasi agar pengguna biasa hanya dapat
        | membaca pengajuan miliknya sendiri.
        |
        */

        Route::middleware(
            'permission:request.history.view,approval.merchandise.view'
        )->group(function (): void {
            Route::get(
                '/orders/{id}',
                [OrderController::class, 'show']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Approval Merchandise - Read
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:approval.merchandise.view'
        )->group(function (): void {
            Route::get(
                '/orders',
                [OrderController::class, 'index']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Approval Merchandise - Process
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:approval.merchandise.process'
        )->group(function (): void {
            Route::put(
                '/orders/{id}/approve',
                [OrderController::class, 'approve']
            );

            Route::put(
                '/orders/{id}/reject',
                [OrderController::class, 'reject']
            );

            Route::put(
                '/orders/{id}/complete',
                [OrderController::class, 'complete']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Pengajuan Layanan Humas
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:request.humas.create'
        )->group(function (): void {
            Route::post(
                '/humas-service-requests',
                [HumasServiceRequestController::class, 'store']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Detail Layanan Humas
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:request.history.view,approval.humas.view'
        )->group(function (): void {
            Route::get(
                '/humas-service-requests/{id}',
                [HumasServiceRequestController::class, 'show']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Approval Layanan Humas - Read
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:approval.humas.view'
        )->group(function (): void {
            Route::get(
                '/humas-service-requests',
                [HumasServiceRequestController::class, 'index']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Approval Layanan Humas - Process
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:approval.humas.process'
        )->group(function (): void {
            Route::put(
                '/humas-service-requests/{id}/approve',
                [HumasServiceRequestController::class, 'approve']
            );

            Route::put(
                '/humas-service-requests/{id}/reject',
                [HumasServiceRequestController::class, 'reject']
            );

            Route::put(
                '/humas-service-requests/{id}/complete',
                [HumasServiceRequestController::class, 'complete']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Pengajuan Peminjaman SEKPiM
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:request.borrowing.create'
        )->group(function (): void {
            Route::post(
                '/borrow-requests',
                [BorrowRequestController::class, 'store']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Detail Peminjaman SEKPiM
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:request.history.view,approval.borrowing.view'
        )->group(function (): void {
            Route::get(
                '/borrow-requests/{id}',
                [BorrowRequestController::class, 'show']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Approval Peminjaman SEKPiM - Read
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:approval.borrowing.view'
        )->group(function (): void {
            Route::get(
                '/borrow-requests',
                [BorrowRequestController::class, 'index']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Approval Peminjaman SEKPiM - Process
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:approval.borrowing.process'
        )->group(function (): void {
            Route::put(
                '/borrow-requests/{id}/approve',
                [BorrowRequestController::class, 'approve']
            );

            Route::put(
                '/borrow-requests/{id}/reject',
                [BorrowRequestController::class, 'reject']
            );

            Route::put(
                '/borrow-requests/{id}/borrowed',
                [BorrowRequestController::class, 'borrowed']
            );

            Route::put(
                '/borrow-requests/{id}/returned',
                [BorrowRequestController::class, 'returned']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Manajemen Produk
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:products.manage'
        )->group(function (): void {
            Route::post(
                '/products',
                [ProductController::class, 'store']
            );

            Route::put(
                '/products/{product}',
                [ProductController::class, 'update']
            );

            Route::delete(
                '/products/{product}',
                [ProductController::class, 'destroy']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Manajemen Kategori
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:categories.manage'
        )->group(function (): void {
            Route::post(
                '/categories',
                [CategoryController::class, 'store']
            );

            Route::put(
                '/categories/{category}',
                [CategoryController::class, 'update']
            );

            Route::delete(
                '/categories/{category}',
                [CategoryController::class, 'destroy']
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Manajemen User - Read
        |--------------------------------------------------------------------------
        |
        | users.view:
        | - melihat daftar;
        | - melihat detail.
        |
        */

        Route::prefix('admin')
            ->middleware(
                'permission:users.view,users.manage'
            )
            ->group(function (): void {
                Route::get(
                    '/users',
                    [UserController::class, 'index']
                );

                Route::get(
                    '/users/{user}',
                    [UserController::class, 'show']
                );
            });

        /*
        |--------------------------------------------------------------------------
        | Manajemen User - Process
        |--------------------------------------------------------------------------
        |
        | users.manage:
        | - membaca daftar permission;
        | - membuat akun;
        | - memperbarui akun;
        | - menghapus akun.
        |
        */

        Route::prefix('admin')
            ->middleware(
                'permission:users.manage'
            )
            ->group(function (): void {
                Route::get(
                    '/users/permissions',
                    [UserController::class, 'permissions']
                );

                Route::post(
                    '/users',
                    [UserController::class, 'store']
                );

                Route::put(
                    '/users/{user}',
                    [UserController::class, 'update']
                );

                Route::patch(
                    '/users/{user}',
                    [UserController::class, 'update']
                );

                Route::delete(
                    '/users/{user}',
                    [UserController::class, 'destroy']
                );
            });
    });