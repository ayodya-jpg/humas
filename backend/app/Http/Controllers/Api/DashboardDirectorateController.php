<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DirectorateReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardDirectorateController extends Controller
{
    public function index(
        Request $request,
        DirectorateReportService $report
    ): JsonResponse {
        $user = $request->user();

        abort_unless(
            $user &&
            $user->hasPermission('dashboard.view') &&
            in_array($user->role, [
                'admin',
                'admin_humas',
                'admin_sekpim',
                'superadmin',
            ], true),
            403,
            'Tidak memiliki izin melihat laporan Direktorat.'
        );

        $validated = $request->validate([
            'start_date' => [
                'required',
                'date_format:Y-m-d',
            ],
            'end_date' => [
                'required',
                'date_format:Y-m-d',
                'after_or_equal:start_date',
            ],
        ]);

        $data = $report->generate(
            $validated['start_date'],
            $validated['end_date'],
            $user->role
        );

        return response()->json([
            'success' => true,
            'message' => 'Rekap Direktorat berhasil dimuat.',
            'data' => $data,
        ]);
    }
}
