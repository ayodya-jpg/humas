
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
        'requester_unit',
        'pic_name',
        'event_date',
        'start_time',
        'end_time',
        'all_day',
        'location',
        'agenda_type',
        'color',
        'is_public',
    ];

    private function canManage(Request $request): bool
    {
        return in_array(
            $request->user()?->role,
            self::ADMIN_ROLES,
            true
        );
    }

    private function ensureCanManage(Request $request): void
    {
        abort_unless(
            $this->canManage($request),
            403,
            'Anda tidak memiliki akses untuk mengelola Jadwal Direktorat.'
        );
    }

    private function directorateLabel(?string $value): string
    {
        return self::DIRECTORATE_LABELS[$value] ?? 'Direktorat';
    }

    private function directorateOptions(): array
    {
        return collect(self::DIRECTORATE_LABELS)
            ->map(fn ($label, $value) => [
                'value' => $value,
                'label' => $label,
            ])
            ->values()
            ->all();
    }

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
            'directorate' => [
                'nullable',
                Rule::in(array_keys(self::DIRECTORATE_LABELS)),
            ],
        ]);

        $query = EventSchedule::query()
            ->where('is_public', true);

        $this->applyDateFilters($query, $validated);

        if (!empty($validated['directorate'])) {
            $query->where(
                'directorate',
                $validated['directorate']
            );
        }

        if (filter_var(
            $validated['upcoming'] ?? false,
            FILTER_VALIDATE_BOOLEAN
        )) {
            $query->whereDate(
                'event_date',
                '>=',
                now()->toDateString()
            );
        }

        $query = $this->orderEvents($query);

        if (!empty($validated['limit'])) {
            $query->limit((int) $validated['limit']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Jadwal Direktorat berhasil diambil.',
            'data' => $query->get()
                ->map(fn ($event) => $this->transformEvent($event, false))
                ->values(),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | INDEX - AGENDA INTERNAL
    |--------------------------------------------------------------------------
    */

    public function index(Request $request)
    {
        $validated = $request->validate([
            'start' => ['nullable', 'date'],
            'end' => ['nullable', 'date'],
            'directorate' => [
                'nullable',
                Rule::in(array_keys(self::DIRECTORATE_LABELS)),
            ],
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

        $this->applyDateFilters($query, $validated);

        if (!empty($validated['directorate'])) {
            $query->where('directorate', $validated['directorate']);
        }

        if (!empty($validated['agenda_type'])) {
            $query->where('agenda_type', $validated['agenda_type']);
        }

        $canManage = $this->canManage($request);

        if (!empty($validated['search'])) {
            $term = trim($validated['search']);

            $query->where(function ($q) use ($term, $canManage) {
                $q->where('title', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%")
                    ->orWhere('location', 'like', "%{$term}%");

                if ($canManage) {
                    $q->orWhere('requester_unit', 'like', "%{$term}%")
                        ->orWhere('pic_name', 'like', "%{$term}%");
                }
            });
        }

        return response()->json([
            'success' => true,
            'message' => 'Jadwal Direktorat berhasil diambil.',
            'data' => [
                'events' => $this->orderEvents($query)
                    ->get()
                    ->map(fn ($event) =>
                        $this->transformEvent($event, $canManage)
                    )
                    ->values(),
                'directorates' => $this->directorateOptions(),
                'agenda_types' => self::AGENDA_TYPES,
                'can_manage' => $canManage,
            ],
        ]);
    }

    private function applyDateFilters($query, array $validated): void
    {
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
    }

    private function orderEvents($query)
    {
        return $query
            ->orderBy('event_date')
            ->orderByRaw(
                'CASE WHEN all_day = 1 THEN 0 ELSE 1 END'
            )
            ->orderBy('start_time');
    }

    /*
    |--------------------------------------------------------------------------
    | DETAIL AGENDA
    |--------------------------------------------------------------------------
    */

    public function show(
        Request $request,
        EventSchedule $eventSchedule
    ) {
        $canManage = $this->canManage($request);

        $eventSchedule->load([
            'createdBy:id,name',
            'updatedBy:id,name',
        ]);

        if ($canManage) {
            $eventSchedule->load([
                'histories' => fn ($query) =>
                    $query->with('user:id,name')->latest(),
            ]);
        }

        $data = $this->transformEvent($eventSchedule, $canManage);

        $data['can_manage'] = $canManage;

        if ($canManage) {
            $data['histories'] = $eventSchedule->histories
                ->map(fn ($history) =>
                    $this->transformHistory($history)
                )
                ->values();
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail Jadwal Direktorat berhasil diambil.',
            'data' => $data,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    private function validatePayload(Request $request): array
    {
        $validated = $request->validate([
            'directorate' => [
                'required',
                Rule::in(array_keys(self::DIRECTORATE_LABELS)),
            ],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],

            // Unit dan PIC dapat dikosongkan untuk agenda lama
            // atau agenda yang dibuat langsung oleh admin.
            'requester_unit' => ['nullable', 'string', 'max:255'],
            'pic_name' => ['nullable', 'string', 'max:255'],

            'event_date' => ['required', 'date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'all_day' => ['required', 'boolean'],
            'location' => ['nullable', 'string', 'max:255'],
            'agenda_type' => [
                'required',
                Rule::in(self::AGENDA_TYPES),
            ],
            'color' => [
                'required',
                'string',
                'regex:/^#[0-9A-Fa-f]{6}$/',
            ],
            'is_public' => ['required', 'boolean'],
        ]);

        foreach ([
            'title',
            'description',
            'location',
            'requester_unit',
            'pic_name',
        ] as $field) {
            if (array_key_exists($field, $validated)) {
                $validated[$field] =
                    trim((string) ($validated[$field] ?? '')) ?: null;
            }
        }

        if (!$validated['title']) {
            throw ValidationException::withMessages([
                'title' => 'Judul agenda wajib diisi.',
            ]);
        }

        $validated['all_day'] = filter_var(
            $validated['all_day'],
            FILTER_VALIDATE_BOOLEAN
        );

        $validated['is_public'] = filter_var(
            $validated['is_public'],
            FILTER_VALIDATE_BOOLEAN
        );

        if ($validated['all_day']) {
            $validated['start_time'] = null;
            $validated['end_time'] = null;
        } else {
            if (
                empty($validated['start_time']) ||
                empty($validated['end_time'])
            ) {
                throw ValidationException::withMessages([
                    'start_time' =>
                        'Jam mulai dan jam selesai wajib diisi.',
                ]);
            }

            if ($validated['end_time'] <= $validated['start_time']) {
                throw ValidationException::withMessages([
                    'end_time' =>
                        'Jam selesai harus setelah jam mulai.',
                ]);
            }
        }

        return $validated;
    }

    /*
    |--------------------------------------------------------------------------
    | CONFLICT DETECTION
    |--------------------------------------------------------------------------
    */

    private function conflictDirectorates(string $directorate): array
    {
        if ($directorate === 'direktorat') {
            return array_keys(self::DIRECTORATE_LABELS);
        }

        return ['direktorat', $directorate];
    }

    private function findConflict(
        array $data,
        ?int $excludeId = null,
        bool $lockForUpdate = false
    ): ?EventSchedule {
        $query = EventSchedule::query()
            ->whereIn(
                'directorate',
                $this->conflictDirectorates($data['directorate'])
            )
            ->whereDate('event_date', $data['event_date']);

        if ($excludeId !== null) {
            $query->where('id', '!=', $excludeId);
        }

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        if (!empty($data['all_day'])) {
            return $query->first();
        }

        return $query
            ->where(function ($q) use ($data) {
                $q->where('all_day', true)
                    ->orWhere(function ($times) use ($data) {
                        $times->where('all_day', false)
                            ->where(
                                'start_time',
                                '<',
                                $data['end_time']
                            )
                            ->where(
                                'end_time',
                                '>',
                                $data['start_time']
                            );
                    });
            })
            ->first();
    }

    private function throwScheduleConflict(
        EventSchedule $conflict,
        string $requestedDirectorate
    ): void {
        $conflictLabel = $this->directorateLabel(
            $conflict->directorate
        );

        $requestedLabel = $this->directorateLabel(
            $requestedDirectorate
        );

        if ($requestedDirectorate === 'direktorat') {
            $message =
                'Agenda Direktorat tidak dapat disimpan karena salah satu pimpinan memiliki jadwal bentrok.';
        } elseif ($conflict->directorate === 'direktorat') {
            $message =
                "Agenda {$requestedLabel} tidak dapat disimpan karena terdapat Agenda Direktorat pada waktu tersebut.";
        } else {
            $message =
                "Agenda {$requestedLabel} tidak dapat disimpan karena jadwal {$conflictLabel} sudah terisi.";
        }

        $timeText = $conflict->all_day
            ? 'Sepanjang Hari'
            : substr((string) $conflict->start_time, 0, 5) .
                ' - ' .
                substr((string) $conflict->end_time, 0, 5);

        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'code' => 'SCHEDULE_CONFLICT',
                'message' => $message,
                'data' => [
                    'requested_directorate' => $requestedDirectorate,
                    'requested_directorate_label' => $requestedLabel,
                    'conflict' => [
                        'id' => $conflict->id,
                        'directorate' => $conflict->directorate,
                        'directorate_label' => $conflictLabel,
                        'title' => $conflict->title,
                        'event_date' => $conflict->event_date
                            ->format('Y-m-d'),
                        'start_time' => $conflict->start_time
                            ? substr($conflict->start_time, 0, 5)
                            : null,
                        'end_time' => $conflict->end_time
                            ? substr($conflict->end_time, 0, 5)
                            : null,
                        'all_day' => (bool) $conflict->all_day,
                        'time_text' => $timeText,
                        'location' => $conflict->location,
                        'agenda_type' => $conflict->agenda_type,
                    ],
                ],
            ], 409)
        );
    }

    /*
    |--------------------------------------------------------------------------
    | STORE AGENDA
    |--------------------------------------------------------------------------
    */

    public function store(Request $request)
    {
        $this->ensureCanManage($request);

        $data = $this->validatePayload($request);

        $event = DB::transaction(function () use ($data, $request) {
            $conflict = $this->findConflict($data, null, true);

            if ($conflict) {
                $this->throwScheduleConflict(
                    $conflict,
                    $data['directorate']
                );
            }

            $data['created_by'] = $request->user()->id;
            $data['updated_by'] = $request->user()->id;

            $event = EventSchedule::create($data);

            $this->writeHistory(
                $event,
                $request->user()->id,
                'created',
                null,
                $this->auditSnapshot($event),
                'Agenda Direktorat dibuat.'
            );

            return $event;
        });

        $event->load([
            'createdBy:id,name',
            'updatedBy:id,name',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Agenda Direktorat berhasil ditambahkan.',
            'data' => $this->transformEvent($event, true),
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE AGENDA
    |--------------------------------------------------------------------------
    */

    public function update(
        Request $request,
        EventSchedule $eventSchedule
    ) {
        $this->ensureCanManage($request);

        $data = $this->validatePayload($request);

        DB::transaction(function () use ($request, $eventSchedule, $data) {
            $event = EventSchedule::query()
                ->lockForUpdate()
                ->findOrFail($eventSchedule->id);

            $conflict = $this->findConflict(
                $data,
                $event->id,
                true
            );

            if ($conflict) {
                $this->throwScheduleConflict(
                    $conflict,
                    $data['directorate']
                );
            }

            $before = $this->auditSnapshot($event);

            $data['updated_by'] = $request->user()->id;

            $event->update($data);
            $event->refresh();

            $after = $this->auditSnapshot($event);

            [$oldValues, $newValues] =
                $this->changedAuditValues($before, $after);

            if ($oldValues || $newValues) {
                $this->writeHistory(
                    $event,
                    $request->user()->id,
                    'updated',
                    $oldValues,
                    $newValues,
                    'Agenda Direktorat diperbarui.'
                );
            }
        });

        $eventSchedule->refresh()->load([
            'createdBy:id,name',
            'updatedBy:id,name',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Agenda Direktorat berhasil diperbarui.',
            'data' => $this->transformEvent($eventSchedule, true),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | DELETE AGENDA
    |--------------------------------------------------------------------------
    */

    public function destroy(
        Request $request,
        EventSchedule $eventSchedule
    ) {
        $this->ensureCanManage($request);

        DB::transaction(function () use ($request, $eventSchedule) {
            $event = EventSchedule::query()
                ->lockForUpdate()
                ->findOrFail($eventSchedule->id);

            $this->writeHistory(
                $event,
                $request->user()->id,
                'deleted',
                $this->auditSnapshot($event),
                null,
                'Agenda Direktorat dihapus.'
            );

            $event->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Agenda Direktorat berhasil dihapus.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | AUDIT HELPERS
    |--------------------------------------------------------------------------
    */

    private function auditSnapshot(EventSchedule $event): array
    {
        $snapshot = [];

        foreach (self::AUDITABLE_FIELDS as $field) {
            $value = $event->{$field};

            if ($field === 'event_date' && $value) {
                $value = $event->event_date->format('Y-m-d');
            }

            if (
                in_array($field, ['start_time', 'end_time'], true) &&
                $value
            ) {
                $value = substr((string) $value, 0, 5);
            }

            if (in_array($field, ['all_day', 'is_public'], true)) {
                $value = (bool) $value;
            }

            $snapshot[$field] = $value;
        }

        return $snapshot;
    }

    private function changedAuditValues(
        array $before,
        array $after
    ): array {
        $oldValues = [];
        $newValues = [];

        foreach (self::AUDITABLE_FIELDS as $field) {
            $old = $before[$field] ?? null;
            $new = $after[$field] ?? null;

            if ($old !== $new) {
                $oldValues[$field] = $old;
                $newValues[$field] = $new;
            }
        }

        return [$oldValues, $newValues];
    }

    private function writeHistory(
        EventSchedule $event,
        int $userId,
        string $action,
        ?array $oldValues,
        ?array $newValues,
        string $description
    ): void {
        EventScheduleHistory::create([
            'event_schedule_id' => $event->id,
            'user_id' => $userId,
            'action' => $action,
            'event_title' => $event->title,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'description' => $description,
        ]);
    }

    private function transformHistory(
        EventScheduleHistory $history
    ): array {
        $old = $history->old_values ?? [];
        $new = $history->new_values ?? [];

        $directorate =
            $history->eventSchedule?->directorate ??
            $new['directorate'] ??
            $old['directorate'] ??
            null;

        return [
            'id' => $history->id,
            'event_schedule_id' => $history->event_schedule_id,
            'event_exists' => $history->event_schedule_id !== null,
            'action' => $history->action,
            'event_title' => $history->event_title,
            'directorate' => $directorate,
            'directorate_label' => $directorate
                ? $this->directorateLabel($directorate)
                : null,
            'old_values' => $old,
            'new_values' => $new,
            'description' => $history->description,
            'user' => $history->user,
            'user_name' => $history->user?->name ??
                'User tidak tersedia',
            'created_at' => $history->created_at
                ?->toISOString(),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | RIWAYAT AKTIVITAS
    |--------------------------------------------------------------------------
    */

    public function activity(Request $request)
    {
        $this->ensureCanManage($request);

        $validated = $request->validate([
            'action' => [
                'nullable',
                Rule::in(['created', 'updated', 'deleted']),
            ],
            'directorate' => [
                'nullable',
                Rule::in(array_keys(self::DIRECTORATE_LABELS)),
            ],
            'search' => ['nullable', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'end_date' => [
                'nullable',
                'date',
                'after_or_equal:start_date',
            ],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => [
                'nullable',
                'integer',
                'min:5',
                'max:100',
            ],
        ]);

        $query = EventScheduleHistory::query()
            ->with([
                'user:id,name',
                'eventSchedule:id,directorate',
            ]);

        if (!empty($validated['search'])) {
            $term = trim($validated['search']);

            $query->where(function ($q) use ($term) {
                $q->where('event_title', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%")
                    ->orWhereHas(
                        'user',
                        fn ($userQuery) =>
                            $userQuery->where(
                                'name',
                                'like',
                                "%{$term}%"
                            )
                    );
            });
        }

        if (!empty($validated['directorate'])) {
            $directorate = $validated['directorate'];

            $query->where(function ($q) use ($directorate) {
                $q->whereHas(
                    'eventSchedule',
                    fn ($eventQuery) =>
                        $eventQuery->where(
                            'directorate',
                            $directorate
                        )
                )
                ->orWhere(
                    'new_values->directorate',
                    $directorate
                )
                ->orWhere(
                    'old_values->directorate',
                    $directorate
                );
            });
        }

        if (!empty($validated['start_date'])) {
            $query->whereDate(
                'created_at',
                '>=',
                $validated['start_date']
            );
        }

        if (!empty($validated['end_date'])) {
            $query->whereDate(
                'created_at',
                '<=',
                $validated['end_date']
            );
        }

        $summaryBase = clone $query;

        $summary = [
            'total' => (clone $summaryBase)->count(),
            'created' => (clone $summaryBase)
                ->where('action', 'created')->count(),
            'updated' => (clone $summaryBase)
                ->where('action', 'updated')->count(),
            'deleted' => (clone $summaryBase)
                ->where('action', 'deleted')->count(),
        ];

        if (!empty($validated['action'])) {
            $query->where('action', $validated['action']);
        }

        $paginator = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate((int) ($validated['per_page'] ?? 20));

        $histories = $paginator->getCollection()
            ->map(fn ($history) =>
                $this->transformHistory($history)
            )
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Riwayat Jadwal Direktorat berhasil diambil.',
            'data' => [
                'histories' => $histories,
                'summary' => $summary,
                'directorates' => $this->directorateOptions(),
                'actions' => [
                    ['value' => 'created', 'label' => 'Dibuat'],
                    ['value' => 'updated', 'label' => 'Diperbarui'],
                    ['value' => 'deleted', 'label' => 'Dihapus'],
                ],
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'from' => $paginator->firstItem(),
                    'to' => $paginator->lastItem(),
                ],
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | RESPONSE AGENDA
    |--------------------------------------------------------------------------
    */

    private function transformEvent(
        EventSchedule $event,
        bool $includeAdminData = false
    ): array {
        $date = $event->event_date->format('Y-m-d');

        $startTime = $event->start_time
            ? substr((string) $event->start_time, 0, 5)
            : null;

        $endTime = $event->end_time
            ? substr((string) $event->end_time, 0, 5)
            : null;

        $data = [
            'id' => $event->id,
            'directorate' => $event->directorate,
            'directorate_label' =>
                $this->directorateLabel($event->directorate),
            'title' => $event->title,
            'description' => $event->description,
            'event_date' => $date,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'all_day' => (bool) $event->all_day,
            'allDay' => (bool) $event->all_day,
            'location' => $event->location,
            'agenda_type' => $event->agenda_type,
            'color' => $event->color,
            'is_public' => (bool) $event->is_public,
            'start' => $event->all_day
                ? $date
                : "{$date}T{$startTime}:00",
            'end' => $event->all_day
                ? null
                : "{$date}T{$endTime}:00",
            'backgroundColor' => $event->color,
            'borderColor' => $event->color,
        ];

        if ($includeAdminData) {
            $data['requester_unit'] = $event->requester_unit;
            $data['pic_name'] = $event->pic_name;

            $data['created_by'] = $event->created_by;
            $data['updated_by'] = $event->updated_by;

            $data['created_by_user'] =
                $event->relationLoaded('createdBy')
                    ? $event->createdBy
                    : null;

            $data['updated_by_user'] =
                $event->relationLoaded('updatedBy')
                    ? $event->updatedBy
                    : null;

            $data['created_at'] = $event->created_at
                ?->toISOString();

            $data['updated_at'] = $event->updated_at
                ?->toISOString();
        }

        return $data;
    }
}
