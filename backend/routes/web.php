<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Route utama aplikasi Laravel HUMAS & SEKPiM.
|
| Tidak menggunakan konversi WebP ke PDF.
| Seluruh endpoint API tetap berada di routes/api.php.
|
| PENTING:
| Jangan menambahkan spasi, baris kosong, atau BOM
| sebelum tag pembuka PHP.
|
*/

Route::get('/', function () {
    return view('welcome');
});
