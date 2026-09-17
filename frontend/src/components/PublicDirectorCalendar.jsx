import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import interactionPlugin from '@fullcalendar/react/interaction';
import themePlugin from '@fullcalendar/react/themes/monarch';

import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/monarch/theme.css';
import '@fullcalendar/react/themes/monarch/palettes/red.css';

import api from '../api/axios';

const formatDate = (
    value
) => {
    if (
        !value
    ) {
        return '-';
    }

    if (
        typeof value ===
            'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(
            value
        )
    ) {
        const [
            year,
            month,
            day,
        ] =
            value
                .split('-')
                .map(
                    Number
                );

        return new Date(
            year,
            month - 1,
            day
        ).toLocaleDateString(
            'id-ID',
            {
                weekday:
                    'long',

                day:
                    '2-digit',

                month:
                    'long',

                year:
                    'numeric',
            }
        );
    }

    const parsed =
        new Date(
            value
        );

    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {
        return '-';
    }

    return parsed
        .toLocaleDateString(
            'id-ID',
            {
                weekday:
                    'long',

                day:
                    '2-digit',

                month:
                    'long',

                year:
                    'numeric',
            }
        );
};

const formatTime = (
    event
) => {
    if (
        event
            ?.all_day ||
        event
            ?.allDay
    ) {
        return 'Sepanjang Hari';
    }

    const start =
        event
            ?.start_time
            ? String(
                  event
                      .start_time
              ).slice(
                  0,
                  5
              )
            : null;

    const end =
        event
            ?.end_time
            ? String(
                  event
                      .end_time
              ).slice(
                  0,
                  5
              )
            : null;

    if (
        start &&
        end
    ) {
        return `${start} - ${end}`;
    }

    return (
        start ||
        '-'
    );
};

const extractEvents = (
    response
) => {
    const payload =
        response
            ?.data
            ?.data;

    if (
        Array.isArray(
            payload
        )
    ) {
        return payload;
    }

    if (
        Array.isArray(
            payload
                ?.events
        )
    ) {
        return payload
            .events;
    }

    return [];
};

export default function PublicDirectorCalendar() {
    const [
        events,
        setEvents,
    ] =
        useState(
            []
        );

    const [
        selectedEvent,
        setSelectedEvent,
    ] =
        useState(
            null
        );

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );

    const [
        error,
        setError,
    ] =
        useState(
            false
        );

    /*
    |--------------------------------------------------------------------------
    | LOAD PUBLIC EVENTS
    |--------------------------------------------------------------------------
    */

    const loadEvents =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true
                    );

                    setError(
                        false
                    );

                    /*
                     * Tidak pakai limit karena kalender
                     * membutuhkan event berdasarkan bulan.
                     *
                     * Backend hanya akan memberikan
                     * is_public = true.
                     */
                    const response =
                        await api.get(
                            '/event-schedules/public'
                        );

                    setEvents(
                        extractEvents(
                            response
                        )
                    );
                } catch (
                    requestError
                ) {
                    console.error(
                        'Load public director calendar error:',
                        requestError
                            ?.response
                            ?.data ||
                            requestError
                    );

                    setEvents(
                        []
                    );

                    setError(
                        true
                    );
                } finally {
                    setLoading(
                        false
                    );
                }
            },
            []
        );

    useEffect(
        () => {
            loadEvents();
        },
        [
            loadEvents,
        ]
    );

    /*
    |--------------------------------------------------------------------------
    | CALENDAR EVENT
    |--------------------------------------------------------------------------
    */

    const calendarEvents =
        useMemo(
            () =>
                events.map(
                    (
                        item
                    ) => ({
                        id:
                            String(
                                item.id
                            ),

                        title:
                            item.title,

                        start:
                            item.start,

                        end:
                            item.end,

                        allDay:
                            Boolean(
                                item
                                    .allDay ??
                                    item
                                        .all_day
                            ),

                        backgroundColor:
                            item
                                .color ||
                            '#7f1d1d',

                        borderColor:
                            item
                                .color ||
                            '#7f1d1d',

                        textColor:
                            '#ffffff',
                    })
                ),
            [
                events,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | EVENT CLICK
    |--------------------------------------------------------------------------
    */

    const handleEventClick =
        (
            info
        ) => {
            const eventId =
                Number(
                    info
                        .event
                        .id
                );

            const event =
                events.find(
                    (
                        item
                    ) =>
                        Number(
                            item.id
                        ) ===
                        eventId
                );

            if (
                !event
            ) {
                return;
            }

            setSelectedEvent(
                event
            );
        };

    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */

    if (
        loading
    ) {
        return (
            <div className="public-director-calendar-loading">
                <div className="spinner-border text-danger mb-3" />

                <div className="fw-bold">
                    Memuat Jadwal Direktur
                </div>
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | VIEW
    |--------------------------------------------------------------------------
    */

    return (
        <>
            <div className="public-director-calendar">
                <div className="public-calendar-heading">
                    <div>
                        <span className="public-calendar-label">
                            AGENDA DIREKTUR
                        </span>

                        <h3 className="public-calendar-title">
                            Jadwal Direktur
                        </h3>

                        <p className="public-calendar-description">
                            Agenda publik Direktur Telkom University Surabaya.
                        </p>
                    </div>

                    <div className="public-calendar-icon">
                        <i className="bi bi-calendar3" />
                    </div>
                </div>

                {error && (
                    <div className="alert alert-warning rounded-4">
                        <div className="d-flex align-items-center justify-content-between gap-3">
                            <div>
                                <i className="bi bi-exclamation-triangle-fill me-2" />

                                Jadwal belum dapat dimuat.
                            </div>

                            <button
                                type="button"
                                className="btn btn-sm btn-outline-warning rounded-pill"
                                onClick={
                                    loadEvents
                                }
                            >
                                Coba Lagi
                            </button>
                        </div>
                    </div>
                )}

                <div className="public-calendar-wrapper">
                    <FullCalendar
                        plugins={[
                            themePlugin,
                            dayGridPlugin,
                            interactionPlugin,
                        ]}
                        initialView="dayGridMonth"
                        locale="id"
                        firstDay={1}
                        height="auto"
                        events={
                            calendarEvents
                        }
                        eventClick={
                            handleEventClick
                        }
                        headerToolbar={{
                            start:
                                'prev,next today',

                            center:
                                'title',

                            end:
                                '',
                        }}
                        buttons={{
                            today: {
                                text:
                                    'Hari Ini',
                            },
                        }}
                        eventTimeFormat={{
                            hour:
                                '2-digit',

                            minute:
                                '2-digit',

                            hour12:
                                false,
                        }}
                        dayMaxEvents={2}
                        fixedWeekCount={
                            false
                        }
                        showNonCurrentDates
                    />
                </div>

                <div className="public-calendar-footer">
                    <div>
                        <i className="bi bi-info-circle-fill me-2" />

                        Klik agenda untuk melihat detail.
                    </div>

                    <div>
                        {
                            events.length
                        } agenda publik
                    </div>
                </div>
            </div>

            {/* =====================================================
                DETAIL MODAL
            ===================================================== */}

            {selectedEvent && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    style={{
                        background:
                            'rgba(15, 23, 42, .62)',
                    }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-5 shadow-lg overflow-hidden">
                            <div
                                style={{
                                    height:
                                        7,

                                    background:
                                        selectedEvent
                                            .color ||
                                        '#7f1d1d',
                                }}
                            />

                            <div className="modal-header border-0 px-4 pt-4 pb-2">
                                <div>
                                    <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-2 mb-2">
                                        {selectedEvent
                                            .agenda_type ||
                                            'Agenda Direktur'}
                                    </span>

                                    <h4 className="fw-black mb-0">
                                        {
                                            selectedEvent
                                                .title
                                        }
                                    </h4>
                                </div>

                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() =>
                                        setSelectedEvent(
                                            null
                                        )
                                    }
                                />
                            </div>

                            <div className="modal-body p-4">
                                <div className="row g-3">
                                    <div className="col-12">
                                        <div className="p-3 bg-light rounded-4">
                                            <div className="small text-muted mb-1">
                                                Tanggal
                                            </div>

                                            <div className="fw-black">
                                                <i className="bi bi-calendar-event-fill text-danger me-2" />

                                                {formatDate(
                                                    selectedEvent
                                                        .event_date
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="p-3 bg-light rounded-4 h-100">
                                            <div className="small text-muted mb-1">
                                                Waktu
                                            </div>

                                            <div className="fw-black">
                                                <i className="bi bi-clock-fill text-danger me-2" />

                                                {formatTime(
                                                    selectedEvent
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="p-3 bg-light rounded-4 h-100">
                                            <div className="small text-muted mb-1">
                                                Lokasi
                                            </div>

                                            <div className="fw-black">
                                                <i className="bi bi-geo-alt-fill text-danger me-2" />

                                                {selectedEvent
                                                    .location ||
                                                    '-'}
                                            </div>
                                        </div>
                                    </div>

                                    {selectedEvent
                                        .description && (
                                        <div className="col-12">
                                            <div className="p-3 bg-light rounded-4">
                                                <div className="small text-muted mb-1">
                                                    Keterangan
                                                </div>

                                                <div
                                                    style={{
                                                        whiteSpace:
                                                            'pre-line',

                                                        lineHeight:
                                                            1.7,
                                                    }}
                                                >
                                                    {
                                                        selectedEvent
                                                            .description
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="modal-footer border-0 px-4 pb-4 pt-0">
                                <button
                                    type="button"
                                    className="btn btn-danger rounded-pill px-4"
                                    onClick={() =>
                                        setSelectedEvent(
                                            null
                                        )
                                    }
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================
                STYLE
            ===================================================== */}

            <style>
                {`
                    .public-director-calendar {
                        background: rgba(255, 255, 255, 0.98);
                        border-radius: 32px;
                        padding: 24px;
                        color: #111827;
                        box-shadow: 0 28px 70px rgba(15, 23, 42, 0.24);
                    }

                    .public-calendar-heading {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 20px;
                        margin-bottom: 22px;
                    }

                    .public-calendar-label {
                        display: inline-block;
                        font-size: 0.72rem;
                        font-weight: 900;
                        letter-spacing: 0.12em;
                        color: #b91c1c;
                        margin-bottom: 5px;
                    }

                    .public-calendar-title {
                        font-size: 1.7rem;
                        font-weight: 900;
                        margin: 0 0 4px;
                    }

                    .public-calendar-description {
                        margin: 0;
                        color: #6b7280;
                        font-size: 0.9rem;
                    }

                    .public-calendar-icon {
                        width: 52px;
                        height: 52px;
                        border-radius: 18px;
                        background: #fee2e2;
                        color: #b91c1c;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.3rem;
                        flex-shrink: 0;
                    }

                    .public-calendar-wrapper {
                        min-height: 520px;
                    }

                    .public-calendar-wrapper .fc {
                        font-size: 0.93rem;
                    }

                    .public-calendar-wrapper .fc-toolbar {
                        margin-bottom: 18px !important;
                        gap: 10px;
                    }

                    .public-calendar-wrapper .fc-toolbar-title {
                        font-size: 1.35rem !important;
                        font-weight: 900 !important;
                        text-transform: capitalize;
                    }

                    .public-calendar-wrapper .fc-button {
                        border-radius: 12px !important;
                        font-weight: 700 !important;
                    }

                    .public-calendar-wrapper .fc-daygrid-day {
                        min-height: 78px;
                    }

                    .public-calendar-wrapper .fc-daygrid-day-frame {
                        min-height: 78px;
                    }

                    .public-calendar-wrapper .fc-col-header-cell {
                        padding-top: 10px;
                        padding-bottom: 10px;
                    }

                    .public-calendar-wrapper .fc-col-header-cell-cushion {
                        font-size: 0.82rem;
                        font-weight: 900;
                        color: #4b5563;
                        text-decoration: none;
                    }

                    .public-calendar-wrapper .fc-daygrid-day-number {
                        font-weight: 800;
                        color: #374151;
                        text-decoration: none;
                        padding: 8px;
                    }

                    .public-calendar-wrapper .fc-day-today {
                        background: #fff7f7 !important;
                    }

                    .public-calendar-wrapper .fc-event {
                        border-radius: 7px !important;
                        padding: 2px 4px;
                        font-weight: 700;
                        cursor: pointer;
                        font-size: 0.76rem;
                    }

                    .public-calendar-footer {
                        display: flex;
                        justify-content: space-between;
                        gap: 15px;
                        flex-wrap: wrap;
                        color: #6b7280;
                        font-size: 0.8rem;
                        margin-top: 16px;
                    }

                    .public-director-calendar-loading {
                        min-height: 450px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-direction: column;
                        background: rgba(255, 255, 255, 0.98);
                        border-radius: 32px;
                        color: #111827;
                    }

                    @media (max-width: 1199.98px) {
                        .public-calendar-wrapper {
                            min-height: auto;
                        }

                        .public-calendar-wrapper .fc-daygrid-day-frame {
                            min-height: 68px;
                        }
                    }

                    @media (max-width: 767.98px) {
                        .public-director-calendar {
                            padding: 16px;
                            border-radius: 24px;
                        }

                        .public-calendar-title {
                            font-size: 1.35rem;
                        }

                        .public-calendar-description {
                            display: none;
                        }

                        .public-calendar-icon {
                            width: 44px;
                            height: 44px;
                        }

                        .public-calendar-wrapper .fc-toolbar {
                            flex-direction: column;
                            align-items: stretch;
                        }

                        .public-calendar-wrapper .fc-toolbar-chunk {
                            display: flex;
                            justify-content: center;
                        }

                        .public-calendar-wrapper .fc-daygrid-day-frame {
                            min-height: 54px;
                        }

                        .public-calendar-wrapper .fc-event {
                            font-size: 0.65rem;
                        }
                    }
                `}
            </style>
        </>
    );
}