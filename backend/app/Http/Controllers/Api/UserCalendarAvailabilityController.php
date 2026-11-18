<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BorrowRequest;
use App\Models\EventScheduleRequest;
use App\Models\HumasServiceRequest;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserCalendarAvailabilityController extends Controller
{
    private const COLORS = [
        'humas' => '#2563EB',
        'merchandise' => '#9333EA',
        'asset_request' => '#0891B2',
        'borrowing' => '#047857',
        'pending_schedule' => '#D97706',
    ];

    private function date(mixed $value): ?string
    {
        return $value
            ? Carbon::parse($value)->toDateString()
            : null;
    }

    private function normalizeStatus(?string $value): string
    {
        return match ($value) {
            'approved',
            'completed',
            'returned',
            'borrowed',
            'revision' => $value,

            default => 'pending',
        };
    }

    /*
    |--------------------------------------------------------------------------
    | MEMBUAT EVENT KALENDER
    |--------------------------------------------------------------------------
    |
    | Pengajuan milik sendiri:
    | - Menampilkan informasi pengajuan.
    |
    | Pengajuan milik orang lain:
    | - Hanya menampilkan jenis layanan,
    |   tanggal, dan status.
    |
    | Data pribadi dan kode pengajuan
    | tidak diberikan kepada user lain.
    |
    */

    private function makeEvent(
        string $source,
        int $id,
        ?string $startDate,
        ?string $endDate,
        string $privateTitle,
        string $publicTitle,
        ?string $status,
        bool $isOwner,
        string $recordType,
        array $details = []
    ): ?array {
        if (!$startDate) {
            return null;
        }

        $endDate ??= $startDate;

        $endExclusive = Carbon::parse($endDate)
            ->addDay()
            ->toDateString();

        $color = self::COLORS[$source];

        $properties = [
            'source_type' => $source,
            'record_type' => $recordType,

            'source_id' => $isOwner
                ? $id
                : null,

            'owned_by_me' => $isOwner,
            'availability_only' => !$isOwner,

            'status' => $this->normalizeStatus($status),

            'event_date' => $startDate,
            'pickup_date' => $startDate,

            'return_date' => $source === 'borrowing'
                ? $endDate
                : null,
        ];

        if ($isOwner) {
            $properties = array_merge(
                $properties,
                $details
            );
        }

        return [
            'id' => $isOwner
                ? "{$source}-{$id}"
                : 'available-' . $source . '-' . substr(
                    hash_hmac(
                        'sha256',
                        (string) $id,
                        (string) config('app.key')
                    ),
                    0,
                    20
                ),

            'title' => $isOwner
                ? $privateTitle
                : $publicTitle,

            'start' => $startDate,
            'end' => $endExclusive,

            'allDay' => true,

            'backgroundColor' => $color,
            'borderColor' => $color,
            'textColor' => '#ffffff',

            'extendedProps' => $properties,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | INDEX
    |--------------------------------------------------------------------------
    */

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless(
            $user,
            401,
            'Silakan login terlebih dahulu.'
        );

        abort_unless(
            $user->role === 'user',
            403,
            'Endpoint ini hanya untuk kalender pemohon.'
        );

        $validated = $request->validate([
            'start' => [
                'nullable',
                'date_format:Y-m-d',
            ],

            'end' => [
                'nullable',
                'date_format:Y-m-d',
            ],
        ]);

        $start = $validated['start']
            ?? now()->startOfMonth()->toDateString();

        $end = $validated['end']
            ?? now()->endOfMonth()->toDateString();

        if (
            $end < $start ||
            Carbon::parse($start)
                ->diffInDays(Carbon::parse($end)) > 370
        ) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Rentang kalender harus 1–371 hari.',
                'data' => null,
            ], 422);
        }

        $userId = (int) $user->id;

        $events = collect();

        $excluded = [
            'rejected',
            'cancelled',
            'canceled',
        ];

        /*
        |--------------------------------------------------------------------------
        | 1. JADWAL LAYANAN HUMAS
        |--------------------------------------------------------------------------
        */

        $humas = HumasServiceRequest::query()
            ->whereDate('event_date', '>=', $start)
            ->whereDate('event_date', '<=', $end)
            ->whereNotIn('status', $excluded)
            ->get();

        foreach ($humas as $item) {
            $own = (int) $item->user_id === $userId;

            $date = $this->date($item->event_date);

            $event = $this->makeEvent(
                'humas',
                (int) $item->id,
                $date,
                $date,

                'HUMAS: ' .
                    ($item->coverage_type ?: 'Layanan'),

                'Jadwal Layanan HUMAS',

                $item->status,
                $own,
                'service_request',

                [
                    'service_code' => $item->service_code,
                    'requester_unit' => $item->unit_name,
                    'pic_name' => $item->applicant_name,
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
        | 2. PENGAMBILAN MERCHANDISE
        |--------------------------------------------------------------------------
        */

        $orders = Order::query()
            ->whereNotNull('pickup_date')
            ->whereDate('pickup_date', '>=', $start)
            ->whereDate('pickup_date', '<=', $end)
            ->whereNotIn('status', $excluded)
            ->get();

        foreach ($orders as $item) {
            $own = (int) $item->user_id === $userId;

            $date = $this->date($item->pickup_date);

            $event = $this->makeEvent(
                'merchandise',
                (int) $item->id,
                $date,
                $date,

                'Ambil Merchandise: ' .
                    (
                        $item->event_name
                        ?: $item->order_code
                    ),

                'Jadwal Pengambilan Merchandise',

                $item->status,
                $own,
                'pickup',

                [
                    'service_code' => $item->order_code,
                    'requester_unit' => $item->institution_name,
                    'pic_name' => $item->pic_name,
                    'pic_phone' => $item->pic_phone,
                    'description' => $item->user_note,
                    'activity_date' => $this->date(
                        $item->activity_date
                    ),
                ]
            );

            if ($event) {
                $events->push($event);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | 3. PEMINJAMAN DAN REQUEST ASET SEKPiM
        |--------------------------------------------------------------------------
        */

        $borrows = BorrowRequest::query()
            ->whereDate('borrow_date', '<=', $end)
            ->where(function ($query) use ($start) {
                $query
                    ->whereDate(
                        'return_date',
                        '>=',
                        $start
                    )
                    ->orWhereNull('return_date');
            })
            ->whereNotIn('status', $excluded)
            ->get();

        foreach ($borrows as $item) {
            $pickup = $this->date(
                $item->borrow_date
            );

            if (!$pickup) {
                continue;
            }

            $asset = $item->request_type === 'asset_request';

            $source = $asset
                ? 'asset_request'
                : 'borrowing';

            $endDate = $asset
                ? $pickup
                : (
                    $this->date($item->return_date)
                    ?: $pickup
                );

            if ($endDate < $pickup) {
                $endDate = $pickup;
            }

            if (
                $endDate < $start ||
                $pickup > $end
            ) {
                continue;
            }

            $own = (int) $item->user_id === $userId;

            $event = $this->makeEvent(
                $source,
                (int) $item->id,
                $pickup,
                $endDate,

                (
                    $asset
                        ? 'Request Barang: '
                        : 'Peminjaman: '
                ) . (
                    $item->purpose
                    ?: $item->borrow_code
                ),

                $asset
                    ? 'Jadwal Pengambilan Barang SEKPiM'
                    : 'Jadwal Peminjaman Barang SEKPiM',

                $item->status,
                $own,

                $asset
                    ? 'pickup'
                    : 'borrowing_period',

                [
                    'service_code' => $item->borrow_code,
                    'pic_name' => $item->pic_name,
                    'pic_phone' => $item->pic_phone,
                    'description' => $item->purpose,
                    'request_type' => $item->request_type,
                ]
            );

            if ($event) {
                $events->push($event);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | 4. PENGAJUAN JADWAL DIREKTORAT
        |--------------------------------------------------------------------------
        |
        | Pengajuan pending bersifat tentatif.
        | Agenda resmi publik diambil melalui
        | endpoint event-schedules/public.
        |
        */

        $scheduleRequests = EventScheduleRequest::query()
            ->where('status', 'pending')
            ->whereDate('event_date', '>=', $start)
            ->whereDate('event_date', '<=', $end)
            ->get();

        foreach ($scheduleRequests as $item) {
            $own = (int) $item->requested_by === $userId;

            $date = $this->date(
                $item->event_date
            );

            $event = $this->makeEvent(
                'pending_schedule',
                (int) $item->id,
                $date,
                $date,

                '[Pengajuan] ' . $item->title,

                'Pengajuan Jadwal Direktorat (Tentatif)',

                'pending',
                $own,
                'pending_request',

                [
                    'requester_unit' => $item->requester_unit,
                    'pic_name' => $item->pic_name,
                    'location' => $item->location,
                    'description' => $item->description,
                    'directorate' => $item->directorate,
                    'agenda_type' => $item->agenda_type,
                    'start_time' => $item->start_time,
                    'end_time' => $item->end_time,
                ]
            );

            if ($event) {
                $events->push($event);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        $rows = $events
            ->sortBy('start')
            ->values();

        return response()->json([
            'success' => true,

            'message' =>
                'Ketersediaan jadwal layanan berhasil dimuat.',

            'data' => [
                'events' => $rows,

                'notice' =>
                    'Jadwal tercatat bukan konfirmasi stok atau kapasitas resource.',
            ],
        ]);
    }
}
