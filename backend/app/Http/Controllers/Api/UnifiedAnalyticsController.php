<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BorrowRequest;
use App\Models\EventSchedule;
use App\Models\EventScheduleRequest;
use App\Models\HumasServiceRequest;
use App\Models\MeetingRecord;
use App\Models\Order;
use App\Services\UnifiedAnalyticsExcelService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UnifiedAnalyticsController extends Controller
{
    private const ADMIN_ROLES = [
        'admin',
        'admin_humas',
        'admin_sekpim',
        'superadmin',
    ];

    private const DIRECTORATES = [
        'direktorat',
        'direktur',
        'wakil_direktur_1',
        'wakil_direktur_2',
    ];

    private const LABELS = [
        'merchandise' => 'Merchandise HUMAS',
        'humas' => 'Liputan HUMAS',
        'borrow' => 'Peminjaman SEKPiM',
        'asset_request' => 'Request Aset SEKPiM',
        'schedule_request' => 'Pengajuan Jadwal',
        'agenda' => 'Agenda Direktorat',
        'meeting' => 'Rapat Terlaksana',
    ];

    private function authorizeDashboard(Request $request): void
    {
        $user = $request->user();

        abort_unless(
            $user &&
            in_array($user->role, self::ADMIN_ROLES, true) &&
            $user->hasPermission('dashboard.view'),
            403,
            'Anda tidak memiliki izin melihat analytics terintegrasi.'
        );
    }

    private function authorizeMeeting(Request $request): void
    {
        $this->authorizeDashboard($request);
    }

    private function period(Request $request): array
    {
        $today = CarbonImmutable::now('Asia/Jakarta');

        $validated = $request->validate([
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => [
                'nullable',
                'date_format:Y-m-d',
                'after_or_equal:start_date',
            ],
        ]);

        $start = CarbonImmutable::parse(
            $validated['start_date'] ??
            $today->startOfYear()->toDateString(),
            'Asia/Jakarta'
        )->startOfDay();

        $end = CarbonImmutable::parse(
            $validated['end_date'] ?? $today->toDateString(),
            'Asia/Jakarta'
        )->endOfDay();

        if ($start->year !== $end->year) {
            throw ValidationException::withMessages([
                'end_date' =>
                    'Untuk analisis YoY, pilih periode dalam satu tahun yang sama.',
            ]);
        }

        if ($start->greaterThan($end)) {
            throw ValidationException::withMessages([
                'end_date' => 'Tanggal selesai harus setelah tanggal mulai.',
            ]);
        }

        return [$start, $end];
    }

    private function permittedServices($user): array
    {
        $services = [];

        if ($user->hasPermission('approval.merchandise.view')) {
            $services[] = 'merchandise';
        }

        if ($user->hasPermission('approval.humas.view')) {
            $services[] = 'humas';
        }

        if ($user->hasPermission('approval.borrowing.view')) {
            $services[] = 'borrow';
            $services[] = 'asset_request';
        }

        // Kalender Direktorat dapat dikelola oleh role admin.
        $services[] = 'schedule_request';
        $services[] = 'agenda';
        $services[] = 'meeting';

        return $services;
    }

    private function dataset(
        $user,
        CarbonImmutable $start,
        CarbonImmutable $end
    ): array {
        $allowed = $this->permittedServices($user);
        $rows = collect();

        $between = [
            $start->startOfDay(),
            $end->endOfDay(),
        ];

        $append = function (
            string $service,
            $records,
            string $codeField,
            string $nameField,
            string $dateField = 'submitted_at'
        ) use ($rows): void {
            foreach ($records as $record) {
                $date = $record->{$dateField}
                    ?: $record->created_at;

                $rows->push([
                    'service' => $service,
                    'label' => self::LABELS[$service],
                    'id' => $record->id,
                    'code' => (string) ($record->{$codeField} ?? ''),
                    'name' => (string) ($record->{$nameField} ?? ''),
                    'status' => (string) ($record->status ?? ''),
                    'date' => $date
                        ? substr((string) $date, 0, 10)
                        : '',
                ]);
            }
        };

        if (in_array('merchandise', $allowed, true)) {
            $append(
                'merchandise',
                Order::query()
                    ->whereBetween(
                        DB::raw('COALESCE(submitted_at, created_at)'),
                        $between
                    )
                    ->get(),
                'order_code',
                'event_name'
            );
        }

        if (in_array('humas', $allowed, true)) {
            $append(
                'humas',
                HumasServiceRequest::query()
                    ->whereBetween(
                        DB::raw('COALESCE(submitted_at, created_at)'),
                        $between
                    )
                    ->get(),
                'service_code',
                'activity_detail'
            );
        }

        if (
            in_array('borrow', $allowed, true) ||
            in_array('asset_request', $allowed, true)
        ) {
            $records = BorrowRequest::query()
                ->whereBetween(
                    DB::raw('COALESCE(submitted_at, created_at)'),
                    $between
                )
                ->get();

            foreach ($records as $record) {
                $service = $record->request_type === 'asset_request'
                    ? 'asset_request'
                    : 'borrow';

                $rows->push([
                    'service' => $service,
                    'label' => self::LABELS[$service],
                    'id' => $record->id,
                    'code' => $record->borrow_code ?? '',
                    'name' => $record->purpose ?? '',
                    'status' => $record->status ?? '',
                    'date' => (
                        $record->submitted_at ?: $record->created_at
                    )?->toDateString() ?? '',
                ]);
            }
        }

        $scheduleRequests = EventScheduleRequest::query()
            ->whereBetween('created_at', $between)
            ->get();

        $append(
            'schedule_request',
            $scheduleRequests,
            'id',
            'title',
            'created_at'
        );

        $agendas = EventSchedule::query()
            ->whereBetween('event_date', [
                $start->toDateString(),
                $end->toDateString(),
            ])
            ->orderBy('event_date')
            ->get();

        foreach ($agendas as $agenda) {
            $rows->push([
                'service' => 'agenda',
                'label' => self::LABELS['agenda'],
                'id' => $agenda->id,
                'code' => (string) $agenda->id,
                'name' => $agenda->title,
                'status' => 'scheduled',
                'date' => $agenda->event_date->toDateString(),
            ]);
        }

        $meetings = MeetingRecord::query()
            ->whereBetween('meeting_date', [
                $start->toDateString(),
                $end->toDateString(),
            ])
            ->orderByDesc('meeting_date')
            ->orderByDesc('id')
            ->get();

        foreach ($meetings as $meeting) {
            // Hanya rapat yang benar-benar terlaksana
            // masuk indikator jumlah rapat terlaksana.
            if ($meeting->realization_status !== 'held') {
                continue;
            }

            $rows->push([
                'service' => 'meeting',
                'label' => self::LABELS['meeting'],
                'id' => $meeting->id,
                'code' => (string) $meeting->id,
                'name' => $meeting->title,
                'status' => 'held',
                'date' => $meeting->meeting_date->toDateString(),
            ]);
        }

        return [
            'rows' => $rows,
            'agendas' => $agendas,
            'meetings' => $meetings,
        ];
    }

    private function countByService(Collection $rows): array
    {
        $counts = array_fill_keys(
            array_keys(self::LABELS),
            0
        );

        foreach ($rows as $row) {
            $service = $row['service'];

            if (array_key_exists($service, $counts)) {
                $counts[$service]++;
            }
        }

        return $counts;
    }

    private function analyticsData(Request $request): array
    {
        [$start, $end] = $this->period($request);
        $user = $request->user();

        $current = $this->dataset($user, $start, $end);
        $previous = $this->dataset(
            $user,
            $start->subYear(),
            $end->subYear()
        );

        $currentCounts = $this->countByService($current['rows']);
        $previousCounts = $this->countByService($previous['rows']);

        $allowed = $this->permittedServices($user);
        $yoy = [];

        foreach ($allowed as $service) {
            $now = $currentCounts[$service] ?? 0;
            $before = $previousCounts[$service] ?? 0;

            $yoy[] = [
                'service' => $service,
                'label' => self::LABELS[$service],
                'current' => $now,
                'previous' => $before,
                'difference' => $now - $before,
                'growth_percent' => $before > 0
                    ? round(
                        (($now - $before) / $before) * 100,
                        2
                    )
                    : null,
            ];
        }

        $requestServices = [
            'merchandise',
            'humas',
            'borrow',
            'asset_request',
            'schedule_request',
        ];

        $requestRows = $current['rows']->filter(
            fn (array $row): bool =>
                in_array($row['service'], $requestServices, true)
        );

        $summary = [
            'total_requests' => $requestRows->count(),
            'pending' => $requestRows
                ->where('status', 'pending')
                ->count(),
            'processed' => $requestRows
                ->whereIn('status', [
                    'approved',
                    'rejected',
                    'completed',
                    'borrowed',
                    'returned',
                ])
                ->count(),
            'agendas' => $currentCounts['agenda'],
            'meetings_held' => $currentCounts['meeting'],
            'meetings_postponed' => $current['meetings']
                ->where('realization_status', 'postponed')
                ->count(),
            'meetings_cancelled' => $current['meetings']
                ->where('realization_status', 'cancelled')
                ->count(),
        ];

        $trend = [];

        for ($month = 1; $month <= 12; $month++) {
            $trend[] = [
                'month' => $month,
                'label' => CarbonImmutable::create(
                    2026, $month, 1
                )->locale('id')->translatedFormat('M'),
                'current' => $current['rows']->filter(
                    fn (array $row): bool =>
                        (int) substr($row['date'], 5, 2) === $month
                )->count(),
                'previous' => $previous['rows']->filter(
                    fn (array $row): bool =>
                        (int) substr($row['date'], 5, 2) === $month
                )->count(),
            ];
        }

        $availableAgendas = $current['agendas']
            ->where('agenda_type', 'Rapat')
            ->values()
            ->map(fn ($agenda): array => [
                'id' => $agenda->id,
                'title' => $agenda->title,
                'directorate' => $agenda->directorate,
                'event_date' => $agenda->event_date->toDateString(),
            ])
            ->all();

        return [
            'period' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
                'previous_start' => $start->subYear()->toDateString(),
                'previous_end' => $end->subYear()->toDateString(),
                'current_year' => $start->year,
                'previous_year' => $start->year - 1,
            ],
            'available_services' => $allowed,
            'summary' => $summary,
            'yoy' => $yoy,
            'trend' => $trend,
            'recent_requests' => $requestRows
                ->sortByDesc('date')
                ->take(10)
                ->values()
                ->all(),
            'meeting_records' => $current['meetings']
                ->take(100)
                ->values()
                ->all(),
            'available_agendas' => $availableAgendas,
            'export_data' => [
                'current' => $current,
                'previous' => $previous,
            ],
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeDashboard($request);

        $data = $this->analyticsData($request);
        unset($data['export_data']);

        return response()->json([
            'success' => true,
            'message' => 'Analytics seluruh layanan berhasil dimuat.',
            'data' => $data,
        ]);
    }

    public function export(
        Request $request,
        UnifiedAnalyticsExcelService $excel
    ): StreamedResponse {
        $this->authorizeDashboard($request);

        return $excel->download(
            $this->analyticsData($request)
        );
    }

    private function meetingRules(): array
    {
        return [
            'event_schedule_id' => [
                'nullable',
                'integer',
                'exists:event_schedules,id',
            ],
            'title' => ['required', 'string', 'min:3', 'max:255'],
            'directorate' => [
                'required',
                Rule::in(self::DIRECTORATES),
            ],
            'meeting_date' => ['required', 'date_format:Y-m-d'],
            'realization_status' => [
                'required',
                Rule::in(['held', 'postponed', 'cancelled']),
            ],
            'participants_count' => [
                'required',
                'integer',
                'min:0',
            ],
            'notes' => ['nullable', 'string', 'max:10000'],
            'decisions' => ['nullable', 'string', 'max:10000'],
            'follow_up' => ['nullable', 'string', 'max:10000'],
            'follow_up_pic' => [
                'nullable',
                'string',
                'max:255',
            ],
            'follow_up_due_date' => [
                'nullable',
                'date_format:Y-m-d',
            ],
        ];
    }

    private function normalizeMeetingPayload(
        array $validated,
        ?MeetingRecord $existing = null
    ): array {
        $scheduleId = $validated['event_schedule_id'] ?? null;

        if ($scheduleId) {
            $agenda = EventSchedule::findOrFail($scheduleId);

            if ($agenda->agenda_type !== 'Rapat') {
                throw ValidationException::withMessages([
                    'event_schedule_id' =>
                        'Agenda yang dipilih bukan kategori Rapat.',
                ]);
            }

            $duplicate = MeetingRecord::query()
                ->where('event_schedule_id', $agenda->id)
                ->when(
                    $existing,
                    fn ($query) => $query->where(
                        'id',
                        '!=',
                        $existing->id
                    )
                )
                ->exists();

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'event_schedule_id' =>
                        'Agenda tersebut sudah memiliki catatan rapat.',
                ]);
            }

            $validated['title'] = $agenda->title;
            $validated['directorate'] = $agenda->directorate;
            $validated['meeting_date'] =
                $agenda->event_date->toDateString();
        }

        return $validated;
    }

    public function storeMeeting(Request $request): JsonResponse
    {
        $this->authorizeMeeting($request);

        $validated = $this->normalizeMeetingPayload(
            $request->validate($this->meetingRules())
        );

        $record = MeetingRecord::create([
            ...$validated,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Catatan rapat berhasil disimpan.',
            'data' => $record,
        ], 201);
    }

    public function updateMeeting(
        Request $request,
        MeetingRecord $meetingRecord
    ): JsonResponse {
        $this->authorizeMeeting($request);

        $validated = $this->normalizeMeetingPayload(
            $request->validate($this->meetingRules()),
            $meetingRecord
        );

        $meetingRecord->update([
            ...$validated,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Catatan rapat berhasil diperbarui.',
            'data' => $meetingRecord->fresh(),
        ]);
    }

    public function destroyMeeting(
        Request $request,
        MeetingRecord $meetingRecord
    ): JsonResponse {
        $this->authorizeMeeting($request);

        $meetingRecord->delete();

        return response()->json([
            'success' => true,
            'message' => 'Catatan rapat berhasil dihapus.',
            'data' => null,
        ]);
    }
}
