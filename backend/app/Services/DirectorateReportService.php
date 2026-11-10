<?php

namespace App\Services;

use App\Models\EventSchedule;
use App\Models\EventScheduleRequest;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DirectorateReportService
{
    private const DIRECTORATES = [
        'direktorat' => 'Direktorat Bersama',
        'direktur' => 'Direktur',
        'wakil_direktur_1' => 'Wakil Direktur I',
        'wakil_direktur_2' => 'Wakil Direktur II',
    ];

    private function collectPeriod(
        CarbonImmutable $start,
        CarbonImmutable $end,
        bool $canViewRequests,
        bool $canViewMeetingNotes
    ): array {
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $events = EventSchedule::query()
            ->whereBetween('event_date', [$startDate, $endDate])
            ->orderBy('event_date')
            ->orderBy('start_time')
            ->get();

        $requests = $canViewRequests
            ? EventScheduleRequest::query()
                ->whereBetween('created_at', [
                    $start->startOfDay(),
                    $end->endOfDay(),
                ])
                ->orderByDesc('created_at')
                ->get()
            : collect();

        $hasMeetingRecords = Schema::hasTable('meeting_records');

        $meetings = $hasMeetingRecords && $canViewMeetingNotes
            ? DB::table('meeting_records')
                ->whereBetween('meeting_date', [
                    $startDate,
                    $endDate,
                ])
                ->orderByDesc('meeting_date')
                ->get()
            : collect();

        $directorates = [];

        foreach (self::DIRECTORATES as $key => $label) {
            $directorateEvents = $events->where('directorate', $key);

            $directorates[] = [
                'key' => $key,
                'label' => $label,
                'total' => $directorateEvents->count(),
                'rapat' => $directorateEvents
                    ->where('agenda_type', 'Rapat')
                    ->count(),
                'other' => $directorateEvents
                    ->where('agenda_type', '!=', 'Rapat')
                    ->count(),
            ];
        }

        $categoryCounts = $events
            ->groupBy(fn ($event) => $event->agenda_type ?: 'Lainnya')
            ->map(fn ($group, $category) => [
                'category' => $category,
                'total' => $group->count(),
            ])
            ->values()
            ->all();

        $agendaRows = $events->map(
            fn ($event): array => [
                'id' => $event->id,
                'event_date' => $event->event_date->toDateString(),
                'directorate' => $event->directorate,
                'directorate_label' =>
                    self::DIRECTORATES[$event->directorate]
                    ?? $event->directorate,
                'title' => $event->title,
                'agenda_type' => $event->agenda_type,
                'start_time' => $event->start_time,
                'end_time' => $event->end_time,
                'location' => $event->location,
            ]
        )->values()->all();

        $requestRows = $requests->map(
            fn ($item): array => [
                'id' => $item->id,
                'created_at' => $item->created_at?->toDateString(),
                'event_date' => $item->event_date?->toDateString(),
                'directorate' => $item->directorate,
                'directorate_label' =>
                    self::DIRECTORATES[$item->directorate]
                    ?? $item->directorate,
                'title' => $item->title,
                'requester_unit' => $item->requester_unit,
                'pic_name' => $item->pic_name,
                'status' => $item->status,
                'approved_schedule_id' => $item->approved_schedule_id,
            ]
        )->values()->all();

        $meetingRows = $meetings->map(
            fn ($item): array => [
                'meeting_date' => $item->meeting_date,
                'directorate' => $item->directorate,
                'title' => $item->title,
                'realization_status' => $item->realization_status,
                'participants_count' => $item->participants_count,
                'notes' => $item->notes,
                'decisions' => $item->decisions,
                'follow_up' => $item->follow_up,
                'follow_up_pic' => $item->follow_up_pic,
                'follow_up_due_date' => $item->follow_up_due_date,
            ]
        )->values()->all();

        return [
            'summary' => [
                'total_agendas' => $events->count(),
                'planned_meetings' => $events
                    ->where('agenda_type', 'Rapat')
                    ->count(),
                'total_schedule_requests' => $requests->count(),
                'pending_schedule_requests' => $requests
                    ->where('status', 'pending')
                    ->count(),
                'approved_schedule_requests' => $requests
                    ->where('status', 'approved')
                    ->count(),
                'rejected_schedule_requests' => $requests
                    ->where('status', 'rejected')
                    ->count(),
                'meetings_held' => $meetings
                    ->where('realization_status', 'held')
                    ->count(),
                'has_meeting_records' => $hasMeetingRecords,
                'can_view_schedule_requests' => $canViewRequests,
                'can_view_meeting_notes' => $canViewMeetingNotes,
            ],
            'directorates' => $directorates,
            'categories' => $categoryCounts,
            'agendas' => $agendaRows,
            'schedule_requests' => $requestRows,
            'meeting_records' => $meetingRows,
        ];
    }

    public function generate(
        string $startDate,
        string $endDate,
        string $role = 'admin'
    ): array {
        $start = CarbonImmutable::parse(
            $startDate,
            'Asia/Jakarta'
        )->startOfDay();

        $end = CarbonImmutable::parse(
            $endDate,
            'Asia/Jakarta'
        )->endOfDay();

        if ($start->greaterThan($end)) {
            throw new \InvalidArgumentException(
                'Tanggal mulai melebihi tanggal selesai.'
            );
        }

        $canViewRequests = in_array(
            $role,
            ['admin', 'superadmin'],
            true
        );

        $canViewMeetingNotes = $canViewRequests;

        $previousStart = $start->subYearNoOverflow();
        $previousEnd = $end->subYearNoOverflow();

        $current = $this->collectPeriod(
            $start,
            $end,
            $canViewRequests,
            $canViewMeetingNotes
        );

        $previous = $this->collectPeriod(
            $previousStart,
            $previousEnd,
            $canViewRequests,
            $canViewMeetingNotes
        );

        $comparison = [];

        foreach (self::DIRECTORATES as $key => $label) {
            $currentRow = collect($current['directorates'])
                ->firstWhere('key', $key);

            $previousRow = collect($previous['directorates'])
                ->firstWhere('key', $key);

            $now = (int) ($currentRow['total'] ?? 0);
            $before = (int) ($previousRow['total'] ?? 0);

            $comparison[] = [
                'key' => $key,
                'label' => $label,
                'current' => $now,
                'previous' => $before,
                'difference' => $now - $before,
                'growth_percent' => $before > 0
                    ? round((($now - $before) / $before) * 100, 2)
                    : null,
            ];
        }

        return [
            'period' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
                'previous_start' => $previousStart->toDateString(),
                'previous_end' => $previousEnd->toDateString(),
            ],
            'current' => $current,
            'previous_summary' => $previous['summary'],
            'comparison' => $comparison,
        ];
    }
}
