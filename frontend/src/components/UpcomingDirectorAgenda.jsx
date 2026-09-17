import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import api from '../api/axios';

const formatDateLabel = (
    dateValue
) => {
    if (
        !dateValue
    ) {
        return '-';
    }

    const [
        year,
        month,
        day,
    ] =
        String(
            dateValue
        )
            .split('-')
            .map(
                Number
            );

    const eventDate =
        new Date(
            year,
            month - 1,
            day
        );

    const today =
        new Date();

    const todayOnly =
        new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );

    const eventOnly =
        new Date(
            eventDate.getFullYear(),
            eventDate.getMonth(),
            eventDate.getDate()
        );

    const diffTime =
        eventOnly.getTime() -
        todayOnly.getTime();

    const diffDays =
        Math.round(
            diffTime /
                (
                    1000 *
                    60 *
                    60 *
                    24
                )
        );

    if (
        diffDays ===
        0
    ) {
        return 'Hari Ini';
    }

    if (
        diffDays ===
        1
    ) {
        return 'Besok';
    }

    return eventDate
        .toLocaleDateString(
            'id-ID',
            {
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

    const startTime =
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

    const endTime =
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
        startTime &&
        endTime
    ) {
        return `${startTime} - ${endTime}`;
    }

    if (
        startTime
    ) {
        return startTime;
    }

    return '-';
};

const getAgendaIcon = (
    agendaType
) => {
    const type =
        String(
            agendaType ||
                ''
        )
            .trim()
            .toLowerCase();

    if (
        type ===
        'rapat'
    ) {
        return 'bi-people-fill';
    }

    if (
        type ===
        'kunjungan'
    ) {
        return 'bi-building-fill-check';
    }

    if (
        type ===
        'internal'
    ) {
        return 'bi-building-fill';
    }

    if (
        type ===
        'eksternal'
    ) {
        return 'bi-globe2';
    }

    if (
        type ===
        'seremonial'
    ) {
        return 'bi-stars';
    }

    if (
        type ===
        'akademik'
    ) {
        return 'bi-mortarboard-fill';
    }

    return 'bi-calendar-event-fill';
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

export default function UpcomingDirectorAgenda({
    limit =
        5,
    compact =
        false,
}) {
    const [
        agendas,
        setAgendas,
    ] =
        useState(
            []
        );

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );

    const [
        hasError,
        setHasError,
    ] =
        useState(
            false
        );

    const loadAgenda =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true
                    );

                    setHasError(
                        false
                    );

                    const response =
                        await api.get(
                            '/event-schedules/public',
                            {
                                params: {
                                    upcoming:
                                        1,

                                    limit,
                                },
                            }
                        );

                    setAgendas(
                        extractEvents(
                            response
                        )
                    );
                } catch (
                    error
                ) {
                    console.error(
                        'Load public director agenda error:',
                        error
                            ?.response
                            ?.data ||
                            error
                    );

                    setAgendas(
                        []
                    );

                    setHasError(
                        true
                    );
                } finally {
                    setLoading(
                        false
                    );
                }
            },
            [
                limit,
            ]
        );

    useEffect(
        () => {
            loadAgenda();
        },
        [
            loadAgenda,
        ]
    );

    const visibleAgendas =
        useMemo(
            () =>
                agendas.slice(
                    0,
                    limit
                ),
            [
                agendas,
                limit,
            ]
        );

    return (
        <section
            className={`director-agenda-widget ${
                compact
                    ? 'director-agenda-widget-compact'
                    : ''
            }`}
        >
            <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
                <div>
                    <div className="small text-uppercase fw-bold text-danger mb-1">
                        Agenda Direktur
                    </div>

                    <h5 className="fw-black mb-0">
                        Agenda Terdekat
                    </h5>
                </div>

                <div
                    className="rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                        width:
                            42,

                        height:
                            42,
                    }}
                >
                    <i className="bi bi-calendar3" />
                </div>
            </div>

            {loading ? (
                <div className="py-4 text-center">
                    <div className="spinner-border spinner-border-sm text-danger mb-2" />

                    <div className="small text-muted">
                        Memuat agenda...
                    </div>
                </div>
            ) : hasError ? (
                <div className="p-3 rounded-4 bg-light border">
                    <div className="d-flex align-items-start gap-3">
                        <i className="bi bi-exclamation-circle-fill text-warning" />

                        <div>
                            <div className="small fw-bold">
                                Agenda belum dapat dimuat
                            </div>

                            <button
                                type="button"
                                className="btn btn-link btn-sm p-0 text-danger text-decoration-none mt-1"
                                onClick={
                                    loadAgenda
                                }
                            >
                                Coba lagi
                            </button>
                        </div>
                    </div>
                </div>
            ) : visibleAgendas.length ===
              0 ? (
                <div className="p-4 rounded-4 bg-light border text-center">
                    <div
                        className="mx-auto mb-3 rounded-circle bg-white text-secondary d-flex align-items-center justify-content-center"
                        style={{
                            width:
                                52,

                            height:
                                52,
                        }}
                    >
                        <i className="bi bi-calendar2-check fs-4" />
                    </div>

                    <div className="fw-bold mb-1">
                        Belum Ada Agenda
                    </div>

                    <div className="small text-muted">
                        Belum ada agenda Direktur yang dijadwalkan dalam waktu dekat.
                    </div>
                </div>
            ) : (
                <div className="d-flex flex-column gap-2">
                    {visibleAgendas.map(
                        (
                            agenda
                        ) => (
                            <div
                                key={
                                    agenda.id
                                }
                                className="p-3 rounded-4 border bg-white"
                            >
                                <div className="d-flex align-items-start gap-3">
                                    <div
                                        className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                                        style={{
                                            width:
                                                44,

                                            height:
                                                44,

                                            background:
                                                agenda
                                                    .color ||
                                                '#7F1D1D',

                                            color:
                                                '#ffffff',
                                        }}
                                    >
                                        <i
                                            className={`bi ${getAgendaIcon(
                                                agenda
                                                    .agenda_type
                                            )}`}
                                        />
                                    </div>

                                    <div className="flex-grow-1 min-w-0">
                                        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                            <span className="small fw-black text-danger">
                                                {formatDateLabel(
                                                    agenda
                                                        .event_date
                                                )}
                                            </span>

                                            <span className="small text-muted">
                                                •
                                            </span>

                                            <span className="small fw-bold text-dark">
                                                {formatTime(
                                                    agenda
                                                )}
                                            </span>
                                        </div>

                                        <div className="fw-black text-dark mb-1 text-break">
                                            {
                                                agenda
                                                    .title
                                            }
                                        </div>

                                        <div className="d-flex flex-wrap gap-3 small text-muted">
                                            {agenda
                                                .agenda_type && (
                                                <span>
                                                    <i className="bi bi-tag-fill me-1" />

                                                    {
                                                        agenda
                                                            .agenda_type
                                                    }
                                                </span>
                                            )}

                                            {agenda
                                                .location && (
                                                <span>
                                                    <i className="bi bi-geo-alt-fill me-1" />

                                                    {
                                                        agenda
                                                            .location
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}
        </section>
    );
}