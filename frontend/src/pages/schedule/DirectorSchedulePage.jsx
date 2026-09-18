import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import interactionPlugin from '@fullcalendar/react/interaction';
import themePlugin from '@fullcalendar/react/themes/monarch';

import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/monarch/theme.css';
import '@fullcalendar/react/themes/monarch/palettes/red.css';

import api from '../../api/axios';

import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

/*
|--------------------------------------------------------------------------
| AGENDA CONFIG
|--------------------------------------------------------------------------
*/

const AGENDA_TYPES = [
    'Rapat',
    'Kunjungan',
    'Internal',
    'Eksternal',
    'Seremonial',
    'Akademik',
    'Lainnya',
];

const AGENDA_COLORS = {
    Rapat: '#7F1D1D',
    Kunjungan: '#1D4ED8',
    Internal: '#4338CA',
    Eksternal: '#047857',
    Seremonial: '#C2410C',
    Akademik: '#7E22CE',
    Lainnya: '#475569',
};

const AGENDA_ICONS = {
    Rapat: 'bi-people-fill',
    Kunjungan: 'bi-building-fill-check',
    Internal: 'bi-building-fill',
    Eksternal: 'bi-globe2',
    Seremonial: 'bi-stars',
    Akademik: 'bi-mortarboard-fill',
    Lainnya: 'bi-calendar-event-fill',
};

const WORKING_START_MINUTES = 6 * 60;
const WORKING_END_MINUTES = 22 * 60;
const SLOT_INTERVAL_MINUTES = 30;

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const getAgendaColor = (
    agendaType
) => {
    return (
        AGENDA_COLORS[
            agendaType
        ] ||
        AGENDA_COLORS.Lainnya
    );
};

const getAgendaIcon = (
    agendaType
) => {
    return (
        AGENDA_ICONS[
            agendaType
        ] ||
        AGENDA_ICONS.Lainnya
    );
};

const getStoredUser = () => {
    try {
        return JSON.parse(
            localStorage.getItem(
                'admin_user'
            ) || '{}'
        );
    } catch {
        return {};
    }
};

const getEmptyForm = (
    date = ''
) => ({
    id: null,
    title: '',
    description: '',
    event_date: date,
    start_time: '09:00',
    end_time: '10:00',
    all_day: false,
    location: '',
    agenda_type: 'Rapat',
    color:
        getAgendaColor(
            'Rapat'
        ),
    is_public: true,
});

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

const timeToMinutes = (
    value
) => {
    const normalized =
        normalizeTime(
            value
        );

    if (!normalized) {
        return null;
    }

    const [
        hours,
        minutes,
    ] = normalized
        .split(':')
        .map(Number);

    if (
        Number.isNaN(
            hours
        ) ||
        Number.isNaN(
            minutes
        )
    ) {
        return null;
    }

    return (
        hours * 60 +
        minutes
    );
};

const minutesToTime = (
    value
) => {
    const safeMinutes =
        Math.max(
            0,
            Math.min(
                value,
                23 * 60 + 59
            )
        );

    const hours =
        Math.floor(
            safeMinutes / 60
        );

    const minutes =
        safeMinutes % 60;

    return `${String(
        hours
    ).padStart(
        2,
        '0'
    )}:${String(
        minutes
    ).padStart(
        2,
        '0'
    )}`;
};

const getLocalDateKey = (
    date
) => {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            '0'
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            '0'
        );

    return `${year}-${month}-${day}`;
};

const buildLocalDate = (
    dateString,
    timeString = '00:00'
) => {
    if (
        !dateString
    ) {
        return null;
    }

    const [
        year,
        month,
        day,
    ] =
        dateString
            .split('-')
            .map(
                Number
            );

    const [
        hours,
        minutes,
    ] =
        String(
            timeString ||
                '00:00'
        )
            .slice(
                0,
                5
            )
            .split(':')
            .map(
                Number
            );

    const date =
        new Date(
            year,
            month - 1,
            day,
            hours || 0,
            minutes || 0,
            0,
            0
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    return date;
};

const extractErrorMessage = (
    error
) => {
    const data =
        error
            ?.response
            ?.data;

    if (
        data?.errors
    ) {
        const firstError =
            Object.values(
                data.errors
            )
                .flat()
                .find(
                    Boolean
                );

        if (
            firstError
        ) {
            return firstError;
        }
    }

    return (
        data?.message ||
        'Terjadi kesalahan pada server.'
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

    return '-';
};

const formatShortDate = (
    value
) => {
    if (!value) {
        return '-';
    }

    const [
        year,
        month,
        day,
    ] =
        String(
            value
        )
            .split('-')
            .map(
                Number
            );

    const date =
        new Date(
            year,
            month - 1,
            day
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return date
        .toLocaleDateString(
            'id-ID',
            {
                day:
                    '2-digit',

                month:
                    'short',

                year:
                    'numeric',
            }
        );
};

const formatConflictDate = (
    value
) => {
    if (!value) {
        return '-';
    }

    const parts =
        String(
            value
        ).split('-');

    if (
        parts.length !==
        3
    ) {
        return value;
    }

    const [
        year,
        month,
        day,
    ] =
        parts.map(
            Number
        );

    const date =
        new Date(
            year,
            month - 1,
            day
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return date
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

const getConflictTimeText = (
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

const getSameDateEvents = (
    events,
    date,
    excludeId = null
) => {
    if (!date) {
        return [];
    }

    return events.filter(
        (
            event
        ) => {
            if (
                event
                    .event_date !==
                date
            ) {
                return false;
            }

            if (
                excludeId !==
                    null &&
                Number(
                    event.id
                ) ===
                    Number(
                        excludeId
                    )
            ) {
                return false;
            }

            return true;
        }
    );
};

const findTimeConflict = (
    events,
    date,
    startTime,
    endTime,
    excludeId = null
) => {
    const newStart =
        timeToMinutes(
            startTime
        );

    const newEnd =
        timeToMinutes(
            endTime
        );

    if (
        newStart ===
            null ||
        newEnd ===
            null ||
        newEnd <=
            newStart
    ) {
        return null;
    }

    const sameDateEvents =
        getSameDateEvents(
            events,
            date,
            excludeId
        );

    return (
        sameDateEvents.find(
            (
                event
            ) => {
                if (
                    event
                        .all_day ||
                    event
                        .allDay
                ) {
                    return true;
                }

                const existingStart =
                    timeToMinutes(
                        event
                            .start_time
                    );

                const existingEnd =
                    timeToMinutes(
                        event
                            .end_time
                    );

                if (
                    existingStart ===
                        null ||
                    existingEnd ===
                        null
                ) {
                    return false;
                }

                return (
                    newStart <
                        existingEnd &&
                    newEnd >
                        existingStart
                );
            }
        ) ||
        null
    );
};

const getEventStartDate = (
    event
) => {
    if (
        !event
            ?.event_date
    ) {
        return null;
    }

    if (
        event
            .all_day ||
        event
            .allDay
    ) {
        return buildLocalDate(
            event
                .event_date,
            '00:00'
        );
    }

    return buildLocalDate(
        event
            .event_date,
        normalizeTime(
            event
                .start_time
        ) ||
            '00:00'
    );
};

const getEventEndDate = (
    event
) => {
    if (
        !event
            ?.event_date
    ) {
        return null;
    }

    if (
        event
            .all_day ||
        event
            .allDay
    ) {
        return buildLocalDate(
            event
                .event_date,
            '23:59'
        );
    }

    return buildLocalDate(
        event
            .event_date,
        normalizeTime(
            event
                .end_time
        ) ||
            normalizeTime(
                event
                    .start_time
            ) ||
            '23:59'
    );
};

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

export default function DirectorSchedulePage() {
    const currentUser =
        useMemo(
            () =>
                getStoredUser(),
            []
        );

    const [
        events,
        setEvents,
    ] =
        useState([]);

    const [
        canManage,
        setCanManage,
    ] =
        useState(false);

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        modalOpen,
        setModalOpen,
    ] =
        useState(false);

    const [
        detailMode,
        setDetailMode,
    ] =
        useState(false);

    const [
        selectedEvent,
        setSelectedEvent,
    ] =
        useState(null);

    const [
        form,
        setForm,
    ] =
        useState(
            getEmptyForm()
        );

    const [
        saving,
        setSaving,
    ] =
        useState(false);

    const [
        activeFilter,
        setActiveFilter,
    ] =
        useState(
            'Semua'
        );

    const [
        now,
        setNow,
    ] =
        useState(
            () =>
                new Date()
        );

    const userCanPotentiallyManage =
        [
            'admin',
            'admin_humas',
            'admin_sekpim',
            'superadmin',
        ].includes(
            currentUser
                ?.role
        );

    /*
    |--------------------------------------------------------------------------
    | CLOCK
    |--------------------------------------------------------------------------
    */

    useEffect(
        () => {
            const timer =
                window.setInterval(
                    () => {
                        setNow(
                            new Date()
                        );
                    },
                    60000
                );

            return () => {
                window.clearInterval(
                    timer
                );
            };
        },
        []
    );

    /*
    |--------------------------------------------------------------------------
    | LOAD EVENTS
    |--------------------------------------------------------------------------
    */

    const loadEvents =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true
                    );

                    const response =
                        await api.get(
                            '/event-schedules'
                        );

                    const data =
                        response
                            ?.data
                            ?.data ||
                        {};

                    setEvents(
                        Array.isArray(
                            data
                                .events
                        )
                            ? data
                                  .events
                            : []
                    );

                    setCanManage(
                        Boolean(
                            data
                                .can_manage
                        )
                    );
                } catch (
                    error
                ) {
                    console.error(
                        'Load director schedule error:',
                        error
                            ?.response
                            ?.data ||
                            error
                    );

                    await showErrorAlert(
                        'Gagal Memuat Jadwal',
                        extractErrorMessage(
                            error
                        )
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
    | TODAY
    |--------------------------------------------------------------------------
    */

    const todayDateKey =
        useMemo(
            () =>
                getLocalDateKey(
                    now
                ),
            [
                now,
            ]
        );

    const todayEvents =
        useMemo(
            () => {
                return events
                    .filter(
                        (
                            event
                        ) =>
                            event
                                .event_date ===
                            todayDateKey
                    )
                    .sort(
                        (
                            a,
                            b
                        ) => {
                            if (
                                Boolean(
                                    a
                                        .all_day
                                ) !==
                                Boolean(
                                    b
                                        .all_day
                                )
                            ) {
                                return a
                                    .all_day
                                    ? -1
                                    : 1;
                            }

                            return String(
                                a
                                    .start_time ||
                                    ''
                            ).localeCompare(
                                String(
                                    b
                                        .start_time ||
                                        ''
                                )
                            );
                        }
                    );
            },
            [
                events,
                todayDateKey,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | NEXT / ACTIVE AGENDA
    |--------------------------------------------------------------------------
    */

    const nearestAgenda =
        useMemo(
            () => {
                const candidates =
                    events
                        .map(
                            (
                                event
                            ) => {
                                const start =
                                    getEventStartDate(
                                        event
                                    );

                                const end =
                                    getEventEndDate(
                                        event
                                    );

                                return {
                                    event,
                                    start,
                                    end,
                                };
                            }
                        )
                        .filter(
                            (
                                item
                            ) => {
                                if (
                                    !item
                                        .start ||
                                    !item
                                        .end
                                ) {
                                    return false;
                                }

                                return (
                                    item.end
                                        .getTime() >=
                                    now.getTime()
                                );
                            }
                        )
                        .sort(
                            (
                                a,
                                b
                            ) =>
                                a.start
                                    .getTime() -
                                b.start
                                    .getTime()
                        );

                if (
                    candidates.length ===
                    0
                ) {
                    return null;
                }

                const active =
                    candidates.find(
                        (
                            item
                        ) =>
                            item.start
                                .getTime() <=
                                now.getTime() &&
                            item.end
                                .getTime() >=
                                now.getTime()
                    );

                if (
                    active
                ) {
                    return {
                        ...active,

                        status:
                            'ongoing',
                    };
                }

                return {
                    ...candidates[0],

                    status:
                        'upcoming',
                };
            },
            [
                events,
                now,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | FILTER COUNTS
    |--------------------------------------------------------------------------
    */

    const agendaCounts =
        useMemo(
            () => {
                const counts = {
                    Semua:
                        events.length,
                };

                AGENDA_TYPES.forEach(
                    (
                        type
                    ) => {
                        counts[type] =
                            events.filter(
                                (
                                    event
                                ) =>
                                    event
                                        .agenda_type ===
                                    type
                            ).length;
                    }
                );

                return counts;
            },
            [
                events,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | FILTERED EVENTS
    |--------------------------------------------------------------------------
    */

    const filteredEvents =
        useMemo(
            () => {
                if (
                    activeFilter ===
                    'Semua'
                ) {
                    return events;
                }

                return events.filter(
                    (
                        event
                    ) =>
                        event
                            .agenda_type ===
                        activeFilter
                );
            },
            [
                events,
                activeFilter,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | REALTIME CONFLICT
    |--------------------------------------------------------------------------
    */

    const realtimeConflict =
        useMemo(
            () => {
                if (
                    detailMode ||
                    !form
                        .event_date
                ) {
                    return null;
                }

                const sameDateEvents =
                    getSameDateEvents(
                        events,
                        form
                            .event_date,
                        form.id
                    );

                if (
                    form
                        .all_day
                ) {
                    return (
                        sameDateEvents[0] ||
                        null
                    );
                }

                return findTimeConflict(
                    events,
                    form
                        .event_date,
                    form
                        .start_time,
                    form
                        .end_time,
                    form.id
                );
            },
            [
                events,
                form.id,
                form.event_date,
                form.start_time,
                form.end_time,
                form.all_day,
                detailMode,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | AVAILABILITY
    |--------------------------------------------------------------------------
    */

    const availabilityState =
        useMemo(
            () => {
                if (
                    detailMode ||
                    !form
                        .event_date
                ) {
                    return null;
                }

                if (
                    form
                        .all_day
                ) {
                    return realtimeConflict
                        ? 'conflict'
                        : 'available';
                }

                if (
                    !form
                        .start_time ||
                    !form
                        .end_time
                ) {
                    return null;
                }

                if (
                    form
                        .end_time <=
                    form
                        .start_time
                ) {
                    return 'invalid';
                }

                return realtimeConflict
                    ? 'conflict'
                    : 'available';
            },
            [
                detailMode,
                form.event_date,
                form.start_time,
                form.end_time,
                form.all_day,
                realtimeConflict,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | SUGGESTED TIME
    |--------------------------------------------------------------------------
    */

    const suggestedTimeSlots =
        useMemo(
            () => {
                if (
                    detailMode ||
                    !realtimeConflict ||
                    form
                        .all_day ||
                    !form
                        .event_date
                ) {
                    return [];
                }

                const requestedStart =
                    timeToMinutes(
                        form
                            .start_time
                    );

                const requestedEnd =
                    timeToMinutes(
                        form
                            .end_time
                    );

                if (
                    requestedStart ===
                        null ||
                    requestedEnd ===
                        null ||
                    requestedEnd <=
                        requestedStart
                ) {
                    return [];
                }

                const duration =
                    requestedEnd -
                    requestedStart;

                const sameDateEvents =
                    getSameDateEvents(
                        events,
                        form
                            .event_date,
                        form.id
                    );

                const hasAllDayEvent =
                    sameDateEvents.some(
                        (
                            event
                        ) =>
                            event
                                .all_day ||
                            event
                                .allDay
                    );

                if (
                    hasAllDayEvent
                ) {
                    return [];
                }

                const candidates =
                    [];

                for (
                    let start =
                        WORKING_START_MINUTES;
                    start +
                        duration <=
                    WORKING_END_MINUTES;
                    start +=
                        SLOT_INTERVAL_MINUTES
                ) {
                    const end =
                        start +
                        duration;

                    const startText =
                        minutesToTime(
                            start
                        );

                    const endText =
                        minutesToTime(
                            end
                        );

                    const conflict =
                        findTimeConflict(
                            events,
                            form
                                .event_date,
                            startText,
                            endText,
                            form.id
                        );

                    if (
                        !conflict
                    ) {
                        candidates.push({
                            start:
                                startText,

                            end:
                                endText,

                            startMinutes:
                                start,

                            distance:
                                Math.abs(
                                    start -
                                        requestedStart
                                ),
                        });
                    }
                }

                return candidates
                    .sort(
                        (
                            a,
                            b
                        ) => {
                            if (
                                a.distance !==
                                b.distance
                            ) {
                                return (
                                    a.distance -
                                    b.distance
                                );
                            }

                            return (
                                a.startMinutes -
                                b.startMinutes
                            );
                        }
                    )
                    .slice(
                        0,
                        3
                    );
            },
            [
                detailMode,
                realtimeConflict,
                form.all_day,
                form.event_date,
                form.start_time,
                form.end_time,
                form.id,
                events,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | APPLY SUGGESTION
    |--------------------------------------------------------------------------
    */

    const applySuggestedTime = (
        slot
    ) => {
        setForm(
            (
                previous
            ) => ({
                ...previous,

                all_day:
                    false,

                start_time:
                    slot.start,

                end_time:
                    slot.end,
            })
        );
    };

    /*
    |--------------------------------------------------------------------------
    | OPEN CREATE
    |--------------------------------------------------------------------------
    */

    const openCreateModal = (
        date = ''
    ) => {
        setSelectedEvent(
            null
        );

        setDetailMode(
            false
        );

        setForm(
            getEmptyForm(
                date
            )
        );

        setModalOpen(
            true
        );
    };

    /*
    |--------------------------------------------------------------------------
    | OPEN DETAIL
    |--------------------------------------------------------------------------
    */

    const openDetailModal = (
        event
    ) => {
        const agendaType =
            event
                .agenda_type ||
            'Rapat';

        setSelectedEvent(
            event
        );

        setForm({
            id:
                event.id,

            title:
                event.title ||
                '',

            description:
                event.description ||
                '',

            event_date:
                event.event_date ||
                '',

            start_time:
                event.start_time ||
                '09:00',

            end_time:
                event.end_time ||
                '10:00',

            all_day:
                Boolean(
                    event
                        .all_day
                ),

            location:
                event.location ||
                '',

            agenda_type:
                agendaType,

            color:
                event.color ||
                getAgendaColor(
                    agendaType
                ),

            is_public:
                Boolean(
                    event
                        .is_public
                ),
        });

        setDetailMode(
            true
        );

        setModalOpen(
            true
        );
    };

    /*
    |--------------------------------------------------------------------------
    | CLOSE MODAL
    |--------------------------------------------------------------------------
    */

    const closeModal =
        () => {
            if (
                saving
            ) {
                return;
            }

            setModalOpen(
                false
            );

            setSelectedEvent(
                null
            );

            setDetailMode(
                false
            );
        };

    /*
    |--------------------------------------------------------------------------
    | FORM CHANGE
    |--------------------------------------------------------------------------
    */

    const handleFormChange = (
        field,
        value
    ) => {
        setForm(
            (
                previous
            ) => {
                if (
                    field ===
                    'agenda_type'
                ) {
                    return {
                        ...previous,

                        agenda_type:
                            value,

                        color:
                            getAgendaColor(
                                value
                            ),
                    };
                }

                return {
                    ...previous,

                    [field]:
                        value,
                };
            }
        );
    };

    /*
    |--------------------------------------------------------------------------
    | VALIDATE
    |--------------------------------------------------------------------------
    */

    const validateForm =
        async () => {
            if (
                !form
                    .title
                    .trim()
            ) {
                await showWarningAlert(
                    'Judul Belum Diisi',
                    'Judul agenda wajib diisi.'
                );

                return false;
            }

            if (
                !form
                    .event_date
            ) {
                await showWarningAlert(
                    'Tanggal Belum Dipilih',
                    'Tanggal agenda wajib dipilih.'
                );

                return false;
            }

            if (
                !form
                    .all_day
            ) {
                if (
                    !form
                        .start_time ||
                    !form
                        .end_time
                ) {
                    await showWarningAlert(
                        'Jam Belum Lengkap',
                        'Jam mulai dan jam selesai wajib diisi.'
                    );

                    return false;
                }

                if (
                    form
                        .end_time <=
                    form
                        .start_time
                ) {
                    await showWarningAlert(
                        'Jam Tidak Valid',
                        'Jam selesai harus setelah jam mulai.'
                    );

                    return false;
                }
            }

            if (
                realtimeConflict
            ) {
                await showWarningAlert(
                    'Jadwal Bentrok',
                    `Waktu yang dipilih bertabrakan dengan agenda "${realtimeConflict.title}".

Tanggal: ${formatConflictDate(
                        realtimeConflict.event_date
                    )}
Waktu: ${getConflictTimeText(
                        realtimeConflict
                    )}
Lokasi: ${realtimeConflict.location || '-'}

Silakan pilih waktu lain.`
                );

                return false;
            }

            return true;
        };

    /*
    |--------------------------------------------------------------------------
    | CALENDAR CLICK
    |--------------------------------------------------------------------------
    */

    const handleDateClick = (
        info
    ) => {
        if (
            !canManage
        ) {
            return;
        }

        openCreateModal(
            info.dateStr
        );
    };

    const handleEventClick = (
        info
    ) => {
        const id =
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
                    id
            );

        if (
            event
        ) {
            openDetailModal(
                event
            );
        }
    };

    /*
    |--------------------------------------------------------------------------
    | SAVE
    |--------------------------------------------------------------------------
    */

    const handleSave =
        async () => {
            if (
                !canManage ||
                !userCanPotentiallyManage
            ) {
                await showErrorAlert(
                    'Akses Ditolak',
                    'Akun tidak memiliki izin mengelola Jadwal Direktur.'
                );

                return;
            }

            if (
                !(await validateForm())
            ) {
                return;
            }

            const isEdit =
                Boolean(
                    form.id
                );

            const confirmation =
                await showConfirmAlert({
                    title:
                        isEdit
                            ? 'Simpan Perubahan Agenda?'
                            : 'Tambahkan Agenda?',

                    text:
                        isEdit
                            ? 'Perubahan agenda akan langsung diterapkan pada kalender.'
                            : 'Agenda akan langsung ditambahkan ke kalender Direktur.',

                    confirmButtonText:
                        isEdit
                            ? 'Ya, simpan'
                            : 'Ya, tambahkan',

                    cancelButtonText:
                        'Batal',

                    icon:
                        'question',

                    confirmButtonColor:
                        '#7f1d1d',
                });

            if (
                !confirmation
                    .isConfirmed
            ) {
                return;
            }

            const payload = {
                title:
                    form
                        .title
                        .trim(),

                description:
                    form
                        .description
                        .trim() ||
                    null,

                event_date:
                    form
                        .event_date,

                all_day:
                    Boolean(
                        form
                            .all_day
                    ),

                start_time:
                    form
                        .all_day
                        ? null
                        : form
                              .start_time,

                end_time:
                    form
                        .all_day
                        ? null
                        : form
                              .end_time,

                location:
                    form
                        .location
                        .trim() ||
                    null,

                agenda_type:
                    form
                        .agenda_type,

                color:
                    getAgendaColor(
                        form
                            .agenda_type
                    ),

                is_public:
                    Boolean(
                        form
                            .is_public
                    ),
            };

            try {
                setSaving(
                    true
                );

                showLoadingAlert(
                    isEdit
                        ? 'Menyimpan Agenda'
                        : 'Menambahkan Agenda',

                    'Sistem sedang memeriksa ketersediaan jadwal.'
                );

                const response =
                    isEdit
                        ? await api.put(
                              `/event-schedules/${form.id}`,
                              payload
                          )
                        : await api.post(
                              '/event-schedules',
                              payload
                          );

                closeAlert();

                await showSuccessAlert(
                    isEdit
                        ? 'Agenda Diperbarui'
                        : 'Agenda Ditambahkan',

                    response
                        ?.data
                        ?.message ||
                        'Data agenda berhasil disimpan.'
                );

                setModalOpen(
                    false
                );

                setSelectedEvent(
                    null
                );

                setDetailMode(
                    false
                );

                await loadEvents();
            } catch (
                error
            ) {
                console.error(
                    'Save director schedule error:',
                    error
                        ?.response
                        ?.data ||
                        error
                );

                closeAlert();

                const responseData =
                    error
                        ?.response
                        ?.data;

                if (
                    error
                        ?.response
                        ?.status ===
                        409 &&
                    responseData
                        ?.code ===
                        'SCHEDULE_CONFLICT'
                ) {
                    const conflict =
                        responseData
                            ?.data
                            ?.conflict;

                    const conflictDate =
                        formatConflictDate(
                            conflict
                                ?.event_date
                        );

                    const conflictTime =
                        conflict
                            ?.all_day
                            ? 'Sepanjang Hari'
                            : conflict
                                  ?.time_text ||
                              `${conflict?.start_time || '-'} - ${conflict?.end_time || '-'}`;

                    await showWarningAlert(
                        'Jadwal Bentrok',
                        `Agenda tidak dapat disimpan karena terdapat agenda lain pada waktu tersebut.

Agenda: ${conflict?.title || '-'}
Kategori: ${conflict?.agenda_type || '-'}
Tanggal: ${conflictDate}
Waktu: ${conflictTime}
Lokasi: ${conflict?.location || '-'}

Silakan ubah tanggal atau jam agenda untuk melakukan reschedule.`
                    );

                    return;
                }

                await showErrorAlert(
                    'Gagal Menyimpan Agenda',
                    extractErrorMessage(
                        error
                    )
                );
            } finally {
                setSaving(
                    false
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | DELETE
    |--------------------------------------------------------------------------
    */

    const handleDelete =
        async () => {
            if (
                !selectedEvent ||
                !canManage
            ) {
                return;
            }

            const confirmation =
                await showConfirmAlert({
                    title:
                        'Hapus Agenda?',

                    text:
                        `Agenda "${selectedEvent.title}" akan dihapus permanen.`,

                    confirmButtonText:
                        'Ya, hapus',

                    cancelButtonText:
                        'Batal',

                    icon:
                        'warning',

                    confirmButtonColor:
                        '#dc2626',
                });

            if (
                !confirmation
                    .isConfirmed
            ) {
                return;
            }

            try {
                setSaving(
                    true
                );

                showLoadingAlert(
                    'Menghapus Agenda',
                    'Mohon tunggu sebentar.'
                );

                await api.delete(
                    `/event-schedules/${selectedEvent.id}`
                );

                closeAlert();

                await showSuccessAlert(
                    'Agenda Dihapus',
                    'Agenda berhasil dihapus.'
                );

                setModalOpen(
                    false
                );

                setSelectedEvent(
                    null
                );

                setDetailMode(
                    false
                );

                await loadEvents();
            } catch (
                error
            ) {
                console.error(
                    'Delete director schedule error:',
                    error
                        ?.response
                        ?.data ||
                        error
                );

                closeAlert();

                await showErrorAlert(
                    'Gagal Menghapus Agenda',
                    extractErrorMessage(
                        error
                    )
                );
            } finally {
                setSaving(
                    false
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | CALENDAR EVENTS
    |--------------------------------------------------------------------------
    */

    const calendarEvents =
        useMemo(
            () =>
                filteredEvents.map(
                    (
                        item
                    ) => {
                        const color =
                            item
                                .color ||
                            getAgendaColor(
                                item
                                    .agenda_type
                            );

                        return {
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
                                color,

                            borderColor:
                                color,

                            textColor:
                                '#ffffff',
                        };
                    }
                ),
            [
                filteredEvents,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */

    if (
        loading
    ) {
        return (
            <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body py-5 text-center">
                    <div className="spinner-border text-danger mb-3" />

                    <h5 className="fw-black mb-0">
                        Memuat Jadwal Direktur
                    </h5>
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
        <div className="director-schedule-page">
            {/* =====================================================
                HEADER
            ===================================================== */}

            <section className="director-schedule-top">
                <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                        <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-2">
                            SEKRETARIAT PIMPINAN
                        </span>

                        <span className="badge rounded-pill bg-white text-dark border px-3 py-2">
                            <i className="bi bi-calendar-event me-2" />

                            {events.length} Agenda
                        </span>
                    </div>

                    <h2 className="fw-black mb-1">
                        Jadwal Direktur
                    </h2>

                    <p className="text-muted mb-0">
                        Kalender agenda dan kegiatan Direktur Telkom University Surabaya.
                    </p>
                </div>

                {canManage && (
                    <button
                        type="button"
                        className="btn btn-danger rounded-pill director-add-button"
                        onClick={() =>
                            openCreateModal()
                        }
                    >
                        <i className="bi bi-plus-lg me-2" />

                        Tambah Agenda
                    </button>
                )}
            </section>

            {/* =====================================================
                OVERVIEW + FILTER
            ===================================================== */}

            <section className="schedule-overview-panel">
                <div className="schedule-filter-area">
                    <div className="schedule-filter-header">
                        <div>
                            <div className="schedule-filter-title">
                                <i className="bi bi-funnel-fill me-2" />
                                Filter Agenda
                            </div>

                            <div className="schedule-filter-subtitle">
                                Saring agenda berdasarkan kategori.
                            </div>
                        </div>

                        <div className="schedule-filter-result">
                            <strong>
                                {
                                    filteredEvents.length
                                }
                            </strong>{' '}
                            dari{' '}
                            <strong>
                                {
                                    events.length
                                }
                            </strong>{' '}
                            agenda
                        </div>
                    </div>

                    <div className="schedule-filter-list">
                        <button
                            type="button"
                            className={`schedule-filter-button ${
                                activeFilter ===
                                'Semua'
                                    ? 'active'
                                    : ''
                            }`}
                            onClick={() =>
                                setActiveFilter(
                                    'Semua'
                                )
                            }
                        >
                            <span className="schedule-filter-icon schedule-filter-icon-all">
                                <i className="bi bi-grid-fill" />
                            </span>

                            <span>
                                Semua
                            </span>

                            <span className="schedule-filter-count">
                                {
                                    agendaCounts
                                        .Semua
                                }
                            </span>
                        </button>

                        {AGENDA_TYPES.map(
                            (
                                type
                            ) => {
                                const color =
                                    getAgendaColor(
                                        type
                                    );

                                const isActive =
                                    activeFilter ===
                                    type;

                                return (
                                    <button
                                        key={
                                            type
                                        }
                                        type="button"
                                        className={`schedule-filter-button ${
                                            isActive
                                                ? 'active'
                                                : ''
                                        }`}
                                        style={
                                            isActive
                                                ? {
                                                      '--agenda-filter-color':
                                                          color,

                                                      borderColor:
                                                          color,

                                                      color:
                                                          color,

                                                      background:
                                                          `${color}10`,
                                                  }
                                                : {
                                                      '--agenda-filter-color':
                                                          color,
                                                  }
                                        }
                                        onClick={() =>
                                            setActiveFilter(
                                                type
                                            )
                                        }
                                    >
                                        <span
                                            className="schedule-filter-icon"
                                            style={{
                                                background:
                                                    color,
                                            }}
                                        >
                                            <i
                                                className={`bi ${getAgendaIcon(
                                                    type
                                                )}`}
                                            />
                                        </span>

                                        <span>
                                            {type}
                                        </span>

                                        <span
                                            className="schedule-filter-count"
                                            style={
                                                isActive
                                                    ? {
                                                          background:
                                                              color,

                                                          color:
                                                              '#ffffff',
                                                      }
                                                    : undefined
                                            }
                                        >
                                            {
                                                agendaCounts[
                                                    type
                                                ]
                                            }
                                        </span>
                                    </button>
                                );
                            }
                        )}
                    </div>
                </div>

                {/* =================================================
                    SUMMARY
                ================================================= */}

                <div className="schedule-summary-area">
                    <div className="schedule-mini-card schedule-mini-today">
                        <div className="schedule-mini-icon">
                            <i className="bi bi-calendar2-check-fill" />
                        </div>

                        <div className="schedule-mini-content">
                            <div className="schedule-mini-label">
                                Agenda Hari Ini
                            </div>

                            <div className="schedule-mini-main">
                                <span className="schedule-mini-number">
                                    {
                                        todayEvents.length
                                    }
                                </span>

                                <span>
                                    agenda
                                </span>
                            </div>

                            <div className="schedule-mini-description">
                                {todayEvents.length >
                                0
                                    ? todayEvents[0]
                                          .title
                                    : 'Tidak ada agenda hari ini'}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        className={`schedule-mini-card schedule-mini-next ${
                            nearestAgenda
                                ? 'schedule-mini-clickable'
                                : ''
                        }`}
                        onClick={() => {
                            if (
                                nearestAgenda
                                    ?.event
                            ) {
                                openDetailModal(
                                    nearestAgenda
                                        .event
                                );
                            }
                        }}
                        disabled={
                            !nearestAgenda
                        }
                    >
                        <div className="schedule-mini-icon">
                            <i
                                className={`bi ${
                                    nearestAgenda
                                        ?.status ===
                                    'ongoing'
                                        ? 'bi-broadcast-pin'
                                        : 'bi-clock-history'
                                }`}
                            />
                        </div>

                        <div className="schedule-mini-content">
                            <div className="schedule-mini-label">
                                {nearestAgenda
                                    ?.status ===
                                'ongoing'
                                    ? 'Sedang Berlangsung'
                                    : 'Agenda Terdekat'}
                            </div>

                            {nearestAgenda ? (
                                <>
                                    <div className="schedule-next-title">
                                        {
                                            nearestAgenda
                                                .event
                                                .title
                                        }
                                    </div>

                                    <div className="schedule-mini-description">
                                        {formatShortDate(
                                            nearestAgenda
                                                .event
                                                .event_date
                                        )}

                                        {' • '}

                                        {getConflictTimeText(
                                            nearestAgenda
                                                .event
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="schedule-mini-description">
                                    Belum ada agenda mendatang.
                                </div>
                            )}
                        </div>

                        {nearestAgenda && (
                            <div className="schedule-mini-arrow">
                                <i className="bi bi-chevron-right" />
                            </div>
                        )}
                    </button>
                </div>
            </section>

            {/* =====================================================
                CALENDAR
            ===================================================== */}

            <section className="card border-0 shadow-sm director-calendar-card">
                <div className="card-body director-calendar-body">
                    <div className="director-calendar-viewport">
                        <FullCalendar
                            plugins={[
                                themePlugin,
                                dayGridPlugin,
                                timeGridPlugin,
                                interactionPlugin,
                            ]}
                            initialView="dayGridMonth"
                            locale="id"
                            firstDay={1}
                            height="100%"
                            expandRows
                            events={
                                calendarEvents
                            }
                            dateClick={
                                handleDateClick
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
                                    'dayGridMonth,timeGridWeek,timeGridDay',
                            }}
                            buttons={{
                                today: {
                                    text:
                                        'Hari Ini',
                                },

                                dayGridMonth: {
                                    text:
                                        'Bulan',
                                },

                                timeGridWeek: {
                                    text:
                                        'Minggu',
                                },

                                timeGridDay: {
                                    text:
                                        'Hari',
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
                            slotLabelFormat={{
                                hour:
                                    '2-digit',

                                minute:
                                    '2-digit',

                                hour12:
                                    false,
                            }}
                            slotMinTime="06:00:00"
                            slotMaxTime="22:00:00"
                            slotDuration="00:30:00"
                            nowIndicator
                            navLinks
                            selectable={
                                canManage
                            }
                            dayMaxEvents={3}
                            fixedWeekCount={
                                false
                            }
                        />
                    </div>
                </div>
            </section>

            {/* =====================================================
                MODAL
            ===================================================== */}

            {modalOpen && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    style={{
                        background:
                            'rgba(15, 23, 42, .58)',
                    }}
                >
                    <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                        <div className="modal-content border-0 rounded-5 shadow-lg overflow-hidden">
                            <div
                                style={{
                                    height:
                                        7,

                                    background:
                                        getAgendaColor(
                                            form
                                                .agenda_type
                                        ),
                                }}
                            />

                            <div className="modal-header border-0 p-4 pb-2">
                                <div>
                                    <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-2 mb-2">
                                        {form.id
                                            ? 'DETAIL AGENDA'
                                            : 'AGENDA BARU'}
                                    </span>

                                    <h4 className="fw-black mb-0">
                                        {form.id
                                            ? form.title
                                            : 'Tambah Agenda Direktur'}
                                    </h4>
                                </div>

                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={
                                        closeModal
                                    }
                                    disabled={
                                        saving
                                    }
                                />
                            </div>

                            <div className="modal-body p-4">
                                {detailMode ? (
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <div className="p-4 rounded-4 bg-light">
                                                <div className="text-muted mb-1">
                                                    Judul Agenda
                                                </div>

                                                <div className="fs-4 fw-black">
                                                    {
                                                        form.title
                                                    }
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="p-3 rounded-4 bg-light h-100">
                                                <div className="text-muted mb-1">
                                                    Tanggal
                                                </div>

                                                <div className="fw-black fs-5">
                                                    {formatDate(
                                                        form.event_date
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="p-3 rounded-4 bg-light h-100">
                                                <div className="text-muted mb-1">
                                                    Waktu
                                                </div>

                                                <div className="fw-black fs-5">
                                                    {form.all_day
                                                        ? 'Sepanjang Hari'
                                                        : `${form.start_time} - ${form.end_time}`}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="p-3 rounded-4 bg-light h-100">
                                                <div className="text-muted mb-2">
                                                    Kategori
                                                </div>

                                                <div
                                                    className="agenda-category-preview"
                                                    style={{
                                                        background:
                                                            `${getAgendaColor(
                                                                form.agenda_type
                                                            )}14`,

                                                        borderColor:
                                                            `${getAgendaColor(
                                                                form.agenda_type
                                                            )}45`,

                                                        color:
                                                            getAgendaColor(
                                                                form.agenda_type
                                                            ),
                                                    }}
                                                >
                                                    <span
                                                        className="agenda-category-icon"
                                                        style={{
                                                            background:
                                                                getAgendaColor(
                                                                    form.agenda_type
                                                                ),
                                                        }}
                                                    >
                                                        <i
                                                            className={`bi ${getAgendaIcon(
                                                                form.agenda_type
                                                            )}`}
                                                        />
                                                    </span>

                                                    <strong>
                                                        {
                                                            form.agenda_type
                                                        }
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="p-3 rounded-4 bg-light h-100">
                                                <div className="text-muted mb-1">
                                                    Lokasi
                                                </div>

                                                <div className="fw-black fs-5">
                                                    {form.location ||
                                                        '-'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <div className="p-3 rounded-4 bg-light">
                                                <div className="text-muted mb-1">
                                                    Deskripsi
                                                </div>

                                                <div
                                                    style={{
                                                        whiteSpace:
                                                            'pre-line',

                                                        lineHeight:
                                                            1.8,
                                                    }}
                                                >
                                                    {form.description ||
                                                        '-'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <span
                                                className={`badge rounded-pill px-3 py-2 fs-6 ${
                                                    form.is_public
                                                        ? 'bg-success-subtle text-success'
                                                        : 'bg-secondary-subtle text-secondary'
                                                }`}
                                            >
                                                <i
                                                    className={`bi ${
                                                        form.is_public
                                                            ? 'bi-globe2'
                                                            : 'bi-lock-fill'
                                                    } me-2`}
                                                />

                                                {form.is_public
                                                    ? 'Tampil di Login'
                                                    : 'Hanya Internal'}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="form-label fw-bold">
                                                Judul Agenda
                                            </label>

                                            <input
                                                type="text"
                                                className="form-control form-control-lg"
                                                value={
                                                    form.title
                                                }
                                                maxLength="255"
                                                placeholder="Contoh: Rapat Koordinasi Pimpinan"
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'title',
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">
                                                Tanggal
                                            </label>

                                            <input
                                                type="date"
                                                className="form-control form-control-lg"
                                                value={
                                                    form.event_date
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'event_date',
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">
                                                Kategori
                                            </label>

                                            <select
                                                className="form-select form-select-lg"
                                                value={
                                                    form.agenda_type
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'agenda_type',
                                                        event.target.value
                                                    )
                                                }
                                            >
                                                {AGENDA_TYPES.map(
                                                    (
                                                        agendaType
                                                    ) => (
                                                        <option
                                                            key={
                                                                agendaType
                                                            }
                                                            value={
                                                                agendaType
                                                            }
                                                        >
                                                            {
                                                                agendaType
                                                            }
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </div>

                                        <div className="col-12">
                                            <div
                                                className="agenda-category-preview"
                                                style={{
                                                    background:
                                                        `${getAgendaColor(
                                                            form.agenda_type
                                                        )}12`,

                                                    borderColor:
                                                        `${getAgendaColor(
                                                            form.agenda_type
                                                        )}42`,

                                                    color:
                                                        getAgendaColor(
                                                            form.agenda_type
                                                        ),
                                                }}
                                            >
                                                <span
                                                    className="agenda-category-icon"
                                                    style={{
                                                        background:
                                                            getAgendaColor(
                                                                form.agenda_type
                                                            ),
                                                    }}
                                                >
                                                    <i
                                                        className={`bi ${getAgendaIcon(
                                                            form.agenda_type
                                                        )}`}
                                                    />
                                                </span>

                                                <div>
                                                    <div className="fw-black">
                                                        {
                                                            form.agenda_type
                                                        }
                                                    </div>

                                                    <div className="small opacity-75">
                                                        Warna agenda ditentukan otomatis berdasarkan kategori.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="agendaAllDay"
                                                    checked={
                                                        form.all_day
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        handleFormChange(
                                                            'all_day',
                                                            event.target.checked
                                                        )
                                                    }
                                                />

                                                <label
                                                    className="form-check-label fw-bold"
                                                    htmlFor="agendaAllDay"
                                                >
                                                    Sepanjang Hari
                                                </label>
                                            </div>
                                        </div>

                                        {!form.all_day && (
                                            <>
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold">
                                                        Jam Mulai
                                                    </label>

                                                    <input
                                                        type="time"
                                                        className="form-control form-control-lg"
                                                        value={
                                                            form.start_time
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            handleFormChange(
                                                                'start_time',
                                                                event.target.value
                                                            )
                                                        }
                                                    />
                                                </div>

                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold">
                                                        Jam Selesai
                                                    </label>

                                                    <input
                                                        type="time"
                                                        className="form-control form-control-lg"
                                                        value={
                                                            form.end_time
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            handleFormChange(
                                                                'end_time',
                                                                event.target.value
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {availabilityState && (
                                            <div className="col-12">
                                                {availabilityState ===
                                                    'available' && (
                                                    <div className="schedule-availability schedule-availability-success">
                                                        <div className="schedule-availability-icon">
                                                            <i className="bi bi-check-lg" />
                                                        </div>

                                                        <div>
                                                            <div className="fw-black">
                                                                Jadwal Tersedia
                                                            </div>

                                                            <div className="small">
                                                                Belum terdapat agenda lain yang bertabrakan dengan waktu ini.
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {availabilityState ===
                                                    'invalid' && (
                                                    <div className="schedule-availability schedule-availability-warning">
                                                        <div className="schedule-availability-icon">
                                                            <i className="bi bi-exclamation-lg" />
                                                        </div>

                                                        <div>
                                                            <div className="fw-black">
                                                                Jam Tidak Valid
                                                            </div>

                                                            <div className="small">
                                                                Jam selesai harus setelah jam mulai.
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {availabilityState ===
                                                    'conflict' &&
                                                    realtimeConflict && (
                                                        <div className="schedule-availability schedule-availability-danger">
                                                            <div className="schedule-availability-icon">
                                                                <i className="bi bi-calendar-x-fill" />
                                                            </div>

                                                            <div className="flex-grow-1">
                                                                <div className="fw-black mb-1">
                                                                    Jadwal Bentrok
                                                                </div>

                                                                <div className="small mb-2">
                                                                    Waktu yang dipilih sudah digunakan oleh agenda lain.
                                                                </div>

                                                                <div className="schedule-conflict-detail">
                                                                    <div>
                                                                        <strong>
                                                                            Agenda:
                                                                        </strong>{' '}
                                                                        {
                                                                            realtimeConflict.title
                                                                        }
                                                                    </div>

                                                                    <div>
                                                                        <strong>
                                                                            Kategori:
                                                                        </strong>{' '}
                                                                        {
                                                                            realtimeConflict.agenda_type
                                                                        }
                                                                    </div>

                                                                    <div>
                                                                        <strong>
                                                                            Waktu:
                                                                        </strong>{' '}
                                                                        {getConflictTimeText(
                                                                            realtimeConflict
                                                                        )}
                                                                    </div>

                                                                    <div>
                                                                        <strong>
                                                                            Lokasi:
                                                                        </strong>{' '}
                                                                        {realtimeConflict.location ||
                                                                            '-'}
                                                                    </div>
                                                                </div>

                                                                {suggestedTimeSlots.length >
                                                                    0 && (
                                                                    <div className="schedule-suggestions mt-3">
                                                                        <div className="small fw-black mb-2">
                                                                            <i className="bi bi-lightbulb-fill me-1" />

                                                                            Saran waktu tersedia
                                                                        </div>

                                                                        <div className="d-flex flex-wrap gap-2">
                                                                            {suggestedTimeSlots.map(
                                                                                (
                                                                                    slot
                                                                                ) => (
                                                                                    <button
                                                                                        type="button"
                                                                                        key={`${slot.start}-${slot.end}`}
                                                                                        className="btn btn-sm btn-light border rounded-pill schedule-suggestion-button"
                                                                                        onClick={() =>
                                                                                            applySuggestedTime(
                                                                                                slot
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <i className="bi bi-clock me-1" />

                                                                                        {
                                                                                            slot.start
                                                                                        }{' '}
                                                                                        -{' '}
                                                                                        {
                                                                                            slot.end
                                                                                        }
                                                                                    </button>
                                                                                )
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {suggestedTimeSlots.length ===
                                                                    0 &&
                                                                    !form.all_day && (
                                                                        <div className="small fw-bold mt-3">
                                                                            Tidak ditemukan slot kosong dengan durasi yang sama pada pukul 06:00–22:00. Silakan pilih tanggal lain.
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                        )}

                                        <div className="col-12">
                                            <label className="form-label fw-bold">
                                                Lokasi
                                            </label>

                                            <input
                                                type="text"
                                                className="form-control form-control-lg"
                                                value={
                                                    form.location
                                                }
                                                placeholder="Contoh: Ruang Direktur"
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'location',
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label fw-bold">
                                                Deskripsi
                                            </label>

                                            <textarea
                                                className="form-control"
                                                rows="5"
                                                value={
                                                    form.description
                                                }
                                                placeholder="Tambahkan informasi agenda jika diperlukan..."
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'description',
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="col-12">
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="agendaPublic"
                                                    checked={
                                                        form.is_public
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        handleFormChange(
                                                            'is_public',
                                                            event.target.checked
                                                        )
                                                    }
                                                />

                                                <label
                                                    className="form-check-label fw-bold"
                                                    htmlFor="agendaPublic"
                                                >
                                                    Tampilkan di halaman Login
                                                </label>
                                            </div>

                                            <div className="form-text">
                                                Jika diaktifkan, agenda dapat dilihat pada kalender publik di halaman login.
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer border-0 p-4 pt-2">
                                {detailMode ? (
                                    <>
                                        {canManage && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger rounded-pill"
                                                    onClick={
                                                        handleDelete
                                                    }
                                                    disabled={
                                                        saving
                                                    }
                                                >
                                                    <i className="bi bi-trash-fill me-2" />

                                                    Hapus
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-danger rounded-pill"
                                                    onClick={() =>
                                                        setDetailMode(
                                                            false
                                                        )
                                                    }
                                                    disabled={
                                                        saving
                                                    }
                                                >
                                                    <i className="bi bi-pencil-fill me-2" />

                                                    Edit Agenda
                                                </button>
                                            </>
                                        )}

                                        <button
                                            type="button"
                                            className="btn btn-light border rounded-pill"
                                            onClick={
                                                closeModal
                                            }
                                        >
                                            Tutup
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-light border rounded-pill"
                                            onClick={
                                                closeModal
                                            }
                                            disabled={
                                                saving
                                            }
                                        >
                                            Batal
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-danger rounded-pill px-4"
                                            onClick={
                                                handleSave
                                            }
                                            disabled={
                                                saving ||
                                                Boolean(
                                                    realtimeConflict
                                                ) ||
                                                availabilityState ===
                                                    'invalid'
                                            }
                                        >
                                            {saving ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" />

                                                    Memeriksa Jadwal...
                                                </>
                                            ) : realtimeConflict ? (
                                                <>
                                                    <i className="bi bi-calendar-x-fill me-2" />

                                                    Jadwal Bentrok
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-floppy-fill me-2" />

                                                    Simpan Agenda
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
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
                    .director-schedule-page {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                        min-height: 0;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | HEADER
                    |--------------------------------------------------------------------------
                    */

                    .director-schedule-top {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        flex-wrap: wrap;
                        gap: 16px;
                        margin-bottom: 0;
                        flex-shrink: 0;
                    }

                    .director-schedule-top h2 {
                        font-size: 2rem;
                        line-height: 1.1;
                    }

                    .director-schedule-top p {
                        font-size: 1rem;
                    }

                    .director-add-button {
                        min-height: 46px;
                        padding-left: 24px;
                        padding-right: 24px;
                        font-size: 1rem;
                        font-weight: 800;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | OVERVIEW PANEL
                    |--------------------------------------------------------------------------
                    */

                    .schedule-overview-panel {
                        display: grid;
                        grid-template-columns:
                            minmax(0, 1.65fr)
                            minmax(330px, .75fr);

                        gap: 10px;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | FILTER AREA
                    |--------------------------------------------------------------------------
                    */

                    .schedule-filter-area {
                        min-width: 0;

                        background: #ffffff;

                        border: 1px solid #e5e7eb;
                        border-radius: 18px;

                        padding: 12px 14px;

                        box-shadow:
                            0 4px 20px
                            rgba(
                                15,
                                23,
                                42,
                                .04
                            );
                    }

                    .schedule-filter-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;

                        gap: 12px;

                        margin-bottom: 9px;
                    }

                    .schedule-filter-title {
                        font-size: .92rem;
                        font-weight: 900;

                        color: #1f2937;
                    }

                    .schedule-filter-subtitle {
                        font-size: .74rem;

                        color: #94a3b8;

                        margin-top: 1px;
                    }

                    .schedule-filter-result {
                        flex-shrink: 0;

                        font-size: .75rem;

                        color: #64748b;

                        background: #f8fafc;

                        border: 1px solid #e2e8f0;

                        padding: 5px 10px;

                        border-radius: 999px;
                    }

                    .schedule-filter-list {
                        display: flex;
                        gap: 6px;
                        flex-wrap: wrap;
                    }

                    .schedule-filter-button {
                        display: inline-flex;
                        align-items: center;

                        gap: 6px;

                        min-height: 32px;

                        border:
                            1px solid
                            #e2e8f0;

                        background:
                            #ffffff;

                        color:
                            #475569;

                        border-radius:
                            999px;

                        padding:
                            3px
                            7px
                            3px
                            4px;

                        font-size:
                            .72rem;

                        font-weight:
                            800;

                        transition:
                            transform
                                .15s
                                ease,
                            box-shadow
                                .15s
                                ease,
                            border-color
                                .15s
                                ease,
                            background
                                .15s
                                ease;
                    }

                    .schedule-filter-button:hover {
                        transform:
                            translateY(
                                -1px
                            );

                        box-shadow:
                            0 5px 12px
                            rgba(
                                15,
                                23,
                                42,
                                .08
                            );

                        border-color:
                            var(
                                --agenda-filter-color,
                                #7f1d1d
                            );
                    }

                    .schedule-filter-button.active {
                        border-color:
                            #7f1d1d;

                        background:
                            #fff7f7;

                        color:
                            #7f1d1d;
                    }

                    .schedule-filter-icon {
                        width: 24px;
                        height: 24px;

                        flex:
                            0 0 24px;

                        display:
                            inline-flex;

                        align-items:
                            center;

                        justify-content:
                            center;

                        border-radius:
                            50%;

                        color:
                            #ffffff;

                        font-size:
                            .64rem;
                    }

                    .schedule-filter-icon-all {
                        background:
                            #7f1d1d;
                    }

                    .schedule-filter-count {
                        min-width:
                            20px;

                        height:
                            20px;

                        display:
                            inline-flex;

                        align-items:
                            center;

                        justify-content:
                            center;

                        padding:
                            0 5px;

                        border-radius:
                            999px;

                        background:
                            #f1f5f9;

                        color:
                            #64748b;

                        font-size:
                            .64rem;

                        font-weight:
                            900;
                    }

                    .schedule-filter-button.active
                    .schedule-filter-count {
                        background:
                            #7f1d1d;

                        color:
                            #ffffff;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | SUMMARY AREA
                    |--------------------------------------------------------------------------
                    */

                    .schedule-summary-area {
                        display: grid;

                        grid-template-columns:
                            1fr 1.35fr;

                        gap: 8px;
                    }

                    .schedule-mini-card {
                        width: 100%;

                        min-width: 0;

                        border:
                            1px solid
                            #e5e7eb;

                        border-radius:
                            18px;

                        background:
                            #ffffff;

                        padding:
                            12px;

                        display:
                            flex;

                        align-items:
                            center;

                        gap: 10px;

                        text-align:
                            left;

                        color:
                            inherit;

                        box-shadow:
                            0 4px 20px
                            rgba(
                                15,
                                23,
                                42,
                                .04
                            );
                    }

                    button.schedule-mini-card {
                        appearance:
                            none;

                        font-family:
                            inherit;
                    }

                    button.schedule-mini-card:disabled {
                        opacity: 1;
                    }

                    .schedule-mini-today {
                        background:
                            linear-gradient(
                                145deg,
                                #fff7f7,
                                #ffffff
                            );

                        border-color:
                            #fecaca;
                    }

                    .schedule-mini-next {
                        background:
                            linear-gradient(
                                145deg,
                                #f8fafc,
                                #ffffff
                            );
                    }

                    .schedule-mini-clickable {
                        cursor:
                            pointer;

                        transition:
                            transform
                                .15s
                                ease,
                            box-shadow
                                .15s
                                ease,
                            border-color
                                .15s
                                ease;
                    }

                    .schedule-mini-clickable:hover {
                        transform:
                            translateY(
                                -2px
                            );

                        border-color:
                            #d1d5db;

                        box-shadow:
                            0 8px 22px
                            rgba(
                                15,
                                23,
                                42,
                                .09
                            );
                    }

                    .schedule-mini-icon {
                        width: 39px;
                        height: 39px;

                        flex:
                            0 0 39px;

                        display:
                            flex;

                        align-items:
                            center;

                        justify-content:
                            center;

                        border-radius:
                            12px;

                        color:
                            #ffffff;

                        background:
                            #7f1d1d;

                        font-size:
                            1rem;
                    }

                    .schedule-mini-next
                    .schedule-mini-icon {
                        background:
                            #334155;
                    }

                    .schedule-mini-content {
                        min-width: 0;
                        flex: 1;
                    }

                    .schedule-mini-label {
                        color:
                            #64748b;

                        font-size:
                            .67rem;

                        line-height:
                            1;

                        font-weight:
                            800;

                        text-transform:
                            uppercase;

                        letter-spacing:
                            .04em;

                        margin-bottom:
                            5px;
                    }

                    .schedule-mini-main {
                        display:
                            flex;

                        align-items:
                            baseline;

                        gap: 4px;

                        font-size:
                            .76rem;

                        font-weight:
                            800;

                        color:
                            #475569;
                    }

                    .schedule-mini-number {
                        font-size:
                            1.55rem;

                        line-height:
                            1;

                        font-weight:
                            900;

                        color:
                            #7f1d1d;
                    }

                    .schedule-mini-description {
                        margin-top:
                            4px;

                        color:
                            #64748b;

                        font-size:
                            .69rem;

                        line-height:
                            1.3;

                        white-space:
                            nowrap;

                        overflow:
                            hidden;

                        text-overflow:
                            ellipsis;
                    }

                    .schedule-next-title {
                        color:
                            #1f2937;

                        font-size:
                            .82rem;

                        line-height:
                            1.25;

                        font-weight:
                            900;

                        white-space:
                            nowrap;

                        overflow:
                            hidden;

                        text-overflow:
                            ellipsis;
                    }

                    .schedule-mini-arrow {
                        flex-shrink:
                            0;

                        color:
                            #94a3b8;

                        font-size:
                            .9rem;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | CALENDAR
                    |--------------------------------------------------------------------------
                    */

                    .director-calendar-card {
                        border-radius:
                            24px !important;

                        overflow:
                            hidden;

                        min-height:
                            0;
                    }

                    .director-calendar-body {
                        padding:
                            14px !important;

                        min-height:
                            0;
                    }

                    .director-calendar-viewport {
                        height:
                            calc(
                                100vh - 365px
                            );

                        min-height:
                            450px;

                        max-height:
                            720px;
                    }

                    .director-calendar-viewport > div,
                    .director-calendar-viewport .fc {
                        height:
                            100%;
                    }

                    .director-calendar-card .fc {
                        font-size:
                            1.08rem;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | TOOLBAR
                    |--------------------------------------------------------------------------
                    */

                    .director-calendar-card
                    .fc-toolbar {
                        margin-bottom:
                            12px !important;

                        gap:
                            12px;
                    }

                    .director-calendar-card
                    .fc-toolbar-title {
                        font-size:
                            2rem !important;

                        font-weight:
                            900 !important;

                        line-height:
                            1 !important;

                        text-transform:
                            capitalize;
                    }

                    .director-calendar-card
                    .fc-button {
                        min-height:
                            40px;

                        border-radius:
                            999px !important;

                        font-size:
                            .92rem !important;

                        font-weight:
                            800 !important;

                        padding-left:
                            16px !important;

                        padding-right:
                            16px !important;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | CALENDAR HEADER
                    |--------------------------------------------------------------------------
                    */

                    .director-calendar-card
                    .fc-col-header-cell {
                        background:
                            #f8fafc;

                        padding-top:
                            8px;

                        padding-bottom:
                            8px;
                    }

                    .director-calendar-card
                    .fc-col-header-cell-cushion {
                        font-size:
                            1rem;

                        font-weight:
                            900;

                        color:
                            #475569;

                        text-decoration:
                            none;

                        text-transform:
                            uppercase;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | DAY
                    |--------------------------------------------------------------------------
                    */

                    .director-calendar-card
                    .fc-daygrid-day-frame {
                        min-height:
                            0 !important;
                    }

                    .director-calendar-card
                    .fc-daygrid-day-number {
                        padding:
                            8px 10px;

                        font-size:
                            1.05rem;

                        font-weight:
                            900;

                        color:
                            #1f2937;

                        text-decoration:
                            none;
                    }

                    .director-calendar-card
                    .fc-day-today {
                        background:
                            #fff7f7 !important;
                    }

                    .director-calendar-card
                    .fc-day-today
                    .fc-daygrid-day-number {
                        min-width:
                            30px;

                        min-height:
                            30px;

                        display:
                            inline-flex;

                        align-items:
                            center;

                        justify-content:
                            center;

                        border-radius:
                            999px;

                        background:
                            #7f1d1d;

                        color:
                            #ffffff !important;

                        margin:
                            4px;

                        padding:
                            4px 8px;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | EVENT
                    |--------------------------------------------------------------------------
                    */

                    .director-calendar-card
                    .fc-event {
                        border-radius:
                            7px !important;

                        padding:
                            3px 5px !important;

                        margin:
                            2px 4px !important;

                        font-size:
                            .92rem !important;

                        font-weight:
                            800;

                        line-height:
                            1.3;

                        cursor:
                            pointer;
                    }

                    .director-calendar-card
                    .fc-event-main {
                        overflow:
                            hidden;
                    }

                    .director-calendar-card
                    .fc-event-time {
                        font-size:
                            .9rem !important;

                        font-weight:
                            900;
                    }

                    .director-calendar-card
                    .fc-event-title {
                        font-size:
                            .92rem !important;

                        font-weight:
                            800;

                        overflow:
                            hidden;

                        white-space:
                            nowrap;

                        text-overflow:
                            ellipsis;
                    }

                    .director-calendar-card
                    .fc-daygrid-more-link {
                        margin-left:
                            5px;

                        color:
                            #b91c1c;

                        font-size:
                            .85rem;

                        font-weight:
                            900;

                        text-decoration:
                            none;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | GRID
                    |--------------------------------------------------------------------------
                    */

                    .director-calendar-card
                    .fc-scrollgrid {
                        border-radius:
                            14px;

                        overflow:
                            hidden;
                    }

                    .director-calendar-card
                    .fc-theme-standard td,
                    .director-calendar-card
                    .fc-theme-standard th {
                        border-color:
                            #e5e7eb;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | WEEK / DAY
                    |--------------------------------------------------------------------------
                    */

                    .director-calendar-card
                    .fc-timegrid-axis,
                    .director-calendar-card
                    .fc-timegrid-slot-label {
                        font-size:
                            .9rem;

                        font-weight:
                            700;
                    }

                    .director-calendar-card
                    .fc-timegrid-slot {
                        height:
                            2.7rem;
                    }

                    .director-calendar-card
                    .fc-timegrid-event {
                        font-size:
                            .9rem !important;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | CATEGORY PREVIEW
                    |--------------------------------------------------------------------------
                    */

                    .agenda-category-preview {
                        display:
                            flex;

                        align-items:
                            center;

                        gap:
                            12px;

                        border:
                            1px solid;

                        border-radius:
                            16px;

                        padding:
                            12px 14px;
                    }

                    .agenda-category-icon {
                        width:
                            42px;

                        height:
                            42px;

                        flex:
                            0 0 42px;

                        display:
                            flex;

                        align-items:
                            center;

                        justify-content:
                            center;

                        border-radius:
                            12px;

                        color:
                            #ffffff;

                        font-size:
                            1.15rem;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | AVAILABILITY
                    |--------------------------------------------------------------------------
                    */

                    .schedule-availability {
                        display:
                            flex;

                        align-items:
                            flex-start;

                        gap:
                            14px;

                        border-radius:
                            16px;

                        padding:
                            14px 16px;

                        border:
                            1px solid transparent;
                    }

                    .schedule-availability-icon {
                        width:
                            40px;

                        height:
                            40px;

                        flex:
                            0 0 40px;

                        display:
                            flex;

                        align-items:
                            center;

                        justify-content:
                            center;

                        border-radius:
                            12px;

                        font-size:
                            1.15rem;
                    }

                    .schedule-availability-success {
                        background:
                            #ecfdf5;

                        border-color:
                            #a7f3d0;

                        color:
                            #065f46;
                    }

                    .schedule-availability-success
                    .schedule-availability-icon {
                        background:
                            #d1fae5;
                    }

                    .schedule-availability-warning {
                        background:
                            #fffbeb;

                        border-color:
                            #fde68a;

                        color:
                            #92400e;
                    }

                    .schedule-availability-warning
                    .schedule-availability-icon {
                        background:
                            #fef3c7;
                    }

                    .schedule-availability-danger {
                        background:
                            #fef2f2;

                        border-color:
                            #fecaca;

                        color:
                            #991b1b;
                    }

                    .schedule-availability-danger
                    .schedule-availability-icon {
                        background:
                            #fee2e2;
                    }

                    .schedule-conflict-detail {
                        display:
                            grid;

                        gap:
                            3px;

                        padding:
                            10px 12px;

                        border-radius:
                            10px;

                        background:
                            rgba(
                                255,
                                255,
                                255,
                                .68
                            );
                    }

                    .schedule-suggestion-button {
                        color:
                            #065f46 !important;

                        background:
                            #ffffff !important;

                        border-color:
                            #a7f3d0 !important;

                        font-weight:
                            800 !important;
                    }

                    .schedule-suggestion-button:hover {
                        background:
                            #d1fae5 !important;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | LARGE SCREEN
                    |--------------------------------------------------------------------------
                    */

                    @media (
                        min-width:
                            1500px
                    ) {
                        .schedule-overview-panel {
                            grid-template-columns:
                                minmax(
                                    0,
                                    1.75fr
                                )
                                minmax(
                                    380px,
                                    .7fr
                                );
                        }

                        .director-calendar-viewport {
                            height:
                                calc(
                                    100vh - 355px
                                );

                            max-height:
                                790px;
                        }

                        .director-calendar-card
                        .fc-toolbar-title {
                            font-size:
                                2.15rem !important;
                        }

                        .director-calendar-card
                        .fc-col-header-cell-cushion {
                            font-size:
                                1.05rem;
                        }

                        .director-calendar-card
                        .fc-daygrid-day-number {
                            font-size:
                                1.08rem;
                        }

                        .director-calendar-card
                        .fc-event,
                        .director-calendar-card
                        .fc-event-title {
                            font-size:
                                .95rem !important;
                        }
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | LAPTOP / SHORT SCREEN
                    |--------------------------------------------------------------------------
                    */

                    @media (
                        min-width:
                            992px
                    ) and (
                        max-height:
                            850px
                    ) {
                        .director-schedule-page {
                            gap:
                                8px;
                        }

                        .director-schedule-top h2 {
                            font-size:
                                1.6rem;
                        }

                        .director-schedule-top p {
                            font-size:
                                .84rem;
                        }

                        .schedule-filter-area,
                        .schedule-mini-card {
                            padding:
                                8px 10px;
                        }

                        .schedule-filter-header {
                            margin-bottom:
                                5px;
                        }

                        .schedule-filter-subtitle {
                            display:
                                none;
                        }

                        .schedule-filter-button {
                            min-height:
                                29px;

                            font-size:
                                .68rem;
                        }

                        .schedule-filter-icon {
                            width:
                                21px;

                            height:
                                21px;

                            flex-basis:
                                21px;

                            font-size:
                                .57rem;
                        }

                        .schedule-filter-count {
                            min-width:
                                18px;

                            height:
                                18px;

                            font-size:
                                .6rem;
                        }

                        .schedule-mini-icon {
                            width:
                                34px;

                            height:
                                34px;

                            flex-basis:
                                34px;
                        }

                        .schedule-mini-number {
                            font-size:
                                1.3rem;
                        }

                        .schedule-mini-label {
                            font-size:
                                .6rem;
                        }

                        .schedule-mini-description,
                        .schedule-next-title {
                            font-size:
                                .65rem;
                        }

                        .director-calendar-viewport {
                            height:
                                calc(
                                    100vh - 310px
                                );

                            min-height:
                                420px;
                        }

                        .director-calendar-card
                        .fc-toolbar {
                            margin-bottom:
                                7px !important;
                        }

                        .director-calendar-card
                        .fc-toolbar-title {
                            font-size:
                                1.6rem !important;
                        }

                        .director-calendar-card
                        .fc-button {
                            min-height:
                                35px;

                            font-size:
                                .78rem !important;
                        }

                        .director-calendar-card
                        .fc-col-header-cell {
                            padding-top:
                                5px;

                            padding-bottom:
                                5px;
                        }

                        .director-calendar-card
                        .fc-event,
                        .director-calendar-card
                        .fc-event-title {
                            font-size:
                                .79rem !important;
                        }

                        .director-calendar-card
                        .fc-event-time {
                            font-size:
                                .76rem !important;
                        }
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | MEDIUM
                    |--------------------------------------------------------------------------
                    */

                    @media (
                        max-width:
                            1250px
                    ) {
                        .schedule-overview-panel {
                            grid-template-columns:
                                1fr;
                        }

                        .schedule-summary-area {
                            grid-template-columns:
                                1fr 1.5fr;
                        }

                        .director-calendar-viewport {
                            height:
                                auto;

                            min-height:
                                650px;

                            max-height:
                                none;
                        }
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | TABLET
                    |--------------------------------------------------------------------------
                    */

                    @media (
                        max-width:
                            991.98px
                    ) {
                        .schedule-filter-header {
                            align-items:
                                flex-start;

                            flex-direction:
                                column;
                        }

                        .director-calendar-viewport {
                            min-height:
                                720px;
                        }

                        .director-calendar-card
                        .fc-toolbar {
                            flex-direction:
                                column;
                        }

                        .director-calendar-card
                        .fc-toolbar-chunk {
                            display:
                                flex;

                            justify-content:
                                center;
                        }

                        .director-calendar-card
                        .fc-daygrid-day-frame {
                            min-height:
                                90px !important;
                        }
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | MOBILE
                    |--------------------------------------------------------------------------
                    */

                    @media (
                        max-width:
                            767.98px
                    ) {
                        .director-schedule-top h2 {
                            font-size:
                                1.6rem;
                        }

                        .schedule-filter-area {
                            padding:
                                11px;
                        }

                        .schedule-filter-list {
                            flex-wrap:
                                nowrap;

                            overflow-x:
                                auto;

                            padding-bottom:
                                4px;

                            scrollbar-width:
                                none;
                        }

                        .schedule-filter-list::-webkit-scrollbar {
                            display:
                                none;
                        }

                        .schedule-filter-button {
                            flex-shrink:
                                0;
                        }

                        .schedule-filter-result {
                            font-size:
                                .7rem;
                        }

                        .schedule-summary-area {
                            grid-template-columns:
                                1fr;
                        }

                        .schedule-mini-card {
                            min-height:
                                74px;
                        }

                        .director-calendar-body {
                            padding:
                                10px !important;
                        }

                        .director-calendar-card
                        .fc {
                            font-size:
                                .82rem;
                        }

                        .director-calendar-card
                        .fc-toolbar-title {
                            font-size:
                                1.35rem !important;
                        }

                        .director-calendar-card
                        .fc-button {
                            min-height:
                                36px;

                            padding-left:
                                10px !important;

                            padding-right:
                                10px !important;

                            font-size:
                                .72rem !important;
                        }

                        .director-calendar-card
                        .fc-col-header-cell-cushion {
                            font-size:
                                .75rem;
                        }

                        .director-calendar-card
                        .fc-daygrid-day-number {
                            font-size:
                                .8rem;

                            padding:
                                5px;
                        }

                        .director-calendar-card
                        .fc-event,
                        .director-calendar-card
                        .fc-event-title,
                        .director-calendar-card
                        .fc-event-time {
                            font-size:
                                .65rem !important;
                        }
                    }
                `}
            </style>
        </div>
    );
}