
<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Route halaman utama Laravel.
|
| Konversi WebP ke PDF tidak digunakan.
| Seluruh API HUMAS & SEKPiM tetap berada
| pada routes/api.php.
|
*/

Route::get('/', function () {
    return view('welcome');
});
