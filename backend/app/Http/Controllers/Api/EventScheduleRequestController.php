<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventSchedule;
use App\Models\EventScheduleHistory;
use App\Models\EventScheduleRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class EventScheduleRequestController extends Controller
{
    private const APPROVAL_ROLES = [
        'admin',
        'superadmin',
    ];

    private const DIRECTORATES = [
        'direktorat',
        'direktur',
        'wakil_direktur_1',
        'wakil_direktur_2',
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

    private const COLORS = [
        'Rapat' => '#7F1D1D',
        'Kunjungan' => '#1D4ED8',
        'Internal' => '#4338CA',
        'Eksternal' => '#047857',
        'Seremonial' => '#C2410C',
        'Akademik' => '#7E22CE',
        'Lainnya' => '#475569',
    ];

    private function canApprove(Request $request): bool
    {
        return in_array(
            $request->user()?->role,
            self::APPROVAL_ROLES,
            true
        );
    }

    private function ensureCanApprove(Request $request): void
    {
        abort_unless(
            $this->canApprove($request),
            403,
            'Anda tidak memiliki akses approval jadwal.'
        );
    }

    private function ensureCanView(
        Request $request,
        EventScheduleRequest $scheduleRequest
    ): void {
        if ($this->canApprove($request)) {
            return;
        }

        abort_unless(
            (int) $scheduleRequest->requested_by ===
                (int) $request->user()?->id,
            403,
            'Anda tidak memiliki akses ke pengajuan ini.'
        );
    }

    private function validateSchedule(Request $request): array
    {
        $validated = $request->validate([
            'requester_unit' => [
                'required', 'string', 'max:255',
            ],
            'pic_name' => [
                'required', 'string', 'max:255',
            ],
            'directorate' => [
                'required',
                Rule::in(self::DIRECTORATES),
            ],
            'title' => [
                'required', 'string', 'max:255',
            ],
            'description' => [
                'nullable', 'string', 'max:5000',
            ],
            'event_date' => [
                'required', 'date_format:Y-m-d',
            ],
            'start_time' => [
                'nullable', 'date_format:H:i',
            ],
            'end_time' => [
                'nullable', 'date_format:H:i',
            ],
            'all_day' => [
                'required', 'boolean',
            ],
            'location' => [
                'nullable', 'string', 'max:255',
            ],
            'agenda_type' => [
                'required',
                Rule::in(self::AGENDA_TYPES),
            ],
            'is_public' => [
                'sometimes', 'boolean',
            ],
        ]);

        foreach (
            ['requester_unit', 'pic_name', 'title']
            as $field
        ) {
            $validated[$field] = trim(
                $validated[$field]
            );

            if ($validated[$field] === '') {
                throw ValidationException::withMessages([
                    $field => 'Kolom ini wajib diisi.',
                ]);
            }
        }

        $validated['description'] =
            trim($validated['description'] ?? '') ?: null;

        $validated['location'] =
            trim($validated['location'] ?? '') ?: null;

        $validated['all_day'] = filter_var(
            $validated['all_day'],
            FILTER_VALIDATE_BOOLEAN
        );

        $validated['is_public'] = filter_var(
            $validated['is_public'] ?? false,
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
                        'Jam mulai dan selesai wajib diisi.',
                ]);
            }

            if (
                $validated['end_time'] <=
                $validated['start_time']
            ) {
                throw ValidationException::withMessages([
                    'end_time' =>
                        'Jam selesai harus setelah jam mulai.',
                ]);
            }
        }

        return $validated;
    }

    private function validateDocuments(
        Request $request,
        bool $isCreating
    ): void {
        $request->validate([
            'rundown' => [
                $isCreating ? 'required' : 'nullable',
                'file',
                'mimes:pdf,doc,docx,xls,xlsx',
                'max:5120',
            ],
            'tor' => [
                'nullable',
                'file',
                'mimes:pdf,doc,docx,xls,xlsx',
                'max:5120',
            ],
        ], [
            'rundown.required' =>
                'Rundown kegiatan wajib dilampirkan.',
            'rundown.file' =>
                'Rundown harus berupa file yang valid.',
            'rundown.mimes' =>
                'Rundown harus berformat PDF, Word, atau Excel.',
            'rundown.max' =>
                'Ukuran rundown maksimal 5 MB.',
            'tor.file' =>
                'TOR harus berupa file yang valid.',
            'tor.mimes' =>
                'TOR harus berformat PDF, Word, atau Excel.',
            'tor.max' =>
                'Ukuran TOR maksimal 5 MB.',
        ]);
    }

    private function detail(
        EventScheduleRequest $scheduleRequest
    ): array {
        $scheduleRequest->load([
            'requester:id,name',
            'reviewer:id,name',
            'editor:id,name',
            'approvedSchedule:id,title',
        ]);

        return [
            'id' => $scheduleRequest->id,
            'requested_by' => $scheduleRequest->requested_by,
            'requester_name' => $scheduleRequest->requester?->name,

            'requester_unit' => $scheduleRequest->requester_unit,
            'pic_name' => $scheduleRequest->pic_name,
            'directorate' => $scheduleRequest->directorate,
            'title' => $scheduleRequest->title,
            'description' => $scheduleRequest->description,

            'event_date' => $scheduleRequest->event_date
                ?->format('Y-m-d'),

            'start_time' => $scheduleRequest->start_time
                ? substr($scheduleRequest->start_time, 0, 5)
                : null,

            'end_time' => $scheduleRequest->end_time
                ? substr($scheduleRequest->end_time, 0, 5)
                : null,

            'all_day' => (bool) $scheduleRequest->all_day,
            'location' => $scheduleRequest->location,
            'agenda_type' => $scheduleRequest->agenda_type,
            'is_public' => (bool) $scheduleRequest->is_public,
            'status' => $scheduleRequest->status,

            'rundown_name' => $scheduleRequest->rundown_name,
            'rundown_url' => $scheduleRequest->rundown_url,
            'tor_name' => $scheduleRequest->tor_name,
            'tor_url' => $scheduleRequest->tor_url,

            'approved_schedule_id' =>
                $scheduleRequest->approved_schedule_id,
            'approved_schedule' =>
                $scheduleRequest->approvedSchedule,

            'reviewed_by' => $scheduleRequest->reviewed_by,
            'reviewer_name' => $scheduleRequest->reviewer?->name,
            'reviewed_at' => $scheduleRequest->reviewed_at
                ?->toISOString(),

            'rejection_reason' =>
                $scheduleRequest->rejection_reason,

            'edited_by' => $scheduleRequest->edited_by,
            'editor_name' => $scheduleRequest->editor?->name,
            'edited_at' => $scheduleRequest->edited_at
                ?->toISOString(),

            'created_at' => $scheduleRequest->created_at
                ?->toISOString(),
            'updated_at' => $scheduleRequest->updated_at
                ?->toISOString(),
        ];
    }

    private function success(
        string $message,
        mixed $data = null,
        int $status = 200
    ) {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    public function myRequests(Request $request)
    {
        $query = EventScheduleRequest::query()
            ->where('requested_by', $request->user()->id);

        if ($request->filled('status')) {
            $validated = $request->validate([
                'status' => [
                    Rule::in([
                        'pending',
                        'approved',
                        'rejected',
                    ]),
                ],
            ]);

            $query->where('status', $validated['status']);
        }

        $requests = $query
            ->latest()
            ->get()
            ->map(fn ($item) => $this->detail($item));

        return $this->success(
            'Riwayat pengajuan jadwal berhasil diambil.',
            $requests
        );
    }

    public function index(Request $request)
    {
        $this->ensureCanApprove($request);

        $validated = $request->validate([
            'status' => [
                'nullable',
                Rule::in([
                    'pending',
                    'approved',
                    'rejected',
                ]),
            ],
            'directorate' => [
                'nullable',
                Rule::in(self::DIRECTORATES),
            ],
            'search' => [
                'nullable', 'string', 'max:255',
            ],
        ]);

        $base = EventScheduleRequest::query();

        if (!empty($validated['directorate'])) {
            $base->where(
                'directorate',
                $validated['directorate']
            );
        }

        if (!empty($validated['search'])) {
            $term = trim($validated['search']);

            $base->where(function ($query) use ($term) {
                $query
                    ->where('title', 'like', "%{$term}%")
                    ->orWhere(
                        'requester_unit',
                        'like',
                        "%{$term}%"
                    )
                    ->orWhere(
                        'pic_name',
                        'like',
                        "%{$term}%"
                    )
                    ->orWhere(
                        'location',
                        'like',
                        "%{$term}%"
                    )
                    ->orWhere(
                        'description',
                        'like',
                        "%{$term}%"
                    )
                    ->orWhereHas(
                        'requester',
                        fn ($userQuery) =>
                            $userQuery->where(
                                'name',
                                'like',
                                "%{$term}%"
                            )
                    );
            });
        }

        $summary = [
            'total' => (clone $base)->count(),
            'pending' => (clone $base)
                ->where('status', 'pending')->count(),
            'approved' => (clone $base)
                ->where('status', 'approved')->count(),
            'rejected' => (clone $base)
                ->where('status', 'rejected')->count(),
        ];

        if (!empty($validated['status'])) {
            $base->where(
                'status',
                $validated['status']
            );
        }

        $results = $base
            ->orderByRaw(
                "CASE WHEN status = 'pending' THEN 0 ELSE 1 END"
            )
            ->latest()
            ->get()
            ->map(fn ($item) => $this->detail($item));

        return $this->success(
            'Daftar pengajuan jadwal berhasil diambil.',
            [
                'requests' => $results,
                'summary' => $summary,
                'can_approve' => true,
            ]
        );
    }

    public function store(Request $request)
    {
        $validated = $this->validateSchedule($request);
        $this->validateDocuments($request, true);

        $rundownPath = null;
        $torPath = null;

        try {
            $rundown = $request->file('rundown');
            $tor = $request->file('tor');

            $rundownPath = $rundown->store(
                'directorate/rundown',
                'public'
            );

            if ($tor) {
                $torPath = $tor->store(
                    'directorate/tor',
                    'public'
                );
            }

            $scheduleRequest = EventScheduleRequest::create([
                ...$validated,
                'requested_by' => $request->user()->id,

                'rundown_path' => $rundownPath,
                'rundown_name' =>
                    $rundown->getClientOriginalName(),

                'tor_path' => $torPath,
                'tor_name' => $tor
                    ? $tor->getClientOriginalName()
                    : null,

                'status' => EventScheduleRequest::STATUS_PENDING,
            ]);

            return $this->success(
                'Pengajuan jadwal berhasil dikirim dan menunggu persetujuan.',
                $this->detail($scheduleRequest),
                201
            );
        } catch (Throwable $error) {
            if ($rundownPath) {
                Storage::disk('public')->delete($rundownPath);
            }

            if ($torPath) {
                Storage::disk('public')->delete($torPath);
            }

            throw $error;
        }
    }

    
public function show(
    Request $request,
    EventScheduleRequest $scheduleRequest
) {
    // Admin boleh mengakses semua request.
    // User hanya boleh mengakses pengajuannya sendiri.
    $this->ensureCanView($request, $scheduleRequest);

    // Akses dokumen menggunakan endpoint yang sama.
    if ($request->filled('document')) {
        return $this->serveDocument(
            $request,
            $scheduleRequest
        );
    }

    return $this->success(
        'Detail pengajuan jadwal berhasil diambil.',
        $this->detail($scheduleRequest)
    );
}


private function serveDocument(
    Request $request,
    EventScheduleRequest $scheduleRequest
) {
    $validated = $request->validate([
        'document' => [
            'required',
            'in:rundown,tor',
        ],
        'disposition' => [
            'nullable',
            'in:inline,attachment',
        ],
    ]);

    $type = $validated['document'];

    if ($type === 'rundown') {
        $path = $scheduleRequest->rundown_path;
        $filename = $scheduleRequest->rundown_name;
    } else {
        $path = $scheduleRequest->tor_path;
        $filename = $scheduleRequest->tor_name;
    }

    if (!$path) {
        abort(404, 'Dokumen belum dilampirkan.');
    }

    $disk = Storage::disk('public');

    if (!$disk->exists($path)) {
        abort(404, 'File dokumen tidak ditemukan.');
    }

    $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

    $allowedExtensions = [
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
    ];

    if (!in_array($extension, $allowedExtensions, true)) {
        abort(404, 'Format dokumen tidak didukung.');
    }

    $disposition = $validated['disposition'] ?? 'attachment';

    // Preview inline hanya diperbolehkan untuk PDF.
    if ($disposition === 'inline' && $extension !== 'pdf') {
        $disposition = 'attachment';
    }

    $filename = basename(
        $filename ?: "dokumen.{$extension}"
    );

    return $disk->response(
        $path,
        $filename,
        [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ],
        $disposition
    );
}



    public function update(
        Request $request,
        EventScheduleRequest $scheduleRequest
    ) {
        $this->ensureCanApprove($request);

        $validated = $this->validateSchedule($request);
        $this->validateDocuments($request, false);

        $newRundown = null;
        $newTor = null;

        try {
            if ($request->hasFile('rundown')) {
                $newRundown = $request->file('rundown')->store(
                    'directorate/rundown',
                    'public'
                );
            }

            if ($request->hasFile('tor')) {
                $newTor = $request->file('tor')->store(
                    'directorate/tor',
                    'public'
                );
            }

            $oldPaths = [];

            $scheduleRequest = DB::transaction(
                function () use (
                    $scheduleRequest,
                    $validated,
                    $request,
                    $newRundown,
                    $newTor,
                    &$oldPaths
                ) {
                    $locked = EventScheduleRequest::query()
                        ->lockForUpdate()
                        ->findOrFail($scheduleRequest->id);

                    if (
                        $locked->status !==
                        EventScheduleRequest::STATUS_PENDING
                    ) {
                        throw ValidationException::withMessages([
                            'status' =>
                                'Hanya pengajuan pending yang dapat diedit.',
                        ]);
                    }

                    $changes = [
                        ...$validated,
                        'edited_by' => $request->user()->id,
                        'edited_at' => now(),
                    ];

                    if ($newRundown) {
                        $oldPaths[] = $locked->rundown_path;

                        $changes['rundown_path'] = $newRundown;
                        $changes['rundown_name'] =
                            $request->file('rundown')
                                ->getClientOriginalName();
                    }

                    if ($newTor) {
                        $oldPaths[] = $locked->tor_path;

                        $changes['tor_path'] = $newTor;
                        $changes['tor_name'] =
                            $request->file('tor')
                                ->getClientOriginalName();
                    }

                    $locked->update($changes);

                    return $locked->fresh();
                }
            );

            foreach ($oldPaths as $path) {
                if ($path) {
                    Storage::disk('public')->delete($path);
                }
            }

            return $this->success(
                'Pengajuan jadwal berhasil diperbarui.',
                $this->detail($scheduleRequest)
            );
        } catch (Throwable $error) {
            foreach ([$newRundown, $newTor] as $path) {
                if ($path) {
                    Storage::disk('public')->delete($path);
                }
            }

            throw $error;
        }
    }

    private function conflictingDirectorates(
        string $directorate
    ): array {
        if ($directorate === 'direktorat') {
            return self::DIRECTORATES;
        }

        return ['direktorat', $directorate];
    }

    private function findConflict(
        EventScheduleRequest $scheduleRequest
    ): ?EventSchedule {
        $query = EventSchedule::query()
            ->whereDate(
                'event_date',
                $scheduleRequest->event_date->format('Y-m-d')
            )
            ->whereIn(
                'directorate',
                $this->conflictingDirectorates(
                    $scheduleRequest->directorate
                )
            );

        if ($scheduleRequest->all_day) {
            return $query->first();
        }

        return $query
            ->where(function ($query) use ($scheduleRequest) {
                $query
                    ->where('all_day', true)
                    ->orWhere(function ($timeQuery) use ($scheduleRequest) {
                        $timeQuery
                            ->where('all_day', false)
                            ->where(
                                'start_time',
                                '<',
                                $scheduleRequest->end_time
                            )
                            ->where(
                                'end_time',
                                '>',
                                $scheduleRequest->start_time
                            );
                    });
            })
            ->first();
    }

    public function approve(
        Request $request,
        EventScheduleRequest $scheduleRequest
    ) {
        $this->ensureCanApprove($request);

        $result = DB::transaction(
            function () use ($request, $scheduleRequest) {
                $locked = EventScheduleRequest::query()
                    ->lockForUpdate()
                    ->findOrFail($scheduleRequest->id);

                if (
                    $locked->status !==
                    EventScheduleRequest::STATUS_PENDING
                ) {
                    throw ValidationException::withMessages([
                        'status' =>
                            'Pengajuan sudah diproses sebelumnya.',
                    ]);
                }

                $conflict = $this->findConflict($locked);

                if ($conflict) {
                    return ['conflict' => $conflict];
                }

                $actorId = $request->user()->id;

                $color = self::COLORS[$locked->agenda_type]
                    ?? self::COLORS['Lainnya'];

                $event = EventSchedule::create([
                    'directorate' => $locked->directorate,
                    'title' => $locked->title,
                    'description' => $locked->description,
                    'event_date' =>
                        $locked->event_date->format('Y-m-d'),
                    'start_time' => $locked->all_day
                        ? null
                        : $locked->start_time,
                    'end_time' => $locked->all_day
                        ? null
                        : $locked->end_time,
                    'all_day' => (bool) $locked->all_day,
                    'location' => $locked->location,
                    'agenda_type' => $locked->agenda_type,
                    'color' => $color,
                    'is_public' => (bool) $locked->is_public,
                    'created_by' => $actorId,
                    'updated_by' => $actorId,
                ]);

                EventScheduleHistory::create([
                    'event_schedule_id' => $event->id,
                    'user_id' => $actorId,
                    'action' => 'created',
                    'event_title' => $event->title,
                    'old_values' => null,
                    'new_values' => [
                        'directorate' => $event->directorate,
                        'title' => $event->title,
                        'description' => $event->description,
                        'event_date' =>
                            $event->event_date->format('Y-m-d'),
                        'start_time' => $event->start_time
                            ? substr($event->start_time, 0, 5)
                            : null,
                        'end_time' => $event->end_time
                            ? substr($event->end_time, 0, 5)
                            : null,
                        'all_day' => (bool) $event->all_day,
                        'location' => $event->location,
                        'agenda_type' => $event->agenda_type,
                        'color' => $event->color,
                        'is_public' => (bool) $event->is_public,
                    ],
                    'description' =>
                        'Agenda dibuat melalui approval pengajuan jadwal #' .
                        $locked->id,
                ]);

                $locked->update([
                    'status' =>
                        EventScheduleRequest::STATUS_APPROVED,
                    'approved_schedule_id' => $event->id,
                    'reviewed_by' => $actorId,
                    'reviewed_at' => now(),
                    'rejection_reason' => null,
                ]);

                return [
                    'request' => $locked->fresh(),
                    'event' => $event,
                ];
            }
        );

        if (isset($result['conflict'])) {
            $conflict = $result['conflict'];

            return response()->json([
                'success' => false,
                'code' => 'SCHEDULE_CONFLICT',
                'message' =>
                    'Pengajuan belum dapat disetujui karena jadwal bertabrakan dengan agenda yang sudah ada.',
                'data' => [
                    'conflict' => [
                        'id' => $conflict->id,
                        'title' => $conflict->title,
                        'directorate' => $conflict->directorate,
                        'event_date' => $conflict->event_date
                            ->format('Y-m-d'),
                        'start_time' => $conflict->start_time,
                        'end_time' => $conflict->end_time,
                        'all_day' => (bool) $conflict->all_day,
                    ],
                ],
            ], 409);
        }

        return $this->success(
            'Pengajuan berhasil disetujui dan agenda masuk ke kalender Direktorat.',
            [
                'request' => $this->detail($result['request']),
                'event_id' => $result['event']->id,
            ]
        );
    }

    public function reject(
        Request $request,
        EventScheduleRequest $scheduleRequest
    ) {
        $this->ensureCanApprove($request);

        $validated = $request->validate([
            'rejection_reason' => [
                'required', 'string', 'max:2000',
            ],
        ]);

        $reason = trim($validated['rejection_reason']);

        if ($reason === '') {
            throw ValidationException::withMessages([
                'rejection_reason' =>
                    'Alasan penolakan wajib diisi.',
            ]);
        }

        $scheduleRequest = DB::transaction(
            function () use (
                $request,
                $scheduleRequest,
                $reason
            ) {
                $locked = EventScheduleRequest::query()
                    ->lockForUpdate()
                    ->findOrFail($scheduleRequest->id);

                if (
                    $locked->status !==
                    EventScheduleRequest::STATUS_PENDING
                ) {
                    throw ValidationException::withMessages([
                        'status' =>
                            'Pengajuan sudah diproses sebelumnya.',
                    ]);
                }

                $locked->update([
                    'status' =>
                        EventScheduleRequest::STATUS_REJECTED,
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                    'rejection_reason' => $reason,
                ]);

                return $locked->fresh();
            }
        );

        return $this->success(
            'Pengajuan jadwal berhasil ditolak.',
            $this->detail($scheduleRequest)
        );
    }
}
