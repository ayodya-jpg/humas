<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventSchedule;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Throwable;

class EventScheduleController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | ADMIN ROLES
    |--------------------------------------------------------------------------
    |
    | Role berikut dapat:
    | - tambah agenda
    | - edit agenda
    | - hapus agenda
    |
    */

    private const ADMIN_ROLES = [
        'admin',
        'admin_humas',
        'admin_sekpim',
        'superadmin',
    ];

    /*
    |--------------------------------------------------------------------------
    | AGENDA TYPES
    |--------------------------------------------------------------------------
    */

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
    |
    | Tidak membutuhkan login.
    |
    | Digunakan untuk:
    | - halaman login
    | - agenda direktur terdekat
    |
    | Contoh:
    |
    | GET /api/event-schedules/public
    |
    | GET /api/event-schedules/public?upcoming=1&limit=5
    |
    | GET /api/event-schedules/public?start=2026-09-01&end=2026-09-30
    |
    */

    public function publicIndex(
        Request $request
    ): JsonResponse {
        $validated =
            $request->validate([
                'start' => [
                    'nullable',
                    'date_format:Y-m-d',
                ],

                'end' => [
                    'nullable',
                    'date_format:Y-m-d',
                    'after_or_equal:start',
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

        $query =
            EventSchedule::query()
                ->where(
                    'is_public',
                    true
                );

        $this->applyDateFilters(
            $query,
            $validated,
            true
        );

        $limit =
            isset(
                $validated[
                    'limit'
                ]
            )
                ? (int)
                    $validated[
                        'limit'
                    ]
                : null;

        if (
            $limit !==
            null
        ) {
            $query->limit(
                $limit
            );
        }

        $events =
            $query
                ->orderBy(
                    'event_date'
                )
                ->orderByRaw(
                    'CASE WHEN all_day = 1 THEN 0 ELSE 1 END'
                )
                ->orderBy(
                    'start_time'
                )
                ->get();

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Jadwal Direktur berhasil diambil.',

            'data' =>
                $events->map(
                    fn (
                        EventSchedule $event
                    ) =>
                        $this->transformEvent(
                            $event,
                            false
                        )
                )->values(),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | AUTHENTICATED INDEX
    |--------------------------------------------------------------------------
    |
    | Seluruh user yang sudah login dapat melihat agenda.
    |
    | Admin juga menerima flag can_manage.
    |
    */

    public function index(
        Request $request
    ): JsonResponse {
        $validated =
            $request->validate([
                'start' => [
                    'nullable',
                    'date_format:Y-m-d',
                ],

                'end' => [
                    'nullable',
                    'date_format:Y-m-d',
                    'after_or_equal:start',
                ],

                'agenda_type' => [
                    'nullable',
                    'string',
                    'max:100',
                ],

                'search' => [
                    'nullable',
                    'string',
                    'max:255',
                ],
            ]);

        $query =
            EventSchedule::query()
                ->with([
                    'createdBy:id,name,username',
                    'updatedBy:id,name,username',
                ]);

        $this->applyDateFilters(
            $query,
            $validated,
            false
        );

        if (
            !empty(
                $validated[
                    'agenda_type'
                ] ?? null
            )
        ) {
            $query->where(
                'agenda_type',
                $validated[
                    'agenda_type'
                ]
            );
        }

        if (
            !empty(
                $validated[
                    'search'
                ] ?? null
            )
        ) {
            $keyword =
                trim(
                    $validated[
                        'search'
                    ]
                );

            $query->where(
                function (
                    Builder $builder
                ) use (
                    $keyword
                ): void {
                    $builder
                        ->where(
                            'title',
                            'like',
                            "%{$keyword}%"
                        )
                        ->orWhere(
                            'description',
                            'like',
                            "%{$keyword}%"
                        )
                        ->orWhere(
                            'location',
                            'like',
                            "%{$keyword}%"
                        )
                        ->orWhere(
                            'agenda_type',
                            'like',
                            "%{$keyword}%"
                        );
                }
            );
        }

        $events =
            $query
                ->orderBy(
                    'event_date'
                )
                ->orderByRaw(
                    'CASE WHEN all_day = 1 THEN 0 ELSE 1 END'
                )
                ->orderBy(
                    'start_time'
                )
                ->get();

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Jadwal Direktur berhasil diambil.',

            'data' => [
                'events' =>
                    $events->map(
                        fn (
                            EventSchedule $event
                        ) =>
                            $this->transformEvent(
                                $event,
                                true
                            )
                    )->values(),

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
    */

    public function show(
        Request $request,
        EventSchedule $eventSchedule
    ): JsonResponse {
        $eventSchedule->load([
            'createdBy:id,name,username',
            'updatedBy:id,name,username',
        ]);

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Detail agenda berhasil diambil.',

            'data' =>
                $this->transformEvent(
                    $eventSchedule,
                    true
                ),

            'access' => [
                'can_manage' =>
                    $this->canManage(
                        $request
                    ),
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | STORE
    |--------------------------------------------------------------------------
    */

    public function store(
        Request $request
    ): JsonResponse {
        if (
            !$this->canManage(
                $request
            )
        ) {
            return $this->forbiddenResponse();
        }

        $validated =
            $this->validateEvent(
                $request
            );

        try {
            $event =
                DB::transaction(
                    function () use (
                        $validated,
                        $request
                    ): EventSchedule {
                        $data =
                            $this->normalizeEventData(
                                $validated
                            );

                        $data[
                            'created_by'
                        ] =
                            $request
                                ->user()
                                ->id;

                        $data[
                            'updated_by'
                        ] =
                            $request
                                ->user()
                                ->id;

                        return EventSchedule::create(
                            $data
                        );
                    }
                );

            $event->load([
                'createdBy:id,name,username',
                'updatedBy:id,name,username',
            ]);

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    'Agenda Direktur berhasil ditambahkan.',

                'data' =>
                    $this->transformEvent(
                        $event,
                        true
                    ),
            ], 201);
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
                        : 'Agenda Direktur gagal ditambahkan.',

                'data' =>
                    null,
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    */

    public function update(
        Request $request,
        EventSchedule $eventSchedule
    ): JsonResponse {
        if (
            !$this->canManage(
                $request
            )
        ) {
            return $this->forbiddenResponse();
        }

        $validated =
            $this->validateEvent(
                $request
            );

        try {
            DB::transaction(
                function () use (
                    $validated,
                    $request,
                    $eventSchedule
                ): void {
                    $data =
                        $this->normalizeEventData(
                            $validated
                        );

                    $data[
                        'updated_by'
                    ] =
                        $request
                            ->user()
                            ->id;

                    $eventSchedule->update(
                        $data
                    );
                }
            );

            $eventSchedule
                ->refresh()
                ->load([
                    'createdBy:id,name,username',
                    'updatedBy:id,name,username',
                ]);

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    'Agenda Direktur berhasil diperbarui.',

                'data' =>
                    $this->transformEvent(
                        $eventSchedule,
                        true
                    ),
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
                        : 'Agenda Direktur gagal diperbarui.',

                'data' =>
                    null,
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | DESTROY
    |--------------------------------------------------------------------------
    */

    public function destroy(
        Request $request,
        EventSchedule $eventSchedule
    ): JsonResponse {
        if (
            !$this->canManage(
                $request
            )
        ) {
            return $this->forbiddenResponse();
        }

        try {
            DB::transaction(
                function () use (
                    $eventSchedule
                ): void {
                    $eventSchedule->delete();
                }
            );

            return response()->json([
                'success' =>
                    true,

                'message' =>
                    'Agenda Direktur berhasil dihapus.',

                'data' =>
                    null,
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
                        : 'Agenda Direktur gagal dihapus.',

                'data' =>
                    null,
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    private function validateEvent(
        Request $request
    ): array {
        return $request->validate([
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
                'date_format:Y-m-d',
            ],

            'all_day' => [
                'required',
                'boolean',
            ],

            'start_time' => [
                Rule::requiredIf(
                    !$request->boolean(
                        'all_day'
                    )
                ),

                'nullable',
                'date_format:H:i',
            ],

            'end_time' => [
                Rule::requiredIf(
                    !$request->boolean(
                        'all_day'
                    )
                ),

                'nullable',
                'date_format:H:i',
            ],

            'location' => [
                'nullable',
                'string',
                'max:255',
            ],

            'agenda_type' => [
                'required',
                'string',

                Rule::in(
                    self::AGENDA_TYPES
                ),
            ],

            'color' => [
                'nullable',
                'string',
                'regex:/^#[0-9A-Fa-f]{6}$/',
            ],

            'is_public' => [
                'required',
                'boolean',
            ],
        ], [
            'title.required' =>
                'Judul agenda wajib diisi.',

            'title.max' =>
                'Judul agenda maksimal 255 karakter.',

            'event_date.required' =>
                'Tanggal agenda wajib dipilih.',

            'event_date.date_format' =>
                'Format tanggal agenda tidak valid.',

            'all_day.required' =>
                'Jenis waktu agenda wajib ditentukan.',

            'start_time.required' =>
                'Jam mulai wajib diisi.',

            'start_time.date_format' =>
                'Format jam mulai tidak valid.',

            'end_time.required' =>
                'Jam selesai wajib diisi.',

            'end_time.date_format' =>
                'Format jam selesai tidak valid.',

            'agenda_type.required' =>
                'Kategori agenda wajib dipilih.',

            'agenda_type.in' =>
                'Kategori agenda tidak valid.',

            'color.regex' =>
                'Format warna agenda tidak valid.',

            'is_public.required' =>
                'Status publik agenda wajib ditentukan.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE EVENT DATA
    |--------------------------------------------------------------------------
    */

    private function normalizeEventData(
        array $validated
    ): array {
        $allDay =
            (bool)
                $validated[
                    'all_day'
                ];

        if (
            !$allDay
        ) {
            $start =
                Carbon::createFromFormat(
                    'H:i',
                    $validated[
                        'start_time'
                    ]
                );

            $end =
                Carbon::createFromFormat(
                    'H:i',
                    $validated[
                        'end_time'
                    ]
                );

            if (
                $end
                    ->lessThanOrEqualTo(
                        $start
                    )
            ) {
                abort(
                    422,
                    'Jam selesai harus setelah jam mulai.'
                );
            }
        }

        return [
            'title' =>
                trim(
                    $validated[
                        'title'
                    ]
                ),

            'description' =>
                isset(
                    $validated[
                        'description'
                    ]
                )
                    ? trim(
                        $validated[
                            'description'
                        ]
                    )
                    : null,

            'event_date' =>
                $validated[
                    'event_date'
                ],

            'all_day' =>
                $allDay,

            'start_time' =>
                $allDay
                    ? null
                    : $validated[
                        'start_time'
                    ],

            'end_time' =>
                $allDay
                    ? null
                    : $validated[
                        'end_time'
                    ],

            'location' =>
                isset(
                    $validated[
                        'location'
                    ]
                )
                    ? trim(
                        $validated[
                            'location'
                        ]
                    )
                    : null,

            'agenda_type' =>
                $validated[
                    'agenda_type'
                ],

            'color' =>
                $validated[
                    'color'
                ] ??
                '#7F1D1D',

            'is_public' =>
                (bool)
                    $validated[
                        'is_public'
                    ],
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | APPLY DATE FILTER
    |--------------------------------------------------------------------------
    */

    private function applyDateFilters(
        Builder $query,
        array $validated,
        bool $public
    ): void {
        if (
            !empty(
                $validated[
                    'start'
                ] ?? null
            )
        ) {
            $query->whereDate(
                'event_date',
                '>=',
                $validated[
                    'start'
                ]
            );
        }

        if (
            !empty(
                $validated[
                    'end'
                ] ?? null
            )
        ) {
            $query->whereDate(
                'event_date',
                '<=',
                $validated[
                    'end'
                ]
            );
        }

        /*
         * Untuk halaman login.
         *
         * Jika upcoming=1 dan start tidak dikirim,
         * otomatis mulai dari hari ini.
         */
        if (
            $public &&
            !empty(
                $validated[
                    'upcoming'
                ] ?? false
            ) &&
            empty(
                $validated[
                    'start'
                ] ?? null
            )
        ) {
            $query->whereDate(
                'event_date',
                '>=',
                now()
                    ->startOfDay()
                    ->toDateString()
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | TRANSFORM EVENT
    |--------------------------------------------------------------------------
    |
    | Format ini nantinya langsung mudah dipakai FullCalendar.
    |
    */

    private function transformEvent(
        EventSchedule $event,
        bool $includeAdminData
    ): array {
        $eventDate =
            $event
                ->event_date
                ->format(
                    'Y-m-d'
                );

        $start =
            $event
                ->all_day
                ? $eventDate
                : sprintf(
                    '%sT%s',
                    $eventDate,
                    substr(
                        (string)
                            $event
                                ->start_time,
                        0,
                        5
                    )
                );

        $end =
            $event
                ->all_day
                ? null
                : sprintf(
                    '%sT%s',
                    $eventDate,
                    substr(
                        (string)
                            $event
                                ->end_time,
                        0,
                        5
                    )
                );

        $data = [
            'id' =>
                $event
                    ->id,

            'title' =>
                $event
                    ->title,

            'description' =>
                $event
                    ->description,

            'event_date' =>
                $eventDate,

            'start_time' =>
                $event
                    ->start_time
                    ? substr(
                        (string)
                            $event
                                ->start_time,
                        0,
                        5
                    )
                    : null,

            'end_time' =>
                $event
                    ->end_time
                    ? substr(
                        (string)
                            $event
                                ->end_time,
                        0,
                        5
                    )
                    : null,

            'all_day' =>
                (bool)
                    $event
                        ->all_day,

            'location' =>
                $event
                    ->location,

            'agenda_type' =>
                $event
                    ->agenda_type,

            'color' =>
                $event
                    ->color,

            'is_public' =>
                (bool)
                    $event
                        ->is_public,

            /*
             * FullCalendar-compatible fields.
             */
            'start' =>
                $start,

            'end' =>
                $end,

            'allDay' =>
                (bool)
                    $event
                        ->all_day,

            'backgroundColor' =>
                $event
                    ->color,

            'borderColor' =>
                $event
                    ->color,

            'created_at' =>
                $event
                    ->created_at,

            'updated_at' =>
                $event
                    ->updated_at,
        ];

        if (
            $includeAdminData
        ) {
            $data[
                'created_by'
            ] =
                $event
                    ->createdBy
                    ? [
                        'id' =>
                            $event
                                ->createdBy
                                ->id,

                        'name' =>
                            $event
                                ->createdBy
                                ->name,

                        'username' =>
                            $event
                                ->createdBy
                                ->username,
                    ]
                    : null;

            $data[
                'updated_by'
            ] =
                $event
                    ->updatedBy
                    ? [
                        'id' =>
                            $event
                                ->updatedBy
                                ->id,

                        'name' =>
                            $event
                                ->updatedBy
                                ->name,

                        'username' =>
                            $event
                                ->updatedBy
                                ->username,
                    ]
                    : null;
        }

        return $data;
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
            $request
                ->user();

        return (
            $user !==
                null &&
            in_array(
                $user
                    ->role,
                self::ADMIN_ROLES,
                true
            )
        );
    }

    private function forbiddenResponse(): JsonResponse
    {
        return response()->json([
            'success' =>
                false,

            'message' =>
                'Kamu tidak memiliki izin untuk mengelola Jadwal Direktur.',

            'data' =>
                null,
        ], 403);
    }
}