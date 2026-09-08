<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use InvalidArgumentException;

class ServiceSubmissionSetting extends Model
{
    public const SERVICE_MERCHANDISE =
        'merchandise';

    public const SERVICE_HUMAS =
        'humas';

    public const SERVICE_SEKPIM_BORROW =
        'sekpim_borrow';

    public const SERVICE_SEKPIM_ASSET_REQUEST =
        'sekpim_asset_request';

    public const SERVICES = [
        self::SERVICE_MERCHANDISE,
        self::SERVICE_HUMAS,
        self::SERVICE_SEKPIM_BORROW,
        self::SERVICE_SEKPIM_ASSET_REQUEST,
    ];

    protected $fillable = [
        'service_key',
        'min_submission_days',
        'updated_by',
    ];

    protected $casts = [
        'id' =>
            'integer',

        'min_submission_days' =>
            'integer',

        'updated_by' =>
            'integer',
    ];

    /*
    |--------------------------------------------------------------------------
    | RELATION
    |--------------------------------------------------------------------------
    */

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'updated_by'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | VALID SERVICE
    |--------------------------------------------------------------------------
    */

    public static function ensureValidService(
        string $serviceKey
    ): void {
        if (
            !in_array(
                $serviceKey,
                self::SERVICES,
                true
            )
        ) {
            throw new InvalidArgumentException(
                "Service key {$serviceKey} tidak valid."
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | GET SETTING
    |--------------------------------------------------------------------------
    */

    public static function getFor(
        string $serviceKey
    ): self {
        self::ensureValidService(
            $serviceKey
        );

        return self::query()
            ->firstOrCreate(
                [
                    'service_key' =>
                        $serviceKey,
                ],
                [
                    'min_submission_days' =>
                        4,

                    'updated_by' =>
                        null,
                ]
            );
    }

    /*
    |--------------------------------------------------------------------------
    | MINIMUM DAYS
    |--------------------------------------------------------------------------
    */

    public static function minimumDays(
        string $serviceKey
    ): int {
        $days =
            (int)
                self::getFor(
                    $serviceKey
                )
                    ->min_submission_days;

        /*
         * Guard tambahan.
         *
         * Walaupun controller membatasi 0-365,
         * model tetap dibuat aman jika database
         * pernah diubah manual.
         */
        return max(
            0,
            min(
                365,
                $days
            )
        );
    }

    /*
    |--------------------------------------------------------------------------
    | TODAY
    |--------------------------------------------------------------------------
    |
    | Semua perhitungan restriction tanggal menggunakan
    | timezone aplikasi Laravel.
    |
    */

    public static function today(): Carbon
    {
        return Carbon::now(
            config(
                'app.timezone'
            )
        )->startOfDay();
    }

    /*
    |--------------------------------------------------------------------------
    | MINIMUM DATE OBJECT
    |--------------------------------------------------------------------------
    */

    public static function minimumDateCarbon(
        string $serviceKey
    ): Carbon {
        return self::today()
            ->copy()
            ->addDays(
                self::minimumDays(
                    $serviceKey
                )
            );
    }

    /*
    |--------------------------------------------------------------------------
    | MINIMUM DATE STRING
    |--------------------------------------------------------------------------
    */

    public static function minimumDate(
        string $serviceKey
    ): string {
        return self::minimumDateCarbon(
            $serviceKey
        )->toDateString();
    }

    /*
    |--------------------------------------------------------------------------
    | RULE LABEL
    |--------------------------------------------------------------------------
    */

    public static function ruleLabel(
        string $serviceKey
    ): string {
        $days =
            self::minimumDays(
                $serviceKey
            );

        return "H-{$days}";
    }

    /*
    |--------------------------------------------------------------------------
    | DATE VALIDATION
    |--------------------------------------------------------------------------
    */

    public static function isDateAllowed(
        string $serviceKey,
        string $date
    ): bool {
        $requestedDate =
            Carbon::createFromFormat(
                'Y-m-d',
                $date,
                config(
                    'app.timezone'
                )
            )->startOfDay();

        return $requestedDate
            ->greaterThanOrEqualTo(
                self::minimumDateCarbon(
                    $serviceKey
                )
            );
    }
}