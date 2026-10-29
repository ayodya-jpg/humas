<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BorrowRequest;
use App\Models\EventSchedule;
use App\Models\EventScheduleRequest;
use App\Models\HumasServiceRequest;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Http\Request;

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
        'merchandise' => '#9333EA',
        'asset_request' => '#0891B2',
        'borrowing' => '#047857',
    ];

    private function date($value): ?string
    {
        return $value
            ? Carbon::parse($value)->toDateString()
            : null;
    }

    private function clock($value): ?string
    {
        return $value
            ? substr((string) $value, 0, 5)
            : null;
    }

    private function status(?string $value): string
    {
        return match ($value) {
            'approved',
            'completed',
            'borrowed',
            'returned',
            'revision' => $value,

            'rejected',
            'canceled',
            'cancelled' => 'rejected',

            default => 'pending',
        };
    }

    private function event(
        string $source,
        int $id,
        string $title,
        ?string $date,
        ?string $startTime,
        ?string $endTime,
        bool $allDay,
        ?string $status,
        array $properties = []
    ): ?array {
        if (!$date) {
            return null;
        }

        if (
            !$allDay &&
            (
                !$startTime ||
                !$endTime ||
                $endTime <= $startTime
            )
        ) {
            $allDay = true;
        }

        $color = self::COLORS[$source];

        return [
            'id' => "{$source}-{$id}",
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
                'source_id' => $id,
                'status' => $this->status($status),
                'event_date' => $date,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'requester_unit' => null,
                'pic_name' => null,
                'location' => null,
                'description' => null,
            ], $properties),
        ];
    }

    public function index(Request $request)
    {
        abort_unless(
            $request->user() &&
            in_array(
                $request->user()->role,
                self::ADMIN_ROLES,
                true
            ),
            403,
            'Kalender terintegrasi hanya dapat diakses admin.'
        );

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

        if (
            $end < $start ||
            Carbon::parse($start)
                ->diffInDays(Carbon::parse($end)) > 370
        ) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Rentang tanggal tidak valid atau melebihi 370 hari.',
            ], 422);
        }

        $events = collect();

        $skipStatuses = [
            'rejected',
            'cancelled',
            'canceled',
        ];

        /*
        |--------------------------------------------------------------------------
        | 1. JADWAL RESMI DIREKTORAT
        |--------------------------------------------------------------------------
        */

        $scheduleItems = EventSchedule::query()
            ->whereDate('event_date', '>=', $start)
            ->whereDate('event_date', '<=', $end)
            ->get();

        foreach ($scheduleItems as $item) {
            $event = $this->event(
                'directorate',
                (int) $item->id,
                $item->title,
                $this->date($item->event_date),
                $this->clock($item->start_time),
                $this->clock($item->end_time),
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
        | 2. PENGAJUAN JADWAL DIREKTORAT
        |--------------------------------------------------------------------------
        */

        $scheduleRequests = EventScheduleRequest::query()
            ->where('status', 'pending')
            ->whereDate('event_date', '>=', $start)
            ->whereDate('event_date', '<=', $end)
            ->get();

        foreach ($scheduleRequests as $item) {
            $event = $this->event(
                'directorate',
                (int) $item->id,
                '[Pengajuan] ' . $item->title,
                $this->date($item->event_date),
                $this->clock($item->start_time),
                $this->clock($item->end_time),
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
                $event['id'] =
                    'directorate-request-' . $item->id;

                $events->push($event);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | 3. LIPUTAN HUMAS
        |--------------------------------------------------------------------------
        | Berdasarkan tanggal pelaksanaan kegiatan.
        */

        $humasItems = HumasServiceRequest::query()
            ->whereDate('event_date', '>=', $start)
            ->whereDate('event_date', '<=', $end)
            ->whereNotIn('status', $skipStatuses)
            ->get();

        foreach ($humasItems as $item) {
            $unit = $item->unit_name === 'Lainnya'
                ? $item->other_unit_name
                : $item->unit_name;

            $event = $this->event(
                'humas',
                (int) $item->id,
                'HUMAS: ' .
                    ($item->coverage_type ?: 'Liputan'),
                $this->date($item->event_date),
                null,
                null,
                true,
                $item->status,
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
        | 4. PENGAMBILAN MERCHANDISE
        |--------------------------------------------------------------------------
        | Hanya pada pickup_date.
        | Tidak menggunakan activity_date.
        */

        $orders = Order::query()
            ->with('user')
            ->whereNotNull('pickup_date')
            ->whereDate('pickup_date', '>=', $start)
            ->whereDate('pickup_date', '<=', $end)
            ->whereNotIn('status', $skipStatuses)
            ->get();

        foreach ($orders as $item) {
            $event = $this->event(
                'merchandise',
                (int) $item->id,
                'Ambil Merchandise: ' .
                    ($item->event_name ?: $item->order_code),
                $this->date($item->pickup_date),
                null,
                null,
                true,
                $item->status,
                [
                    'record_type' => 'pickup',
                    'service_code' => $item->order_code,
                    'requester_unit' => $item->institution_name,
                    'pic_name' =>
                        $item->pic_name ?: $item->user?->name,
                    'pic_phone' => $item->pic_phone,
                    'description' => $item->user_note,
                    'activity_date' =>
                        $this->date($item->activity_date),
                    'pickup_date' =>
                        $this->date($item->pickup_date),
                ]
            );

            if ($event) {
                $events->push($event);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | 5. PEMINJAMAN DAN REQUEST BARANG SEKPiM
        |--------------------------------------------------------------------------
        |
        | asset_request = hanya pada tanggal pengambilan
        | borrow = dari pengambilan sampai pengembalian
        |
        */

        $borrowItems = BorrowRequest::query()
            ->with('user')
            ->whereDate('borrow_date', '<=', $end)
            ->where(function ($query) use ($start) {
                $query
                    ->whereDate('return_date', '>=', $start)
                    ->orWhereNull('return_date');
            })
            ->whereNotIn('status', $skipStatuses)
            ->get();

        foreach ($borrowItems as $item) {
            $pickup = $this->date($item->borrow_date);

            if (!$pickup) {
                continue;
            }

            $isAssetRequest =
                $item->request_type === 'asset_request';

            $source = $isAssetRequest
                ? 'asset_request'
                : 'borrowing';

            $return = $isAssetRequest
                ? $pickup
                : (
                    $this->date($item->return_date)
                    ?: $pickup
                );

            if ($return < $pickup) {
                $return = $pickup;
            }

            if ($return < $start || $pickup > $end) {
                continue;
            }

            $color = self::COLORS[$source];

            $events->push([
                'id' => $source . '-' . $item->id,

                'title' => (
                    $isAssetRequest
                        ? 'Ambil Request Barang: '
                        : 'Peminjaman: '
                ) . (
                    $item->purpose
                    ?: $item->borrow_code
                    ?: 'Barang'
                ),

                'start' => $pickup,

                // FullCalendar menggunakan tanggal akhir eksklusif.
                // +1 hari agar tanggal pengembalian tetap terlihat.
                'end' => Carbon::parse($return)
                    ->addDay()
                    ->toDateString(),

                'allDay' => true,
                'backgroundColor' => $color,
                'borderColor' => $color,
                'textColor' => '#ffffff',

                'extendedProps' => [
                    'source_type' => $source,
                    'source_id' => (int) $item->id,

                    'record_type' => $isAssetRequest
                        ? 'pickup'
                        : 'borrowing_period',

                    'status' =>
                        $this->status($item->status),

                    'service_code' => $item->borrow_code,
                    'event_date' => $pickup,
                    'pickup_date' => $pickup,

                    'return_date' => $isAssetRequest
                        ? null
                        : $return,

                    'start_time' => null,
                    'end_time' => null,

                    'requester_unit' =>
                        $item->user?->unit_name,

                    'pic_name' => $item->pic_name,
                    'pic_phone' => $item->pic_phone,
                    'location' => null,
                    'description' => $item->purpose,
                    'request_type' => $item->request_type,
                ],
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | 6. RESPONSE
        |--------------------------------------------------------------------------
        */

        $result = $events
            ->sortBy('start')
            ->values();

        return response()->json([
            'success' => true,
            'message' =>
                'Kalender terintegrasi berhasil dimuat.',

            'data' => [
                'events' => $result,

                'summary' => [
                    'total' => $result->count(),

                    'directorate' => $result
                        ->where(
                            'extendedProps.source_type',
                            'directorate'
                        )
                        ->count(),

                    'humas' => $result
                        ->where(
                            'extendedProps.source_type',
                            'humas'
                        )
                        ->count(),

                    'merchandise' => $result
                        ->where(
                            'extendedProps.source_type',
                            'merchandise'
                        )
                        ->count(),

                    'asset_request' => $result
                        ->where(
                            'extendedProps.source_type',
                            'asset_request'
                        )
                        ->count(),

                    'borrowing' => $result
                        ->where(
                            'extendedProps.source_type',
                            'borrowing'
                        )
                        ->count(),
                ],
            ],
        ]);
    }
}
