<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventSchedule;
use App\Models\EventScheduleHistory;
use Illuminate\Http\Exceptions\HttpResponseException;
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

    private const AUDITABLE_FIELDS = [
        'title',
        'description',
        'event_date',
        'start_time',
        'end_time',
        'all_day',
        'location',
        'agenda_type',
        'color',
        'is_public',
    ];

    /*
    |--------------------------------------------------------------------------
    | PUBLIC INDEX
    |--------------------------------------------------------------------------
    */

    public function publicIndex(Request $request)
    {
        $validated = $request->validate([
            'start' => [
                'nullable',
                'date',
            ],

            'end' => [
                'nullable',
                'date',
            ],

            'upcoming' => [
                'nullable',
                'boolean',
            ],

            'limit' => [
                'nullable',
                'integer',
                'min:1',
                'max:100',
            ],
        ]);

        $query = EventSchedule::query()
            ->where(
                'is_public',
                true
            );

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

            'message' =>
                'Jadwal Direktur berhasil diambil.',

            'data' =>
                $events,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | INDEX
    |--------------------------------------------------------------------------
    */

    public function index(Request $request)
    {
        $validated = $request->validate([
            'start' => [
                'nullable',
                'date',
            ],

            'end' => [
                'nullable',
                'date',
            ],

            'agenda_type' => [
                'nullable',
                Rule::in(
                    self::AGENDA_TYPES
                ),
            ],

            'search' => [
                'nullable',
                'string',
                'max:255',
            ],
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

            'message' =>
                'Jadwal Direktur berhasil diambil.',

            'data' => [
                'events' =>
                    $events,

                'agenda_types' =>
                    self::AGENDA_TYPES,

                'can_manage' =>
                    $this->canManage(
                        $request
                    ),
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | SHOW
    |--------------------------------------------------------------------------
    |
    | Detail agenda sekaligus mengambil audit trail.
    |
    */

    public function show(
        Request $request,
        EventSchedule $eventSchedule
    ) {
        $eventSchedule->load([
            'createdBy:id,name',
            'updatedBy:id,name',

            'histories' => function ($query) {
                $query
                    ->with([
                        'user:id,name',
                    ])
                    ->latest();
            },
        ]);

        $data =
            $this->transformEvent(
                $eventSchedule,
                true
            );

        $data['histories'] =
            $eventSchedule
                ->histories
                ->map(
                    fn (EventScheduleHistory $history) =>
                        $this->transformHistory(
                            $history
                        )
                )
                ->values();

        return response()->json([
            'success' => true,

            'message' =>
                'Detail Jadwal Direktur berhasil diambil.',

            'data' =>
                $data,
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

                $event =
                    EventSchedule::create(
                        $validated
                    );

                /*
                 * Audit CREATE.
                 */
                EventScheduleHistory::create([
                    'event_schedule_id' =>
                        $event->id,

                    'user_id' =>
                        $request->user()->id,

                    'action' =>
                        'created',

                    'event_title' =>
                        $event->title,

                    'old_values' =>
                        null,

                    'new_values' =>
                        $this->getAuditSnapshot(
                            $event
                        ),

                    'description' =>
                        'Agenda Direktur dibuat.',
                ]);

                return $event;
            }
        );

        $event->load([
            'createdBy:id,name',
            'updatedBy:id,name',
        ]);

        return response()->json([
            'success' => true,

            'message' =>
                'Agenda Direktur berhasil ditambahkan.',

            'data' =>
                $this->transformEvent(
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

                /*
                 * Simpan snapshot sebelum update.
                 */
                $oldValues =
                    $this->getAuditSnapshot(
                        $eventSchedule
                    );

                $validated['updated_by'] =
                    $request->user()->id;

                $eventSchedule->update(
                    $validated
                );

                $eventSchedule->refresh();

                $newValues =
                    $this->getAuditSnapshot(
                        $eventSchedule
                    );

                /*
                 * Hanya menyimpan field yang benar-benar berubah.
                 */
                $changes =
                    $this->getChangedAuditValues(
                        $oldValues,
                        $newValues
                    );

                if (
                    !empty(
                        $changes['old']
                    ) ||
                    !empty(
                        $changes['new']
                    )
                ) {
                    EventScheduleHistory::create([
                        'event_schedule_id' =>
                            $eventSchedule->id,

                        'user_id' =>
                            $request->user()->id,

                        'action' =>
                            'updated',

                        'event_title' =>
                            $eventSchedule->title,

                        'old_values' =>
                            $changes['old'],

                        'new_values' =>
                            $changes['new'],

                        'description' =>
                            'Agenda Direktur diperbarui.',
                    ]);
                }
            }
        );

        $eventSchedule->refresh();

        $eventSchedule->load([
            'createdBy:id,name',
            'updatedBy:id,name',
        ]);

        return response()->json([
            'success' => true,

            'message' =>
                'Agenda Direktur berhasil diperbarui.',

            'data' =>
                $this->transformEvent(
                    $eventSchedule,
                    true
                ),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | DESTROY
    |--------------------------------------------------------------------------
    */

    public function destroy(
        Request $request,
        EventSchedule $eventSchedule
    ) {
        $this->ensureCanManage(
            $request
        );

        DB::transaction(
            function () use (
                $request,
                $eventSchedule
            ) {
                /*
                 * Snapshot terakhir sebelum agenda dihapus.
                 */
                $oldValues =
                    $this->getAuditSnapshot(
                        $eventSchedule
                    );

                EventScheduleHistory::create([
                    'event_schedule_id' =>
                        $eventSchedule->id,

                    'user_id' =>
                        $request->user()->id,

                    'action' =>
                        'deleted',

                    'event_title' =>
                        $eventSchedule->title,

                    'old_values' =>
                        $oldValues,

                    'new_values' =>
                        null,

                    'description' =>
                        'Agenda Direktur dihapus.',
                ]);

                /*
                 * Karena FK histories menggunakan nullOnDelete,
                 * histori tetap tersimpan setelah event dihapus.
                 */
                $eventSchedule->delete();
            }
        );

        return response()->json([
            'success' => true,

            'message' =>
                'Agenda Direktur berhasil dihapus.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATE PAYLOAD
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
    | NORMALIZE PAYLOAD
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

        if (
            $excludeId !== null
        ) {
            $query->where(
                'id',
                '!=',
                $excludeId
            );
        }

        if (
            $lockForUpdate
        ) {
            $query->lockForUpdate();
        }

        if (
            $payload['all_day']
        ) {
            return $query
                ->orderByRaw(
                    'CASE WHEN all_day = 1 THEN 0 ELSE 1 END'
                )
                ->orderBy(
                    'start_time'
                )
                ->first();
        }

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
            ->orderBy(
                'start_time'
            )
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
        $startTime =
            $conflict->start_time
                ? substr(
                    (string) $conflict->start_time,
                    0,
                    5
                )
                : null;

        $endTime =
            $conflict->end_time
                ? substr(
                    (string) $conflict->end_time,
                    0,
                    5
                )
                : null;

        $timeText =
            $conflict->all_day
                ? 'Sepanjang Hari'
                : sprintf(
                    '%s - %s',
                    $startTime,
                    $endTime
                );

        throw new HttpResponseException(
            response()->json([
                'success' =>
                    false,

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
                            $startTime,

                        'end_time' =>
                            $endTime,

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
        );
    }

    /*
    |--------------------------------------------------------------------------
    | AUDIT SNAPSHOT
    |--------------------------------------------------------------------------
    */

    private function getAuditSnapshot(
        EventSchedule $event
    ): array {
        $snapshot = [];

        foreach (
            self::AUDITABLE_FIELDS
            as $field
        ) {
            $value =
                $event->{$field};

            if (
                $field === 'event_date' &&
                $value
            ) {
                $value =
                    $event
                        ->event_date
                        ->format(
                            'Y-m-d'
                        );
            }

            if (
                in_array(
                    $field,
                    [
                        'start_time',
                        'end_time',
                    ],
                    true
                ) &&
                $value
            ) {
                $value =
                    substr(
                        (string) $value,
                        0,
                        5
                    );
            }

            if (
                in_array(
                    $field,
                    [
                        'all_day',
                        'is_public',
                    ],
                    true
                )
            ) {
                $value =
                    (bool) $value;
            }

            $snapshot[$field] =
                $value;
        }

        return $snapshot;
    }

    /*
    |--------------------------------------------------------------------------
    | AUDIT CHANGES
    |--------------------------------------------------------------------------
    */

    private function getChangedAuditValues(
        array $oldValues,
        array $newValues
    ): array {
        $oldChanges = [];
        $newChanges = [];

        foreach (
            self::AUDITABLE_FIELDS
            as $field
        ) {
            $old =
                $oldValues[$field] ??
                null;

            $new =
                $newValues[$field] ??
                null;

            if (
                $old !== $new
            ) {
                $oldChanges[$field] =
                    $old;

                $newChanges[$field] =
                    $new;
            }
        }

        return [
            'old' =>
                $oldChanges,

            'new' =>
                $newChanges,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | TRANSFORM HISTORY
    |--------------------------------------------------------------------------
    */

    private function transformHistory(
        EventScheduleHistory $history
    ): array {
        return [
            'id' =>
                $history->id,

            'action' =>
                $history->action,

            'event_title' =>
                $history->event_title,

            'old_values' =>
                $history->old_values,

            'new_values' =>
                $history->new_values,

            'description' =>
                $history->description,

            'user' =>
                $history->relationLoaded(
                    'user'
                )
                    ? $history->user
                    : null,

            'user_name' =>
                $history->user
                    ? $history
                        ->user
                        ->name
                    : 'User tidak tersedia',

            'created_at' =>
                optional(
                    $history->created_at
                )->toISOString(),
        ];
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
    | TRANSFORM EVENT
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