<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BorrowRequestController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/admin/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/admin/me', [AuthController::class, 'me']);
    Route::post('/admin/logout', [AuthController::class, 'logout']);

    /*
    |--------------------------------------------------------------------------
    | Public authenticated access
    |--------------------------------------------------------------------------
    */
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{category}', [CategoryController::class, 'show']);

    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{product}', [ProductController::class, 'show']);

    /*
    |--------------------------------------------------------------------------
    | User request routes
    |--------------------------------------------------------------------------
    */
    Route::get('/my-orders', [OrderController::class, 'myOrders']);
    Route::get('/my-borrow-requests', [BorrowRequestController::class, 'myBorrowRequests']);

    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);

    Route::post('/borrow-requests', [BorrowRequestController::class, 'store']);
    Route::get('/borrow-requests/{id}', [BorrowRequestController::class, 'show']);

    /*
    |--------------------------------------------------------------------------
    | Admin & Superadmin approval routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('role:admin,superadmin')->group(function () {
        Route::get('/orders', [OrderController::class, 'index']);
        Route::put('/orders/{id}/approve', [OrderController::class, 'approve']);
        Route::put('/orders/{id}/revision', [OrderController::class, 'revision']);
        Route::put('/orders/{id}/reject', [OrderController::class, 'reject']);
        Route::put('/orders/{id}/complete', [OrderController::class, 'complete']);

        Route::get('/borrow-requests', [BorrowRequestController::class, 'index']);
        Route::put('/borrow-requests/{id}/approve', [BorrowRequestController::class, 'approve']);
        Route::put('/borrow-requests/{id}/revision', [BorrowRequestController::class, 'revision']);
        Route::put('/borrow-requests/{id}/reject', [BorrowRequestController::class, 'reject']);
        Route::put('/borrow-requests/{id}/borrowed', [BorrowRequestController::class, 'borrowed']);
        Route::put('/borrow-requests/{id}/returned', [BorrowRequestController::class, 'returned']);
    });

    /*
    |--------------------------------------------------------------------------
    | Superadmin only routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('role:superadmin')->group(function () {
        Route::apiResource('/users', UserController::class)->except(['create', 'edit']);

        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
    });
});