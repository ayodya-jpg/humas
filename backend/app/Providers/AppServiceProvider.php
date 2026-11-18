<?php

namespace App\Providers;

use App\Services\DashboardExcelService;
use App\Services\VerifiedDashboardExcelService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /*
    |--------------------------------------------------------------------------
    | REGISTER SERVICES
    |--------------------------------------------------------------------------
    */

    public function register(): void
    {
        /*
         * Semua export Dashboard menggunakan
         * generator Excel yang sudah divalidasi.
         *
         * Tidak mengubah format maupun isi
         * sheet laporan yang sudah tersedia.
         */

        $this->app->bind(
            DashboardExcelService::class,
            VerifiedDashboardExcelService::class
        );
    }

    /*
    |--------------------------------------------------------------------------
    | BOOT SERVICES
    |--------------------------------------------------------------------------
    */

    public function boot(): void
    {
        // Tidak ada konversi WebP/PDF tambahan.
    }
}
