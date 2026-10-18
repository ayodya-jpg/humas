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
    /*
    |--------------------------------------------------------------------------
    | CONFIG
    |--------------------------------------------------------------------------
    */

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

    private const DIRECTORATE_LABELS = [
        'direktorat' => 'Direktorat',
        'direktur' => 'Direktur',
        'wakil_direktur_1' => 'Wakil Direktur I',
        'wakil_direktur_2' => 'Wakil Direktur II',
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
        'directorate',
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

    public function publicIndex(
        Request $request
    ) {
        $validated =
            $request->validate([
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

                'directorate' => [
                    'nullable',
                    Rule::in(
                        self::DIRECTORATES
                    ),
                ],
            ]);

        $query =
            EventSchedule::query()
                ->where(
                    'is_public',
                    true
                );

        if (
            !empty(
                $validated[
                    'directorate'
                ]
            )
        ) {
            $query->where(
                'directorate',
                $validated[
                    'directorate'
                ]
            );
        }

        if (
            !empty(
                $validated[
                    'start'
                ]
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
                ]
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

        if (
            filter_var(
                $validated[
                    'upcoming'
                ] ??
                    false,
                FILTER_VALIDATE_BOOLEAN
            )
        ) {
            $query->whereDate(
                'event_date',
                '>=',
                now()
                    ->toDateString()
            );
        }

        $query
            ->orderBy(
                'event_date'
            )
            ->orderByRaw(
                'CASE WHEN all_day = 1 THEN 0 ELSE 1 END'
            )
            ->orderBy(
                'start_time'
            );

        if (
            !empty(
                $validated[
                    'limit'
                ]
            )
        ) {
            $query->limit(
                (int)
                    $validated[
                        'limit'
                    ]
            );
        }

        $events =
            $query
                ->get()
                ->map(
                    fn (
                        EventSchedule $event
                    ) =>
                        $this
                            ->transformEvent(
                                $event,
                                false
                            )
                )
                ->values();

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Jadwal Direktorat berhasil diambil.',

            'data' =>
                $events,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | INDEX
    |--------------------------------------------------------------------------
    */

    public function index(
        Request $request
    ) {
        $validated =
            $request->validate([
                'start' => [
                    'nullable',
                    'date',
                ],

                'end' => [
                    'nullable',
                    'date',
                ],

                'directorate' => [
                    'nullable',
                    Rule::in(
                        self::DIRECTORATES
                    ),
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

        $query =
            EventSchedule::query()
                ->with([
                    'createdBy:id,name',
                    'updatedBy:id,name',
                ]);

        if (
            !empty(
                $validated[
                    'start'
                ]
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
                ]
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

        if (
            !empty(
                $validated[
                    'directorate'
                ]
            )
        ) {
            $query->where(
                'directorate',
                $validated[
                    'directorate'
                ]
            );
        }

        if (
            !empty(
                $validated[
                    'agenda_type'
                ]
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
                ]
            )
        ) {
            $search =
                trim(
                    $validated[
                        'search'
                    ]
                );

            $query->where(
                function (
                    $subQuery
                ) use (
                    $search
                ) {
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
                ->get()
                ->map(
                    fn (
                        EventSchedule $event
                    ) =>
                        $this
                            ->transformEvent(
                                $event,
                                true
                            )
                )
                ->values();

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Jadwal Direktorat berhasil diambil.',

            'data' => [
                'events' =>
                    $events,

                'directorates' =>
                    $this
                        ->getDirectorateOptions(),

                'agenda_types' =>
                    self::AGENDA_TYPES,

                'can_manage' =>
                    $this
                        ->canManage(
                            $request
                        ),
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ACTIVITY LOG
    |--------------------------------------------------------------------------
    |
    | Hanya admin.
    |
    | Riwayat agenda yang sudah dihapus tetap muncul karena
    | event_schedule_histories.event_schedule_id menggunakan nullOnDelete.
    |
    */

    public function activity(
        Request $request
    ) {
        $this->ensureCanManage(
            $request
        );

        $validated =
            $request->validate([
                'action' => [
                    'nullable',

                    Rule::in([
                        'created',
                        'updated',
                        'deleted',
                    ]),
                ],

                'directorate' => [
                    'nullable',

                    Rule::in(
                        self::DIRECTORATES
                    ),
                ],

                'search' => [
                    'nullable',
                    'string',
                    'max:255',
                ],

                'start_date' => [
                    'nullable',
                    'date',
                ],

                'end_date' => [
                    'nullable',
                    'date',
                    'after_or_equal:start_date',
                ],

                'page' => [
                    'nullable',
                    'integer',
                    'min:1',
                ],

                'per_page' => [
                    'nullable',
                    'integer',
                    'min:5',
                    'max:100',
                ],
            ]);

        $query =
            EventScheduleHistory::query()
                ->with([
                    'user:id,name',
                    'eventSchedule:id,directorate',
                ]);

        /*
        |--------------------------------------------------------------------------
        | SEARCH
        |--------------------------------------------------------------------------
        */

        if (
            !empty(
                $validated[
                    'search'
                ]
            )
        ) {
            $search =
                trim(
                    $validated[
                        'search'
                    ]
                );

            $query->where(
                function (
                    $subQuery
                ) use (
                    $search
                ) {
                    $subQuery
                        ->where(
                            'event_title',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'description',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhereHas(
                            'user',
                            function (
                                $userQuery
                            ) use (
                                $search
                            ) {
                                $userQuery
                                    ->where(
                                        'name',
                                        'like',
                                        "%{$search}%"
                                    );
                            }
                        );
                }
            );
        }

        /*
        |--------------------------------------------------------------------------
        | DIRECTORATE FILTER
        |--------------------------------------------------------------------------
        */

        if (
            !empty(
                $validated[
                    'directorate'
                ]
            )
        ) {
            $directorate =
                $validated[
                    'directorate'
                ];

            $query->where(
                function (
                    $subQuery
                ) use (
                    $directorate
                ) {
                    /*
                     * Agenda masih aktif.
                     */
                    $subQuery
                        ->whereHas(
                            'eventSchedule',
                            function (
                                $eventQuery
                            ) use (
                                $directorate
                            ) {
                                $eventQuery
                                    ->where(
                                        'directorate',
                                        $directorate
                                    );
                            }
                        )

                        /*
                         * Agenda sudah dihapus /
                         * directorate tersimpan di JSON history.
                         */
                        ->orWhere(
                            'new_values->directorate',
                            $directorate
                        )
                        ->orWhere(
                            'old_values->directorate',
                            $directorate
                        );
                }
            );
        }

        /*
        |--------------------------------------------------------------------------
        | DATE FILTER
        |--------------------------------------------------------------------------
        */

        if (
            !empty(
                $validated[
                    'start_date'
                ]
            )
        ) {
            $query->whereDate(
                'created_at',
                '>=',
                $validated[
                    'start_date'
                ]
            );
        }

        if (
            !empty(
                $validated[
                    'end_date'
                ]
            )
        ) {
            $query->whereDate(
                'created_at',
                '<=',
                $validated[
                    'end_date'
                ]
            );
        }

        /*
        |--------------------------------------------------------------------------
        | SUMMARY
        |--------------------------------------------------------------------------
        |
        | Summary mengikuti filter pencarian / directorate / tanggal.
        | Tetapi tidak mengikuti filter action supaya angka semua kartu tetap
        | terlihat ketika user klik Dibuat / Diperbarui / Dihapus.
        |
        */

        $summaryBaseQuery =
            clone $query;

        $summary = [
            'total' =>
                (
                    clone $summaryBaseQuery
                )->count(),

            'created' =>
                (
                    clone $summaryBaseQuery
                )
                    ->where(
                        'action',
                        'created'
                    )
                    ->count(),

            'updated' =>
                (
                    clone $summaryBaseQuery
                )
                    ->where(
                        'action',
                        'updated'
                    )
                    ->count(),

            'deleted' =>
                (
                    clone $summaryBaseQuery
                )
                    ->where(
                        'action',
                        'deleted'
                    )
                    ->count(),
        ];

        /*
        |--------------------------------------------------------------------------
        | ACTION FILTER
        |--------------------------------------------------------------------------
        */

        if (
            !empty(
                $validated[
                    'action'
                ]
            )
        ) {
            $query->where(
                'action',
                $validated[
                    'action'
                ]
            );
        }

        /*
        |--------------------------------------------------------------------------
        | PAGINATION
        |--------------------------------------------------------------------------
        */

        $perPage =
            (int) (
                $validated[
                    'per_page'
                ] ??
                20
            );

        $paginator =
            $query
                ->orderByDesc(
                    'created_at'
                )
                ->orderByDesc(
                    'id'
                )
                ->paginate(
                    $perPage
                );

        $histories =
            $paginator
                ->getCollection()
                ->map(
                    fn (
                        EventScheduleHistory $history
                    ) =>
                        $this
                            ->transformHistory(
                                $history
                            )
                )
                ->values();

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Riwayat Jadwal Direktorat berhasil diambil.',

            'data' => [
                'histories' =>
                    $histories,

                'summary' =>
                    $summary,

                'directorates' =>
                    $this
                        ->getDirectorateOptions(),

                'actions' => [
                    [
                        'value' =>
                            'created',

                        'label' =>
                            'Dibuat',
                    ],

                    [
                        'value' =>
                            'updated',

                        'label' =>
                            'Diperbarui',
                    ],

                    [
                        'value' =>
                            'deleted',

                        'label' =>
                            'Dihapus',
                    ],
                ],

                'pagination' => [
                    'current_page' =>
                        $paginator
                            ->currentPage(),

                    'last_page' =>
                        $paginator
                            ->lastPage(),

                    'per_page' =>
                        $paginator
                            ->perPage(),

                    'total' =>
                        $paginator
                            ->total(),

                    'from' =>
                        $paginator
                            ->firstItem(),

                    'to' =>
                        $paginator
                            ->lastItem(),
                ],
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
        $canManage =
            $this->canManage(
                $request
            );

        $eventSchedule->load([
            'createdBy:id,name',
            'updatedBy:id,name',
        ]);

        if (
            $canManage
        ) {
            $eventSchedule->load([
                'histories' =>
                    function (
                        $query
                    ) {
                        $query
                            ->with([
                                'user:id,name',
                            ])
                            ->latest();
                    },
            ]);
        }

        $data =
            $this->transformEvent(
                $eventSchedule,
                true
            );

        $data[
            'can_manage'
        ] =
            $canManage;

        if (
            $canManage
        ) {
            $data[
                'histories'
            ] =
                $eventSchedule
                    ->histories
                    ->map(
                        fn (
                            EventScheduleHistory $history
                        ) =>
                            $this
                                ->transformHistory(
                                    $history
                                )
                    )
                    ->values();
        }

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Detail Jadwal Direktorat berhasil diambil.',

            'data' =>
                $data,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | STORE
    |--------------------------------------------------------------------------
    */

    public function store(
        Request $request
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

        $event =
            DB::transaction(
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

                    if (
                        $conflict
                    ) {
                        $this
                            ->throwScheduleConflict(
                                $conflict,
                                $validated[
                                    'directorate'
                                ]
                            );
                    }

                    $validated[
                        'created_by'
                    ] =
                        $request
                            ->user()
                            ->id;

                    $validated[
                        'updated_by'
                    ] =
                        $request
                            ->user()
                            ->id;

                    $event =
                        EventSchedule::create(
                            $validated
                        );

                    EventScheduleHistory::create([
                        'event_schedule_id' =>
                            $event->id,

                        'user_id' =>
                            $request
                                ->user()
                                ->id,

                        'action' =>
                            'created',

                        'event_title' =>
                            $event
                                ->title,

                        'old_values' =>
                            null,

                        'new_values' =>
                            $this
                                ->getAuditSnapshot(
                                    $event
                                ),

                        'description' =>
                            'Agenda Direktorat dibuat.',
                    ]);

                    return $event;
                }
            );

        $event->load([
            'createdBy:id,name',
            'updatedBy:id,name',
        ]);

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Agenda Direktorat berhasil ditambahkan.',

            'data' =>
                $this
                    ->transformEvent(
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
                        $eventSchedule
                            ->id,
                        true
                    );

                if (
                    $conflict
                ) {
                    $this
                        ->throwScheduleConflict(
                            $conflict,
                            $validated[
                                'directorate'
                            ]
                        );
                }

                $oldValues =
                    $this
                        ->getAuditSnapshot(
                            $eventSchedule
                        );

                $validated[
                    'updated_by'
                ] =
                    $request
                        ->user()
                        ->id;

                $eventSchedule
                    ->update(
                        $validated
                    );

                $eventSchedule
                    ->refresh();

                $newValues =
                    $this
                        ->getAuditSnapshot(
                            $eventSchedule
                        );

                $changes =
                    $this
                        ->getChangedAuditValues(
                            $oldValues,
                            $newValues
                        );

                if (
                    !empty(
                        $changes[
                            'old'
                        ]
                    ) ||
                    !empty(
                        $changes[
                            'new'
                        ]
                    )
                ) {
                    EventScheduleHistory::create([
                        'event_schedule_id' =>
                            $eventSchedule
                                ->id,

                        'user_id' =>
                            $request
                                ->user()
                                ->id,

                        'action' =>
                            'updated',

                        'event_title' =>
                            $eventSchedule
                                ->title,

                        'old_values' =>
                            $changes[
                                'old'
                            ],

                        'new_values' =>
                            $changes[
                                'new'
                            ],

                        'description' =>
                            'Agenda Direktorat diperbarui.',
                    ]);
                }
            }
        );

        $eventSchedule
            ->refresh();

        $eventSchedule
            ->load([
                'createdBy:id,name',
                'updatedBy:id,name',
            ]);

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Agenda Direktorat berhasil diperbarui.',

            'data' =>
                $this
                    ->transformEvent(
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
                $oldValues =
                    $this
                        ->getAuditSnapshot(
                            $eventSchedule
                        );

                EventScheduleHistory::create([
                    'event_schedule_id' =>
                        $eventSchedule
                            ->id,

                    'user_id' =>
                        $request
                            ->user()
                            ->id,

                    'action' =>
                        'deleted',

                    'event_title' =>
                        $eventSchedule
                            ->title,

                    'old_values' =>
                        $oldValues,

                    'new_values' =>
                        null,

                    'description' =>
                        'Agenda Direktorat dihapus.',
                ]);

                $eventSchedule
                    ->delete();
            }
        );

        return response()->json([
            'success' =>
                true,

            'message' =>
                'Agenda Direktorat berhasil dihapus.',
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
                'directorate' => [
                    'required',

                    Rule::in(
                        self::DIRECTORATES
                    ),
                ],

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
                $validated[
                    'all_day'
                ],
                FILTER_VALIDATE_BOOLEAN
            );

        if (
            !$allDay
        ) {
            if (
                empty(
                    $validated[
                        'start_time'
                    ]
                ) ||
                empty(
                    $validated[
                        'end_time'
                    ]
                )
            ) {
                throw ValidationException::withMessages([
                    'start_time' => [
                        'Jam mulai dan jam selesai wajib diisi.',
                    ],
                ]);
            }

            if (
                $validated[
                    'end_time'
                ] <=
                $validated[
                    'start_time'
                ]
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
        $validated[
            'directorate'
        ] =
            trim(
                $validated[
                    'directorate'
                ]
            );

        $validated[
            'title'
        ] =
            trim(
                $validated[
                    'title'
                ]
            );

        $validated[
            'description'
        ] =
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
                : null;

        if (
            $validated[
                'description'
            ] ===
            ''
        ) {
            $validated[
                'description'
            ] =
                null;
        }

        $validated[
            'location'
        ] =
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
                : null;

        if (
            $validated[
                'location'
            ] ===
            ''
        ) {
            $validated[
                'location'
            ] =
                null;
        }

        $validated[
            'all_day'
        ] =
            filter_var(
                $validated[
                    'all_day'
                ],
                FILTER_VALIDATE_BOOLEAN
            );

        $validated[
            'is_public'
        ] =
            filter_var(
                $validated[
                    'is_public'
                ],
                FILTER_VALIDATE_BOOLEAN
            );

        if (
            $validated[
                'all_day'
            ]
        ) {
            $validated[
                'start_time'
            ] =
                null;

            $validated[
                'end_time'
            ] =
                null;
        }

        return $validated;
    }

    /*
    |--------------------------------------------------------------------------
    | CONFLICT DIRECTORATES
    |--------------------------------------------------------------------------
    */

    private function getConflictDirectorates(
        string $directorate
    ): array {
        if (
            $directorate ===
            'direktorat'
        ) {
            return [
                'direktorat',
                'direktur',
                'wakil_direktur_1',
                'wakil_direktur_2',
            ];
        }

        return [
            'direktorat',
            $directorate,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | FIND CONFLICT
    |--------------------------------------------------------------------------
    */

    private function findConflict(
        array $payload,
        ?int $excludeId = null,
        bool $lockForUpdate = false
    ): ?EventSchedule {
        $conflictDirectorates =
            $this
                ->getConflictDirectorates(
                    $payload[
                        'directorate'
                    ]
                );

        $query =
            EventSchedule::query()
                ->whereIn(
                    'directorate',
                    $conflictDirectorates
                )
                ->whereDate(
                    'event_date',
                    $payload[
                        'event_date'
                    ]
                );

        if (
            $excludeId !==
            null
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
            $query
                ->lockForUpdate();
        }

        /*
         * Agenda sepanjang hari bentrok
         * dengan agenda apa pun di tanggal yang sama
         * untuk pemilik yang saling memengaruhi.
         */
        if (
            $payload[
                'all_day'
            ]
        ) {
            return $query
                ->orderByRaw(
                    "
                    CASE
                        WHEN directorate = 'direktorat'
                        THEN 0
                        ELSE 1
                    END
                    "
                )
                ->orderByRaw(
                    "
                    CASE
                        WHEN all_day = 1
                        THEN 0
                        ELSE 1
                    END
                    "
                )
                ->orderBy(
                    'start_time'
                )
                ->first();
        }

        /*
         * Strict overlap:
         *
         * new_start < existing_end
         * AND
         * new_end > existing_start
         *
         * Maka:
         * 09:00-10:00
         * 10:00-11:00
         *
         * tidak dianggap bentrok.
         */
        return $query
            ->where(
                function (
                    $subQuery
                ) use (
                    $payload
                ) {
                    $subQuery
                        ->where(
                            'all_day',
                            true
                        )
                        ->orWhere(
                            function (
                                $timeQuery
                            ) use (
                                $payload
                            ) {
                                $timeQuery
                                    ->where(
                                        'all_day',
                                        false
                                    )
                                    ->where(
                                        'start_time',
                                        '<',
                                        $payload[
                                            'end_time'
                                        ]
                                    )
                                    ->where(
                                        'end_time',
                                        '>',
                                        $payload[
                                            'start_time'
                                        ]
                                    );
                            }
                        );
                }
            )
            ->orderByRaw(
                "
                CASE
                    WHEN directorate = 'direktorat'
                    THEN 0
                    ELSE 1
                END
                "
            )
            ->orderByRaw(
                "
                CASE
                    WHEN all_day = 1
                    THEN 0
                    ELSE 1
                END
                "
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
        EventSchedule $conflict,
        string $requestedDirectorate
    ): void {
        $startTime =
            $conflict
                ->start_time
                ? substr(
                    (string)
                        $conflict
                            ->start_time,
                    0,
                    5
                )
                : null;

        $endTime =
            $conflict
                ->end_time
                ? substr(
                    (string)
                        $conflict
                            ->end_time,
                    0,
                    5
                )
                : null;

        $timeText =
            $conflict
                ->all_day
                ? 'Sepanjang Hari'
                : sprintf(
                    '%s - %s',
                    $startTime,
                    $endTime
                );

        $requestedLabel =
            $this
                ->getDirectorateLabel(
                    $requestedDirectorate
                );

        $conflictLabel =
            $this
                ->getDirectorateLabel(
                    $conflict
                        ->directorate
                );

        if (
            $requestedDirectorate ===
            'direktorat'
        ) {
            $message =
                'Agenda Direktorat tidak dapat disimpan karena salah satu pimpinan memiliki jadwal yang bentrok.';
        } elseif (
            $conflict
                ->directorate ===
            'direktorat'
        ) {
            $message =
                "Agenda {$requestedLabel} tidak dapat disimpan karena terdapat Agenda Direktorat pada waktu tersebut.";
        } else {
            $message =
                "Agenda {$requestedLabel} tidak dapat disimpan karena jadwal {$conflictLabel} pada waktu tersebut sudah terisi.";
        }

        throw new HttpResponseException(
            response()->json([
                'success' =>
                    false,

                'code' =>
                    'SCHEDULE_CONFLICT',

                'message' =>
                    $message,

                'data' => [
                    'requested_directorate' =>
                        $requestedDirectorate,

                    'requested_directorate_label' =>
                        $requestedLabel,

                    'conflict' => [
                        'id' =>
                            $conflict
                                ->id,

                        'directorate' =>
                            $conflict
                                ->directorate,

                        'directorate_label' =>
                            $conflictLabel,

                        'title' =>
                            $conflict
                                ->title,

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
                            (bool)
                                $conflict
                                    ->all_day,

                        'time_text' =>
                            $timeText,

                        'location' =>
                            $conflict
                                ->location,

                        'agenda_type' =>
                            $conflict
                                ->agenda_type,
                    ],
                ],
            ], 409)
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DIRECTORATE OPTIONS
    |--------------------------------------------------------------------------
    */

    private function getDirectorateOptions(): array
    {
        return collect(
            self::DIRECTORATES
        )
            ->map(
                fn (
                    string $value
                ) => [
                    'value' =>
                        $value,

                    'label' =>
                        $this
                            ->getDirectorateLabel(
                                $value
                            ),
                ]
            )
            ->values()
            ->all();
    }

    /*
    |--------------------------------------------------------------------------
    | DIRECTORATE LABEL
    |--------------------------------------------------------------------------
    */

    private function getDirectorateLabel(
        ?string $directorate
    ): string {
        return (
            self::DIRECTORATE_LABELS[
                $directorate
            ] ??
            'Direktorat'
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
        $snapshot =
            [];

        foreach (
            self::AUDITABLE_FIELDS
            as $field
        ) {
            $value =
                $event->{$field};

            if (
                $field ===
                    'event_date' &&
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
                        (string)
                            $value,
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
                    (bool)
                        $value;
            }

            $snapshot[
                $field
            ] =
                $value;
        }

        return $snapshot;
    }

    /*
    |--------------------------------------------------------------------------
    | CHANGED VALUES
    |--------------------------------------------------------------------------
    */

    private function getChangedAuditValues(
        array $oldValues,
        array $newValues
    ): array {
        $oldChanges =
            [];

        $newChanges =
            [];

        foreach (
            self::AUDITABLE_FIELDS
            as $field
        ) {
            $old =
                $oldValues[
                    $field
                ] ??
                null;

            $new =
                $newValues[
                    $field
                ] ??
                null;

            if (
                $old !==
                $new
            ) {
                $oldChanges[
                    $field
                ] =
                    $old;

                $newChanges[
                    $field
                ] =
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
        $oldValues =
            $history
                ->old_values ??
            [];

        $newValues =
            $history
                ->new_values ??
            [];

        $directorate =
            null;

        /*
         * Jika agenda masih ada, ambil owner terbaru.
         */
        if (
            $history
                ->relationLoaded(
                    'eventSchedule'
                ) &&
            $history
                ->eventSchedule
        ) {
            $directorate =
                $history
                    ->eventSchedule
                    ->directorate;
        }

        /*
         * Jika agenda sudah dihapus,
         * fallback ke JSON history.
         */
        if (
            !$directorate
        ) {
            $directorate =
                $newValues[
                    'directorate'
                ] ??
                $oldValues[
                    'directorate'
                ] ??
                null;
        }

        return [
            'id' =>
                $history
                    ->id,

            'event_schedule_id' =>
                $history
                    ->event_schedule_id,

            'event_exists' =>
                $history
                    ->event_schedule_id !==
                null,

            'action' =>
                $history
                    ->action,

            'event_title' =>
                $history
                    ->event_title,

            'directorate' =>
                $directorate,

            'directorate_label' =>
                $directorate
                    ? $this
                        ->getDirectorateLabel(
                            $directorate
                        )
                    : null,

            'old_values' =>
                $oldValues,

            'new_values' =>
                $newValues,

            'description' =>
                $history
                    ->description,

            'user' =>
                $history
                    ->relationLoaded(
                        'user'
                    )
                    ? $history
                        ->user
                    : null,

            'user_name' =>
                (
                    $history
                        ->relationLoaded(
                            'user'
                        ) &&
                    $history
                        ->user
                )
                    ? $history
                        ->user
                        ->name
                    : 'User tidak tersedia',

            'created_at' =>
                optional(
                    $history
                        ->created_at
                )
                    ->toISOString(),
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
            $request
                ->user();

        if (
            !$user
        ) {
            return false;
        }

        return in_array(
            $user
                ->role,
            self::ADMIN_ROLES,
            true
        );
    }

    private function ensureCanManage(
        Request $request
    ): void {
        abort_unless(
            $this
                ->canManage(
                    $request
                ),
            403,
            'Anda tidak memiliki akses untuk mengelola Jadwal Direktorat.'
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
            $event
                ->start_time
                ? substr(
                    (string)
                        $event
                            ->start_time,
                    0,
                    5
                )
                : null;

        $endTime =
            $event
                ->end_time
                ? substr(
                    (string)
                        $event
                            ->end_time,
                    0,
                    5
                )
                : null;

        $start =
            $event
                ->all_day
                ? $date
                : $date .
                    'T' .
                    $startTime .
                    ':00';

        $end =
            $event
                ->all_day
                ? null
                : $date .
                    'T' .
                    $endTime .
                    ':00';

        $data = [
            'id' =>
                $event
                    ->id,

            'directorate' =>
                $event
                    ->directorate,

            'directorate_label' =>
                $this
                    ->getDirectorateLabel(
                        $event
                            ->directorate
                    ),

            'title' =>
                $event
                    ->title,

            'description' =>
                $event
                    ->description,

            'event_date' =>
                $date,

            'start_time' =>
                $startTime,

            'end_time' =>
                $endTime,

            'all_day' =>
                (bool)
                    $event
                        ->all_day,

            'allDay' =>
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
             * FullCalendar compatibility
             */
            'start' =>
                $start,

            'end' =>
                $end,

            'backgroundColor' =>
                $event
                    ->color,

            'borderColor' =>
                $event
                    ->color,
        ];

        if (
            $includeAdminData
        ) {
            $data[
                'created_by'
            ] =
                $event
                    ->created_by;

            $data[
                'updated_by'
            ] =
                $event
                    ->updated_by;

            $data[
                'created_by_user'
            ] =
                $event
                    ->relationLoaded(
                        'createdBy'
                    )
                    ? $event
                        ->createdBy
                    : null;

            $data[
                'updated_by_user'
            ] =
                $event
                    ->relationLoaded(
                        'updatedBy'
                    )
                    ? $event
                        ->updatedBy
                    : null;

            $data[
                'created_at'
            ] =
                optional(
                    $event
                        ->created_at
                )
                    ->toISOString();

            $data[
                'updated_at'
            ] =
                optional(
                    $event
                        ->updated_at
                )
                    ->toISOString();
        }

        return $data;
    }
}