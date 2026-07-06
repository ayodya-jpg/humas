<?php

use App\Http\Controllers\Api\BorrowRequestController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use Illuminate\Support\Facades\Route;

Route::get('/test', function () {
    return response()->json([
        'success' => true,
        'message' => 'API Laravel berhasil terhubung',
        'data' => [
            'project' => 'HUMAS',
            'backend' => 'Laravel',
            'frontend' => 'React',
        ],
    ]);
});

/*
|--------------------------------------------------------------------------
| Products
|--------------------------------------------------------------------------
*/
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::post('/products', [ProductController::class, 'store']);
Route::put('/products/{id}', [ProductController::class, 'update']);
Route::delete('/products/{id}', [ProductController::class, 'destroy']);

/*
|--------------------------------------------------------------------------
| Orders / Checkout
|--------------------------------------------------------------------------
*/
Route::get('/orders', [OrderController::class, 'index']);
Route::get('/orders/{id}', [OrderController::class, 'show']);
Route::post('/orders', [OrderController::class, 'store']);

Route::put('/orders/{id}/approve', [OrderController::class, 'approve']);
Route::put('/orders/{id}/revision', [OrderController::class, 'revision']);
Route::put('/orders/{id}/reject', [OrderController::class, 'reject']);
Route::put('/orders/{id}/complete', [OrderController::class, 'complete']);

/*
|--------------------------------------------------------------------------
| Borrow Requests / Peminjaman
|--------------------------------------------------------------------------
*/
Route::get('/borrow-requests', [BorrowRequestController::class, 'index']);
Route::get('/borrow-requests/{id}', [BorrowRequestController::class, 'show']);
Route::post('/borrow-requests', [BorrowRequestController::class, 'store']);

Route::put('/borrow-requests/{id}/approve', [BorrowRequestController::class, 'approve']);
Route::put('/borrow-requests/{id}/revision', [BorrowRequestController::class, 'revision']);
Route::put('/borrow-requests/{id}/reject', [BorrowRequestController::class, 'reject']);
Route::put('/borrow-requests/{id}/borrowed', [BorrowRequestController::class, 'borrowed']);
Route::put('/borrow-requests/{id}/returned', [BorrowRequestController::class, 'returned']);