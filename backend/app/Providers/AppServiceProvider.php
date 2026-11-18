<?php

namespace App\Providers;

use App\Services\DashboardExcelService;
use App\Services\VerifiedDashboardExcelService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        /*
         * Validasi file Excel sebelum dikirim ke user.
         * DashboardController dan struktur sheet lama tidak diubah.
         */
        $this->app->bind(
            DashboardExcelService::class,
            VerifiedDashboardExcelService::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
