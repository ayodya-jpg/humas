<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BorrowRequest;
use App\Models\EventSchedule;
use App\Models\EventScheduleRequest;
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

    private const SERVICE_ASSET_REQUEST = 'asset_request';

    private const SERVICE_SCHEDULE_REQUEST = 'schedule_request';

    private const SERVICE_AGENDA = 'agenda';

    private const SERVICES = [
        self::SERVICE_ALL,
        self::SERVICE_MERCHANDISE,
        self::SERVICE_HUMAS,
        self::SERVICE_BORROWING,
        self::SERVICE_ASSET_REQUEST,
        self::SERVICE_SCHEDULE_REQUEST,
        self::SERVICE_AGENDA,
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
                        $result['available_services'],
                        $result['agendas']
                    ),

                'status_distribution' =>
                    $this->buildStatusDistribution(
                        $result['requests']
                    ),

                'trend' =>
                    $this->augmentTrend(
                        $this->buildTrend(
                            $result['requests'],
                            $result['start_date'],
                            $result['end_date'],
                            $result['group_by']
                        ),
                        $result['requests'],
                        $result['agendas'],
                        $result['group_by']
                    ),

                'agenda_summary' =>
                    $this->buildAgendaSummary($result['agendas']),

                'meeting_summary' =>
                    $this->buildMeetingSummary(
                        $request->user(), $result['start_date'], $result['end_date']
                    ),

                'year_on_year' =>
                    $this->buildYearOnYear($request, $result),

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

        $report = [
            'agendas' => $result['agendas'],
            'meeting_records' => $this->loadMeetingRecords(
                $request->user(), $result['start_date'], $result['end_date']
            ),
            'year_on_year' => $this->buildYearOnYear($request, $result),
            'agenda_summary' => $this->buildAgendaSummary($result['agendas']),
        ];

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
            ],
            $report
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
            ) ||
            $this->shouldLoadService(
                $service,
                self::SERVICE_ASSET_REQUEST,
                $availableServices
            )
        ) {
            $requests =
                $requests->merge(
                    $this->loadBorrowRequests(
                        $user,
                        $status,
                        $startDate,
                        $endDate,
                        $service
                    )
                );
        }

        if ($this->shouldLoadService(
            $service,
            self::SERVICE_SCHEDULE_REQUEST,
            $availableServices
        )) {
            $requests = $requests->merge(
                $this->loadScheduleRequests(
                    $user, $status, $startDate, $endDate
                )
            );
        }

        $agendas = $this->shouldLoadService(
            $service,
            self::SERVICE_AGENDA,
            $availableServices
        ) ? $this->loadAgendas($user, $startDate, $endDate) : collect();

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

            'agendas' => $agendas,
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
        Carbon $endDate,
        string $service
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

        if ($service === self::SERVICE_ASSET_REQUEST) {
            $query->where('request_type', 'asset_request');
        } elseif ($service === self::SERVICE_BORROWING) {
            $query->where(function ($builder) {
                $builder->where('request_type', 'borrow')
                    ->orWhereNull('request_type');
            });
        }

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
                $item->request_type === 'asset_request'
                    ? self::SERVICE_ASSET_REQUEST
                    : self::SERVICE_BORROWING,

            'service_label' =>
                $item->request_type === 'asset_request'
                    ? 'Request Aset SEKPiM'
                    : 'Peminjaman SEKPiM',

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
                    $item->request_type === 'asset_request'
                        ? $item->completed_at
                        : $item->returned_at
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
        array $availableServices,
        Collection $agendas
    ): array {
        $labels = [
            self::SERVICE_MERCHANDISE =>
                'Merchandise',

            self::SERVICE_HUMAS =>
                'Layanan Humas',

            self::SERVICE_BORROWING =>
                'Peminjaman SEKPiM',
            self::SERVICE_ASSET_REQUEST =>
                'Request Aset SEKPiM',
            self::SERVICE_SCHEDULE_REQUEST =>
                'Pengajuan Jadwal Direktorat',
            self::SERVICE_AGENDA =>
                'Agenda Direktorat',
        ];

        return collect(
            $availableServices
        )
            ->map(
                function (
                    string $service
                ) use (
                    $requests,
                    $labels,
                    $agendas
                ): array {
                    $items = $requests->where('service', $service);
                    $agendaCount = $service === self::SERVICE_AGENDA
                        ? $agendas->count() : 0;

                    return [
                        'service' =>
                            $service,

                        'label' =>
                            $labels[
                                $service
                            ],

                        'total' =>
                            $items->count() + $agendaCount,

                        'scheduled' => $agendaCount,

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
            $services[] = self::SERVICE_BORROWING;
            $services[] = self::SERVICE_ASSET_REQUEST;
        }

        // Pengajuan jadwal resmi dapat dilihat penuh hanya oleh
        // admin dan superadmin, sesuai aturan approval jadwal.
        if (in_array($user->role, ['admin', 'superadmin'], true)) {
            $services[] = self::SERVICE_SCHEDULE_REQUEST;
            $services[] = self::SERVICE_AGENDA;
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

    /** Normalisasi pengajuan jadwal, tetap satu rekaman per permohonan. */
    private function loadScheduleRequests(
        mixed $user, string $status, Carbon $start, Carbon $end
    ): Collection {
        $query = EventScheduleRequest::query()->with('requester')
            ->whereBetween('created_at', [$start, $end]);

        if (!in_array($user->role, ['admin', 'superadmin'], true)) {
            $query->where('requested_by', $user->id);
        }
        if ($status !== 'all') {
            // Pengajuan jadwal hanya memiliki pending, approved, rejected.
            $query->where('status', $status);
        }

        return $query->get()->map(fn ($item): array => [
            'id' => $item->id,
            'service' => self::SERVICE_SCHEDULE_REQUEST,
            'service_label' => 'Pengajuan Jadwal Direktorat',
            'code' => 'JDL-' . $item->id,
            'title' => $item->title,
            'requester' => $item->requester?->name ?? '-',
            'requester_email' => $item->requester?->email ?? '-',
            'unit' => $item->requester_unit ?? '-',
            'pic_name' => $item->pic_name ?? '-',
            'directorate' => $item->directorate,
            'event_date' => $this->dateValue($item->event_date),
            'agenda_type' => $item->agenda_type ?? '-',
            'location' => $item->location ?? '-',
            'status' => $item->status,
            'submitted_at' => $this->dateTimeValue($item->created_at),
            'approved_at' => $item->status === 'approved'
                ? $this->dateTimeValue($item->reviewed_at) : null,
            'rejected_at' => $item->status === 'rejected'
                ? $this->dateTimeValue($item->reviewed_at) : null,
            'completed_at' => null,
            'rejection_reason' => $item->rejection_reason ?? '-',
            'admin_note' => '-',
            'revision_count' => 0,
            'approved_schedule_id' => $item->approved_schedule_id,
            'detail_url' => null,
        ])->values();
    }

    /** Agenda berbeda dari pengajuan jadwal, sehingga tidak masuk total pengajuan. */
    private function loadAgendas(mixed $user, Carbon $start, Carbon $end): Collection
    {
        $query = EventSchedule::query()
            ->whereBetween('event_date', [
                $start->toDateString(), $end->toDateString()
            ]);

        if (!in_array($user->role, ['admin', 'superadmin'], true)) {
            $query->where('is_public', true);
        }

        return $query->orderBy('event_date')->get();
    }

    private function buildAgendaSummary(Collection $agendas): array
    {
        $today = today()->toDateString();
        $directorates = [
            'direktorat' => 'Direktorat Bersama',
            'direktur' => 'Direktur',
            'wakil_direktur_1' => 'Wakil Direktur I',
            'wakil_direktur_2' => 'Wakil Direktur II',
        ];
        return [
            'total' => $agendas->count(),
            'meetings_planned' => $agendas->where('agenda_type', 'Rapat')->count(),
            'upcoming' => $agendas->filter(
                fn ($a) => $a->event_date?->toDateString() >= $today
            )->count(),
            'by_directorate' => collect($directorates)->map(
                fn ($label, $key) => [
                    'key' => $key,
                    'label' => $label,
                    'total' => $agendas->where('directorate', $key)->count(),
                ]
            )->values()->all(),
        ];
    }

    /** Catatan realisasi rapat hanya tersedia untuk admin dan jika tabel ada. */
    private function loadMeetingRecords(mixed $user, Carbon $start, Carbon $end): Collection
    {
        if (!in_array($user->role, ['admin', 'superadmin'], true) ||
            !\Illuminate\Support\Facades\Schema::hasTable('meeting_records')) {
            return collect();
        }
        return \Illuminate\Support\Facades\DB::table('meeting_records')
            ->whereBetween('meeting_date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('meeting_date')->get();
    }

    private function buildMeetingSummary(mixed $user, Carbon $start, Carbon $end): array
    {
        $available = in_array($user->role, ['admin', 'superadmin'], true) &&
            \Illuminate\Support\Facades\Schema::hasTable('meeting_records');
        if (!$available) return ['available' => false, 'held' => null];
        return [
            'available' => true,
            'held' => $this->loadMeetingRecords($user, $start, $end)
                ->where('realization_status', 'held')->count(),
        ];
    }

    /** Menambah seri tanpa mengubah rumus dasar tren pengajuan. */
    private function augmentTrend(
        array $trend, Collection $requests, Collection $agendas, string $groupBy
    ): array {
        return array_map(function (array $point) use ($requests, $agendas, $groupBy): array {
            $key = $point['period'];
            $fmt = $groupBy === 'month' ? 'Y-m' : 'Y-m-d';

            $samePeriod = static function ($value) use ($fmt, $key): bool {
                if (!$value) return false;
                try {
                    return Carbon::parse($value)->format($fmt) === $key;
                } catch (\Throwable) {
                    return false;
                }
            };

            foreach ([self::SERVICE_ASSET_REQUEST, self::SERVICE_SCHEDULE_REQUEST] as $service) {
                $point[$service] = $requests->filter(
                    fn ($item) => $item['service'] === $service &&
                        $samePeriod($item['submitted_at'] ?? null)
                )->count();
            }
            $point['agenda'] = $agendas->filter(
                fn ($item) => $samePeriod($item->event_date)
            )->count();
            return $point;
        }, $trend);
    }

    /** Membandingkan tanggal yang sama tahun lalu; basis nol menghasilkan N/A. */
    private function buildYearOnYear(Request $request, array $current): array
    {
        $previousFilters = [
            'service' => $current['service'],
            'status' => $current['status'],
            'start_date' => $current['start_date']->copy()->subYearNoOverflow()->toDateString(),
            'end_date' => $current['end_date']->copy()->subYearNoOverflow()->toDateString(),
            'group_by' => $current['group_by'],
        ];
        $previous = $this->buildDashboardData($request, $previousFilters);
        $services = [
            self::SERVICE_MERCHANDISE => 'Merchandise',
            self::SERVICE_HUMAS => 'Liputan Humas',
            self::SERVICE_BORROWING => 'Peminjaman SEKPiM',
            self::SERVICE_ASSET_REQUEST => 'Request Aset SEKPiM',
            self::SERVICE_SCHEDULE_REQUEST => 'Pengajuan Jadwal Direktorat',
            self::SERVICE_AGENDA => 'Agenda Direktorat (terjadwal)',
        ];
        $items = [];
        foreach ($services as $key => $label) {
            if (!in_array($key, $current['available_services'], true)) continue;
            $now = $key === self::SERVICE_AGENDA
                ? $current['agendas']->count()
                : $current['requests']->where('service', $key)->count();
            $before = $key === self::SERVICE_AGENDA
                ? $previous['agendas']->count()
                : $previous['requests']->where('service', $key)->count();
            $items[] = [
                'service' => $key, 'label' => $label,
                'current' => $now, 'previous' => $before,
                'difference' => $now - $before,
                'growth_percent' => $before === 0
                    ? null : round(($now - $before) / $before * 100, 2),
            ];
        }
        return [
            'previous_start' => $previousFilters['start_date'],
            'previous_end' => $previousFilters['end_date'],
            'items' => $items,
        ];
    }
}
