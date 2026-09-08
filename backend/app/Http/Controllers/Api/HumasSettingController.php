<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HumasServiceAvailability;
use App\Models\ServiceSubmissionSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Throwable;

class HumasSettingController extends Controller
{
    private const ADMIN_ROLES = [
        'admin',
        'admin_humas',
        'admin_sekpim',
        'superadmin',
    ];

    private const SERVICE_LABELS = [
        ServiceSubmissionSetting::SERVICE_MERCHANDISE =>
            'Merchandise',

        ServiceSubmissionSetting::SERVICE_HUMAS =>
            'Layanan Humas',

        ServiceSubmissionSetting::SERVICE_SEKPIM_BORROW =>
            'Peminjaman Barang SEKPiM',

        ServiceSubmissionSetting::SERVICE_SEKPIM_ASSET_REQUEST =>
            'Request Barang / Aset SEKPiM',
    ];

    /*
    |--------------------------------------------------------------------------
    | SHOW SETTINGS
    |--------------------------------------------------------------------------
    */

    public function show(
        Request $request
    ): JsonResponse {
        HumasServiceAvailability::ensureDefaults();

        $submissionSettings =
            [];

        foreach (
            ServiceSubmissionSetting::SERVICES
            as $serviceKey
        ) {
            $setting =
                ServiceSubmissionSetting::getFor(
                    $serviceKey
                );

            $days =
                ServiceSubmissionSetting::minimumDays(
                    $serviceKey
                );

            $submissionSettings[
                $serviceKey
            ] = [
                'service_key' =>
                    $serviceKey,

                'label' =>
                    self::SERVICE_LABELS[
                        $serviceKey
                    ] ??
                    $serviceKey,

                'min_submission_days' =>
                    $days,

                /*
                 * Satu sumber restriction tanggal.
                 */
                'minimum_date' =>
                    ServiceSubmissionSetting::minimumDate(
                        $serviceKey
                    ),

                'rule_label' =>
                    ServiceSubmissionSetting::ruleLabel(
                        $serviceKey
                    ),

                'updated_by' =>
                    $setting
                        ->updated_by,

                'updated_at' =>
                    $setting
                        ->updated_at,
            ];
        }

        $humasServices =
            HumasServiceAvailability::query()
                ->orderBy(
                    'id'
                )
                ->get([
                    'id',
                    'coverage_type',
                    'is_active',
                    'updated_by',
                    'updated_at',
                ]);

        $user =
            $request->user();

        $humasSetting =
            $submissionSettings[
                ServiceSubmissionSetting::SERVICE_HUMAS
            ];

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Pengaturan layanan berhasil diambil.',

            'data' => [
                /*
                 * Informasi tanggal server.
                 *
                 * Berguna untuk memastikan frontend dan
                 * backend memakai hari yang sama.
                 */
                'server_date' =>
                    ServiceSubmissionSetting::today()
                        ->toDateString(),

                'timezone' =>
                    config(
                        'app.timezone'
                    ),

                /*
                 * Backward compatibility frontend Humas.
                 */
                'min_submission_days' =>
                    $humasSetting[
                        'min_submission_days'
                    ],

                'minimum_date' =>
                    $humasSetting[
                        'minimum_date'
                    ],

                'rule_label' =>
                    $humasSetting[
                        'rule_label'
                    ],

                /*
                 * Setting semua layanan.
                 */
                'submission_settings' =>
                    $submissionSettings,

                /*
                 * Availability Humas.
                 */
                'services' =>
                    $humasServices,

                'access' => [
                    'can_manage_services' =>
                        $user !== null &&
                        in_array(
                            $user->role,
                            self::ADMIN_ROLES,
                            true
                        ),

                    'can_manage_submission_rule' =>
                        $user?->role ===
                        'superadmin',
                ],
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE HUMAS SERVICE
    |--------------------------------------------------------------------------
    */

    public function updateService(
        Request $request
    ): JsonResponse {
        $user =
            $request->user();

        if (
            !$user ||
            !in_array(
                $user->role,
                self::ADMIN_ROLES,
                true
            )
        ) {
            return response()->json([
                'success' =>
                    false,

                'message' =>
                    'Kamu tidak memiliki izin mengubah ketersediaan layanan Humas.',

                'data' =>
                    null,
            ], 403);
        }

        $validated =
            $request->validate([
                'coverage_type' => [
                    'required',
                    'string',

                    Rule::in(
                        HumasServiceAvailability::COVERAGE_TYPES
                    ),
                ],

                'is_active' => [
                    'required',
                    'boolean',
                ],
            ], [
                'coverage_type.required' =>
                    'Jenis layanan wajib dipilih.',

                'coverage_type.in' =>
                    'Jenis layanan Humas tidak valid.',

                'is_active.required' =>
                    'Status layanan wajib dikirim.',

                'is_active.boolean' =>
                    'Status layanan tidak valid.',
            ]);

        try {
            $service =
                DB::transaction(
                    function () use (
                        $validated,
                        $user
                    ): HumasServiceAvailability {
                        return HumasServiceAvailability::query()
                            ->updateOrCreate(
                                [
                                    'coverage_type' =>
                                        $validated[
                                            'coverage_type'
                                        ],
                                ],
                                [
                                    'is_active' =>
                                        (bool)
                                            $validated[
                                                'is_active'
                                            ],

                                    'updated_by' =>
                                        $user->id,
                                ]
                            );
                    }
                );

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    $service
                        ->is_active
                        ? 'Layanan Humas berhasil dibuka.'
                        : 'Layanan Humas berhasil ditutup.',

                'data' =>
                    $service,
            ]);
        } catch (
            Throwable $error
        ) {
            report(
                $error
            );

            return response()->json([
                'success' =>
                    false,

                'message' =>
                    app()->isLocal()
                        ? $error->getMessage()
                        : 'Status layanan Humas gagal diperbarui.',

                'data' =>
                    null,
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE SUBMISSION RULE
    |--------------------------------------------------------------------------
    */

    public function updateSubmissionRule(
        Request $request
    ): JsonResponse {
        $user =
            $request->user();

        if (
            !$user ||
            $user->role !==
            'superadmin'
        ) {
            return response()->json([
                'success' =>
                    false,

                'message' =>
                    'Hanya Super Administrator yang dapat mengubah aturan batas waktu pengajuan.',

                'data' =>
                    null,
            ], 403);
        }

        $validated =
            $request->validate([
                'service_key' => [
                    'required',
                    'string',

                    Rule::in(
                        ServiceSubmissionSetting::SERVICES
                    ),
                ],

                'min_submission_days' => [
                    'required',
                    'integer',
                    'min:0',
                    'max:365',
                ],
            ], [
                'service_key.required' =>
                    'Jenis layanan wajib dipilih.',

                'service_key.in' =>
                    'Jenis layanan tidak valid.',

                'min_submission_days.required' =>
                    'Minimal hari pengajuan wajib diisi.',

                'min_submission_days.integer' =>
                    'Minimal hari pengajuan harus berupa angka bulat.',

                'min_submission_days.min' =>
                    'Minimal hari pengajuan tidak boleh kurang dari 0.',

                'min_submission_days.max' =>
                    'Minimal hari pengajuan maksimal 365 hari.',
            ]);

        try {
            DB::transaction(
                function () use (
                    $validated,
                    $user
                ): void {
                    $setting =
                        ServiceSubmissionSetting::getFor(
                            $validated[
                                'service_key'
                            ]
                        );

                    $setting->update([
                        'min_submission_days' =>
                            (int)
                                $validated[
                                    'min_submission_days'
                                ],

                        'updated_by' =>
                            $user->id,
                    ]);
                }
            );

            /*
             * Ambil ulang melalui model supaya
             * response dan validation menggunakan
             * perhitungan yang sama.
             */
            $serviceKey =
                $validated[
                    'service_key'
                ];

            $days =
                ServiceSubmissionSetting::minimumDays(
                    $serviceKey
                );

            $serviceLabel =
                self::SERVICE_LABELS[
                    $serviceKey
                ] ??
                $serviceKey;

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    "Batas pengajuan {$serviceLabel} berhasil diubah menjadi H-{$days}.",

                'data' => [
                    'service_key' =>
                        $serviceKey,

                    'label' =>
                        $serviceLabel,

                    'min_submission_days' =>
                        $days,

                    'rule_label' =>
                        ServiceSubmissionSetting::ruleLabel(
                            $serviceKey
                        ),

                    'minimum_date' =>
                        ServiceSubmissionSetting::minimumDate(
                            $serviceKey
                        ),

                    'server_date' =>
                        ServiceSubmissionSetting::today()
                            ->toDateString(),

                    'timezone' =>
                        config(
                            'app.timezone'
                        ),
                ],
            ]);
        } catch (
            Throwable $error
        ) {
            report(
                $error
            );

            return response()->json([
                'success' =>
                    false,

                'message' =>
                    app()->isLocal()
                        ? $error->getMessage()
                        : 'Aturan batas pengajuan gagal diperbarui.',

                'data' =>
                    null,
            ], 500);
        }
    }
}