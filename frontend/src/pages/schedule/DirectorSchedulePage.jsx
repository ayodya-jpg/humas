
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
    closeAlert, showConfirmAlert, showErrorAlert,
    showLoadingAlert, showSuccessAlert, showWarningAlert,
} from '../../utils/sweetAlert';

const DIRECTORATES = [
    { value: 'direktorat', label: 'Direktorat' },
    { value: 'direktur', label: 'Direktur' },
    { value: 'wakil_direktur_1', label: 'Wakil Direktur I' },
    { value: 'wakil_direktur_2', label: 'Wakil Direktur II' },
];

const TYPES = [
    'Rapat', 'Kunjungan', 'Internal', 'Eksternal',
    'Seremonial', 'Akademik', 'Lainnya',
];

const TYPE_COLORS = {
    Rapat: '#7F1D1D',
    Kunjungan: '#1D4ED8',
    Internal: '#4338CA',
    Eksternal: '#047857',
    Seremonial: '#C2410C',
    Akademik: '#7E22CE',
    Lainnya: '#475569',
};

const SOURCES = [
    {
        key: 'all',
        label: 'Semua Kegiatan',
        short: 'Semua',
        icon: 'bi-grid-fill',
        color: '#334155',
    },
    {
        key: 'directorate',
        label: 'Jadwal Direktorat',
        short: 'Direktorat',
        icon: 'bi-calendar-event-fill',
        color: '#7F1D1D',
    },
    {
        key: 'humas',
        label: 'Liputan HUMAS',
        short: 'HUMAS',
        icon: 'bi-camera-reels-fill',
        color: '#2563EB',
    },
    {
        key: 'merchandise',
        label: 'Merchandise',
        short: 'Merchandise',
        icon: 'bi-gift-fill',
        color: '#9333EA',
    },
    {
        key: 'asset_request',
        label: 'Request Barang',
        short: 'Request Barang',
        icon: 'bi-box2-heart-fill',
        color: '#0891B2',
    },
    {
        key: 'borrowing',
        label: 'Peminjaman SEKPiM',
        short: 'Peminjaman',
        icon: 'bi-box-seam-fill',
        color: '#047857',
    },
    {
        key: 'pending_schedule',
        label: 'Pengajuan Jadwal',
        short: 'Pengajuan',
        icon: 'bi-hourglass-split',
        color: '#D97706',
    },
];

const STATUSES = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    revision: 'Perlu Revisi',
    completed: 'Selesai',
    borrowed: 'Sedang Dipinjam',
    returned: 'Dikembalikan',
    rejected: 'Ditolak',
};

const ADMIN_ROLES = [
    'admin', 'admin_humas', 'admin_sekpim', 'superadmin',
];

const AUDIT_FIELDS = {
    directorate: 'Agenda Untuk',
    title: 'Judul Agenda',
    description: 'Deskripsi',
    event_date: 'Tanggal',
    start_time: 'Jam Mulai',
    end_time: 'Jam Selesai',
    all_day: 'Sepanjang Hari',
    location: 'Lokasi',
    agenda_type: 'Kategori',
    color: 'Warna',
    is_public: 'Visibilitas',
};

const ownerLabel = (value) =>
    DIRECTORATES.find(x => x.value === value)?.label || 'Direktorat';

const sourceConfig = (key) =>
    SOURCES.find(x => x.key === key) || SOURCES[0];

const agendaColor = (type) =>
    TYPE_COLORS[type] || TYPE_COLORS.Lainnya;

const dateOnly = (value) =>
    value ? String(value).slice(0, 10) : '';

const timeOnly = (value) =>
    value ? String(value).slice(0, 5) : '';

const dateKey = (value) => [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
].join('-');

function formatDate(value, includeDay = true) {
    const parts = dateOnly(value).split('-').map(Number);

    if (
        parts.length !== 3 ||
        parts.some(x => !Number.isFinite(x))
    ) {
        return '-';
    }

    const date = new Date(
        parts[0], parts[1] - 1, parts[2]
    );

    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('id-ID', {
        ...(includeDay ? { weekday: 'long' } : {}),
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

function formatDateTime(value) {
    const date = value ? new Date(value) : null;

    return date && !Number.isNaN(date.getTime())
        ? date.toLocaleString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '-';
}

const getError = (error) =>
    Object.values(error?.response?.data?.errors || {})
        .flat()
        .find(Boolean) ||
    error?.response?.data?.message ||
    'Terjadi kesalahan pada server.';

function getSource(event) {
    const props = event.extendedProps || {};

    if (props.record_type === 'pending_request') {
        return 'pending_schedule';
    }

    if (props.source_type === 'official') {
        return 'directorate';
    }

    return props.display_source ||
        props.source_type ||
        'directorate';
}

function toMinutes(value) {
    const [h, m] = timeOnly(value)
        .split(':')
        .map(Number);

    return Number.isFinite(h) && Number.isFinite(m)
        ? h * 60 + m
        : null;
}

const fromMinutes = (n) =>
    `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

const blankForm = (date = '', directorate = '') => ({
    id: null,
    directorate,
    title: '',
    description: '',
    event_date: date,
    start_time: '09:00',
    end_time: '10:00',
    all_day: false,
    location: '',
    agenda_type: 'Rapat',
    is_public: true,
});

/*
|--------------------------------------------------------------------------
| DETEKSI BENTROK AGENDA DIREKTORAT
|--------------------------------------------------------------------------
*/

function findConflict(events, form, excluded = null) {
    if (!form.directorate || !form.event_date) {
        return null;
    }

    const owners = form.directorate === 'direktorat'
        ? DIRECTORATES.map(item => item.value)
        : ['direktorat', form.directorate];

    const matches = events.filter(item =>
        owners.includes(item.directorate) &&
        dateOnly(item.event_date) === form.event_date &&
        (
            excluded === null ||
            Number(item.id) !== Number(excluded)
        )
    );

    if (form.all_day) {
        return matches[0] || null;
    }

    const a = toMinutes(form.start_time);
    const b = toMinutes(form.end_time);

    if (a === null || b === null || b <= a) {
        return null;
    }

    return matches.find(item => {
        if (item.all_day || item.allDay) {
            return true;
        }

        const c = toMinutes(item.start_time);
        const d = toMinutes(item.end_time);

        return c !== null &&
            d !== null &&
            a < d &&
            b > c;
    }) || null;
}

/*
|--------------------------------------------------------------------------
| CEK KEGIATAN PADA TANGGAL TERTENTU
|--------------------------------------------------------------------------
|
| All-day: end bersifat eksklusif.
| Peminjaman 28-31 Oktober memiliki end = 1 November.
|
*/

function eventOnDate(event, day) {
    const start = dateOnly(event.start);
    const end = dateOnly(event.end);

    if (!start || !day) return false;

    if (!end) {
        return start === day;
    }

    if (event.allDay) {
        return start <= day && day < end;
    }

    return start <= day && day <= end;
}

/*
|--------------------------------------------------------------------------
| DAPATKAN SELURUH TANGGAL SEBUAH KEGIATAN
|--------------------------------------------------------------------------
*/

function eventDates(event) {
    const start = dateOnly(event.start);

    if (!start) return [];

    const result = [];
    const current = new Date(`${start}T12:00:00`);
    const until = dateOnly(event.end);

    if (!until) return [start];

    for (let i = 0; i < 371; i++) {
        const day = dateKey(current);

        if (
            event.allDay
                ? day >= until
                : day > until
        ) {
            break;
        }

        result.push(day);
        current.setDate(current.getDate() + 1);
    }

    return result;
}

/*
|--------------------------------------------------------------------------
| LATAR WARNA SETIAP TANGGAL
|--------------------------------------------------------------------------
*/

function createDayBackground(colors) {
    if (!colors.length) return '';

    if (colors.length === 1) {
        return `linear-gradient(${colors[0]}16, ${colors[0]}16)`;
    }

    const stops = colors.map((color, index) => {
        const a = index / colors.length * 100;
        const b = (index + 1) / colors.length * 100;

        return `${color}20 ${a}%, ${color}20 ${b}%`;
    });

    return `linear-gradient(135deg, ${stops.join(', ')})`;
}

function InfoBox({ label, value }) {
    return (
        <div className="schedule-info">
            <small>{label}</small>
            <strong>
                {value === undefined ||
                value === null ||
                value === ''
                    ? '-'
                    : String(value)}
            </strong>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| MAIN PAGE
|--------------------------------------------------------------------------
*/

export default function DirectorSchedulePage() {
    const calendarRef = useRef(null);
    const calendarContainerRef = useRef(null);

    const [officialEvents, setOfficialEvents] = useState([]);
    const [integratedEvents, setIntegratedEvents] = useState([]);

    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const [officialError, setOfficialError] = useState('');
    const [integratedError, setIntegratedError] = useState('');

    const [canManage, setCanManage] = useState(false);

    const [isAdmin] = useState(() => {
        try {
            const user = JSON.parse(
                localStorage.getItem('admin_user') || '{}'
            );

            return ADMIN_ROLES.includes(user.role);
        } catch {
            return false;
        }
    });

    const [sourceFilter, setSourceFilter] = useState('all');
    const [ownerFilter, setOwnerFilter] = useState('semua');
    const [typeFilter, setTypeFilter] = useState('Semua');
    const [search, setSearch] = useState('');

    const [calendarRange, setCalendarRange] = useState(null);

    // Modal daftar kegiatan pada tanggal yang dipilih
    const [selectedDay, setSelectedDay] = useState(null);

    // Modal detail kegiatan layanan
    const [selectedIntegrated, setSelectedIntegrated] =
        useState(null);

    // Modal agenda Direktorat
    const [modalOpen, setModalOpen] = useState(false);
    const [detailMode, setDetailMode] = useState(false);
    const [selectedOfficial, setSelectedOfficial] =
        useState(null);

    const [form, setForm] = useState(blankForm());
    const [saving, setSaving] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [histories, setHistories] = useState([]);

    const [compact, setCompact] = useState(() =>
        typeof window !== 'undefined' &&
        window.matchMedia('(max-width: 1100px)').matches
    );

    /*
    |--------------------------------------------------------------------------
    | RESPONSIVE
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const media = window.matchMedia(
            '(max-width: 1100px)'
        );

        const change = () => setCompact(media.matches);

        change();
        media.addEventListener('change', change);

        return () =>
            media.removeEventListener('change', change);
    }, []);

    useEffect(() => {
        const frame = requestAnimationFrame(() =>
            calendarRef.current?.getApi()?.updateSize()
        );

        return () => cancelAnimationFrame(frame);
    }, [compact]);

    /*
    |--------------------------------------------------------------------------
    | LOAD DIRECTORATE
    |--------------------------------------------------------------------------
    */

    const loadOfficial = useCallback(
        async (showLoader = true) => {
            try {
                if (showLoader) setLoading(true);

                setOfficialError('');

                const response = await api.get(
                    '/event-schedules'
                );

                const data = response?.data?.data || {};

                setOfficialEvents(
                    Array.isArray(data.events)
                        ? data.events
                        : []
                );

                setCanManage(Boolean(data.can_manage));
            } catch (error) {
                console.error(
                    'Load directorate schedules',
                    error
                );

                setOfficialError(getError(error));
            } finally {
                if (showLoader) setLoading(false);
            }
        },
        []
    );

    /*
    |--------------------------------------------------------------------------
    | LOAD INTEGRATED CALENDAR
    |--------------------------------------------------------------------------
    */

    const loadIntegrated = useCallback(async () => {
        if (
            !isAdmin ||
            !calendarRange?.start ||
            !calendarRange?.end
        ) {
            return;
        }

        try {
            setSyncing(true);
            setIntegratedError('');

            const response = await api.get(
                '/integrated-calendar/events',
                {
                    params: {
                        start: calendarRange.start,
                        end: calendarRange.end,
                    },
                }
            );

            const rows = response?.data?.data?.events;

            setIntegratedEvents(
                Array.isArray(rows) ? rows : []
            );
        } catch (error) {
            console.error(
                'Load integrated calendar',
                error
            );

            setIntegratedError(getError(error));
            setIntegratedEvents([]);
        } finally {
            setSyncing(false);
        }
    }, [isAdmin, calendarRange]);

    useEffect(() => {
        loadOfficial();
    }, [loadOfficial]);

    useEffect(() => {
        loadIntegrated();
    }, [loadIntegrated]);

    const refresh = async () =>
        Promise.all([
            loadOfficial(false),
            loadIntegrated(),
        ]);

    /*
    |--------------------------------------------------------------------------
    | CALENDAR RANGE
    |--------------------------------------------------------------------------
    */

    const handleDatesSet = useCallback(info => {
        const lastDay = new Date(info.end);
        lastDay.setDate(lastDay.getDate() - 1);

        const next = {
            start: dateKey(info.start),
            end: dateKey(lastDay),
        };

        setCalendarRange(old =>
            old?.start === next.start &&
            old?.end === next.end
                ? old
                : next
        );
    }, []);

    /*
    |--------------------------------------------------------------------------
    | FILTER AGENDA DIREKTORAT
    |--------------------------------------------------------------------------
    */

    const visibleOfficial = useMemo(() => {
        if (
            !['all', 'directorate'].includes(sourceFilter)
        ) {
            return [];
        }

        const keyword = search.trim().toLowerCase();

        return officialEvents.filter(item =>
            (
                ownerFilter === 'semua' ||
                item.directorate === ownerFilter
            ) &&
            (
                typeFilter === 'Semua' ||
                item.agenda_type === typeFilter
            ) &&
            (
                !keyword ||
                [
                    item.title,
                    item.description,
                    item.location,
                    ownerLabel(item.directorate),
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                    .includes(keyword)
            )
        );
    }, [
        officialEvents,
        sourceFilter,
        ownerFilter,
        typeFilter,
        search,
    ]);

    /*
    |--------------------------------------------------------------------------
    | FILTER LAYANAN
    |--------------------------------------------------------------------------
    */

    const visibleIntegrated = useMemo(() => {
        if (
            !isAdmin ||
            sourceFilter === 'directorate'
        ) {
            return [];
        }

        const keyword = search.trim().toLowerCase();

        return integratedEvents.filter(event => {
            const props = event.extendedProps || {};
            const source = getSource(event);

            // Jangan gandakan agenda resmi Direktorat
            if (source === 'directorate') return false;

            if (
                sourceFilter !== 'all' &&
                sourceFilter !== source
            ) {
                return false;
            }

            if (
                source === 'pending_schedule' &&
                ownerFilter !== 'semua' &&
                props.directorate !== ownerFilter
            ) {
                return false;
            }

            if (
                source === 'pending_schedule' &&
                typeFilter !== 'Semua' &&
                props.agenda_type !== typeFilter
            ) {
                return false;
            }

            return !keyword ||
                [
                    event.title,
                    props.description,
                    props.location,
                    props.requester_unit,
                    props.pic_name,
                    props.coverage_type,
                    props.service_code,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                    .includes(keyword);
        });
    }, [
        isAdmin,
        integratedEvents,
        sourceFilter,
        ownerFilter,
        typeFilter,
        search,
    ]);

    /*
    |--------------------------------------------------------------------------
    | KONVERSI DATA FULLCALENDAR
    |--------------------------------------------------------------------------
    */

    const calendarEvents = useMemo(() => {
        const official = visibleOfficial.map(item => {
            const allDay = Boolean(
                item.allDay ?? item.all_day
            );

            const day = dateOnly(item.event_date);

            const color =
                item.color ||
                agendaColor(item.agenda_type);

            return {
                id: `official-${item.id}`,

                title:
                    `[${ownerLabel(item.directorate)}] ${item.title}`,

                start:
                    item.start ||
                    (
                        allDay
                            ? day
                            : `${day}T${timeOnly(item.start_time) || '09:00'}:00`
                    ),

                end:
                    item.end ||
                    (
                        allDay
                            ? null
                            : `${day}T${timeOnly(item.end_time) || '10:00'}:00`
                    ),

                allDay,

                backgroundColor: color,
                borderColor: color,
                textColor: '#fff',

                extendedProps: {
                    source_type: 'official',
                    source_id: item.id,
                    event_date: day,
                    start_time: item.start_time,
                    end_time: item.end_time,
                    all_day: allDay,
                    directorate: item.directorate,
                    agenda_type: item.agenda_type,
                    description: item.description,
                    location: item.location,
                    status: 'approved',
                },
            };
        });

        const integrated = visibleIntegrated.map(item => {
            const source = getSource(item);
            const color = sourceConfig(source).color;

            return {
                ...item,
                id: String(item.id),
                backgroundColor: color,
                borderColor: color,
                textColor: '#fff',

                extendedProps: {
                    ...(item.extendedProps || {}),
                    display_source: source,
                },
            };
        });

        return [...official, ...integrated];
    }, [visibleOfficial, visibleIntegrated]);

    /*
    |--------------------------------------------------------------------------
    | HITUNG JUMLAH KEGIATAN
    |--------------------------------------------------------------------------
    */

    const counts = useMemo(() => {
        const result = {
            directorate: officialEvents.length,
            humas: 0,
            merchandise: 0,
            asset_request: 0,
            borrowing: 0,
            pending_schedule: 0,
        };

        integratedEvents.forEach(event => {
            const source = getSource(event);

            if (
                source !== 'directorate' &&
                source in result
            ) {
                result[source] += 1;
            }
        });

        result.all = Object.values(result).reduce(
            (sum, count) => sum + count,
            0
        );

        return result;
    }, [officialEvents, integratedEvents]);

    /*
    |--------------------------------------------------------------------------
    | DETEKSI BENTROK AGENDA
    |--------------------------------------------------------------------------
    */

    const conflict = useMemo(
        () =>
            detailMode
                ? null
                : findConflict(
                      officialEvents,
                      form,
                      form.id
                  ),
        [
            officialEvents,
            form,
            detailMode,
        ]
    );

    const invalidTime =
        !form.all_day &&
        (
            !form.start_time ||
            !form.end_time ||
            form.end_time <= form.start_time
        );

    const suggestions = useMemo(() => {
        if (
            !conflict ||
            form.all_day ||
            invalidTime
        ) {
            return [];
        }

        const begin = toMinutes(form.start_time);
        const finish = toMinutes(form.end_time);

        if (
            begin === null ||
            finish === null ||
            finish <= begin
        ) {
            return [];
        }

        const duration = finish - begin;
        const options = [];

        for (
            let minute = 360;
            minute + duration <= 1320;
            minute += 30
        ) {
            const next = {
                ...form,
                start_time: fromMinutes(minute),
                end_time: fromMinutes(
                    minute + duration
                ),
            };

            if (
                !findConflict(
                    officialEvents,
                    next,
                    form.id
                )
            ) {
                options.push({
                    start: next.start_time,
                    end: next.end_time,
                    distance:
                        Math.abs(minute - begin),
                });
            }
        }

        return options
            .sort(
                (a, b) =>
                    a.distance - b.distance
            )
            .slice(0, 3);
    }, [
        conflict,
        form,
        invalidTime,
        officialEvents,
    ]);

    /*
    |--------------------------------------------------------------------------
    | WARNA LATAR TANGGAL
    |--------------------------------------------------------------------------
    */

    const dayColors = useMemo(() => {
        const map = new Map();

        calendarEvents.forEach(event => {
            const source = getSource(event);
            const color = sourceConfig(source).color;

            eventDates(event).forEach(day => {
                if (!map.has(day)) {
                    map.set(day, new Set());
                }

                map.get(day).add(color);
            });
        });

        return map;
    }, [calendarEvents]);

    const applyCellColor = useCallback(cell => {
        const day = cell.getAttribute('data-date');

        const colors = Array.from(
            dayColors.get(day) || []
        );

        cell.style.backgroundImage =
            createDayBackground(colors);

        cell.style.backgroundColor =
            colors.length ? '#fff' : '';

        cell.style.boxShadow =
            colors.length
                ? `inset 0 3px 0 ${colors[0]}`
                : '';

        cell.title = colors.length
            ? `${colors.length} jenis warna agenda pada ${formatDate(day)}`
            : '';
    }, [dayColors]);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            calendarContainerRef.current
                ?.querySelectorAll(
                    '.fc-daygrid-day[data-date]'
                )
                .forEach(applyCellColor);
        });

        return () => cancelAnimationFrame(frame);
    }, [
        applyCellColor,
        calendarRange,
        compact,
    ]);

    const renderDayNumber = useCallback(arg => {
        const colors = Array.from(
            dayColors.get(dateKey(arg.date)) || []
        );

        return (
            <span className="calendar-date-number">
                <strong>{arg.dayNumberText}</strong>

                {colors.length > 0 && (
                    <span className="calendar-date-dots">
                        {colors.map(color => (
                            <span
                                key={color}
                                style={{
                                    background: color,
                                }}
                            />
                        ))}
                    </span>
                )}
            </span>
        );
    }, [dayColors]);

    /*
    |--------------------------------------------------------------------------
    | KEGIATAN PADA TANGGAL YANG DIKLIK
    |--------------------------------------------------------------------------
    */

    const selectedDayEvents = useMemo(() => {
        if (!selectedDay) return [];

        return calendarEvents
            .filter(event =>
                eventOnDate(event, selectedDay)
            )
            .sort((a, b) => {
                const x = a.allDay
                    ? '00:00'
                    : timeOnly(a.start?.slice(11));

                const y = b.allDay
                    ? '00:00'
                    : timeOnly(b.start?.slice(11));

                return x.localeCompare(y) ||
                    a.title.localeCompare(b.title);
            });
    }, [calendarEvents, selectedDay]);

    const selectedDayTypes = useMemo(() => {
        const types = new Map();

        selectedDayEvents.forEach(event => {
            const key = getSource(event);
            const type = sourceConfig(key);

            types.set(key, {
                ...type,
                count:
                    (types.get(key)?.count || 0) + 1,
            });
        });

        return [...types.values()];
    }, [selectedDayEvents]);

    // Klik tanggal membuka daftar kegiatan
    const openDay = day =>
        setSelectedDay(dateOnly(day));

    /*
    |--------------------------------------------------------------------------
    | FORM CREATE / EDIT
    |--------------------------------------------------------------------------
    */

    const openCreate = (day = '') => {
        setSelectedDay(null);
        setSelectedIntegrated(null);
        setSelectedOfficial(null);
        setHistories([]);
        setDetailMode(false);

        setForm(
            blankForm(
                day,
                ownerFilter === 'semua'
                    ? ''
                    : ownerFilter
            )
        );

        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;

        setModalOpen(false);
        setDetailMode(false);
        setSelectedOfficial(null);
        setHistories([]);
    };

    const applyOfficial = item =>
        setForm({
            id: item.id,
            directorate:
                item.directorate || 'direktur',
            title: item.title || '',
            description: item.description || '',
            event_date:
                dateOnly(item.event_date),
            start_time:
                timeOnly(item.start_time) || '09:00',
            end_time:
                timeOnly(item.end_time) || '10:00',
            all_day: Boolean(
                item.all_day ?? item.allDay
            ),
            location: item.location || '',
            agenda_type:
                item.agenda_type || 'Rapat',
            is_public:
                Boolean(item.is_public),
        });

    const openOfficialDetail = async item => {
        setSelectedDay(null);
        setSelectedIntegrated(null);
        setSelectedOfficial(item);

        applyOfficial(item);

        setDetailMode(true);
        setHistories([]);
        setModalOpen(true);

        try {
            setDetailLoading(true);

            const response = await api.get(
                `/event-schedules/${item.id}`
            );

            const detail = response?.data?.data;

            if (detail) {
                setSelectedOfficial(detail);
                applyOfficial(detail);

                setHistories(
                    Array.isArray(detail.histories)
                        ? detail.histories
                        : []
                );
            }
        } catch (error) {
            console.error(
                'Schedule detail',
                error
            );
        } finally {
            setDetailLoading(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | BUKA DETAIL SEBUAH KEGIATAN
    |--------------------------------------------------------------------------
    */

    const openEventDetail = event => {
        const props =
            event.extendedProps || {};

        if (
            props.source_type === 'official'
        ) {
            const item = officialEvents.find(
                x =>
                    Number(x.id) ===
                    Number(props.source_id)
            );

            if (item) {
                openOfficialDetail(item);
            }

            return;
        }

        setSelectedDay(null);

        setSelectedIntegrated({
            id: event.id,
            title: event.title,
            extendedProps: props,
        });
    };

    /*
    |--------------------------------------------------------------------------
    | SAVE AGENDA
    |--------------------------------------------------------------------------
    */

    const handleSave = async () => {
        if (!canManage) return;

        if (
            !form.directorate ||
            !form.title.trim() ||
            !form.event_date
        ) {
            await showWarningAlert(
                'Data Belum Lengkap',
                'Agenda untuk, judul, dan tanggal wajib diisi.'
            );
            return;
        }

        if (invalidTime || conflict) {
            await showWarningAlert(
                conflict
                    ? 'Jadwal Bentrok'
                    : 'Jam Tidak Valid',

                conflict
                    ? `Bentrok dengan "${conflict.title}".`
                    : 'Jam selesai harus setelah jam mulai.'
            );

            return;
        }

        const editing =
            Boolean(form.id);

        const confirmation =
            await showConfirmAlert({
                title: editing
                    ? 'Simpan Perubahan Agenda?'
                    : 'Tambah Agenda?',

                text:
                    `Agenda ${ownerLabel(form.directorate)} akan disimpan.`,

                confirmButtonText:
                    'Ya, Simpan',

                confirmButtonColor:
                    '#7F1D1D',
            });

        if (!confirmation?.isConfirmed) {
            return;
        }

        const payload = {
            directorate: form.directorate,
            title: form.title.trim(),

            description:
                form.description.trim() || null,

            event_date: form.event_date,

            start_time: form.all_day
                ? null
                : timeOnly(form.start_time),

            end_time: form.all_day
                ? null
                : timeOnly(form.end_time),

            all_day:
                Boolean(form.all_day),

            location:
                form.location.trim() || null,

            agenda_type:
                form.agenda_type,

            color:
                agendaColor(form.agenda_type),

            is_public:
                Boolean(form.is_public),
        };

        try {
            setSaving(true);

            showLoadingAlert(
                'Menyimpan Agenda',
                'Sedang memproses agenda.'
            );

            const response = editing
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
                'Agenda Berhasil Disimpan',

                response?.data?.message ||
                    'Agenda sudah tersimpan.'
            );

            setModalOpen(false);
            setSelectedOfficial(null);

            await refresh();
        } catch (error) {
            closeAlert();

            await showErrorAlert(
                'Gagal Menyimpan Agenda',
                getError(error)
            );
        } finally {
            setSaving(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | DELETE AGENDA
    |--------------------------------------------------------------------------
    */

    const handleDelete = async () => {
        if (
            !canManage ||
            !selectedOfficial
        ) {
            return;
        }

        const confirmation =
            await showConfirmAlert({
                title: 'Hapus Agenda?',

                text:
                    `Agenda "${selectedOfficial.title}" akan dihapus.`,

                icon: 'warning',

                confirmButtonText:
                    'Ya, Hapus',

                confirmButtonColor:
                    '#DC2626',
            });

        if (!confirmation?.isConfirmed) {
            return;
        }

        try {
            setSaving(true);

            showLoadingAlert(
                'Menghapus Agenda',
                'Mohon tunggu.'
            );

            await api.delete(
                `/event-schedules/${selectedOfficial.id}`
            );

            closeAlert();

            await showSuccessAlert(
                'Agenda Dihapus',
                'Agenda berhasil dihapus.'
            );

            setModalOpen(false);
            setSelectedOfficial(null);

            await refresh();
        } catch (error) {
            closeAlert();

            await showErrorAlert(
                'Gagal Menghapus Agenda',
                getError(error)
            );
        } finally {
            setSaving(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | DETAIL LAYANAN
    |--------------------------------------------------------------------------
    */

    const selectedProps =
        selectedIntegrated?.extendedProps || {};

    const selectedSource =
        selectedProps.display_source ||
        getSource(
            selectedIntegrated || {
                extendedProps: {},
            }
        );

    const selectedConfig =
        sourceConfig(selectedSource);

    const detailUrl =
        selectedProps.source_id
            ? (
                selectedSource === 'humas'
                    ? `/admin/humas-services/${selectedProps.source_id}`

                    : selectedSource === 'merchandise'
                        ? `/admin/orders/${selectedProps.source_id}`

                        : [
                            'borrowing',
                            'asset_request',
                        ].includes(selectedSource)
                            ? `/admin/borrow-requests/${selectedProps.source_id}`

                            : null
            )
            : null;

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <div className="integrated-schedule-page">

            {/* HEADER */}

            <header className="schedule-page-head">
                <div>
                    <span className="badge bg-danger-subtle text-danger rounded-pill mb-2">
                        SEKRETARIAT PIMPINAN
                    </span>

                    <h2 className="fw-black mb-1">
                        Kalender Event Kegiatan Sekretariat Pimpinan
                    </h2>

                    <p className="text-muted small mb-0">
                        Klik tanggal untuk melihat semua
                        kegiatan pada hari tersebut.
                    </p>
                </div>

                <div className="d-flex gap-2">
                    <button
                        className="btn btn-outline-danger rounded-pill"
                        type="button"
                        onClick={refresh}
                        disabled={syncing}
                    >
                        <i className="bi bi-arrow-clockwise me-2" />
                        Refresh
                    </button>

                    {canManage && (
                        <button
                            className="btn btn-danger rounded-pill"
                            type="button"
                            onClick={() => openCreate()}
                        >
                            <i className="bi bi-plus-lg me-2" />
                            Tambah Agenda
                        </button>
                    )}
                </div>
            </header>

            {officialError && (
                <div className="alert alert-danger">
                    {officialError}
                </div>
            )}

            {integratedError && (
                <div className="alert alert-warning">
                    {integratedError}
                </div>
            )}

            <div className="schedule-layout">

                {/* SIDEBAR FILTER */}

                <aside className="schedule-sidebar">
                    <div className="schedule-panel">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <strong>
                                <i className="bi bi-funnel-fill text-danger me-2" />
                                Filter Kegiatan
                            </strong>

                            {syncing && (
                                <span className="spinner-border spinner-border-sm text-danger" />
                            )}
                        </div>

                        <div className="schedule-source-list">
                            {SOURCES.filter(
                                item =>
                                    isAdmin ||
                                    [
                                        'all',
                                        'directorate',
                                    ].includes(item.key)
                            ).map(item => (
                                <button
                                    key={item.key}
                                    type="button"
                                    className={`schedule-source ${
                                        sourceFilter === item.key
                                            ? 'active'
                                            : ''
                                    }`}

                                    onClick={() => {
                                        setSourceFilter(item.key);
                                        setOwnerFilter('semua');
                                        setTypeFilter('Semua');
                                    }}
                                >
                                    <span
                                        className="source-icon"
                                        style={{
                                            background:
                                                item.color,
                                        }}
                                    >
                                        <i
                                            className={`bi ${item.icon}`}
                                        />
                                    </span>

                                    <span className="source-name">
                                        {item.short}
                                    </span>

                                    <small className="source-count">
                                        {counts[item.key] || 0}
                                    </small>
                                </button>
                            ))}
                        </div>

                        <div className="border-top my-3" />

                        <label className="form-label small fw-bold">
                            Cari Kegiatan
                        </label>

                        <input
                            className="form-control form-control-sm mb-3"
                            type="search"
                            placeholder="Judul, lokasi, PIC..."
                            value={search}
                            onChange={e =>
                                setSearch(e.target.value)
                            }
                        />

                        <label className="form-label small fw-bold">
                            Pemilik Agenda
                        </label>

                        <select
                            className="form-select form-select-sm mb-3"
                            value={ownerFilter}

                            onChange={e => {
                                setOwnerFilter(e.target.value);
                                setSourceFilter('directorate');
                            }}
                        >
                            <option value="semua">
                                Semua Direktorat
                            </option>

                            {DIRECTORATES.map(item => (
                                <option
                                    key={item.value}
                                    value={item.value}
                                >
                                    {item.label}
                                </option>
                            ))}
                        </select>

                        <label className="form-label small fw-bold">
                            Kategori Agenda
                        </label>

                        <select
                            className="form-select form-select-sm"
                            value={typeFilter}
                            onChange={e =>
                                setTypeFilter(e.target.value)
                            }
                        >
                            <option value="Semua">
                                Semua Kategori
                            </option>

                            {TYPES.map(type => (
                                <option
                                    key={type}
                                    value={type}
                                >
                                    {type}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm rounded-pill w-100 mt-3"

                            onClick={() => {
                                setSourceFilter('all');
                                setOwnerFilter('semua');
                                setTypeFilter('Semua');
                                setSearch('');
                            }}
                        >
                            Reset Filter
                        </button>
                    </div>

                    {/* LEGENDA */}

                    <div className="schedule-panel schedule-legend-panel">
                        <strong className="small d-block mb-2">
                            Keterangan Warna
                        </strong>

                        {SOURCES.filter(
                            item => item.key !== 'all'
                        ).map(item => (
                            <div
                                className="schedule-legend-row"
                                key={item.key}
                            >
                                <span
                                    className="legend-dot"
                                    style={{
                                        background:
                                            item.color,
                                    }}
                                />

                                {item.label}
                            </div>
                        ))}
                    </div>
                </aside>

                {/* KALENDER */}

                <main className="schedule-calendar">
                    <div className="calendar-heading">
                        <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-calendar3 fs-5" />

                            <div>
                                <small>
                                    Kalender Aktif
                                </small>

                                <strong>
                                    {
                                        sourceConfig(
                                            sourceFilter
                                        ).label
                                    }
                                </strong>
                            </div>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-white bg-opacity-25">
                                {calendarEvents.length} kegiatan
                            </span>

                            <button
                                type="button"
                                className="btn btn-sm btn-light rounded-pill"

                                onClick={() =>
                                    calendarRef.current
                                        ?.getApi()
                                        ?.today()
                                }
                            >
                                Hari Ini
                            </button>
                        </div>
                    </div>

                    <div
                        className="calendar-content"
                        ref={calendarContainerRef}
                    >
                        {loading ? (
                            <div className="text-center p-5">
                                <div className="spinner-border text-danger mb-3" />
                                <p>Memuat jadwal...</p>
                            </div>
                        ) : (
                            <div className="calendar-viewport">
                                <FullCalendar
                                    ref={calendarRef}

                                    plugins={[
                                        themePlugin,
                                        dayGridPlugin,
                                        timeGridPlugin,
                                        interactionPlugin,
                                    ]}

                                    locale="id"
                                    firstDay={1}
                                    initialView="dayGridMonth"

                                    height={
                                        compact
                                            ? 'auto'
                                            : '100%'
                                    }

                                    expandRows={!compact}
                                    fixedWeekCount={false}

                                    dayMaxEvents={
                                        compact ? 2 : 3
                                    }

                                    events={calendarEvents}
                                    datesSet={handleDatesSet}

                                    // Klik tanggal: buka daftar kegiatan
                                    dateClick={info =>
                                        openDay(
                                            info.dateStr.slice(
                                                0,
                                                10
                                            )
                                        )
                                    }

                                    // Klik agenda: buka detail agenda
                                    eventClick={info =>
                                        openEventDetail(
                                            info.event
                                        )
                                    }

                                    dayCellContent={
                                        renderDayNumber
                                    }

                                    dayCellDidMount={info =>
                                        applyCellColor(
                                            info.el
                                        )
                                    }

                                    // Klik +more: tampilkan daftar tanggal
                                    moreLinkClick={info => {
                                        openDay(
                                            dateKey(info.date)
                                        );

                                        return false;
                                    }}

                                    headerToolbar={{
                                        start: 'prev,next',
                                        center: 'title',
                                        end:
                                            'dayGridMonth,timeGridWeek,timeGridDay',
                                    }}

                                    buttonText={{
                                        month: 'Bulan',
                                        week: 'Minggu',
                                        day: 'Hari',
                                    }}

                                    eventTimeFormat={{
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false,
                                    }}

                                    slotMinTime="06:00:00"
                                    slotMaxTime="22:00:00"
                                    slotDuration="00:30:00"

                                    nowIndicator

                                    // Tidak menavigasi ketika tanggal diklik
                                    navLinks={false}
                                />
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | MODAL DAFTAR KEGIATAN PER TANGGAL
            |--------------------------------------------------------------------------
            */}

            {selectedDay && (
                <div
                    className="modal fade show d-block schedule-modal"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                        <div className="modal-content border-0 rounded-4 overflow-hidden shadow-lg">

                            <div className="calendar-modal-accent" />

                            <div className="modal-header border-0 pb-2 px-4 pt-4 align-items-start">
                                <div>
                                    <span className="badge bg-danger-subtle text-danger rounded-pill mb-2">
                                        DAFTAR KEGIATAN
                                    </span>

                                    <h4 className="fw-black mb-1">
                                        {formatDate(selectedDay)}
                                    </h4>

                                    <div className="small text-muted">
                                        {selectedDayEvents.length}
                                        {' '}
                                        kegiatan pada tanggal ini
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Tutup"

                                    onClick={() =>
                                        setSelectedDay(null)
                                    }
                                />
                            </div>

                            <div className="modal-body px-4 py-3">

                                {/* RINGKASAN JENIS LAYANAN */}

                                {selectedDayTypes.length > 0 && (
                                    <div className="d-flex flex-wrap gap-2 mb-3">
                                        {selectedDayTypes.map(type => (
                                            <span
                                                className="schedule-day-summary"
                                                key={type.key}
                                            >
                                                <span
                                                    className="legend-dot"
                                                    style={{
                                                        background:
                                                            type.color,
                                                    }}
                                                />

                                                {type.short}

                                                <strong>
                                                    {type.count}
                                                </strong>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* TANGGAL KOSONG */}

                                {selectedDayEvents.length === 0 ? (
                                    <div className="schedule-day-empty">
                                        <i className="bi bi-calendar2-check fs-1 text-muted" />

                                        <h6 className="fw-bold mt-3">
                                            Tidak ada kegiatan
                                        </h6>

                                        <p className="small text-muted mb-0">
                                            Belum ada kegiatan yang sesuai
                                            filter pada tanggal ini.
                                        </p>
                                    </div>
                                ) : (

                                    /* LIST KEGIATAN */

                                    <div className="d-flex flex-column gap-2">
                                        {selectedDayEvents.map(event => {
                                            const props =
                                                event.extendedProps || {};

                                            const source =
                                                getSource(event);

                                            const config =
                                                sourceConfig(source);

                                            const allDay =
                                                Boolean(event.allDay);

                                            const timed =
                                                !allDay &&
                                                timeOnly(
                                                    event.start?.slice(11)
                                                );

                                            const when = allDay
                                                ? (
                                                    source === 'borrowing'
                                                        ? 'Periode peminjaman'
                                                        : 'Sepanjang hari'
                                                )
                                                : `${timed || '-'} - ${timeOnly(event.end?.slice(11)) || '-'}`;

                                            return (
                                                <button
                                                    type="button"
                                                    className="schedule-day-event"
                                                    key={event.id}

                                                    style={{
                                                        borderLeftColor:
                                                            config.color,
                                                    }}

                                                    onClick={() =>
                                                        openEventDetail(
                                                            event
                                                        )
                                                    }
                                                >
                                                    <span
                                                        className="schedule-day-event-icon"

                                                        style={{
                                                            background:
                                                                config.color,
                                                        }}
                                                    >
                                                        <i
                                                            className={`bi ${config.icon}`}
                                                        />
                                                    </span>

                                                    <span className="schedule-day-event-body">
                                                        <span className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                                            <span
                                                                className="schedule-day-tag"

                                                                style={{
                                                                    color:
                                                                        config.color,
                                                                }}
                                                            >
                                                                {config.label}
                                                            </span>

                                                            {props.status && (
                                                                <span className="badge bg-light text-secondary border">
                                                                    {
                                                                        STATUSES[props.status] ||
                                                                        props.status
                                                                    }
                                                                </span>
                                                            )}
                                                        </span>

                                                        <strong>
                                                            {event.title}
                                                        </strong>

                                                        <small className="text-muted d-block mt-1">
                                                            <i className="bi bi-clock me-1" />
                                                            {when}

                                                            {props.location && (
                                                                <span className="ms-2">
                                                                    <i className="bi bi-geo-alt me-1" />
                                                                    {props.location}
                                                                </span>
                                                            )}
                                                        </small>

                                                        {source === 'borrowing' &&
                                                            props.return_date && (
                                                                <small className="text-muted d-block">
                                                                    Pengembalian:
                                                                    {' '}
                                                                    {formatDate(
                                                                        props.return_date,
                                                                        false
                                                                    )}
                                                                </small>
                                                            )}
                                                    </span>

                                                    <i className="bi bi-chevron-right text-muted" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer border-0 px-4 pb-4">
                                {canManage && (
                                    <button
                                        type="button"
                                        className="btn btn-danger rounded-pill"

                                        onClick={() =>
                                            openCreate(
                                                selectedDay
                                            )
                                        }
                                    >
                                        <i className="bi bi-plus-lg me-2" />

                                        Tambah Agenda Direktorat
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="btn btn-light border rounded-pill"

                                    onClick={() =>
                                        setSelectedDay(null)
                                    }
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/*
            |--------------------------------------------------------------------------
            | MODAL DETAIL LAYANAN
            |--------------------------------------------------------------------------
            */}

            {selectedIntegrated && (
                <div
                    className="modal fade show d-block schedule-modal"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                        <div className="modal-content border-0 rounded-4 overflow-hidden shadow-lg">

                            <div
                                style={{
                                    height: 7,
                                    background:
                                        selectedConfig.color,
                                }}
                            />

                            <div className="modal-header border-0 px-4 pt-4">
                                <div>
                                    <span
                                        className="badge rounded-pill mb-2"

                                        style={{
                                            background:
                                                selectedConfig.color,
                                        }}
                                    >
                                        {selectedConfig.label}
                                    </span>

                                    <h5 className="fw-black mb-0">
                                        {selectedIntegrated.title}
                                    </h5>
                                </div>

                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Tutup"

                                    onClick={() =>
                                        setSelectedIntegrated(null)
                                    }
                                />
                            </div>

                            <div className="modal-body px-4">
                                <div className="row g-3">
                                    {[
                                        [
                                            'Kode Pengajuan',
                                            selectedProps.service_code,
                                        ],
                                        [
                                            'Status',
                                            STATUSES[selectedProps.status] ||
                                                selectedProps.status,
                                        ],
                                        [
                                            selectedSource === 'humas'
                                                ? 'Tanggal Liputan'
                                                : selectedSource === 'pending_schedule'
                                                    ? 'Tanggal Pengajuan Jadwal'
                                                    : 'Tanggal Pengambilan',

                                            formatDate(
                                                selectedProps.pickup_date ||
                                                selectedProps.event_date
                                            ),
                                        ],
                                        [
                                            'Unit / Instansi',
                                            selectedProps.requester_unit,
                                        ],
                                        [
                                            'PIC',
                                            selectedProps.pic_name,
                                        ],
                                        [
                                            'Telepon PIC',
                                            selectedProps.pic_phone ||
                                                selectedProps.pic_whatsapp,
                                        ],
                                        [
                                            'Lokasi',
                                            selectedProps.location,
                                        ],
                                        [
                                            'Kategori',
                                            selectedProps.coverage_type ||
                                                selectedProps.agenda_type,
                                        ],
                                    ]
                                        .filter(([, value]) =>
                                            value !== null &&
                                            value !== undefined &&
                                            value !== ''
                                        )
                                        .map(([label, value]) => (
                                            <div
                                                className="col-md-6"
                                                key={label}
                                            >
                                                <InfoBox
                                                    label={label}
                                                    value={value}
                                                />
                                            </div>
                                        ))}

                                    {selectedSource === 'borrowing' && (
                                        <div className="col-md-6">
                                            <InfoBox
                                                label="Tanggal Pengembalian"
                                                value={formatDate(
                                                    selectedProps.return_date
                                                )}
                                            />
                                        </div>
                                    )}

                                    {selectedSource === 'merchandise' &&
                                        selectedProps.activity_date && (
                                            <div className="col-md-6">
                                                <InfoBox
                                                    label="Tanggal Kegiatan"
                                                    value={formatDate(
                                                        selectedProps.activity_date
                                                    )}
                                                />
                                            </div>
                                        )}

                                    {selectedProps.description && (
                                        <div className="col-12">
                                            <InfoBox
                                                label="Deskripsi"
                                                value={
                                                    selectedProps.description
                                                }
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="modal-footer border-0 px-4 pb-4">
                                {detailUrl && (
                                    <Link
                                        className="btn btn-danger rounded-pill"
                                        to={detailUrl}

                                        onClick={() =>
                                            setSelectedIntegrated(null)
                                        }
                                    >
                                        <i className="bi bi-box-arrow-up-right me-2" />

                                        Buka Detail Pengajuan
                                    </Link>
                                )}

                                <button
                                    type="button"
                                    className="btn btn-light border rounded-pill"

                                    onClick={() =>
                                        setSelectedIntegrated(null)
                                    }
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/*
            |--------------------------------------------------------------------------
            | MODAL DIREKTORAT
            |--------------------------------------------------------------------------
            */}

            {modalOpen && (
                <div
                    className="modal fade show d-block schedule-modal"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                        <div className="modal-content border-0 rounded-4 overflow-hidden shadow-lg">

                            <div className="calendar-modal-accent" />

                            <div className="modal-header px-4 pt-4 border-0">
                                <h5 className="fw-black mb-0">
                                    {detailMode
                                        ? 'Detail Agenda Direktorat'
                                        : form.id
                                            ? 'Edit Agenda Direktorat'
                                            : 'Tambah Agenda Direktorat'}
                                </h5>

                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Tutup"
                                    onClick={closeModal}
                                    disabled={saving}
                                />
                            </div>

                            <div className="modal-body px-4">
                                <div className="row g-3">
                                    {detailMode ? (
                                        <>
                                            {detailLoading && (
                                                <div className="col-12 text-danger small">
                                                    Memuat detail...
                                                </div>
                                            )}

                                            {[
                                                [
                                                    'Judul',
                                                    form.title,
                                                ],
                                                [
                                                    'Pemilik',
                                                    ownerLabel(
                                                        form.directorate
                                                    ),
                                                ],
                                                [
                                                    'Tanggal',
                                                    formatDate(
                                                        form.event_date
                                                    ),
                                                ],
                                                [
                                                    'Waktu',
                                                    form.all_day
                                                        ? 'Sepanjang Hari'
                                                        : `${form.start_time} - ${form.end_time}`,
                                                ],
                                                [
                                                    'Kategori',
                                                    form.agenda_type,
                                                ],
                                                [
                                                    'Lokasi',
                                                    form.location,
                                                ],
                                                [
                                                    'Deskripsi',
                                                    form.description,
                                                ],
                                                [
                                                    'Visibilitas',
                                                    form.is_public
                                                        ? 'Publik'
                                                        : 'Internal',
                                                ],
                                            ].map(([label, value]) => (
                                                <div
                                                    className="col-md-6"
                                                    key={label}
                                                >
                                                    <InfoBox
                                                        label={label}
                                                        value={value}
                                                    />
                                                </div>
                                            ))}

                                            {canManage && (
                                                <div className="col-12">
                                                    <h6 className="fw-bold mt-3">
                                                        Riwayat Perubahan
                                                    </h6>

                                                    {histories.length === 0 && (
                                                        <p className="small text-muted">
                                                            Belum ada riwayat perubahan.
                                                        </p>
                                                    )}

                                                    {histories.map(item => (
                                                        <div
                                                            className="bg-light rounded-3 p-3 mb-2"
                                                            key={item.id}
                                                        >
                                                            <strong>
                                                                {item.action}
                                                            </strong>

                                                            <div className="small text-muted">
                                                                {item.user_name ||
                                                                    'Admin'}
                                                                {' • '}
                                                                {formatDateTime(
                                                                    item.created_at
                                                                )}
                                                            </div>

                                                            {item.action === 'updated' &&
                                                                [
                                                                    ...new Set([
                                                                        ...Object.keys(
                                                                            item.old_values || {}
                                                                        ),
                                                                        ...Object.keys(
                                                                            item.new_values || {}
                                                                        ),
                                                                    ]),
                                                                ]
                                                                    .filter(
                                                                        field =>
                                                                            JSON.stringify(
                                                                                item.old_values?.[field]
                                                                            ) !==
                                                                            JSON.stringify(
                                                                                item.new_values?.[field]
                                                                            )
                                                                    )
                                                                    .map(field => (
                                                                        <div
                                                                            className="small mt-2"
                                                                            key={field}
                                                                        >
                                                                            <strong>
                                                                                {
                                                                                    AUDIT_FIELDS[field] ||
                                                                                    field
                                                                                }
                                                                            </strong>
                                                                            :{' '}
                                                                            {String(
                                                                                item.old_values?.[field] ?? '-'
                                                                            )}
                                                                            {' → '}
                                                                            {String(
                                                                                item.new_values?.[field] ?? '-'
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>

                                            {/* AGENDA UNTUK */}

                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Agenda Untuk *
                                                </label>

                                                <select
                                                    className="form-select"
                                                    value={form.directorate}

                                                    onChange={e =>
                                                        setForm(old => ({
                                                            ...old,
                                                            directorate:
                                                                e.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option value="">
                                                        Pilih Direktorat
                                                    </option>

                                                    {DIRECTORATES.map(item => (
                                                        <option
                                                            key={item.value}
                                                            value={item.value}
                                                        >
                                                            {item.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* JUDUL */}

                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Judul Agenda *
                                                </label>

                                                <input
                                                    className="form-control"
                                                    value={form.title}
                                                    maxLength={255}

                                                    onChange={e =>
                                                        setForm(old => ({
                                                            ...old,
                                                            title:
                                                                e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>

                                            {/* TANGGAL */}

                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Tanggal *
                                                </label>

                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={form.event_date}

                                                    onChange={e =>
                                                        setForm(old => ({
                                                            ...old,
                                                            event_date:
                                                                e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>

                                            {/* KATEGORI */}

                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Kategori
                                                </label>

                                                <select
                                                    className="form-select"
                                                    value={form.agenda_type}

                                                    onChange={e =>
                                                        setForm(old => ({
                                                            ...old,
                                                            agenda_type:
                                                                e.target.value,
                                                        }))
                                                    }
                                                >
                                                    {TYPES.map(item => (
                                                        <option
                                                            key={item}
                                                            value={item}
                                                        >
                                                            {item}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* SEPANJANG HARI */}

                                            <div className="col-12">
                                                <div className="form-check form-switch">
                                                    <input
                                                        className="form-check-input"
                                                        id="scheduleAllDay"
                                                        type="checkbox"
                                                        checked={form.all_day}

                                                        onChange={e =>
                                                            setForm(old => ({
                                                                ...old,
                                                                all_day:
                                                                    e.target.checked,
                                                            }))
                                                        }
                                                    />

                                                    <label
                                                        className="form-check-label"
                                                        htmlFor="scheduleAllDay"
                                                    >
                                                        Sepanjang Hari
                                                    </label>
                                                </div>
                                            </div>

                                            {/* WAKTU */}

                                            {!form.all_day && (
                                                <>
                                                    <div className="col-md-6">
                                                        <label className="form-label fw-bold">
                                                            Jam Mulai *
                                                        </label>

                                                        <input
                                                            type="time"
                                                            className="form-control"
                                                            value={
                                                                form.start_time
                                                            }

                                                            onChange={e =>
                                                                setForm(old => ({
                                                                    ...old,
                                                                    start_time:
                                                                        e.target.value,
                                                                }))
                                                            }
                                                        />
                                                    </div>

                                                    <div className="col-md-6">
                                                        <label className="form-label fw-bold">
                                                            Jam Selesai *
                                                        </label>

                                                        <input
                                                            type="time"
                                                            className="form-control"
                                                            value={
                                                                form.end_time
                                                            }

                                                            onChange={e =>
                                                                setForm(old => ({
                                                                    ...old,
                                                                    end_time:
                                                                        e.target.value,
                                                                }))
                                                            }
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {/* KETERSEDIAAN */}

                                            {form.directorate &&
                                                form.event_date && (
                                                    <div className="col-12">
                                                        <div
                                                            className={`alert ${
                                                                invalidTime
                                                                    ? 'alert-warning'
                                                                    : conflict
                                                                        ? 'alert-danger'
                                                                        : 'alert-success'
                                                            } mb-0`}
                                                        >
                                                            {invalidTime
                                                                ? 'Jam selesai harus setelah jam mulai.'
                                                                : conflict
                                                                    ? `Bentrok dengan ${conflict.title}.`
                                                                    : 'Jadwal tersedia.'}

                                                            {suggestions.length > 0 && (
                                                                <div className="d-flex flex-wrap gap-2 mt-2">
                                                                    {suggestions.map(item => (
                                                                        <button
                                                                            key={item.start}
                                                                            type="button"
                                                                            className="btn btn-sm btn-light border rounded-pill"

                                                                            onClick={() =>
                                                                                setForm(old => ({
                                                                                    ...old,
                                                                                    start_time:
                                                                                        item.start,
                                                                                    end_time:
                                                                                        item.end,
                                                                                }))
                                                                            }
                                                                        >
                                                                            {item.start}
                                                                            {' - '}
                                                                            {item.end}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                            {/* LOKASI */}

                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Lokasi
                                                </label>

                                                <input
                                                    className="form-control"
                                                    value={form.location}

                                                    onChange={e =>
                                                        setForm(old => ({
                                                            ...old,
                                                            location:
                                                                e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>

                                            {/* DESKRIPSI */}

                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Deskripsi
                                                </label>

                                                <textarea
                                                    className="form-control"
                                                    rows={3}
                                                    value={form.description}

                                                    onChange={e =>
                                                        setForm(old => ({
                                                            ...old,
                                                            description:
                                                                e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>

                                            {/* PUBLIK */}

                                            <div className="col-12">
                                                <div className="form-check form-switch">
                                                    <input
                                                        className="form-check-input"
                                                        id="schedulePublic"
                                                        type="checkbox"
                                                        checked={form.is_public}

                                                        onChange={e =>
                                                            setForm(old => ({
                                                                ...old,
                                                                is_public:
                                                                    e.target.checked,
                                                            }))
                                                        }
                                                    />

                                                    <label
                                                        className="form-check-label"
                                                        htmlFor="schedulePublic"
                                                    >
                                                        Tampilkan di Kalender Publik
                                                    </label>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* FOOTER AGENDA DIREKTORAT */}

                            <div className="modal-footer border-0 px-4 pb-4">
                                {detailMode ? (
                                    <>
                                        {canManage && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger rounded-pill"
                                                    disabled={saving}
                                                    onClick={handleDelete}
                                                >
                                                    Hapus
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-danger rounded-pill"
                                                    disabled={saving}

                                                    onClick={() =>
                                                        setDetailMode(false)
                                                    }
                                                >
                                                    Edit
                                                </button>
                                            </>
                                        )}

                                        <button
                                            type="button"
                                            className="btn btn-light border rounded-pill"
                                            onClick={closeModal}
                                        >
                                            Tutup
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-light border rounded-pill"
                                            disabled={saving}
                                            onClick={closeModal}
                                        >
                                            Batal
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-danger rounded-pill"
                                            disabled={
                                                saving ||
                                                invalidTime ||
                                                Boolean(conflict)
                                            }
                                            onClick={handleSave}
                                        >
                                            Simpan Agenda
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/*
            |--------------------------------------------------------------------------
            | STYLING
            |--------------------------------------------------------------------------
            */}

            <style>{`
                .integrated-schedule-page {
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .integrated-schedule-page .fw-black {
                    font-weight: 900 !important;
                }

                .schedule-page-head {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 12px;
                }

                .schedule-page-head h2 {
                    font-size: 1.5rem;
                }

                .schedule-layout {
                    display: grid;
                    grid-template-columns: 235px minmax(0, 1fr);
                    gap: 12px;
                    align-items: start;
                }

                .schedule-sidebar {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    min-width: 0;
                }

                .schedule-panel {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 17px;
                    padding: 14px;
                }

                .schedule-source-list {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                .schedule-source {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    border: 1px solid transparent;
                    background: #f8fafc;
                    color: #475569;
                    width: 100%;
                    text-align: left;
                    padding: 5px 8px;
                    border-radius: 10px;
                    min-height: 36px;
                }

                .schedule-source.active {
                    background: #fff1f2;
                    border-color: #fecaca;
                    color: #991b1b;
                }

                .source-icon {
                    display: grid;
                    place-items: center;
                    width: 26px;
                    height: 26px;
                    border-radius: 8px;
                    color: white;
                    flex-shrink: 0;
                }

                .source-name {
                    flex: 1;
                    font-size: .73rem;
                    font-weight: 700;
                }

                .source-count {
                    background: white;
                    border-radius: 99px;
                    padding: 2px 7px;
                    font-weight: 800;
                }

                .schedule-legend-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 3px 0;
                    font-size: .72rem;
                    color: #64748b;
                }

                .legend-dot {
                    display: inline-block;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .schedule-calendar {
                    min-width: 0;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    overflow: hidden;
                    background: white;
                }

                .calendar-heading {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    padding: 11px 15px;
                    background: linear-gradient(
                        90deg,
                        #7f1d1d,
                        #991b1b
                    );
                    color: white;
                }

                .calendar-heading small,
                .calendar-heading strong {
                    display: block;
                }

                .calendar-heading small {
                    opacity: .8;
                }

                .calendar-content {
                    padding: 12px;
                }

                .calendar-viewport {
                    height: clamp(
                        490px,
                        calc(100vh - 225px),
                        850px
                    );
                }

                .calendar-viewport > div,
                .calendar-viewport .fc {
                    height: 100%;
                }

                .integrated-schedule-page .fc {
                    font-size: .82rem;
                }

                .integrated-schedule-page .fc-toolbar-title {
                    font-size: 1.2rem !important;
                    font-weight: 900 !important;
                    text-transform: capitalize;
                }

                .integrated-schedule-page .fc-button {
                    border-radius: 999px !important;
                    font-size: .72rem !important;
                    font-weight: 800 !important;
                }

                .integrated-schedule-page .fc-event {
                    margin: 1px !important;
                    padding: 2px 3px !important;
                    border-radius: 6px !important;
                    font-size: .67rem;
                    font-weight: 800;
                    cursor: pointer;
                }

                /* Kotak tanggal dapat diklik */

                .integrated-schedule-page .fc-daygrid-day {
                    cursor: pointer;
                    transition: filter .2s ease;
                }

                .integrated-schedule-page .fc-daygrid-day:hover {
                    filter: brightness(.96);
                }

                .integrated-schedule-page .fc-day-today {
                    outline: 2px solid #7f1d1d;
                    outline-offset: -2px;
                }

                .integrated-schedule-page .fc-daygrid-day-frame {
                    min-height: 58px;
                }

                /* Nomor dan titik warna tanggal */

                .calendar-date-number {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                    gap: 5px;
                    font-size: .79rem;
                    font-weight: 900;
                }

                .calendar-date-dots {
                    display: inline-flex;
                    gap: 2px;
                    align-items: center;
                    flex-wrap: wrap;
                }

                .calendar-date-dots span {
                    width: 7px;
                    height: 7px;
                    display: inline-block;
                    border-radius: 50%;
                    border: 1px solid #fff;
                }

                /* Modal */

                .schedule-modal {
                    background: #0f172a9e;
                    z-index: 1050;
                }

                .calendar-modal-accent {
                    height: 7px;
                    background: linear-gradient(
                        90deg,
                        #7f1d1d,
                        #2563eb,
                        #9333ea,
                        #0891b2,
                        #047857
                    );
                }

                .schedule-info {
                    padding: 12px 14px;
                    background: #f8fafc;
                    border-radius: 12px;
                    height: 100%;
                }

                .schedule-info small {
                    display: block;
                    margin-bottom: 5px;
                    color: #64748b;
                }

                .schedule-info strong {
                    display: block;
                    white-space: pre-wrap;
                    overflow-wrap: anywhere;
                }

                /* Ringkasan layanan pada tanggal */

                .schedule-day-summary {
                    display: inline-flex;
                    gap: 7px;
                    align-items: center;
                    padding: 7px 10px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 99px;
                    font-size: .72rem;
                }

                /* Tanggal kosong */

                .schedule-day-empty {
                    text-align: center;
                    padding: 35px 10px;
                    background: #f8fafc;
                    border-radius: 15px;
                }

                /* Kartu kegiatan per tanggal */

                .schedule-day-event {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px;
                    width: 100%;
                    border: 1px solid #e2e8f0;
                    border-left: 5px solid;
                    border-radius: 13px;
                    text-align: left;
                    background: #fff;
                    color: #0f172a;
                    transition: background .15s;
                }

                .schedule-day-event:hover {
                    background: #f8fafc;
                }

                .schedule-day-event-icon {
                    display: grid;
                    place-items: center;
                    width: 40px;
                    height: 40px;
                    color: white;
                    border-radius: 12px;
                    flex-shrink: 0;
                }

                .schedule-day-event-body {
                    min-width: 0;
                    flex: 1;
                    overflow-wrap: anywhere;
                }

                .schedule-day-event-body strong {
                    display: block;
                    font-size: .92rem;
                }

                .schedule-day-tag {
                    font-size: .7rem;
                    font-weight: 800;
                }

                /* Tablet */

                @media (max-width: 1100px) {
                    .schedule-layout {
                        grid-template-columns: 1fr;
                    }

                    .schedule-sidebar {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                    }

                    .calendar-viewport,
                    .calendar-viewport > div,
                    .calendar-viewport .fc {
                        height: auto !important;
                    }
                }

                /* Mobile */

                @media (max-width: 768px) {
                    .schedule-sidebar {
                        grid-template-columns: 1fr;
                    }

                    .schedule-source-list {
                        display: grid;
                        grid-template-columns:
                            repeat(2, minmax(0, 1fr));
                    }

                    .calendar-heading {
                        flex-wrap: wrap;
                    }

                    .integrated-schedule-page .fc-toolbar {
                        flex-direction: column;
                        gap: 8px;
                    }

                    .integrated-schedule-page .fc-toolbar-title {
                        font-size: 1.1rem !important;
                    }

                    .schedule-day-event {
                        padding: 10px;
                    }

                    .schedule-day-event-icon {
                        width: 33px;
                        height: 33px;
                    }

                    .schedule-day-event-body strong {
                        font-size: .82rem;
                    }

                    .calendar-date-dots span {
                        width: 5px;
                        height: 5px;
                    }
                }
            `}</style>
        </div>
    );
}
