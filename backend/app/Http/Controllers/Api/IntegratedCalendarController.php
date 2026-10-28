<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BorrowRequest;
use App\Models\EventSchedule;
use App\Models\EventScheduleRequest;
use App\Models\HumasServiceRequest;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class IntegratedCalendarController extends Controller
{
    private const ADMIN_ROLES = [
        'admin',
        'admin_humas',
        'admin_sekpim',
        'superadmin',
    ];

    private const COLORS = [
        'directorate' => '#7F1D1D',
        'humas' => '#2563EB',
        'borrowing' => '#047857',
    ];

    private function isAdmin(Request $request): bool
    {
        return in_array(
            $request->user()?->role,
            self::ADMIN_ROLES,
            true
        );
    }

    private function permitted(Request $request): void
    {
        abort_unless(
            $request->user() && $this->isAdmin($request),
            403,
            'Kalender terintegrasi hanya dapat diakses admin.'
        );
    }

    private function formatDate($value): ?string
    {
        if (!$value) {
            return null;
        }

        return Carbon::parse($value)->toDateString();
    }

    private function formatTime($value): ?string
    {
        return $value
            ? substr((string) $value, 0, 5)
            : null;
    }

    private function normalizedStatus(?string $status): string
    {
        return match ($status) {
            'approved', 'completed', 'borrowed', 'returned'
                => $status,

            'rejected', 'cancelled', 'canceled'
                => 'rejected',

            default => 'pending',
        };
    }

    private function buildEvent(
        string $source,
        int $sourceId,
        string $title,
        ?string $date,
        ?string $startTime,
        ?string $endTime,
        bool $allDay,
        string $status,
        array $props = []
    ): ?array {
        if (!$date) {
            return null;
        }

        $color = self::COLORS[$source];

        if (!$allDay && (!$startTime || !$endTime)) {
            $allDay = true;
        }

        return [
            'id' => "{$source}-{$sourceId}",
            'title' => $title,
            'start' => $allDay
                ? $date
                : "{$date}T{$startTime}:00",
            'end' => $allDay
                ? null
                : "{$date}T{$endTime}:00",
            'allDay' => $allDay,
            'backgroundColor' => $color,
            'borderColor' => $color,
            'textColor' => '#ffffff',
            'extendedProps' => array_merge([
                'source_type' => $source,
                'source_id' => $sourceId,
                'status' => $this->normalizedStatus($status),
                'event_date' => $date,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'requester_unit' => null,
                'pic_name' => null,
                'location' => null,
                'description' => null,
            ], $props),
        ];
    }

    private function includeDate(
        ?string $date,
        string $start,
        string $end
    ): bool {
        return $date !== null
            && $date >= $start
            && $date <= $end;
    }

    public function index(Request $request)
    {
        $this->permitted($request);

        $validated = $request->validate([
            'start' => ['nullable', 'date'],
            'end' => ['nullable', 'date'],
        ]);

        $start = Carbon::parse(
            $validated['start'] ?? now()->startOfMonth()
        )->toDateString();

        $end = Carbon::parse(
            $validated['end'] ?? now()->endOfMonth()
        )->toDateString();

        if ($end < $start) {
            return response()->json([
                'success' => false,
                'message' => 'Tanggal akhir tidak boleh sebelum tanggal awal.',
            ], 422);
        }

        if (Carbon::parse($start)->diffInDays(Carbon::parse($end)) > 370) {
            return response()->json([
                'success' => false,
                'message' => 'Rentang kalender maksimal 370 hari.',
            ], 422);
        }

        $events = collect();

        /*
        |--------------------------------------------------------------------------
        | 1. KALENDER DIREKTORAT RESMI
        |--------------------------------------------------------------------------
        */

        $directorateEvents = EventSchedule::query()
            ->whereDate('event_date', '>=', $start)
            ->whereDate('event_date', '<=', $end)
            ->get();

        foreach ($directorateEvents as $item) {
            $date = $this->formatDate($item->event_date);

            $event = $this->buildEvent(
                'directorate',
                (int) $item->id,
                $item->title,
                $date,
                $this->formatTime($item->start_time),
                $this->formatTime($item->end_time),
                (bool) $item->all_day,
                'approved',
                [
                    'record_type' => 'approved_event',
                    'requester_unit' => $item->requester_unit,
                    'pic_name' => $item->pic_name,
                    'location' => $item->location,
                    'description' => $item->description,
                    'directorate' => $item->directorate,
                    'agenda_type' => $item->agenda_type,
                    'is_public' => (bool) $item->is_public,
                ]
            );

            if ($event) {
                $events->push($event);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | 2. REQUEST JADWAL DIREKTORAT YANG MASIH PENDING
        |--------------------------------------------------------------------------
        |
        | Approved sudah diwakili event resmi.
        | Rejected tidak masuk kalender utama.
        |
        */

        $pendingRequests = EventScheduleRequest::query()
            ->where('status', 'pending')
            ->whereDate('event_date', '>=', $start)
            ->whereDate('event_date', '<=', $end)
            ->get();

        foreach ($pendingRequests as $item) {
            $event = $this->buildEvent(
                'directorate',
                (int) $item->id,
                '[Pengajuan] ' . $item->title,
                $this->formatDate($item->event_date),
                $this->formatTime($item->start_time),
                $this->formatTime($item->end_time),
                (bool) $item->all_day,
                'pending',
                [
                    'record_type' => 'pending_request',
                    'requester_unit' => $item->requester_unit,
                    'pic_name' => $item->pic_name,
                    'location' => $item->location,
                    'description' => $item->description,
                    'directorate' => $item->directorate,
                    'agenda_type' => $item->agenda_type,
                ]
            );

            if ($event) {
                $event['id'] = 'directorate-request-' . $item->id;
                $events->push($event);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | 3. PENGAJUAN HUMAS
        |--------------------------------------------------------------------------
        */

        $humasRequests = HumasServiceRequest::query()
            ->whereDate('event_date', '>=', $start)
            ->whereDate('event_date', '<=', $end)
            ->whereNotIn('status', [
                'rejected',
                'cancelled',
                'canceled',
            ])
            ->get();

        foreach ($humasRequests as $item) {
            $unit = $item->unit_name === 'Lainnya'
                ? $item->other_unit_name
                : $item->unit_name;

            $event = $this->buildEvent(
                'humas',
                (int) $item->id,
                'HUMAS: ' . ($item->coverage_type ?: 'Kegiatan'),
                $this->formatDate($item->event_date),
                null,
                null,
                true,
                $item->status ?? 'pending',
                [
                    'record_type' => 'service_request',
                    'service_code' => $item->service_code,
                    'requester_unit' => $unit,
                    'pic_name' => $item->applicant_name,
                    'pic_whatsapp' => $item->pic_whatsapp,
                    'location' => $item->event_location,
                    'description' => $item->activity_detail,
                    'coverage_type' => $item->coverage_type,
                ]
            );

            if ($event) {
                $events->push($event);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | 4. PENGAJUAN PEMINJAMAN
        |--------------------------------------------------------------------------
        |
        | Jadwal ditampilkan sebagai periode penggunaan barang.
        | Tidak dianggap bentrok dengan jadwal pimpinan.
        |
        */

        $borrowRequests = BorrowRequest::query()
            ->whereDate('borrow_date', '<=', $end)
            ->where(function ($query) use ($start) {
                $query->whereDate('return_date', '>=', $start)
                    ->orWhereNull('return_date');
            })
            ->whereNotIn('status', [
                'rejected',
                'cancelled',
                'canceled',
            ])
            ->get();

        foreach ($borrowRequests as $item) {
            $borrowDate = $this->formatDate($item->borrow_date);

            $returnDate = $this->formatDate(
                $item->return_date ?: $item->borrow_date
            );

            if (!$borrowDate) {
                continue;
            }

            if ($returnDate < $borrowDate) {
                $returnDate = $borrowDate;
            }

            $exclusiveEnd = Carbon::parse($returnDate)
                ->addDay()
                ->toDateString();

            $events->push([
                'id' => 'borrowing-' . $item->id,
                'title' => 'Peminjaman: ' .
                    ($item->purpose ?: $item->borrow_code ?: 'Barang'),
                'start' => $borrowDate,
                'end' => $exclusiveEnd,
                'allDay' => true,
                'backgroundColor' => self::COLORS['borrowing'],
                'borderColor' => self::COLORS['borrowing'],
                'textColor' => '#ffffff',
                'extendedProps' => [
                    'source_type' => 'borrowing',
                    'source_id' => (int) $item->id,
                    'record_type' => 'service_request',
                    'status' => $this->normalizedStatus($item->status),
                    'service_code' => $item->borrow_code,
                    'event_date' => $borrowDate,
                    'return_date' => $returnDate,
                    'start_time' => null,
                    'end_time' => null,
                    'requester_unit' => null,
                    'pic_name' => null,
                    'location' => null,
                    'description' => $item->purpose,
                ],
            ]);
        }

        $results = $events
            ->sortBy('start')
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Kalender terintegrasi berhasil dimuat.',
            'data' => [
                'events' => $results,
                'summary' => [
                    'total' => $results->count(),
                    'directorate' => $results->where(
                        'extendedProps.source_type',
                        'directorate'
                    )->count(),
                    'humas' => $results->where(
                        'extendedProps.source_type',
                        'humas'
                    )->count(),
                    'borrowing' => $results->where(
                        'extendedProps.source_type',
                        'borrowing'
                    )->count(),
                ],
            ],
        ]);
    }
}
