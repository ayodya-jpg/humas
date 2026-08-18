<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BorrowRequestController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
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
        | Dashboard
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:dashboard.view'
        )->group(function (): void {
            Route::get(
                '/dashboard/analytics',
                [
                    DashboardController::class,
                    'analytics',
                ]
            );

            Route::get(
                '/dashboard/export',
                [
                    DashboardController::class,
                    'export',
                ]
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Kategori - Read
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:categories.view,categories.manage,products.manage,request.merchandise.create,request.borrowing.create'
        )->group(function (): void {
            Route::get(
                '/categories',
                [
                    CategoryController::class,
                    'index',
                ]
            );

            Route::get(
                '/categories/{category}',
                [
                    CategoryController::class,
                    'show',
                ]
            )->whereNumber(
                'category'
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Produk - Read
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:products.view,products.manage,request.merchandise.create,request.borrowing.create'
        )->group(function (): void {
            Route::get(
                '/products',
                [
                    ProductController::class,
                    'index',
                ]
            );

            Route::get(
                '/products/{product}',
                [
                    ProductController::class,
                    'show',
                ]
            )->whereNumber(
                'product'
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
                [
                    OrderController::class,
                    'myOrders',
                ]
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
                [
                    BorrowRequestController::class,
                    'myBorrowRequests',
                ]
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
                [
                    OrderController::class,
                    'store',
                ]
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Detail Merchandise
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:request.history.view,approval.merchandise.view'
        )->group(function (): void {
            Route::get(
                '/orders/{id}',
                [
                    OrderController::class,
                    'show',
                ]
            )->whereNumber(
                'id'
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
                [
                    OrderController::class,
                    'index',
                ]
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
                [
                    OrderController::class,
                    'approve',
                ]
            )->whereNumber(
                'id'
            );

            Route::put(
                '/orders/{id}/revision',
                [
                    OrderController::class,
                    'revision',
                ]
            )->whereNumber(
                'id'
            );

            Route::put(
                '/orders/{id}/reject',
                [
                    OrderController::class,
                    'reject',
                ]
            )->whereNumber(
                'id'
            );

            Route::put(
                '/orders/{id}/complete',
                [
                    OrderController::class,
                    'complete',
                ]
            )->whereNumber(
                'id'
            );

            Route::post(
                '/orders/{id}/resubmit',
                [
                    OrderController::class,
                    'resubmit',
                ]
            )->whereNumber(
                'id'
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
                [
                    HumasServiceRequestController::class,
                    'store',
                ]
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
                [
                    HumasServiceRequestController::class,
                    'show',
                ]
            )->whereNumber(
                'id'
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
                [
                    HumasServiceRequestController::class,
                    'index',
                ]
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
                [
                    HumasServiceRequestController::class,
                    'approve',
                ]
            )->whereNumber(
                'id'
            );

            Route::put(
                '/humas-service-requests/{id}/reject',
                [
                    HumasServiceRequestController::class,
                    'reject',
                ]
            )->whereNumber(
                'id'
            );

            Route::put(
                '/humas-service-requests/{id}/complete',
                [
                    HumasServiceRequestController::class,
                    'complete',
                ]
            )->whereNumber(
                'id'
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Pengajuan SEKPiM
        |--------------------------------------------------------------------------
        |
        | Satu endpoint digunakan untuk:
        |
        | request_type = borrow
        | → Peminjaman Barang
        |
        | request_type = asset_request
        | → Request Barang
        |
        */

        Route::middleware(
            'permission:request.borrowing.create'
        )->group(function (): void {
            Route::post(
                '/borrow-requests',
                [
                    BorrowRequestController::class,
                    'store',
                ]
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Detail Pengajuan SEKPiM
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:request.history.view,approval.borrowing.view'
        )->group(function (): void {
            Route::get(
                '/borrow-requests/{id}',
                [
                    BorrowRequestController::class,
                    'show',
                ]
            )->whereNumber(
                'id'
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Approval SEKPiM - Read
        |--------------------------------------------------------------------------
        */

        Route::middleware(
            'permission:approval.borrowing.view'
        )->group(function (): void {
            Route::get(
                '/borrow-requests',
                [
                    BorrowRequestController::class,
                    'index',
                ]
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Approval SEKPiM - Process
        |--------------------------------------------------------------------------
        |
        | PEMINJAMAN BARANG
        |
        | pending
        | → approved
        | → borrowed
        | → returned
        |
        |
        | REQUEST BARANG
        |
        | pending
        | → approved
        | → completed
        |
        */

        Route::middleware(
            'permission:approval.borrowing.process'
        )->group(function (): void {
            /*
             * Berlaku untuk Peminjaman Barang
             * dan Request Barang.
             */
            Route::put(
                '/borrow-requests/{id}/approve',
                [
                    BorrowRequestController::class,
                    'approve',
                ]
            )->whereNumber(
                'id'
            );

            /*
             * Berlaku untuk Peminjaman Barang
             * dan Request Barang.
             */
            Route::put(
                '/borrow-requests/{id}/reject',
                [
                    BorrowRequestController::class,
                    'reject',
                ]
            )->whereNumber(
                'id'
            );

            /*
             * Khusus Peminjaman Barang.
             *
             * approved → borrowed
             */
            Route::put(
                '/borrow-requests/{id}/borrowed',
                [
                    BorrowRequestController::class,
                    'borrowed',
                ]
            )->whereNumber(
                'id'
            );

            /*
             * Khusus Peminjaman Barang.
             *
             * borrowed → returned
             */
            Route::put(
                '/borrow-requests/{id}/returned',
                [
                    BorrowRequestController::class,
                    'returned',
                ]
            )->whereNumber(
                'id'
            );

            /*
             * Khusus Request Barang.
             *
             * approved → completed
             *
             * Bukti penyerahan wajib.
             * Stok berkurang permanen.
             */
            Route::put(
                '/borrow-requests/{id}/complete',
                [
                    BorrowRequestController::class,
                    'complete',
                ]
            )->whereNumber(
                'id'
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
                [
                    ProductController::class,
                    'store',
                ]
            );

            Route::put(
                '/products/{product}',
                [
                    ProductController::class,
                    'update',
                ]
            )->whereNumber(
                'product'
            );

            Route::patch(
                '/products/{product}',
                [
                    ProductController::class,
                    'update',
                ]
            )->whereNumber(
                'product'
            );

            Route::delete(
                '/products/{product}',
                [
                    ProductController::class,
                    'destroy',
                ]
            )->whereNumber(
                'product'
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
                [
                    CategoryController::class,
                    'store',
                ]
            );

            Route::put(
                '/categories/{category}',
                [
                    CategoryController::class,
                    'update',
                ]
            )->whereNumber(
                'category'
            );

            Route::patch(
                '/categories/{category}',
                [
                    CategoryController::class,
                    'update',
                ]
            )->whereNumber(
                'category'
            );

            Route::delete(
                '/categories/{category}',
                [
                    CategoryController::class,
                    'destroy',
                ]
            )->whereNumber(
                'category'
            );
        });

        /*
        |--------------------------------------------------------------------------
        | Manajemen User
        |--------------------------------------------------------------------------
        */

        Route::prefix(
            'admin'
        )->group(function (): void {
            Route::get(
                '/users/permissions',
                [
                    UserController::class,
                    'permissions',
                ]
            )->middleware(
                'permission:users.manage'
            );

            Route::get(
                '/users',
                [
                    UserController::class,
                    'index',
                ]
            )->middleware(
                'permission:users.view,users.manage'
            );

            Route::post(
                '/users',
                [
                    UserController::class,
                    'store',
                ]
            )->middleware(
                'permission:users.manage'
            );

            Route::get(
                '/users/{user}',
                [
                    UserController::class,
                    'show',
                ]
            )
                ->whereNumber(
                    'user'
                )
                ->middleware(
                    'permission:users.view,users.manage'
                );

            Route::put(
                '/users/{user}',
                [
                    UserController::class,
                    'update',
                ]
            )
                ->whereNumber(
                    'user'
                )
                ->middleware(
                    'permission:users.manage'
                );

            Route::patch(
                '/users/{user}',
                [
                    UserController::class,
                    'update',
                ]
            )
                ->whereNumber(
                    'user'
                )
                ->middleware(
                    'permission:users.manage'
                );

            Route::delete(
                '/users/{user}',
                [
                    UserController::class,
                    'destroy',
                ]
            )
                ->whereNumber(
                    'user'
                )
                ->middleware(
                    'permission:users.manage'
                );
        });
    });