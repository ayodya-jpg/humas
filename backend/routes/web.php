<?php

use App\Http\Controllers\MerchandiseProofPdfController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| HALAMAN AWAL
|--------------------------------------------------------------------------
*/

Route::get('/', function () {
    return view('welcome');
});

/*
|--------------------------------------------------------------------------
| PILOT DOWNLOAD PDF MERCHANDISE
|--------------------------------------------------------------------------
|
| Hanya tautan dengan signature valid
| yang dapat membuka dokumen.
|
| Signature berlaku sementara dan
| tidak membutuhkan token Bearer
| di alamat browser.
|
*/

Route::get(
    '/merchandise-proofs/{order}/pdf',
    MerchandiseProofPdfController::class
)
    ->middleware([
        'signed:relative',
        'throttle:20,1',
    ])
    ->name('merchandise.proof.pdf');
