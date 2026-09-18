<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EventScheduleController extends Controller
{
    private const ADMIN_ROLES = [
        'admin',
        'admin_humas',
        'admin_sekpim',
        'superadmin',
    ];

    private const AGENDA_TYPES = [
        'Rapat',
        'Kunjungan',
        'Internal',
        'Eksternal',
        'Seremonial',
        'Akademik',
        'Lainnya',
    ];

    /*
    |--------------------------------------------------------------------------
    | PUBLIC INDEX
    |--------------------------------------------------------------------------
    */

    public function publicIndex(Request $request)
    {
        $validated = $request->validate([
            'start' => ['nullable', 'date'],
            'end' => ['nullable', 'date'],
            'upcoming' => ['nullable', 'boolean'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = EventSchedule::query()
            ->where('is_public', true);

        if (!empty($validated['start'])) {
            $query->whereDate(
                'event_date',
                '>=',
                $validated['start']
            );
        }

        if (!empty($validated['end'])) {
            $query->whereDate(
                'event_date',
                '<=',
                $validated['end']
            );
        }

        if (
            filter_var(
                $validated['upcoming'] ?? false,
                FILTER_VALIDATE_BOOLEAN
            )
        ) {
            $query->whereDate(
                'event_date',
                '>=',
                now()->toDateString()
            );
        }

        $query
            ->orderBy('event_date')
            ->orderByRaw(
                'CASE WHEN all_day = 1 THEN 0 ELSE 1 END'
            )
            ->orderBy('start_time');

        if (!empty($validated['limit'])) {
            $query->limit(
                (int) $validated['limit']
            );
        }

        $events = $query
            ->get()
            ->map(
                fn (EventSchedule $event) =>
                    $this->transformEvent(
                        $event,
                        false
                    )
            )
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Jadwal Direktur berhasil diambil.',
            'data' => $events,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | AUTHENTICATED INDEX
    |--------------------------------------------------------------------------
    */

    public function index(Request $request)
    {
        $validated = $request->validate([
            'start' => ['nullable', 'date'],
            'end' => ['nullable', 'date'],
            'agenda_type' => [
                'nullable',
                Rule::in(self::AGENDA_TYPES),
            ],
            'search' => ['nullable', 'string', 'max:255'],
        ]);

        $query = EventSchedule::query()
            ->with([
                'createdBy:id,name',
                'updatedBy:id,name',
            ]);

        if (!empty($validated['start'])) {
            $query->whereDate(
                'event_date',
                '>=',
                $validated['start']
            );
        }

        if (!empty($validated['end'])) {
            $query->whereDate(
                'event_date',
                '<=',
                $validated['end']
            );
        }

        if (!empty($validated['agenda_type'])) {
            $query->where(
                'agenda_type',
                $validated['agenda_type']
            );
        }

        if (!empty($validated['search'])) {
            $search =
                trim(
                    $validated['search']
                );

            $query->where(
                function ($subQuery) use ($search) {
                    $subQuery
                        ->where(
                            'title',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'description',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'location',
                            'like',
                            "%{$search}%"
                        );
                }
            );
        }

        $events = $query
            ->orderBy('event_date')
            ->orderByRaw(
                'CASE WHEN all_day = 1 THEN 0 ELSE 1 END'
            )
            ->orderBy('start_time')
            ->get()
            ->map(
                fn (EventSchedule $event) =>
                    $this->transformEvent(
                        $event,
                        true
                    )
            )
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Jadwal Direktur berhasil diambil.',
            'data' => [
                'events' => $events,
                'agenda_types' => self::AGENDA_TYPES,
                'can_manage' => $this->canManage(
                    $request
                ),
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | SHOW
    |--------------------------------------------------------------------------
    */

    public function show(
        Request $request,
        EventSchedule $eventSchedule
    ) {
        $eventSchedule->load([
            'createdBy:id,name',
            'updatedBy:id,name',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Detail Jadwal Direktur berhasil diambil.',
            'data' => $this->transformEvent(
                $eventSchedule,
                true
            ),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | STORE
    |--------------------------------------------------------------------------
    */

    public function store(Request $request)
    {
        $this->ensureCanManage(
            $request
        );

        $validated =
            $this->validatePayload(
                $request
            );

        $validated =
            $this->normalizePayload(
                $validated
            );

        $event = DB::transaction(
            function () use (
                $validated,
                $request
            ) {
                /*
                 * Lock seluruh agenda pada tanggal tersebut.
                 *
                 * Selain untuk membaca bentrok, ini membantu
                 * mencegah dua admin menyimpan agenda
                 * pada slot yang sama secara bersamaan.
                 */
                $conflict =
                    $this->findConflict(
                        $validated,
                        null,
                        true
                    );

                if ($conflict) {
                    $this->throwScheduleConflict(
                        $conflict
                    );
                }

                $validated['created_by'] =
                    $request->user()->id;

                $validated['updated_by'] =
                    $request->user()->id;

                return EventSchedule::create(
                    $validated
                );
            }
        );

        $event->load([
            'createdBy:id,name',
            'updatedBy:id,name',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Agenda Direktur berhasil ditambahkan.',
            'data' => $this->transformEvent(
                $event,
                true
            ),
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    */

    public function update(
        Request $request,
        EventSchedule $eventSchedule
    ) {
        $this->ensureCanManage(
            $request
        );

        $validated =
            $this->validatePayload(
                $request
            );

        $validated =
            $this->normalizePayload(
                $validated
            );

        DB::transaction(
            function () use (
                $validated,
                $request,
                $eventSchedule
            ) {
                $conflict =
                    $this->findConflict(
                        $validated,
                        $eventSchedule->id,
                        true
                    );

                if ($conflict) {
                    $this->throwScheduleConflict(
                        $conflict
                    );
                }

                $validated['updated_by'] =
                    $request->user()->id;

                $eventSchedule->update(
                    $validated
                );
            }
        );

        $eventSchedule->refresh();

        $eventSchedule->load([
            'createdBy:id,name',
            'updatedBy:id,name',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Agenda Direktur berhasil diperbarui.',
            'data' => $this->transformEvent(
                $eventSchedule,
                true
            ),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | DELETE
    |--------------------------------------------------------------------------
    */

    public function destroy(
        Request $request,
        EventSchedule $eventSchedule
    ) {
        $this->ensureCanManage(
            $request
        );

        $eventSchedule->delete();

        return response()->json([
            'success' => true,
            'message' => 'Agenda Direktur berhasil dihapus.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    private function validatePayload(
        Request $request
    ): array {
        $validated =
            $request->validate([
                'title' => [
                    'required',
                    'string',
                    'max:255',
                ],

                'description' => [
                    'nullable',
                    'string',
                    'max:5000',
                ],

                'event_date' => [
                    'required',
                    'date',
                ],

                'start_time' => [
                    'nullable',
                    'date_format:H:i',
                ],

                'end_time' => [
                    'nullable',
                    'date_format:H:i',
                ],

                'all_day' => [
                    'required',
                    'boolean',
                ],

                'location' => [
                    'nullable',
                    'string',
                    'max:255',
                ],

                'agenda_type' => [
                    'required',
                    Rule::in(
                        self::AGENDA_TYPES
                    ),
                ],

                'color' => [
                    'required',
                    'string',
                    'regex:/^#[0-9A-Fa-f]{6}$/',
                ],

                'is_public' => [
                    'required',
                    'boolean',
                ],
            ]);

        $allDay =
            filter_var(
                $validated['all_day'],
                FILTER_VALIDATE_BOOLEAN
            );

        if (!$allDay) {
            if (
                empty(
                    $validated['start_time']
                ) ||
                empty(
                    $validated['end_time']
                )
            ) {
                throw ValidationException::withMessages([
                    'start_time' => [
                        'Jam mulai dan jam selesai wajib diisi.',
                    ],
                ]);
            }

            if (
                $validated['end_time'] <=
                $validated['start_time']
            ) {
                throw ValidationException::withMessages([
                    'end_time' => [
                        'Jam selesai harus setelah jam mulai.',
                    ],
                ]);
            }
        }

        return $validated;
    }

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE
    |--------------------------------------------------------------------------
    */

    private function normalizePayload(
        array $validated
    ): array {
        $validated['title'] =
            trim(
                $validated['title']
            );

        $validated['description'] =
            isset(
                $validated['description']
            )
                ? trim(
                    $validated['description']
                )
                : null;

        if (
            $validated['description'] === ''
        ) {
            $validated['description'] =
                null;
        }

        $validated['location'] =
            isset(
                $validated['location']
            )
                ? trim(
                    $validated['location']
                )
                : null;

        if (
            $validated['location'] === ''
        ) {
            $validated['location'] =
                null;
        }

        $validated['all_day'] =
            filter_var(
                $validated['all_day'],
                FILTER_VALIDATE_BOOLEAN
            );

        $validated['is_public'] =
            filter_var(
                $validated['is_public'],
                FILTER_VALIDATE_BOOLEAN
            );

        if (
            $validated['all_day']
        ) {
            $validated['start_time'] =
                null;

            $validated['end_time'] =
                null;
        }

        return $validated;
    }

    /*
    |--------------------------------------------------------------------------
    | CONFLICT CHECK
    |--------------------------------------------------------------------------
    |
    | Aturan:
    |
    | 1. Agenda hanya dibandingkan dengan tanggal yang sama.
    |
    | 2. Jika salah satu agenda adalah "Sepanjang Hari",
    |    maka dianggap bentrok dengan semua agenda pada tanggal itu.
    |
    | 3. Untuk agenda berdasarkan jam:
    |
    |       new_start < existing_end
    |       DAN
    |       new_end > existing_start
    |
    | Contoh:
    |
    | 09:00 - 10:00 + 09:30 - 11:00 = BENTROK
    | 09:00 - 10:00 + 10:00 - 11:00 = AMAN
    |
    */

    private function findConflict(
        array $payload,
        ?int $excludeId = null,
        bool $lockForUpdate = false
    ): ?EventSchedule {
        $query =
            EventSchedule::query()
                ->whereDate(
                    'event_date',
                    $payload['event_date']
                );

        /*
         * Saat edit jangan membandingkan
         * agenda dengan dirinya sendiri.
         */
        if ($excludeId !== null) {
            $query->where(
                'id',
                '!=',
                $excludeId
            );
        }

        /*
         * Lock row tanggal tersebut ketika
         * dipanggil dari STORE / UPDATE.
         */
        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        /*
         * Agenda baru Sepanjang Hari:
         * agenda apa pun pada tanggal tersebut
         * dianggap bentrok.
         */
        if (
            $payload['all_day']
        ) {
            return $query
                ->orderByRaw(
                    'CASE WHEN all_day = 1 THEN 0 ELSE 1 END'
                )
                ->orderBy('start_time')
                ->first();
        }

        /*
         * Agenda baru memiliki jam.
         *
         * Bentrok apabila:
         * - agenda existing Sepanjang Hari
         * ATAU
         * - rentang jam saling overlap.
         */
        return $query
            ->where(
                function ($subQuery) use ($payload) {
                    $subQuery
                        ->where(
                            'all_day',
                            true
                        )
                        ->orWhere(
                            function ($timeQuery) use ($payload) {
                                $timeQuery
                                    ->where(
                                        'all_day',
                                        false
                                    )
                                    ->where(
                                        'start_time',
                                        '<',
                                        $payload['end_time']
                                    )
                                    ->where(
                                        'end_time',
                                        '>',
                                        $payload['start_time']
                                    );
                            }
                        );
                }
            )
            ->orderByRaw(
                'CASE WHEN all_day = 1 THEN 0 ELSE 1 END'
            )
            ->orderBy('start_time')
            ->first();
    }

    /*
    |--------------------------------------------------------------------------
    | THROW CONFLICT
    |--------------------------------------------------------------------------
    */

    private function throwScheduleConflict(
        EventSchedule $conflict
    ): void {
        $timeText =
            $conflict->all_day
                ? 'Sepanjang Hari'
                : sprintf(
                    '%s - %s',
                    substr(
                        (string) $conflict->start_time,
                        0,
                        5
                    ),
                    substr(
                        (string) $conflict->end_time,
                        0,
                        5
                    )
                );

        response()
            ->json([
                'success' => false,

                'code' =>
                    'SCHEDULE_CONFLICT',

                'message' =>
                    'Agenda tidak dapat disimpan karena waktu yang dipilih bertabrakan dengan agenda Direktur yang sudah ada.',

                'data' => [
                    'conflict' => [
                        'id' =>
                            $conflict->id,

                        'title' =>
                            $conflict->title,

                        'event_date' =>
                            $conflict
                                ->event_date
                                ->format(
                                    'Y-m-d'
                                ),

                        'start_time' =>
                            $conflict->start_time
                                ? substr(
                                    (string) $conflict->start_time,
                                    0,
                                    5
                                )
                                : null,

                        'end_time' =>
                            $conflict->end_time
                                ? substr(
                                    (string) $conflict->end_time,
                                    0,
                                    5
                                )
                                : null,

                        'all_day' =>
                            (bool) $conflict->all_day,

                        'time_text' =>
                            $timeText,

                        'location' =>
                            $conflict->location,

                        'agenda_type' =>
                            $conflict->agenda_type,
                    ],
                ],
            ], 409)
            ->throwResponse();
    }

    /*
    |--------------------------------------------------------------------------
    | ACCESS
    |--------------------------------------------------------------------------
    */

    private function canManage(
        Request $request
    ): bool {
        $user =
            $request->user();

        if (!$user) {
            return false;
        }

        return in_array(
            $user->role,
            self::ADMIN_ROLES,
            true
        );
    }

    private function ensureCanManage(
        Request $request
    ): void {
        abort_unless(
            $this->canManage(
                $request
            ),
            403,
            'Anda tidak memiliki akses untuk mengelola Jadwal Direktur.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | TRANSFORM
    |--------------------------------------------------------------------------
    */

    private function transformEvent(
        EventSchedule $event,
        bool $includeAdminData = false
    ): array {
        $date =
            $event
                ->event_date
                ->format(
                    'Y-m-d'
                );

        $startTime =
            $event->start_time
                ? substr(
                    (string) $event->start_time,
                    0,
                    5
                )
                : null;

        $endTime =
            $event->end_time
                ? substr(
                    (string) $event->end_time,
                    0,
                    5
                )
                : null;

        $start =
            $event->all_day
                ? $date
                : $date .
                    'T' .
                    $startTime .
                    ':00';

        $end =
            $event->all_day
                ? null
                : $date .
                    'T' .
                    $endTime .
                    ':00';

        $data = [
            'id' =>
                $event->id,

            'title' =>
                $event->title,

            'description' =>
                $event->description,

            'event_date' =>
                $date,

            'start_time' =>
                $startTime,

            'end_time' =>
                $endTime,

            'all_day' =>
                (bool) $event->all_day,

            'allDay' =>
                (bool) $event->all_day,

            'location' =>
                $event->location,

            'agenda_type' =>
                $event->agenda_type,

            'color' =>
                $event->color,

            'is_public' =>
                (bool) $event->is_public,

            /*
             * FullCalendar format.
             */
            'start' =>
                $start,

            'end' =>
                $end,

            'backgroundColor' =>
                $event->color,

            'borderColor' =>
                $event->color,
        ];

        if (
            $includeAdminData
        ) {
            $data['created_by'] =
                $event->created_by;

            $data['updated_by'] =
                $event->updated_by;

            $data['created_by_user'] =
                $event->relationLoaded(
                    'createdBy'
                )
                    ? $event->createdBy
                    : null;

            $data['updated_by_user'] =
                $event->relationLoaded(
                    'updatedBy'
                )
                    ? $event->updatedBy
                    : null;

            $data['created_at'] =
                optional(
                    $event->created_at
                )->toISOString();

            $data['updated_at'] =
                optional(
                    $event->updated_at
                )->toISOString();
        }

        return $data;
    }
}