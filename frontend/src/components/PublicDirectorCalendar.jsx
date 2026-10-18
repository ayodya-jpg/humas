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

/*
|--------------------------------------------------------------------------
| DIRECTORATE CONFIG
|--------------------------------------------------------------------------
*/

const DIRECTORATE_OPTIONS = [
    {
        value: 'semua',
        label: 'Semua',
        shortLabel: 'SEMUA',
        icon: 'bi-grid-fill',
    },

    {
        value: 'direktorat',
        label: 'Direktorat',
        shortLabel: 'DIREKTORAT',
        icon: 'bi-people-fill',
    },

    {
        value: 'direktur',
        label: 'Direktur',
        shortLabel: 'DIREKTUR',
        icon: 'bi-person-badge-fill',
    },

    {
        value: 'wakil_direktur_1',
        label: 'Wadir I',
        fullLabel: 'Wakil Direktur I',
        shortLabel: 'WADIR I',
        icon: 'bi-person-workspace',
    },

    {
        value: 'wakil_direktur_2',
        label: 'Wadir II',
        fullLabel: 'Wakil Direktur II',
        shortLabel: 'WADIR II',
        icon: 'bi-person-workspace',
    },
];

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const getDirectorateConfig = (
    value
) => {
    return (
        DIRECTORATE_OPTIONS.find(
            (item) =>
                item.value ===
                value
        ) ||
        DIRECTORATE_OPTIONS[0]
    );
};

const getDirectorateLabel = (
    value
) => {
    const config =
        getDirectorateConfig(
            value
        );

    return (
        config.fullLabel ||
        config.label ||
        'Direktorat'
    );
};

const getDirectorateShortLabel = (
    value
) => {
    return (
        getDirectorateConfig(
            value
        )?.shortLabel ||
        'DIREKTORAT'
    );
};

const normalizeTime = (
    value
) => {
    if (!value) {
        return null;
    }

    return String(
        value
    ).slice(
        0,
        5
    );
};

const formatDate = (
    value
) => {
    if (!value) {
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
                .map(Number);

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

    return '-';
};

const getTimeText = (
    event
) => {
    if (
        event?.all_day ||
        event?.allDay
    ) {
        return 'Sepanjang Hari';
    }

    const start =
        normalizeTime(
            event?.start_time
        );

    const end =
        normalizeTime(
            event?.end_time
        );

    if (
        start &&
        end
    ) {
        return `${start} - ${end}`;
    }

    return '-';
};

/*
|--------------------------------------------------------------------------
| RESPONSE
|--------------------------------------------------------------------------
*/

const extractEvents = (
    response
) => {
    const payload =
        response
            ?.data
            ?.data;

    /*
     * Format backend sekarang:
     *
     * {
     *     success: true,
     *     data: [...]
     * }
     */
    if (
        Array.isArray(
            payload
        )
    ) {
        return payload;
    }

    /*
     * Fallback apabila response suatu saat
     * menggunakan object events.
     */
    if (
        payload &&
        Array.isArray(
            payload.events
        )
    ) {
        return payload.events;
    }

    /*
     * Fallback Laravel pagination.
     */
    if (
        payload &&
        Array.isArray(
            payload.data
        )
    ) {
        return payload.data;
    }

    return [];
};

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

export default function PublicDirectorCalendar() {
    /*
    |--------------------------------------------------------------------------
    | STATE
    |--------------------------------------------------------------------------
    */

    const [
        events,
        setEvents,
    ] =
        useState([]);

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

    const [
        activeDirectorate,
        setActiveDirectorate,
    ] =
        useState(
            'semua'
        );

    const [
        selectedEvent,
        setSelectedEvent,
    ] =
        useState(
            null
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
                     * Jangan kirim filter directorate.
                     *
                     * Kita butuh seluruh jadwal publik agar
                     * default kalender bisa menampilkan:
                     *
                     * - Direktorat
                     * - Direktur
                     * - Wakil Direktur I
                     * - Wakil Direktur II
                     */
                    const response =
                        await api.get(
                            '/event-schedules/public'
                        );

                    const nextEvents =
                        extractEvents(
                            response
                        );

                    setEvents(
                        nextEvents
                    );
                } catch (
                    requestError
                ) {
                    console.error(
                        'Public directorate calendar error:',
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
    | COUNTS
    |--------------------------------------------------------------------------
    */

    const directorateCounts =
        useMemo(
            () => {
                return {
                    semua:
                        events.length,

                    direktorat:
                        events.filter(
                            (
                                event
                            ) =>
                                event.directorate ===
                                'direktorat'
                        ).length,

                    direktur:
                        events.filter(
                            (
                                event
                            ) =>
                                event.directorate ===
                                'direktur'
                        ).length,

                    wakil_direktur_1:
                        events.filter(
                            (
                                event
                            ) =>
                                event.directorate ===
                                'wakil_direktur_1'
                        ).length,

                    wakil_direktur_2:
                        events.filter(
                            (
                                event
                            ) =>
                                event.directorate ===
                                'wakil_direktur_2'
                        ).length,
                };
            },
            [
                events,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | FILTER
    |--------------------------------------------------------------------------
    */

    const filteredEvents =
        useMemo(
            () => {
                if (
                    activeDirectorate ===
                    'semua'
                ) {
                    return events;
                }

                return events.filter(
                    (
                        event
                    ) =>
                        event.directorate ===
                        activeDirectorate
                );
            },
            [
                events,
                activeDirectorate,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | FULLCALENDAR EVENTS
    |--------------------------------------------------------------------------
    */

    const calendarEvents =
        useMemo(
            () => {
                return filteredEvents.map(
                    (
                        event
                    ) => {
                        const owner =
                            getDirectorateShortLabel(
                                event.directorate
                            );

                        return {
                            id:
                                String(
                                    event.id
                                ),

                            title:
                                `[${owner}] ${event.title}`,

                            start:
                                event.start,

                            end:
                                event.end,

                            allDay:
                                Boolean(
                                    event.allDay ??
                                        event.all_day
                                ),

                            backgroundColor:
                                event.color ||
                                '#7F1D1D',

                            borderColor:
                                event.color ||
                                '#7F1D1D',

                            textColor:
                                '#ffffff',

                            extendedProps: {
                                owner:
                                    event.directorate,

                                ownerLabel:
                                    getDirectorateLabel(
                                        event.directorate
                                    ),

                                originalTitle:
                                    event.title,
                            },
                        };
                    }
                );
            },
            [
                filteredEvents,
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
    | CLOSE DETAIL
    |--------------------------------------------------------------------------
    */

    const closeDetail =
        () => {
            setSelectedEvent(
                null
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

                <div className="fw-black">
                    Memuat Jadwal Direktorat
                </div>

                <div className="small text-muted mt-1">
                    Mengambil agenda publik pimpinan.
                </div>

                <style>
                    {`
                        .public-director-calendar-loading {
                            min-height: 540px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            border-radius: 28px;
                            background: rgba(255,255,255,.97);
                        }
                    `}
                </style>
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
            <section className="public-director-calendar">
                {/* =====================================================
                    HEADING
                ===================================================== */}

                <div className="public-calendar-heading">
                    <div>
                        <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                            <span className="public-calendar-label">
                                AGENDA PIMPINAN
                            </span>

                            <span className="public-calendar-total">
                                <i className="bi bi-calendar-event me-1" />

                                {
                                    filteredEvents.length
                                }{' '}
                                Agenda
                            </span>
                        </div>

                        <h3 className="public-calendar-title">
                            Jadwal Direktorat
                        </h3>

                        <p className="public-calendar-description">
                            Agenda publik Direktur, Wakil Direktur I, Wakil Direktur II, dan agenda bersama Direktorat Telkom University Surabaya.
                        </p>
                    </div>

                    <div className="public-calendar-icon">
                        <i className="bi bi-calendar3" />
                    </div>
                </div>

                {/* =====================================================
                    FILTER DIRECTORATE
                ===================================================== */}

                <div className="public-directorate-filter">
                    {DIRECTORATE_OPTIONS.map(
                        (
                            item
                        ) => {
                            const active =
                                activeDirectorate ===
                                item.value;

                            return (
                                <button
                                    type="button"
                                    key={
                                        item.value
                                    }
                                    className={`public-directorate-filter-button ${
                                        active
                                            ? 'active'
                                            : ''
                                    }`}
                                    onClick={() =>
                                        setActiveDirectorate(
                                            item.value
                                        )
                                    }
                                >
                                    <span className="public-directorate-filter-icon">
                                        <i
                                            className={`bi ${item.icon}`}
                                        />
                                    </span>

                                    <span className="public-directorate-filter-text">
                                        {
                                            item.label
                                        }
                                    </span>

                                    <span className="public-directorate-filter-count">
                                        {
                                            directorateCounts[
                                                item.value
                                            ] ||
                                            0
                                        }
                                    </span>
                                </button>
                            );
                        }
                    )}
                </div>

                {/* =====================================================
                    INFORMATION
                ===================================================== */}

                {activeDirectorate ===
                    'semua' && (
                    <div className="public-calendar-info">
                        <i className="bi bi-info-circle-fill" />

                        <span>
                            Semua jadwal pimpinan ditampilkan bersamaan. Agenda pada jam yang sama dapat terjadi apabila dimiliki oleh pimpinan yang berbeda.
                        </span>
                    </div>
                )}

                {/* =====================================================
                    ERROR
                ===================================================== */}

                {error && (
                    <div className="alert alert-warning rounded-4 border-0 public-calendar-error">
                        <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                            <div>
                                <i className="bi bi-exclamation-triangle-fill me-2" />

                                Jadwal publik belum dapat dimuat.
                            </div>

                            <button
                                type="button"
                                className="btn btn-sm btn-outline-warning rounded-pill"
                                onClick={
                                    loadEvents
                                }
                            >
                                <i className="bi bi-arrow-clockwise me-1" />

                                Coba Lagi
                            </button>
                        </div>
                    </div>
                )}

                {/* =====================================================
                    CALENDAR
                ===================================================== */}

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
                        dayMaxEvents={4}
                        fixedWeekCount={
                            false
                        }
                        navLinks
                    />
                </div>

                {/* =====================================================
                    LEGEND
                ===================================================== */}

                <div className="public-calendar-footer">
                    <div>
                        <i className="bi bi-eye-fill me-2" />

                        Kalender hanya menampilkan agenda yang bersifat publik.
                    </div>

                    <div>
                        Klik agenda untuk melihat detail.
                    </div>
                </div>
            </section>

            {/* =========================================================
                DETAIL MODAL
            ========================================================= */}

            {selectedEvent && (
                <div
                    className="modal fade show d-block public-agenda-modal"
                    tabIndex="-1"
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-5 shadow-lg overflow-hidden">
                            {/* COLOR */}

                            <div
                                className="public-agenda-modal-color"
                                style={{
                                    background:
                                        selectedEvent.color ||
                                        '#7F1D1D',
                                }}
                            />

                            {/* HEADER */}

                            <div className="modal-header border-0 p-4 pb-2">
                                <div>
                                    <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-2 mb-2">
                                        {
                                            getDirectorateShortLabel(
                                                selectedEvent.directorate
                                            )
                                        }
                                    </span>

                                    <h4 className="fw-black mb-0">
                                        {
                                            selectedEvent.title
                                        }
                                    </h4>
                                </div>

                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={
                                        closeDetail
                                    }
                                />
                            </div>

                            {/* BODY */}

                            <div className="modal-body p-4">
                                <div className="public-agenda-owner mb-3">
                                    <span className="public-agenda-owner-icon">
                                        <i
                                            className={`bi ${
                                                getDirectorateConfig(
                                                    selectedEvent.directorate
                                                )
                                                    ?.icon ||
                                                'bi-people-fill'
                                            }`}
                                        />
                                    </span>

                                    <div>
                                        <div className="small text-muted fw-bold">
                                            AGENDA UNTUK
                                        </div>

                                        <div className="fw-black">
                                            {getDirectorateLabel(
                                                selectedEvent.directorate
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="row g-3">
                                    <div className="col-sm-6">
                                        <div className="public-agenda-detail-box h-100">
                                            <div className="public-agenda-detail-label">
                                                Tanggal
                                            </div>

                                            <div className="fw-black">
                                                {formatDate(
                                                    selectedEvent.event_date
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-sm-6">
                                        <div className="public-agenda-detail-box h-100">
                                            <div className="public-agenda-detail-label">
                                                Waktu
                                            </div>

                                            <div className="fw-black">
                                                {getTimeText(
                                                    selectedEvent
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-sm-6">
                                        <div className="public-agenda-detail-box h-100">
                                            <div className="public-agenda-detail-label">
                                                Kategori
                                            </div>

                                            <div className="fw-black">
                                                {selectedEvent.agenda_type ||
                                                    '-'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-sm-6">
                                        <div className="public-agenda-detail-box h-100">
                                            <div className="public-agenda-detail-label">
                                                Lokasi
                                            </div>

                                            <div className="fw-black">
                                                {selectedEvent.location ||
                                                    '-'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <div className="public-agenda-detail-box">
                                            <div className="public-agenda-detail-label">
                                                Deskripsi
                                            </div>

                                            <div
                                                style={{
                                                    whiteSpace:
                                                        'pre-line',
                                                }}
                                            >
                                                {selectedEvent.description ||
                                                    'Tidak ada deskripsi tambahan.'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* FOOTER */}

                            <div className="modal-footer border-0 p-4 pt-0">
                                <button
                                    type="button"
                                    className="btn btn-danger rounded-pill px-4"
                                    onClick={
                                        closeDetail
                                    }
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================
                STYLE
            ========================================================= */}

            <style>
                {`
                    /*
                    |--------------------------------------------------------------------------
                    | CONTAINER
                    |--------------------------------------------------------------------------
                    */

                    .public-director-calendar {
                        position: relative;
                        background: rgba(255,255,255,.985);
                        border-radius: 28px;
                        padding: 20px;
                        box-shadow:
                            0 24px 70px rgba(15, 23, 42, .28);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | HEADING
                    |--------------------------------------------------------------------------
                    */

                    .public-calendar-heading {
                        display: flex;
                        align-items: flex-start;
                        justify-content: space-between;
                        gap: 20px;
                        margin-bottom: 14px;
                    }

                    .public-calendar-label {
                        display: inline-flex;
                        align-items: center;
                        min-height: 27px;
                        padding: 0 11px;
                        border-radius: 999px;
                        background: #fee2e2;
                        color: #991b1b;
                        font-size: .66rem;
                        font-weight: 900;
                        letter-spacing: .06em;
                    }

                    .public-calendar-total {
                        display: inline-flex;
                        align-items: center;
                        min-height: 27px;
                        padding: 0 10px;
                        border-radius: 999px;
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        color: #64748b;
                        font-size: .68rem;
                        font-weight: 800;
                    }

                    .public-calendar-title {
                        margin-bottom: 4px;
                        font-size: 1.6rem;
                        font-weight: 900;
                        color: #111827;
                    }

                    .public-calendar-description {
                        max-width: 650px;
                        margin: 0;
                        color: #64748b;
                        font-size: .83rem;
                        line-height: 1.55;
                    }

                    .public-calendar-icon {
                        width: 50px;
                        height: 50px;
                        flex: 0 0 50px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 16px;
                        background:
                            linear-gradient(
                                135deg,
                                #7f1d1d,
                                #b91c1c
                            );
                        color: #ffffff;
                        font-size: 1.25rem;
                        box-shadow:
                            0 10px 25px
                            rgba(127,29,29,.22);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | FILTER
                    |--------------------------------------------------------------------------
                    */

                    .public-directorate-filter {
                        display: grid;
                        grid-template-columns:
                            repeat(5, minmax(0, 1fr));
                        gap: 7px;
                        margin-bottom: 11px;
                    }

                    .public-directorate-filter-button {
                        min-width: 0;
                        min-height: 39px;
                        padding: 5px 7px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        border: 1px solid #e2e8f0;
                        border-radius: 13px;
                        background: #ffffff;
                        color: #475569;
                        transition:
                            border-color .15s ease,
                            background .15s ease,
                            color .15s ease,
                            transform .15s ease;
                    }

                    .public-directorate-filter-button:hover {
                        transform: translateY(-1px);
                        border-color: #cbd5e1;
                    }

                    .public-directorate-filter-button.active {
                        background: #fff7f7;
                        border-color: #7f1d1d;
                        color: #7f1d1d;
                    }

                    .public-directorate-filter-icon {
                        width: 27px;
                        height: 27px;
                        flex: 0 0 27px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 8px;
                        background: #f1f5f9;
                        font-size: .72rem;
                    }

                    .public-directorate-filter-button.active
                    .public-directorate-filter-icon {
                        background: #7f1d1d;
                        color: #ffffff;
                    }

                    .public-directorate-filter-text {
                        flex: 1;
                        min-width: 0;
                        font-size: .7rem;
                        font-weight: 900;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .public-directorate-filter-count {
                        min-width: 22px;
                        height: 22px;
                        padding: 0 5px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 999px;
                        background: #f1f5f9;
                        color: #64748b;
                        font-size: .6rem;
                        font-weight: 900;
                    }

                    .public-directorate-filter-button.active
                    .public-directorate-filter-count {
                        background: #7f1d1d;
                        color: #ffffff;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | INFO
                    |--------------------------------------------------------------------------
                    */

                    .public-calendar-info {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 11px;
                        padding: 8px 11px;
                        border-radius: 11px;
                        background: #f8fafc;
                        color: #64748b;
                        font-size: .69rem;
                        font-weight: 600;
                    }

                    .public-calendar-info i {
                        color: #7f1d1d;
                        flex-shrink: 0;
                    }

                    .public-calendar-error {
                        font-size: .76rem;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | CALENDAR
                    |--------------------------------------------------------------------------
                    */

                    .public-calendar-wrapper {
                        min-height: 500px;
                    }

                    .public-director-calendar .fc {
                        font-size: .88rem;
                    }

                    .public-director-calendar .fc-toolbar {
                        margin-bottom: 12px !important;
                        gap: 10px;
                    }

                    .public-director-calendar .fc-toolbar-title {
                        font-size: 1.45rem !important;
                        font-weight: 900 !important;
                        color: #111827;
                        text-transform: capitalize;
                    }

                    .public-director-calendar .fc-button {
                        min-height: 34px;
                        border-radius: 999px !important;
                        font-size: .72rem !important;
                        font-weight: 800 !important;
                    }

                    .public-director-calendar
                    .fc-col-header-cell {
                        background: #f8fafc;
                    }

                    .public-director-calendar
                    .fc-col-header-cell-cushion {
                        color: #475569;
                        font-weight: 900;
                        text-decoration: none;
                    }

                    .public-director-calendar
                    .fc-daygrid-day-number {
                        color: #1f2937;
                        font-weight: 900;
                        text-decoration: none;
                    }

                    .public-director-calendar
                    .fc-day-today {
                        background: #fff7f7 !important;
                    }

                    .public-director-calendar
                    .fc-event {
                        margin: 2px 3px !important;
                        padding: 2px 4px !important;
                        border-radius: 6px !important;
                        font-size: .67rem !important;
                        font-weight: 800;
                        cursor: pointer;
                    }

                    .public-director-calendar
                    .fc-more-link {
                        color: #7f1d1d;
                        font-size: .68rem;
                        font-weight: 900;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | FOOTER
                    |--------------------------------------------------------------------------
                    */

                    .public-calendar-footer {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 10px;
                        margin-top: 12px;
                        padding-top: 11px;
                        border-top: 1px solid #f1f5f9;
                        color: #94a3b8;
                        font-size: .66rem;
                        font-weight: 600;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | MODAL
                    |--------------------------------------------------------------------------
                    */

                    .public-agenda-modal {
                        z-index: 1090;
                        background: rgba(15,23,42,.68);
                        backdrop-filter: blur(5px);
                    }

                    .public-agenda-modal-color {
                        height: 7px;
                    }

                    .public-agenda-owner {
                        display: flex;
                        align-items: center;
                        gap: 11px;
                        padding: 12px 13px;
                        border: 1px solid #fecaca;
                        border-radius: 14px;
                        background: #fff7f7;
                    }

                    .public-agenda-owner-icon {
                        width: 39px;
                        height: 39px;
                        flex: 0 0 39px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 11px;
                        background: #7f1d1d;
                        color: #ffffff;
                    }

                    .public-agenda-detail-box {
                        padding: 12px 13px;
                        border-radius: 13px;
                        background: #f8fafc;
                        color: #334155;
                    }

                    .public-agenda-detail-label {
                        margin-bottom: 3px;
                        color: #94a3b8;
                        font-size: .65rem;
                        font-weight: 800;
                        text-transform: uppercase;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | RESPONSIVE
                    |--------------------------------------------------------------------------
                    */

                    @media (
                        max-width: 1199.98px
                    ) {
                        .public-directorate-filter {
                            grid-template-columns:
                                repeat(
                                    3,
                                    minmax(0,1fr)
                                );
                        }
                    }

                    @media (
                        max-width: 767.98px
                    ) {
                        .public-director-calendar {
                            padding: 14px;
                            border-radius: 22px;
                        }

                        .public-calendar-title {
                            font-size: 1.3rem;
                        }

                        .public-calendar-description {
                            font-size: .75rem;
                        }

                        .public-calendar-icon {
                            width: 42px;
                            height: 42px;
                            flex-basis: 42px;
                        }

                        .public-directorate-filter {
                            display: flex;
                            overflow-x: auto;
                            scrollbar-width: none;
                            padding-bottom: 2px;
                        }

                        .public-directorate-filter::-webkit-scrollbar {
                            display: none;
                        }

                        .public-directorate-filter-button {
                            min-width: 118px;
                            flex-shrink: 0;
                        }

                        .public-calendar-info {
                            align-items: flex-start;
                        }

                        .public-director-calendar
                        .fc-toolbar {
                            flex-direction: column;
                        }

                        .public-director-calendar
                        .fc-toolbar-chunk {
                            display: flex;
                            justify-content: center;
                        }

                        .public-director-calendar
                        .fc-toolbar-title {
                            font-size: 1.2rem !important;
                        }

                        .public-director-calendar
                        .fc {
                            font-size: .76rem;
                        }

                        .public-calendar-footer {
                            flex-direction: column;
                            align-items: flex-start;
                        }
                    }
                `}
            </style>
        </>
    );
}