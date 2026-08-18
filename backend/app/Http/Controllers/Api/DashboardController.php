<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BorrowRequest;
use App\Models\HumasServiceRequest;
use App\Models\Order;
use App\Services\DashboardExcelService;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardController extends Controller
{
    private const SERVICE_ALL = 'all';

    private const SERVICE_MERCHANDISE = 'merchandise';

    private const SERVICE_HUMAS = 'humas';

    private const SERVICE_BORROWING = 'borrowing';

    private const SERVICES = [
        self::SERVICE_ALL,
        self::SERVICE_MERCHANDISE,
        self::SERVICE_HUMAS,
        self::SERVICE_BORROWING,
    ];

    private const STATUSES = [
        'all',
        'pending',
        'revision',
        'approved',
        'rejected',
        'completed',
        'borrowed',
        'returned',
    ];

    public function analytics(
        Request $request
    ): JsonResponse {
        $filters =
            $this->validateFilters(
                $request
            );

        $result =
            $this->buildDashboardData(
                $request,
                $filters
            );

        return response()->json([
            'success' => true,

            'message' =>
                'Data dashboard berhasil dimuat.',

            'data' => [
                'filters' => [
                    'service' =>
                        $result['service'],

                    'status' =>
                        $result['status'],

                    'start_date' =>
                        $result['start_date']
                            ->toDateString(),

                    'end_date' =>
                        $result['end_date']
                            ->toDateString(),

                    'group_by' =>
                        $result['group_by'],

                    'available_services' =>
                        $result[
                            'available_services'
                        ],
                ],

                'summary' =>
                    $this->buildSummary(
                        $result['requests']
                    ),

                'service_distribution' =>
                    $this->buildServiceDistribution(
                        $result['requests'],
                        $result[
                            'available_services'
                        ]
                    ),

                'status_distribution' =>
                    $this->buildStatusDistribution(
                        $result['requests']
                    ),

                'trend' =>
                    $this->buildTrend(
                        $result['requests'],
                        $result['start_date'],
                        $result['end_date'],
                        $result['group_by']
                    ),

                'recent_requests' =>
                    $result['requests']
                        ->take(8)
                        ->values(),
            ],
        ]);
    }

    public function export(
        Request $request,
        DashboardExcelService $excelService
    ): StreamedResponse {
        $filters =
            $this->validateFilters(
                $request
            );

        $result =
            $this->buildDashboardData(
                $request,
                $filters
            );

        $summary =
            $this->buildSummary(
                $result['requests']
            );

        return $excelService->download(
            $result['requests'],
            $summary,
            [
                'service' =>
                    $result['service'],

                'status' =>
                    $result['status'],

                'start_date' =>
                    $result['start_date']
                        ->toDateString(),

                'end_date' =>
                    $result['end_date']
                        ->toDateString(),

                'group_by' =>
                    $result['group_by'],
            ]
        );
    }

    private function validateFilters(
        Request $request
    ): array {
        return $request->validate([
            'service' => [
                'nullable',
                Rule::in(
                    self::SERVICES
                ),
            ],

            'status' => [
                'nullable',
                Rule::in(
                    self::STATUSES
                ),
            ],

            'start_date' => [
                'nullable',
                'date_format:Y-m-d',
            ],

            'end_date' => [
                'nullable',
                'date_format:Y-m-d',
            ],

            'group_by' => [
                'nullable',
                Rule::in([
                    'day',
                    'month',
                ]),
            ],
        ]);
    }

    private function buildDashboardData(
        Request $request,
        array $filters
    ): array {
        $user =
            $request->user();

        abort_unless(
            $user,
            401,
            'Pengguna tidak terautentikasi.'
        );

        $service =
            $filters['service']
                ?? self::SERVICE_ALL;

        $status =
            $filters['status']
                ?? 'all';

        $startDate =
            isset(
                $filters['start_date']
            )
                ? Carbon::createFromFormat(
                    'Y-m-d',
                    $filters[
                        'start_date'
                    ]
                )->startOfDay()
                : now()
                    ->subDays(29)
                    ->startOfDay();

        $endDate =
            isset(
                $filters['end_date']
            )
                ? Carbon::createFromFormat(
                    'Y-m-d',
                    $filters[
                        'end_date'
                    ]
                )->endOfDay()
                : now()
                    ->endOfDay();

        abort_if(
            $startDate->greaterThan(
                $endDate
            ),
            422,
            'Tanggal mulai tidak boleh melebihi tanggal selesai.'
        );

        $groupBy =
            $filters['group_by']
                ?? $this->resolveGroupBy(
                    $startDate,
                    $endDate
                );

        $availableServices =
            $this->getAvailableServices(
                $user
            );

        if (
            $service !==
                self::SERVICE_ALL &&
            !in_array(
                $service,
                $availableServices,
                true
            )
        ) {
            abort(
                403,
                'Anda tidak memiliki akses ke layanan tersebut.'
            );
        }

        $requests =
            collect();

        if (
            $this->shouldLoadService(
                $service,
                self::SERVICE_MERCHANDISE,
                $availableServices
            )
        ) {
            $requests =
                $requests->merge(
                    $this->loadOrders(
                        $user,
                        $status,
                        $startDate,
                        $endDate
                    )
                );
        }

        if (
            $this->shouldLoadService(
                $service,
                self::SERVICE_HUMAS,
                $availableServices
            )
        ) {
            $requests =
                $requests->merge(
                    $this->loadHumasRequests(
                        $user,
                        $status,
                        $startDate,
                        $endDate
                    )
                );
        }

        if (
            $this->shouldLoadService(
                $service,
                self::SERVICE_BORROWING,
                $availableServices
            )
        ) {
            $requests =
                $requests->merge(
                    $this->loadBorrowRequests(
                        $user,
                        $status,
                        $startDate,
                        $endDate
                    )
                );
        }

        $requests =
            $requests
                ->sortByDesc(
                    function (
                        array $item
                    ): int {
                        try {
                            return Carbon::parse(
                                $item[
                                    'submitted_at'
                                ] ?? null
                            )->timestamp;
                        } catch (
                            \Throwable
                        ) {
                            return 0;
                        }
                    }
                )
                ->values();

        return [
            'service' =>
                $service,

            'status' =>
                $status,

            'start_date' =>
                $startDate,

            'end_date' =>
                $endDate,

            'group_by' =>
                $groupBy,

            'available_services' =>
                $availableServices,

            'requests' =>
                $requests,
        ];
    }

    private function loadOrders(
        mixed $user,
        string $status,
        Carbon $startDate,
        Carbon $endDate
    ): Collection {
        $query =
            Order::query()
                ->with([
                    'user',
                    'items.product',
                    'revisionHistories.requestedBy',
                ]);

        $this->applyOwnershipScope(
            $query,
            $user,
            'approval.merchandise.view'
        );

        $this->applyCommonFilters(
            $query,
            $status,
            $startDate,
            $endDate
        );

        return $query
            ->orderByDesc(
                'submitted_at'
            )
            ->orderByDesc(
                'created_at'
            )
            ->get()
            ->map(
                fn (
                    Order $order
                ): array =>
                    $this->normalizeOrder(
                        $order
                    )
            )
            ->values();
    }

    private function loadHumasRequests(
        mixed $user,
        string $status,
        Carbon $startDate,
        Carbon $endDate
    ): Collection {
        $query =
            HumasServiceRequest::query()
                ->with([
                    'user',
                ]);

        $this->applyOwnershipScope(
            $query,
            $user,
            'approval.humas.view'
        );

        $this->applyCommonFilters(
            $query,
            $status,
            $startDate,
            $endDate
        );

        return $query
            ->orderByDesc(
                'submitted_at'
            )
            ->orderByDesc(
                'created_at'
            )
            ->get()
            ->map(
                fn (
                    HumasServiceRequest $item
                ): array =>
                    $this->normalizeHumasRequest(
                        $item
                    )
            )
            ->values();
    }

    private function loadBorrowRequests(
        mixed $user,
        string $status,
        Carbon $startDate,
        Carbon $endDate
    ): Collection {
        $query =
            BorrowRequest::query()
                ->with([
                    'user',
                    'items.product',
                ]);

        $this->applyOwnershipScope(
            $query,
            $user,
            'approval.borrowing.view'
        );

        $this->applyCommonFilters(
            $query,
            $status,
            $startDate,
            $endDate
        );

        return $query
            ->orderByDesc(
                'submitted_at'
            )
            ->orderByDesc(
                'created_at'
            )
            ->get()
            ->map(
                fn (
                    BorrowRequest $item
                ): array =>
                    $this->normalizeBorrowRequest(
                        $item
                    )
            )
            ->values();
    }

    private function applyOwnershipScope(
        Builder $query,
        mixed $user,
        string $approvalPermission
    ): void {
        if (
            $this->userHasPermission(
                $user,
                $approvalPermission
            )
        ) {
            return;
        }

        $query->where(
            'user_id',
            $user->id
        );
    }

    private function applyCommonFilters(
        Builder $query,
        string $status,
        Carbon $startDate,
        Carbon $endDate
    ): void {
        if (
            $status !==
            'all'
        ) {
            $query->where(
                'status',
                $status
            );
        }

        $query->where(
            function (
                Builder $dateQuery
            ) use (
                $startDate,
                $endDate
            ): void {
                $dateQuery
                    ->whereBetween(
                        'submitted_at',
                        [
                            $startDate,
                            $endDate,
                        ]
                    )
                    ->orWhere(
                        function (
                            Builder $fallback
                        ) use (
                            $startDate,
                            $endDate
                        ): void {
                            $fallback
                                ->whereNull(
                                    'submitted_at'
                                )
                                ->whereBetween(
                                    'created_at',
                                    [
                                        $startDate,
                                        $endDate,
                                    ]
                                );
                        }
                    );
            }
        );
    }

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE MERCHANDISE
    |--------------------------------------------------------------------------
    */

    private function normalizeOrder(
        Order $order
    ): array {
        $items =
            $order->items
                ?? collect();

        $itemsText =
            $items
                ->map(
                    function (
                        $item
                    ): string {
                        $productName =
                            $item->product
                                ?->name
                            ?? 'Produk';

                        $quantity =
                            $item->quantity
                            ?? $item->qty
                            ?? 0;

                        return
                            $productName .
                            ' (' .
                            $quantity .
                            ')';
                    }
                )
                ->filter()
                ->implode(
                    ', '
                );

        $totalQuantity =
            $items->sum(
                fn (
                    $item
                ): int =>
                    (int) (
                        $item->quantity
                        ?? $item->qty
                        ?? 0
                    )
            );

        $revisionHistories =
            $order
                ->revisionHistories
                ?? collect();

        $latestRevision =
            $revisionHistories
                ->first();

        $revisionCount =
            $revisionHistories
                ->count();

        $latestRevisionReason =
            $latestRevision
                ?->revision_note
            ?: '-';

        $latestRevisionAt =
            $this->dateTimeValue(
                $latestRevision
                    ?->requested_at
            );

        $latestResubmittedAt =
            $this->dateTimeValue(
                $latestRevision
                    ?->resubmitted_at
            );

        $revisionHistoryText =
            $revisionHistories
                ->values()
                ->map(
                    function (
                        $history,
                        int $index
                    ): string {
                        $number =
                            $index + 1;

                        $requestedAt =
                            $this->formatDateTimeForText(
                                $history
                                    ->requested_at
                            );

                        $resubmittedAt =
                            $this->formatDateTimeForText(
                                $history
                                    ->resubmitted_at
                            );

                        $adminName =
                            $history
                                ->requestedBy
                                ?->name
                            ?: '-';

                        $note =
                            $history
                                ->revision_note
                            ?: '-';

                        return
                            "Revisi #{$number}: " .
                            "Alasan: {$note} | " .
                            "Diminta: {$requestedAt} | " .
                            "Dikirim ulang: {$resubmittedAt} | " .
                            "Admin: {$adminName}";
                    }
                )
                ->implode(
                    "\n"
                );

        $rejectionReason =
            (
                $order->status ===
                    'rejected' ||
                $order->rejected_at
            )
                ? (
                    $order->admin_note
                    ?: '-'
                )
                : '-';

        return [
            'id' =>
                $order->id,

            'service' =>
                self::SERVICE_MERCHANDISE,

            'service_label' =>
                'Merchandise',

            'code' =>
                $order->order_code
                ?: 'MER-' .
                    $order->id,

            'title' =>
                $order->event_name
                ?: 'Pengajuan Merchandise',

            /*
             * PEMOHON
             */

            'requester' =>
                $order->user?->name
                ?: '-',

            'requester_email' =>
                $order->user?->email
                ?: '-',

            /*
             * PIC MERCHANDISE
             */

            'pic_name' =>
                $order->pic_name
                ?: '-',

            'pic_phone' =>
                $order->pic_phone
                ?: '-',

            /*
             * TAMU / INSTANSI
             */

            'unit' =>
                $order->institution_name
                ?: '-',

            'institution_name' =>
                $order->institution_name
                ?: '-',

            'guest_name' =>
                $order->guest_name
                ?: '-',

            'guest_position' =>
                $order->guest_position
                ?: '-',

            /*
             * TANGGAL
             */

            'activity_date' =>
                $this->dateValue(
                    $order->activity_date
                ),

            'pickup_date' =>
                $this->dateValue(
                    $order->pickup_date
                ),

            'status' =>
                $order->status,

            'submitted_at' =>
                $this->dateTimeValue(
                    $order->submitted_at
                    ?: $order->created_at
                ),

            'revision_requested_at' =>
                $latestRevisionAt
                ?: $this->dateTimeValue(
                    $order
                        ->revision_requested_at
                ),

            'resubmitted_at' =>
                $latestResubmittedAt
                ?: $this->dateTimeValue(
                    $order
                        ->resubmitted_at
                ),

            'approved_at' =>
                $this->dateTimeValue(
                    $order->approved_at
                ),

            'rejected_at' =>
                $this->dateTimeValue(
                    $order->rejected_at
                ),

            'completed_at' =>
                $this->dateTimeValue(
                    $order->completed_at
                ),

            /*
             * CATATAN
             */

            'user_note' =>
                $order->user_note
                ?: '-',

            'admin_note' =>
                $order->admin_note
                ?: '-',

            /*
             * REVISI
             */

            'revision_reason' =>
                $latestRevisionReason,

            'latest_revision_reason' =>
                $latestRevisionReason,

            'latest_revision_at' =>
                $latestRevisionAt,

            'latest_resubmitted_at' =>
                $latestResubmittedAt,

            'revision_count' =>
                $revisionCount,

            'revision_history_text' =>
                $revisionHistoryText
                ?: '-',

            'rejection_reason' =>
                $rejectionReason,

            /*
             * ITEMS
             */

            'items_text' =>
                $itemsText
                ?: '-',

            'total_quantity' =>
                $totalQuantity,

            /*
             * EVIDENCE
             */

            'user_evidence_url' =>
                $order
                    ->proof_file_url,

            'user_reference_link' =>
                $order->proof_link,

            'admin_evidence_url' =>
                null,

            'admin_evidence_name' =>
                null,

            'admin_evidence_mime' =>
                null,

            'admin_result_link' =>
                null,

            'admin_result_note' =>
                null,

            'handover_evidence_url' =>
                null,

            'return_evidence_url' =>
                null,

            'detail_url' =>
                null,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE HUMAS
    |--------------------------------------------------------------------------
    */

    private function normalizeHumasRequest(
        HumasServiceRequest $item
    ): array {
        $rejectionReason =
            (
                $item->status ===
                    'rejected' ||
                $item->rejected_at
            )
                ? (
                    $item->admin_note
                    ?: '-'
                )
                : '-';

        return [
            'id' =>
                $item->id,

            'service' =>
                self::SERVICE_HUMAS,

            'service_label' =>
                'Layanan Humas',

            'code' =>
                $item->service_code
                ?: 'HMS-' .
                    $item->id,

            'title' =>
                $this->coverageLabel(
                    $item->coverage_type
                ),

            'requester' =>
                $item->applicant_name
                ?: $item->user?->name
                ?: '-',

            'requester_email' =>
                $item->user?->email
                ?: '-',

            'unit' =>
                $item
                    ->resolved_unit_name
                ?: '-',

            'pic_whatsapp' =>
                $item->pic_whatsapp
                ?: '-',

            'activity_detail' =>
                $item->activity_detail
                ?: '-',

            'coverage_type' =>
                $item->coverage_type
                ?: '-',

            'coverage_label' =>
                $this->coverageLabel(
                    $item->coverage_type
                ),

            'event_location' =>
                $item->event_location
                ?: '-',

            'event_date' =>
                $this->dateValue(
                    $item->event_date
                ),

            'status' =>
                $item->status,

            'submitted_at' =>
                $this->dateTimeValue(
                    $item->submitted_at
                    ?: $item->created_at
                ),

            'revision_requested_at' =>
                null,

            'resubmitted_at' =>
                null,

            'approved_at' =>
                $this->dateTimeValue(
                    $item->approved_at
                ),

            'rejected_at' =>
                $this->dateTimeValue(
                    $item->rejected_at
                ),

            'completed_at' =>
                $this->dateTimeValue(
                    $item->completed_at
                ),

            'revision_reason' =>
                '-',

            'latest_revision_reason' =>
                '-',

            'latest_revision_at' =>
                null,

            'latest_resubmitted_at' =>
                null,

            'revision_count' =>
                0,

            'revision_history_text' =>
                '-',

            'rejection_reason' =>
                $rejectionReason,

            'admin_note' =>
                $item->admin_note
                ?: '-',

            'admin_result_note' =>
                $item->result_note
                ?: '-',

            /*
             * Lampiran / Brief dari User.
             * Nama database tetap article_draft_*.
             */
            'user_evidence_url' =>
                $item
                    ->article_draft_url,

            'user_evidence_name' =>
                $item
                    ->article_draft_name,

            'user_evidence_mime' =>
                $item
                    ->article_draft_mime,

            'user_reference_link' =>
                $item->reference_link,

            /*
             * Hasil Admin Humas.
             */
            'admin_evidence_url' =>
                $item
                    ->result_file_url,

            'admin_evidence_name' =>
                $item
                    ->result_file_name,

            'admin_evidence_mime' =>
                $item
                    ->result_file_mime,

            'admin_result_link' =>
                $item->result_link,

            'handover_evidence_url' =>
                null,

            'return_evidence_url' =>
                null,

            'items_text' =>
                '-',

            'total_quantity' =>
                0,

            'detail_url' =>
                null,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE BORROWING
    |--------------------------------------------------------------------------
    */

    private function normalizeBorrowRequest(
        BorrowRequest $item
    ): array {
        $items =
            $item->items
                ?? collect();

        $itemsText =
            $items
                ->map(
                    function (
                        $requestItem
                    ): string {
                        $productName =
                            $requestItem
                                ->product
                                ?->name
                            ?? 'Barang';

                        $quantity =
                            $requestItem
                                ->quantity
                            ?? $requestItem
                                ->qty
                            ?? 0;

                        return
                            $productName .
                            ' (' .
                            $quantity .
                            ')';
                    }
                )
                ->filter()
                ->implode(
                    ', '
                );

        $totalQuantity =
            $items->sum(
                fn (
                    $requestItem
                ): int =>
                    (int) (
                        $requestItem
                            ->quantity
                        ?? $requestItem
                            ->qty
                        ?? 0
                    )
            );

        $rejectionReason =
            (
                $item->status ===
                    'rejected' ||
                $item->rejected_at
            )
                ? (
                    $item->admin_note
                    ?: '-'
                )
                : '-';

        return [
            'id' =>
                $item->id,

            'service' =>
                self::SERVICE_BORROWING,

            'service_label' =>
                'Peminjaman SEKPiM',

            'code' =>
                $item->borrow_code
                ?: 'BRW-' .
                    $item->id,

            'title' =>
                $item->purpose
                ?: 'Peminjaman SEKPiM',

            'requester' =>
                $item->user?->name
                ?: '-',

            'requester_email' =>
                $item->user?->email
                ?: '-',

            'unit' =>
                '-',

            'borrow_date' =>
                $this->dateValue(
                    $item->borrow_date
                ),

            'return_date' =>
                $this->dateValue(
                    $item->return_date
                ),

            'status' =>
                $item->status,

            'submitted_at' =>
                $this->dateTimeValue(
                    $item->submitted_at
                    ?: $item->created_at
                ),

            'approved_at' =>
                $this->dateTimeValue(
                    $item->approved_at
                ),

            'rejected_at' =>
                $this->dateTimeValue(
                    $item->rejected_at
                ),

            'borrowed_at' =>
                $this->dateTimeValue(
                    $item->borrowed_at
                ),

            'returned_at' =>
                $this->dateTimeValue(
                    $item->returned_at
                ),

            'completed_at' =>
                $this->dateTimeValue(
                    $item->returned_at
                ),

            'revision_requested_at' =>
                null,

            'resubmitted_at' =>
                null,

            'revision_reason' =>
                '-',

            'latest_revision_reason' =>
                '-',

            'latest_revision_at' =>
                null,

            'latest_resubmitted_at' =>
                null,

            'revision_count' =>
                0,

            'revision_history_text' =>
                '-',

            'rejection_reason' =>
                $rejectionReason,

            'admin_note' =>
                $item->admin_note
                ?: '-',

            'admin_result_note' =>
                '-',

            'items_text' =>
                $itemsText
                ?: '-',

            'total_quantity' =>
                $totalQuantity,

            'user_evidence_url' =>
                null,

            'user_evidence_name' =>
                null,

            'user_evidence_mime' =>
                null,

            'user_reference_link' =>
                null,

            'admin_evidence_url' =>
                null,

            'admin_evidence_name' =>
                null,

            'admin_evidence_mime' =>
                null,

            'admin_result_link' =>
                null,

            /*
             * Evidence Serah Terima
             */

            'handover_evidence_url' =>
                $item
                    ->handover_evidence_url,

            'handover_evidence_name' =>
                $item
                    ->handover_evidence_name,

            'handover_evidence_mime' =>
                $item
                    ->handover_evidence_mime,

            /*
             * Evidence Pengembalian
             */

            'return_evidence_url' =>
                $item
                    ->return_evidence_url,

            'return_evidence_name' =>
                $item
                    ->return_evidence_name,

            'return_evidence_mime' =>
                $item
                    ->return_evidence_mime,

            'detail_url' =>
                null,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | SUMMARY
    |--------------------------------------------------------------------------
    */

    private function buildSummary(
        Collection $requests
    ): array {
        return [
            'total' =>
                $requests->count(),

            'pending' =>
                $requests
                    ->where(
                        'status',
                        'pending'
                    )
                    ->count(),

            'revision' =>
                $requests
                    ->where(
                        'status',
                        'revision'
                    )
                    ->count(),

            'approved' =>
                $requests
                    ->where(
                        'status',
                        'approved'
                    )
                    ->count(),

            'rejected' =>
                $requests
                    ->where(
                        'status',
                        'rejected'
                    )
                    ->count(),

            'borrowed' =>
                $requests
                    ->where(
                        'status',
                        'borrowed'
                    )
                    ->count(),

            'returned' =>
                $requests
                    ->where(
                        'status',
                        'returned'
                    )
                    ->count(),

            'completed' =>
                $requests
                    ->where(
                        'status',
                        'completed'
                    )
                    ->count(),

            'finished' =>
                $requests
                    ->whereIn(
                        'status',
                        [
                            'completed',
                            'returned',
                        ]
                    )
                    ->count(),

            'total_revision_events' =>
                $requests
                    ->sum(
                        fn (
                            array $item
                        ): int =>
                            (int) (
                                $item[
                                    'revision_count'
                                ] ?? 0
                            )
                    ),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | SERVICE DISTRIBUTION
    |--------------------------------------------------------------------------
    */

    private function buildServiceDistribution(
        Collection $requests,
        array $availableServices
    ): array {
        $labels = [
            self::SERVICE_MERCHANDISE =>
                'Merchandise',

            self::SERVICE_HUMAS =>
                'Layanan Humas',

            self::SERVICE_BORROWING =>
                'Peminjaman SEKPiM',
        ];

        return collect(
            $availableServices
        )
            ->map(
                function (
                    string $service
                ) use (
                    $requests,
                    $labels
                ): array {
                    $items =
                        $requests
                            ->where(
                                'service',
                                $service
                            );

                    return [
                        'service' =>
                            $service,

                        'label' =>
                            $labels[
                                $service
                            ],

                        'total' =>
                            $items
                                ->count(),

                        'pending' =>
                            $items
                                ->where(
                                    'status',
                                    'pending'
                                )
                                ->count(),

                        'revision' =>
                            $items
                                ->where(
                                    'status',
                                    'revision'
                                )
                                ->count(),

                        'approved' =>
                            $items
                                ->where(
                                    'status',
                                    'approved'
                                )
                                ->count(),

                        'rejected' =>
                            $items
                                ->where(
                                    'status',
                                    'rejected'
                                )
                                ->count(),

                        'borrowed' =>
                            $items
                                ->where(
                                    'status',
                                    'borrowed'
                                )
                                ->count(),

                        'returned' =>
                            $items
                                ->where(
                                    'status',
                                    'returned'
                                )
                                ->count(),

                        'completed' =>
                            $items
                                ->where(
                                    'status',
                                    'completed'
                                )
                                ->count(),

                        'finished' =>
                            $items
                                ->whereIn(
                                    'status',
                                    [
                                        'completed',
                                        'returned',
                                    ]
                                )
                                ->count(),
                    ];
                }
            )
            ->values()
            ->all();
    }

    /*
    |--------------------------------------------------------------------------
    | STATUS DISTRIBUTION
    |--------------------------------------------------------------------------
    */

    private function buildStatusDistribution(
        Collection $requests
    ): array {
        $statuses = [
            'pending' =>
                'Menunggu',

            'revision' =>
                'Perlu Revisi',

            'approved' =>
                'Disetujui',

            'rejected' =>
                'Ditolak',

            'borrowed' =>
                'Dipinjam',

            'returned' =>
                'Dikembalikan',

            'completed' =>
                'Selesai',
        ];

        return collect(
            $statuses
        )
            ->map(
                fn (
                    string $label,
                    string $status
                ): array => [
                    'status' =>
                        $status,

                    'label' =>
                        $label,

                    'total' =>
                        $requests
                            ->where(
                                'status',
                                $status
                            )
                            ->count(),
                ]
            )
            ->values()
            ->all();
    }

    /*
    |--------------------------------------------------------------------------
    | TREND
    |--------------------------------------------------------------------------
    */

    private function buildTrend(
        Collection $requests,
        Carbon $startDate,
        Carbon $endDate,
        string $groupBy
    ): array {
        if (
            $groupBy ===
            'month'
        ) {
            return $this
                ->buildMonthlyTrend(
                    $requests,
                    $startDate,
                    $endDate
                );
        }

        return $this
            ->buildDailyTrend(
                $requests,
                $startDate,
                $endDate
            );
    }

    private function buildDailyTrend(
        Collection $requests,
        Carbon $startDate,
        Carbon $endDate
    ): array {
        $period =
            CarbonPeriod::create(
                $startDate
                    ->copy()
                    ->startOfDay(),
                '1 day',
                $endDate
                    ->copy()
                    ->startOfDay()
            );

        return collect(
            $period
        )
            ->map(
                function (
                    Carbon $date
                ) use (
                    $requests
                ): array {
                    $key =
                        $date->format(
                            'Y-m-d'
                        );

                    $items =
                        $requests
                            ->filter(
                                function (
                                    array $item
                                ) use (
                                    $key
                                ): bool {
                                    try {
                                        return Carbon::parse(
                                            $item[
                                                'submitted_at'
                                            ]
                                        )
                                            ->format(
                                                'Y-m-d'
                                            ) ===
                                            $key;
                                    } catch (
                                        \Throwable
                                    ) {
                                        return false;
                                    }
                                }
                            );

                    return $this
                        ->trendRow(
                            $key,
                            $date
                                ->locale(
                                    'id'
                                )
                                ->translatedFormat(
                                    'd M'
                                ),
                            $items
                        );
                }
            )
            ->values()
            ->all();
    }

    private function buildMonthlyTrend(
        Collection $requests,
        Carbon $startDate,
        Carbon $endDate
    ): array {
        $cursor =
            $startDate
                ->copy()
                ->startOfMonth();

        $lastMonth =
            $endDate
                ->copy()
                ->startOfMonth();

        $rows = [];

        while (
            $cursor
                ->lessThanOrEqualTo(
                    $lastMonth
                )
        ) {
            $key =
                $cursor
                    ->format(
                        'Y-m'
                    );

            $items =
                $requests
                    ->filter(
                        function (
                            array $item
                        ) use (
                            $key
                        ): bool {
                            try {
                                return Carbon::parse(
                                    $item[
                                        'submitted_at'
                                    ]
                                )
                                    ->format(
                                        'Y-m'
                                    ) ===
                                    $key;
                            } catch (
                                \Throwable
                            ) {
                                return false;
                            }
                        }
                    );

            $rows[] =
                $this->trendRow(
                    $key,
                    $cursor
                        ->locale(
                            'id'
                        )
                        ->translatedFormat(
                            'M Y'
                        ),
                    $items
                );

            $cursor
                ->addMonth();
        }

        return $rows;
    }

    private function trendRow(
        string $period,
        string $label,
        Collection $items
    ): array {
        return [
            'period' =>
                $period,

            'label' =>
                $label,

            'merchandise' =>
                $items
                    ->where(
                        'service',
                        self::SERVICE_MERCHANDISE
                    )
                    ->count(),

            'humas' =>
                $items
                    ->where(
                        'service',
                        self::SERVICE_HUMAS
                    )
                    ->count(),

            'borrowing' =>
                $items
                    ->where(
                        'service',
                        self::SERVICE_BORROWING
                    )
                    ->count(),

            'total' =>
                $items
                    ->count(),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | PERMISSION
    |--------------------------------------------------------------------------
    */

    private function getAvailableServices(
        mixed $user
    ): array {
        $services = [];

        if (
            $this->userHasAnyPermission(
                $user,
                [
                    'request.history.view',
                    'approval.merchandise.view',
                ]
            )
        ) {
            $services[] =
                self::SERVICE_MERCHANDISE;
        }

        if (
            $this->userHasAnyPermission(
                $user,
                [
                    'request.history.view',
                    'approval.humas.view',
                ]
            )
        ) {
            $services[] =
                self::SERVICE_HUMAS;
        }

        if (
            $this->userHasAnyPermission(
                $user,
                [
                    'request.history.view',
                    'approval.borrowing.view',
                ]
            )
        ) {
            $services[] =
                self::SERVICE_BORROWING;
        }

        return array_values(
            array_unique(
                $services
            )
        );
    }

    private function shouldLoadService(
        string $selectedService,
        string $targetService,
        array $availableServices
    ): bool {
        return in_array(
            $targetService,
            $availableServices,
            true
        ) &&
            (
                $selectedService ===
                    self::SERVICE_ALL ||
                $selectedService ===
                    $targetService
            );
    }

    private function userHasAnyPermission(
        mixed $user,
        array $permissions
    ): bool {
        if (
            $user->role ===
            'superadmin'
        ) {
            return true;
        }

        foreach (
            $permissions as
            $permission
        ) {
            if (
                $this->userHasPermission(
                    $user,
                    $permission
                )
            ) {
                return true;
            }
        }

        return false;
    }

    private function userHasPermission(
        mixed $user,
        string $permission
    ): bool {
        if (
            $user->role ===
            'superadmin'
        ) {
            return true;
        }

        if (
            method_exists(
                $user,
                'hasPermission'
            )
        ) {
            return (bool)
                $user
                    ->hasPermission(
                        $permission
                    );
        }

        if (
            method_exists(
                $user,
                'hasPermissionTo'
            )
        ) {
            return (bool)
                $user
                    ->hasPermissionTo(
                        $permission
                    );
        }

        $permissions =
            $this->normalizePermissions(
                $user->permissions
                    ?? []
            );

        return in_array(
            $permission,
            $permissions,
            true
        );
    }

    private function normalizePermissions(
        mixed $permissions
    ): array {
        if (
            is_string(
                $permissions
            )
        ) {
            $decoded =
                json_decode(
                    $permissions,
                    true
                );

            if (
                json_last_error() ===
                    JSON_ERROR_NONE &&
                is_array(
                    $decoded
                )
            ) {
                $permissions =
                    $decoded;
            } else {
                $permissions =
                    preg_split(
                        '/[,;|]/',
                        $permissions
                    ) ?: [];
            }
        }

        if (
            !is_array(
                $permissions
            ) &&
            !(
                $permissions instanceof
                \Traversable
            )
        ) {
            return [];
        }

        return collect(
            $permissions
        )
            ->flatten()
            ->map(
                fn (
                    mixed $permission
                ): string =>
                    trim(
                        (string)
                        $permission
                    )
            )
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /*
    |--------------------------------------------------------------------------
    | HELPERS
    |--------------------------------------------------------------------------
    */

    private function resolveGroupBy(
        Carbon $startDate,
        Carbon $endDate
    ): string {
        return $startDate
            ->diffInDays(
                $endDate
            ) > 62
                ? 'month'
                : 'day';
    }

    /*
     * Mapping nama layanan Humas.
     *
     * Value baru:
     * - REQUEST DESIGN INSTAGRAM
     * - DOKUMENTASI
     * - PUBLIKASI WEBSITE
     * - PUBLIKASI MEDIA MASSA
     * - YOUTUBE
     * - VIDEO REELS
     *
     * SOCIAL MEDIA hanya dipertahankan untuk data lama.
     */
    private function coverageLabel(
        ?string $coverageType
    ): string {
        if (
            !$coverageType
        ) {
            return 'Layanan Humas';
        }

        $parts =
            preg_split(
                '/[;,]/',
                $coverageType
            ) ?: [
                $coverageType,
            ];

        $labels =
            collect(
                $parts
            )
                ->map(
                    function (
                        string $part
                    ): string {
                        $part =
                            trim(
                                $part
                            );

                        return match (
                            strtoupper(
                                $part
                            )
                        ) {
                            'REQUEST DESIGN INSTAGRAM' =>
                                'Request Design Instagram',

                            'DOKUMENTASI' =>
                                'Dokumentasi',

                            'PUBLIKASI WEBSITE' =>
                                'Publikasi Website',

                            'PUBLIKASI MEDIA MASSA' =>
                                'Publikasi Media Massa',

                            'YOUTUBE' =>
                                'YouTube',

                            'VIDEO REELS' =>
                                'Video Reels',

                            /*
                             * Legacy data.
                             */
                            'SOCIAL MEDIA' =>
                                'Social Media (Data Lama)',

                            default =>
                                $part,
                        };
                    }
                )
                ->filter()
                ->values();

        return $labels
            ->implode(
                '; '
            );
    }

    private function dateValue(
        mixed $value
    ): ?string {
        if (
            !$value
        ) {
            return null;
        }

        try {
            return Carbon::parse(
                $value
            )->format(
                'Y-m-d'
            );
        } catch (
            \Throwable
        ) {
            return null;
        }
    }

    private function dateTimeValue(
        mixed $value
    ): ?string {
        if (
            !$value
        ) {
            return null;
        }

        try {
            return Carbon::parse(
                $value
            )->toISOString();
        } catch (
            \Throwable
        ) {
            return null;
        }
    }

    private function formatDateTimeForText(
        mixed $value
    ): string {
        if (
            !$value
        ) {
            return '-';
        }

        try {
            return Carbon::parse(
                $value
            )
                ->locale(
                    'id'
                )
                ->translatedFormat(
                    'd M Y H:i'
                );
        } catch (
            \Throwable
        ) {
            return '-';
        }
    }
}