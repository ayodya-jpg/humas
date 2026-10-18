import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
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
| KONFIGURASI DIREKTORAT
|--------------------------------------------------------------------------
*/

const DIRECTORATES = [
    {
        value: 'direktorat',
        label: 'Direktorat',
        short: 'DIREKTORAT',
        icon: 'bi-people-fill',
        description:
            'Direktur + Wakil Direktur I + Wakil Direktur II',
    },
    {
        value: 'direktur',
        label: 'Direktur',
        short: 'DIREKTUR',
        icon: 'bi-person-badge-fill',
        description: 'Agenda khusus Direktur',
    },
    {
        value: 'wakil_direktur_1',
        label: 'Wakil Direktur I',
        short: 'WADIR I',
        icon: 'bi-person-workspace',
        description: 'Agenda khusus Wakil Direktur I',
    },
    {
        value: 'wakil_direktur_2',
        label: 'Wakil Direktur II',
        short: 'WADIR II',
        icon: 'bi-person-workspace',
        description: 'Agenda khusus Wakil Direktur II',
    },
];

const FILTERS = [
    {
        value: 'semua',
        label: 'Semua Jadwal',
        short: 'SEMUA',
        icon: 'bi-grid-fill',
        description: 'Seluruh agenda Direktorat',
    },
    ...DIRECTORATES,
];

/*
|--------------------------------------------------------------------------
| KONFIGURASI KATEGORI AGENDA
|--------------------------------------------------------------------------
*/

const TYPES = [
    'Rapat',
    'Kunjungan',
    'Internal',
    'Eksternal',
    'Seremonial',
    'Akademik',
    'Lainnya',
];

const COLORS = {
    Rapat: '#7F1D1D',
    Kunjungan: '#1D4ED8',
    Internal: '#4338CA',
    Eksternal: '#047857',
    Seremonial: '#C2410C',
    Akademik: '#7E22CE',
    Lainnya: '#475569',
};

const ICONS = {
    Rapat: 'bi-people-fill',
    Kunjungan: 'bi-building-fill-check',
    Internal: 'bi-building-fill',
    Eksternal: 'bi-globe2',
    Seremonial: 'bi-stars',
    Akademik: 'bi-mortarboard-fill',
    Lainnya: 'bi-calendar-event-fill',
};

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

/*
|--------------------------------------------------------------------------
| HELPER DIREKTORAT
|--------------------------------------------------------------------------
*/

const owner = (value) =>
    DIRECTORATES.find((item) => item.value === value);

const ownerLabel = (value) =>
    owner(value)?.label || 'Direktorat';

const ownerShort = (value) =>
    owner(value)?.short || 'DIREKTORAT';

const colorOf = (type) =>
    COLORS[type] || COLORS.Lainnya;

/*
|--------------------------------------------------------------------------
| HELPER WAKTU DAN TANGGAL
|--------------------------------------------------------------------------
*/

const time = (value) =>
    value ? String(value).slice(0, 5) : '';

const toMinutes = (value) => {
    const [h, m] = time(value).split(':').map(Number);

    return Number.isFinite(h) && Number.isFinite(m)
        ? h * 60 + m
        : null;
};

const fromMinutes = (value) =>
    `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(
        value % 60
    ).padStart(2, '0')}`;

const dateKey = (value) =>
    `${value.getFullYear()}-${String(
        value.getMonth() + 1
    ).padStart(2, '0')}-${String(value.getDate()).padStart(
        2,
        '0'
    )}`;

const localDate = (value, clock = '00:00') => {
    if (!value) return null;

    const [y, m, d] = String(value)
        .slice(0, 10)
        .split('-')
        .map(Number);

    const [h, min] = time(clock).split(':').map(Number);

    const result = new Date(
        y,
        m - 1,
        d,
        h || 0,
        min || 0
    );

    return Number.isNaN(result.getTime()) ? null : result;
};

const dateText = (value, short = false) => {
    const parsed = localDate(value);

    return parsed
        ? parsed.toLocaleDateString(
              'id-ID',
              short
                  ? {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                    }
                  : {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                    }
          )
        : '-';
};

const dateTimeText = (value) => {
    const parsed = value ? new Date(value) : null;

    return parsed && !Number.isNaN(parsed.getTime())
        ? parsed.toLocaleString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '-';
};

const timeText = (event) =>
    event?.all_day || event?.allDay
        ? 'Sepanjang Hari'
        : `${time(event?.start_time) || '-'} - ${
              time(event?.end_time) || '-'
          }`;

/*
|--------------------------------------------------------------------------
| FORM DEFAULT
|--------------------------------------------------------------------------
*/

const blankForm = (
    date = '',
    directorate = ''
) => ({
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
    color: COLORS.Rapat,
    is_public: true,
});

/*
|--------------------------------------------------------------------------
| HELPER BENTROK JADWAL
|--------------------------------------------------------------------------
*/

const conflictOwners = (directorate) =>
    directorate === 'direktorat'
        ? DIRECTORATES.map((item) => item.value)
        : ['direktorat', directorate];

const potentialConflicts = (
    events,
    form,
    excludeId = null
) =>
    events.filter(
        (item) =>
            conflictOwners(form.directorate).includes(
                item.directorate
            ) &&
            item.event_date === form.event_date &&
            (excludeId === null ||
                Number(item.id) !== Number(excludeId))
    );

const scheduleConflict = (
    events,
    form,
    excludeId = null
) => {
    if (!form.directorate || !form.event_date) {
        return null;
    }

    const candidates = potentialConflicts(
        events,
        form,
        excludeId
    );

    if (form.all_day) {
        return candidates[0] || null;
    }

    const begin = toMinutes(form.start_time);
    const finish = toMinutes(form.end_time);

    if (
        begin === null ||
        finish === null ||
        finish <= begin
    ) {
        return null;
    }

    return (
        candidates.find((item) => {
            if (item.all_day || item.allDay) {
                return true;
            }

            const a = toMinutes(item.start_time);
            const b = toMinutes(item.end_time);

            return (
                a !== null &&
                b !== null &&
                begin < b &&
                finish > a
            );
        }) || null
    );
};

/*
|--------------------------------------------------------------------------
| HELPER ERROR
|--------------------------------------------------------------------------
*/

const errorMessage = (error) => {
    const data = error?.response?.data;

    return (
        Object.values(data?.errors || {})
            .flat()
            .find(Boolean) ||
        data?.message ||
        'Terjadi kesalahan pada server.'
    );
};

/*
|--------------------------------------------------------------------------
| HELPER AUDIT TRAIL
|--------------------------------------------------------------------------
*/

const auditValue = (field, value) => {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return '-';
    }

    if (field === 'directorate') {
        return ownerLabel(value);
    }

    if (field === 'event_date') {
        return dateText(value, true);
    }

    if (
        field === 'start_time' ||
        field === 'end_time'
    ) {
        return time(value);
    }

    if (field === 'all_day') {
        return value ? 'Ya' : 'Tidak';
    }

    if (field === 'is_public') {
        return value ? 'Publik' : 'Internal';
    }

    return String(value);
};

const auditChanges = (entry) =>
    [
        ...new Set([
            ...Object.keys(entry.old_values || {}),
            ...Object.keys(entry.new_values || {}),
        ]),
    ]
        .map((field) => ({
            field,
            label: AUDIT_FIELDS[field] || field,
            old: auditValue(
                field,
                entry.old_values?.[field]
            ),
            next: auditValue(
                field,
                entry.new_values?.[field]
            ),
        }))
        .filter((item) => item.old !== item.next);

/*
|--------------------------------------------------------------------------
| KOMPONEN FIELD
|--------------------------------------------------------------------------
*/

function Field({
    label,
    children,
    required = false,
}) {
    return (
        <label className="d-block">
            <span className="form-label fw-bold d-block mb-2">
                {label}

                {required && (
                    <span className="text-danger ms-1">
                        *
                    </span>
                )}
            </span>

            {children}
        </label>
    );
}

/*
|--------------------------------------------------------------------------
| HALAMAN UTAMA
|--------------------------------------------------------------------------
*/

export default function DirectorSchedulePage() {
    const calendarRef = useRef(null);

    /*
    |--------------------------------------------------------------------------
    | STATE DATA
    |--------------------------------------------------------------------------
    */

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const [canManage, setCanManage] = useState(false);

    const [activeOwner, setActiveOwner] =
        useState('semua');

    const [activeType, setActiveType] =
        useState('Semua');

    const [search, setSearch] = useState('');

    /*
    |--------------------------------------------------------------------------
    | STATE MODAL
    |--------------------------------------------------------------------------
    */

    const [modalOpen, setModalOpen] =
        useState(false);

    const [detailMode, setDetailMode] =
        useState(false);

    const [selectedEvent, setSelectedEvent] =
        useState(null);

    const [form, setForm] = useState(blankForm());

    const [saving, setSaving] = useState(false);

    const [detailLoading, setDetailLoading] =
        useState(false);

    const [histories, setHistories] = useState([]);

    const [historyError, setHistoryError] =
        useState(false);

    const [now, setNow] = useState(() => new Date());

    /*
    |--------------------------------------------------------------------------
    | RESPONSIVE CALENDAR
    |--------------------------------------------------------------------------
    |
    | PERBAIKAN UTAMA:
    |
    | PC:
    | - FullCalendar height = 100%
    | - Parent memiliki tinggi tertentu.
    |
    | HP / TABLET:
    | - FullCalendar height = auto
    | - Parent mengikuti tinggi konten.
    |
    */

    const [compact, setCompact] = useState(
        () =>
            typeof window !== 'undefined' &&
            window
                .matchMedia('(max-width: 1250px)')
                .matches
    );

    useEffect(() => {
        const media = window.matchMedia(
            '(max-width: 1250px)'
        );

        const change = () => {
            setCompact(media.matches);
        };

        change();

        media.addEventListener('change', change);

        return () => {
            media.removeEventListener(
                'change',
                change
            );
        };
    }, []);

    /*
    |--------------------------------------------------------------------------
    | CLOCK
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const timer = window.setInterval(
            () => setNow(new Date()),
            60000
        );

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    /*
    |--------------------------------------------------------------------------
    | UPDATE CALENDAR SIZE
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const frame = window.requestAnimationFrame(
            () => {
                calendarRef.current
                    ?.getApi()
                    ?.updateSize();
            }
        );

        return () => {
            window.cancelAnimationFrame(frame);
        };
    }, [compact]);

    /*
    |--------------------------------------------------------------------------
    | LOAD EVENTS
    |--------------------------------------------------------------------------
    */

    const loadEvents = useCallback(async () => {
        try {
            setLoading(true);

            const response = await api.get(
                '/event-schedules'
            );

            const data =
                response?.data?.data || {};

            setEvents(
                Array.isArray(data.events)
                    ? data.events
                    : []
            );

            setCanManage(Boolean(data.can_manage));
        } catch (error) {
            console.error(
                'Load directorate schedules:',
                error?.response?.data || error
            );

            await showErrorAlert(
                'Gagal Memuat Jadwal',
                errorMessage(error)
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    /*
    |--------------------------------------------------------------------------
    | HITUNG TOTAL AGENDA
    |--------------------------------------------------------------------------
    */

    const ownerCounts = useMemo(() => {
        const counts = {
            semua: events.length,
        };

        DIRECTORATES.forEach((item) => {
            counts[item.value] = events.filter(
                (event) =>
                    event.directorate === item.value
            ).length;
        });

        return counts;
    }, [events]);

    /*
    |--------------------------------------------------------------------------
    | FILTER DIREKTORAT
    |--------------------------------------------------------------------------
    */

    const ownerEvents = useMemo(
        () =>
            activeOwner === 'semua'
                ? events
                : events.filter(
                      (event) =>
                          event.directorate ===
                          activeOwner
                  ),
        [events, activeOwner]
    );

    const activeOwnerInfo =
        FILTERS.find(
            (item) => item.value === activeOwner
        ) || FILTERS[0];

    /*
    |--------------------------------------------------------------------------
    | HITUNG KATEGORI
    |--------------------------------------------------------------------------
    */

    const typeCounts = useMemo(() => {
        const counts = {
            Semua: ownerEvents.length,
        };

        TYPES.forEach((type) => {
            counts[type] = ownerEvents.filter(
                (event) =>
                    event.agenda_type === type
            ).length;
        });

        return counts;
    }, [ownerEvents]);

    /*
    |--------------------------------------------------------------------------
    | FILTER AGENDA
    |--------------------------------------------------------------------------
    */

    const filteredEvents = useMemo(
        () =>
            ownerEvents.filter((event) => {
                if (
                    activeType !== 'Semua' &&
                    event.agenda_type !== activeType
                ) {
                    return false;
                }

                const term = search
                    .trim()
                    .toLowerCase();

                return (
                    !term ||
                    [
                        event.title,
                        event.description,
                        event.location,
                        event.directorate_label,
                        ownerLabel(event.directorate),
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase()
                        .includes(term)
                );
            }),
        [ownerEvents, activeType, search]
    );

    /*
    |--------------------------------------------------------------------------
    | AGENDA HARI INI
    |--------------------------------------------------------------------------
    */

    const todayEvents = useMemo(
        () =>
            ownerEvents
                .filter(
                    (event) =>
                        event.event_date ===
                        dateKey(now)
                )
                .sort(
                    (a, b) =>
                        Number(Boolean(b.all_day)) -
                            Number(
                                Boolean(a.all_day)
                            ) ||
                        String(
                            a.start_time || ''
                        ).localeCompare(
                            String(b.start_time || '')
                        )
                ),
        [ownerEvents, now]
    );

    /*
    |--------------------------------------------------------------------------
    | AGENDA TERDEKAT
    |--------------------------------------------------------------------------
    */

    const nearest = useMemo(() => {
        const candidates = ownerEvents
            .map((event) => ({
                event,

                start: localDate(
                    event.event_date,
                    event.all_day
                        ? '00:00'
                        : event.start_time || '00:00'
                ),

                end: localDate(
                    event.event_date,
                    event.all_day
                        ? '23:59'
                        : event.end_time || '23:59'
                ),
            }))
            .filter(
                (item) =>
                    item.start &&
                    item.end &&
                    item.end >= now
            )
            .sort(
                (a, b) => a.start - b.start
            );

        const active = candidates.find(
            (item) =>
                item.start <= now &&
                item.end >= now
        );

        const next = active || candidates[0];

        return next
            ? {
                  ...next,
                  status: active
                      ? 'ongoing'
                      : 'upcoming',
              }
            : null;
    }, [ownerEvents, now]);

    /*
    |--------------------------------------------------------------------------
    | DETEKSI BENTROK
    |--------------------------------------------------------------------------
    */

    const conflict = useMemo(
        () =>
            detailMode
                ? null
                : scheduleConflict(
                      events,
                      form,
                      form.id
                  ),
        [events, form, detailMode]
    );

    const availability = useMemo(() => {
        if (
            detailMode ||
            !form.directorate ||
            !form.event_date
        ) {
            return null;
        }

        if (
            !form.all_day &&
            (!form.start_time ||
                !form.end_time ||
                form.end_time <= form.start_time)
        ) {
            return 'invalid';
        }

        return conflict
            ? 'conflict'
            : 'available';
    }, [form, detailMode, conflict]);

    /*
    |--------------------------------------------------------------------------
    | SARAN WAKTU
    |--------------------------------------------------------------------------
    */

    const suggestions = useMemo(() => {
        if (
            !conflict ||
            form.all_day ||
            detailMode
        ) {
            return [];
        }

        const begin = toMinutes(
            form.start_time
        );

        const finish = toMinutes(
            form.end_time
        );

        if (
            begin === null ||
            finish === null ||
            finish <= begin
        ) {
            return [];
        }

        const candidates = potentialConflicts(
            events,
            form,
            form.id
        );

        if (
            candidates.some(
                (item) =>
                    item.all_day || item.allDay
            )
        ) {
            return [];
        }

        const duration = finish - begin;
        const slots = [];

        for (
            let minute = 360;
            minute + duration <= 1320;
            minute += 30
        ) {
            const start = fromMinutes(minute);

            const end = fromMinutes(
                minute + duration
            );

            const checking = {
                ...form,
                start_time: start,
                end_time: end,
            };

            if (
                !scheduleConflict(
                    events,
                    checking,
                    form.id
                )
            ) {
                slots.push({
                    start,
                    end,
                    distance: Math.abs(
                        minute - begin
                    ),
                    minute,
                });
            }
        }

        return slots
            .sort(
                (a, b) =>
                    a.distance - b.distance ||
                    a.minute - b.minute
            )
            .slice(0, 3);
    }, [
        events,
        form,
        detailMode,
        conflict,
    ]);

    /*
    |--------------------------------------------------------------------------
    | FORM CHANGE
    |--------------------------------------------------------------------------
    */

    const setField = (field, value) => {
        setForm((old) => ({
            ...old,
            [field]: value,

            ...(field === 'agenda_type'
                ? {
                      color: colorOf(value),
                  }
                : {}),
        }));
    };

    /*
    |--------------------------------------------------------------------------
    | CLOSE MODAL
    |--------------------------------------------------------------------------
    */

    const closeModal = () => {
        if (saving) return;

        setModalOpen(false);
        setDetailMode(false);
        setSelectedEvent(null);
        setHistories([]);
        setHistoryError(false);
    };

    /*
    |--------------------------------------------------------------------------
    | CREATE MODAL
    |--------------------------------------------------------------------------
    */

    const openCreateModal = (date = '') => {
        setSelectedEvent(null);
        setHistories([]);
        setHistoryError(false);
        setDetailMode(false);

        setForm(
            blankForm(
                date,
                activeOwner === 'semua'
                    ? ''
                    : activeOwner
            )
        );

        setModalOpen(true);
    };

    /*
    |--------------------------------------------------------------------------
    | APPLY EVENT
    |--------------------------------------------------------------------------
    */

    const applyEvent = (event) => {
        setForm({
            id: event.id,
            directorate:
                event.directorate || 'direktur',
            title: event.title || '',
            description:
                event.description || '',
            event_date:
                event.event_date || '',
            start_time:
                time(event.start_time) || '09:00',
            end_time:
                time(event.end_time) || '10:00',
            all_day: Boolean(
                event.all_day ?? event.allDay
            ),
            location:
                event.location || '',
            agenda_type:
                event.agenda_type || 'Rapat',
            color:
                event.color ||
                colorOf(event.agenda_type),
            is_public: Boolean(
                event.is_public
            ),
        });
    };

    /*
    |--------------------------------------------------------------------------
    | DETAIL MODAL
    |--------------------------------------------------------------------------
    */

    const openDetailModal = async (event) => {
        if (!event?.id) return;

        setSelectedEvent(event);

        applyEvent(event);

        setDetailMode(true);
        setHistories([]);
        setHistoryError(false);
        setModalOpen(true);

        try {
            setDetailLoading(true);

            const response = await api.get(
                `/event-schedules/${event.id}`
            );

            const detail =
                response?.data?.data;

            if (detail) {
                setSelectedEvent(detail);
                applyEvent(detail);

                setHistories(
                    Array.isArray(
                        detail.histories
                    )
                        ? detail.histories
                        : []
                );
            }
        } catch (error) {
            console.error(
                'Load schedule detail:',
                error?.response?.data || error
            );

            setHistoryError(true);
        } finally {
            setDetailLoading(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | VALIDASI FORM
    |--------------------------------------------------------------------------
    */

    const validateForm = async () => {
        if (!form.directorate) {
            await showWarningAlert(
                'Agenda Untuk Siapa?',
                'Pilih Direktorat, Direktur, Wakil Direktur I, atau Wakil Direktur II.'
            );

            return false;
        }

        if (!form.title.trim()) {
            await showWarningAlert(
                'Judul Belum Diisi',
                'Judul agenda wajib diisi.'
            );

            return false;
        }

        if (!form.event_date) {
            await showWarningAlert(
                'Tanggal Belum Dipilih',
                'Tanggal agenda wajib dipilih.'
            );

            return false;
        }

        if (
            !form.all_day &&
            (!form.start_time ||
                !form.end_time ||
                form.end_time <= form.start_time)
        ) {
            await showWarningAlert(
                'Jam Tidak Valid',
                'Jam selesai harus setelah jam mulai.'
            );

            return false;
        }

        if (conflict) {
            await showWarningAlert(
                'Jadwal Bentrok',
                `Agenda ${ownerLabel(
                    form.directorate
                )} bentrok dengan "${
                    conflict.title
                }" (${ownerLabel(
                    conflict.directorate
                )}), ${dateText(
                    conflict.event_date
                )} pukul ${timeText(conflict)}.`
            );

            return false;
        }

        return true;
    };

    /*
    |--------------------------------------------------------------------------
    | SAVE AGENDA
    |--------------------------------------------------------------------------
    */

    const handleSave = async () => {
        if (!canManage) {
            await showErrorAlert(
                'Akses Ditolak',
                'Akun tidak memiliki izin mengelola agenda.'
            );

            return;
        }

        if (!(await validateForm())) {
            return;
        }

        const editing = Boolean(form.id);

        const confirmed =
            await showConfirmAlert({
                title: editing
                    ? 'Simpan Perubahan Agenda?'
                    : 'Tambahkan Agenda?',

                text: `Agenda untuk ${ownerLabel(
                    form.directorate
                )} akan ${
                    editing
                        ? 'diperbarui'
                        : 'ditambahkan'
                }.`,

                confirmButtonText: editing
                    ? 'Ya, simpan'
                    : 'Ya, tambahkan',

                confirmButtonColor:
                    '#7f1d1d',
            });

        if (!confirmed?.isConfirmed) {
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
                : time(form.start_time),

            end_time: form.all_day
                ? null
                : time(form.end_time),

            all_day: Boolean(
                form.all_day
            ),

            location:
                form.location.trim() || null,

            agenda_type:
                form.agenda_type,

            color: colorOf(
                form.agenda_type
            ),

            is_public: Boolean(
                form.is_public
            ),
        };

        try {
            setSaving(true);

            showLoadingAlert(
                editing
                    ? 'Menyimpan Agenda'
                    : 'Menambahkan Agenda',
                'Sistem sedang memeriksa bentrok jadwal.'
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
                editing
                    ? 'Agenda Diperbarui'
                    : 'Agenda Ditambahkan',
                response?.data?.message ||
                    'Agenda berhasil disimpan.'
            );

            if (
                activeOwner !== 'semua'
            ) {
                setActiveOwner(
                    form.directorate
                );
            }

            setModalOpen(false);
            setSelectedEvent(null);
            setDetailMode(false);
            setHistories([]);

            await loadEvents();
        } catch (error) {
            closeAlert();

            const info =
                error?.response?.data;

            if (
                error?.response?.status === 409 &&
                info?.code ===
                    'SCHEDULE_CONFLICT'
            ) {
                const item =
                    info?.data?.conflict;

                await showWarningAlert(
                    'Jadwal Bentrok',
                    `${info.message ||
                        'Agenda tidak dapat disimpan.'}

${item?.directorate_label || ''}
${item?.title || ''}
${dateText(item?.event_date)}
${item?.time_text || ''}`
                );
            } else {
                await showErrorAlert(
                    'Gagal Menyimpan Agenda',
                    errorMessage(error)
                );
            }
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
            !selectedEvent
        ) {
            return;
        }

        const confirmed =
            await showConfirmAlert({
                title: 'Hapus Agenda?',

                text: `Agenda "${selectedEvent.title}" akan dihapus.`,

                icon: 'warning',

                confirmButtonText:
                    'Ya, hapus',

                confirmButtonColor:
                    '#dc2626',
            });

        if (!confirmed?.isConfirmed) {
            return;
        }

        try {
            setSaving(true);

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

            setModalOpen(false);
            setSelectedEvent(null);
            setDetailMode(false);
            setHistories([]);

            await loadEvents();
        } catch (error) {
            closeAlert();

            await showErrorAlert(
                'Gagal Menghapus Agenda',
                errorMessage(error)
            );
        } finally {
            setSaving(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | FULLCALENDAR EVENTS
    |--------------------------------------------------------------------------
    */

    const calendarEvents = useMemo(
        () =>
            filteredEvents.map((event) => ({
                id: String(event.id),

                title: `[${ownerShort(
                    event.directorate
                )}] ${event.title}`,

                start:
                    event.start ||
                    `${event.event_date}${
                        event.all_day
                            ? ''
                            : `T${time(
                                  event.start_time
                              )}:00`
                    }`,

                end:
                    event.end ||
                    (event.all_day
                        ? null
                        : `${event.event_date}T${time(
                              event.end_time
                          )}:00`),

                allDay: Boolean(
                    event.allDay ??
                        event.all_day
                ),

                backgroundColor:
                    event.color ||
                    colorOf(
                        event.agenda_type
                    ),

                borderColor:
                    event.color ||
                    colorOf(
                        event.agenda_type
                    ),

                textColor:
                    '#ffffff',
            })),
        [filteredEvents]
    );

    const onCalendarEvent = (info) => {
        const found = events.find(
            (item) =>
                Number(item.id) ===
                Number(info.event.id)
        );

        if (found) {
            openDetailModal(found);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body text-center py-5">
                    <span className="spinner-border text-danger mb-3" />

                    <h5 className="fw-bold mb-0">
                        Memuat Jadwal Direktorat
                    </h5>
                </div>
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | RENDER PAGE
    |--------------------------------------------------------------------------
    */

    return (
        <div className="director-schedule-page">
            {/* HEADER */}

            <header className="director-schedule-header">
                <div>
                    <div className="d-flex flex-wrap gap-2 mb-2">
                        <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-2">
                            SEKRETARIAT PIMPINAN
                        </span>

                        <span className="badge rounded-pill border bg-white text-dark px-3 py-2">
                            <i className="bi bi-calendar-event me-2" />
                            {events.length} Agenda
                        </span>
                    </div>

                    <h2 className="fw-black mb-1">
                        Jadwal Direktorat
                    </h2>

                    <p className="text-muted mb-0">
                        Agenda Direktur, Wakil Direktur I,
                        Wakil Direktur II, serta agenda
                        bersama Direktorat.
                    </p>
                </div>

                {canManage && (
                    <button
                        type="button"
                        className="btn btn-danger rounded-pill fw-bold px-4"
                        onClick={() =>
                            openCreateModal()
                        }
                    >
                        <i className="bi bi-plus-lg me-2" />
                        Tambah Agenda
                    </button>
                )}
            </header>

            {/* FILTER DIREKTORAT */}

            <section className="directorate-filter-grid">
                {FILTERS.map((item) => (
                    <button
                        key={item.value}
                        type="button"
                        className={`directorate-filter-card ${
                            activeOwner === item.value
                                ? 'active'
                                : ''
                        }`}
                        onClick={() => {
                            setActiveOwner(
                                item.value
                            );

                            setActiveType(
                                'Semua'
                            );

                            setSearch('');
                        }}
                    >
                        <span className="directorate-filter-icon">
                            <i
                                className={`bi ${item.icon}`}
                            />
                        </span>

                        <span className="directorate-filter-content">
                            <strong>
                                {item.label}
                            </strong>

                            <small>
                                {item.description}
                            </small>
                        </span>

                        <span className="directorate-filter-count">
                            {ownerCounts[
                                item.value
                            ] || 0}
                        </span>
                    </button>
                ))}
            </section>

            {/* FILTER AGENDA */}

            <section className="schedule-control-panel">
                <div className="schedule-control-main">
                    <div className="schedule-control-heading">
                        <div>
                            <strong>
                                <i className="bi bi-funnel-fill text-danger me-2" />
                                Filter Agenda
                            </strong>

                            <div className="small text-muted">
                                Menampilkan{' '}
                                {filteredEvents.length}{' '}
                                dari{' '}
                                {ownerEvents.length}{' '}
                                agenda{' '}
                                {activeOwnerInfo.label}.
                            </div>
                        </div>

                        <div className="schedule-control-tools">
                            <div className="schedule-search">
                                <i className="bi bi-search" />

                                <input
                                    type="search"
                                    aria-label="Cari agenda"
                                    placeholder="Cari agenda, lokasi..."
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(
                                            event.target.value
                                        )
                                    }
                                />

                                {search && (
                                    <button
                                        type="button"
                                        aria-label="Hapus pencarian"
                                        onClick={() =>
                                            setSearch('')
                                        }
                                    >
                                        <i className="bi bi-x" />
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                className="schedule-today"
                                onClick={() =>
                                    calendarRef.current
                                        ?.getApi()
                                        ?.today()
                                }
                            >
                                <i className="bi bi-calendar2-day-fill" />
                                Hari Ini
                            </button>
                        </div>
                    </div>

                    {/* KATEGORI */}

                    <div className="schedule-category-list">
                        {[
                            'Semua',
                            ...TYPES,
                        ].map((type) => (
                            <button
                                key={type}
                                type="button"
                                className={`schedule-category-button ${
                                    activeType === type
                                        ? 'active'
                                        : ''
                                }`}
                                style={
                                    activeType ===
                                        type &&
                                    type !== 'Semua'
                                        ? {
                                              color:
                                                  colorOf(
                                                      type
                                                  ),
                                              borderColor:
                                                  colorOf(
                                                      type
                                                  ),
                                          }
                                        : undefined
                                }
                                onClick={() =>
                                    setActiveType(
                                        type
                                    )
                                }
                            >
                                <span
                                    className="agenda-dot"
                                    style={{
                                        background:
                                            type ===
                                            'Semua'
                                                ? '#334155'
                                                : colorOf(
                                                      type
                                                  ),
                                    }}
                                >
                                    <i
                                        className={`bi ${
                                            type ===
                                            'Semua'
                                                ? 'bi-grid-fill'
                                                : ICONS[
                                                      type
                                                  ]
                                        }`}
                                    />
                                </span>

                                {type}

                                <span className="agenda-count">
                                    {typeCounts[
                                        type
                                    ] || 0}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* RINGKASAN */}

                <div className="schedule-summary-grid">
                    <div className="schedule-summary-card">
                        <span className="schedule-summary-icon today">
                            <i className="bi bi-calendar2-check-fill" />
                        </span>

                        <div className="min-w-0">
                            <div className="schedule-summary-label">
                                Agenda Hari Ini
                            </div>

                            <strong>
                                {todayEvents.length}{' '}
                                Agenda
                            </strong>

                            <div className="schedule-summary-description">
                                {todayEvents[0]
                                    ? `${ownerShort(
                                          todayEvents[0]
                                              .directorate
                                      )} • ${
                                          todayEvents[0]
                                              .title
                                      }`
                                    : 'Tidak ada agenda hari ini'}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="schedule-summary-card"
                        disabled={!nearest}
                        onClick={() =>
                            nearest &&
                            openDetailModal(
                                nearest.event
                            )
                        }
                    >
                        <span className="schedule-summary-icon next">
                            <i
                                className={`bi ${
                                    nearest?.status ===
                                    'ongoing'
                                        ? 'bi-broadcast-pin'
                                        : 'bi-clock-history'
                                }`}
                            />
                        </span>

                        <div className="min-w-0">
                            <div className="schedule-summary-label">
                                {nearest?.status ===
                                'ongoing'
                                    ? 'Sedang Berlangsung'
                                    : 'Agenda Terdekat'}
                            </div>

                            <strong className="schedule-summary-title">
                                {nearest?.event.title ||
                                    'Belum ada agenda'}
                            </strong>

                            {nearest && (
                                <div className="schedule-summary-description">
                                    {ownerShort(
                                        nearest.event
                                            .directorate
                                    )}{' '}
                                    •{' '}
                                    {dateText(
                                        nearest.event
                                            .event_date,
                                        true
                                    )}{' '}
                                    •{' '}
                                    {timeText(
                                        nearest.event
                                    )}
                                </div>
                            )}
                        </div>
                    </button>
                </div>
            </section>

            {/* KALENDER */}

            <section className="card border-0 shadow-sm director-calendar-card">
                <div className="calendar-active-banner">
                    <span className="calendar-active-icon">
                        <i
                            className={`bi ${activeOwnerInfo.icon}`}
                        />
                    </span>

                    <div>
                        <div className="calendar-active-label">
                            Kalender Aktif
                        </div>

                        <strong>
                            {activeOwnerInfo.label}
                        </strong>
                    </div>

                    {activeOwner === 'semua' && (
                        <div className="ms-auto calendar-all-info">
                            Agenda bersamaan tetap
                            ditampilkan bila pemiliknya
                            berbeda.
                        </div>
                    )}
                </div>

                <div className="card-body director-calendar-body">
                    <div className="director-calendar-viewport">
                        <FullCalendar
                            ref={calendarRef}
                            plugins={[
                                themePlugin,
                                dayGridPlugin,
                                timeGridPlugin,
                                interactionPlugin,
                            ]}
                            initialView="dayGridMonth"
                            locale="id"
                            firstDay={1}
                            height={
                                compact
                                    ? 'auto'
                                    : '100%'
                            }
                            expandRows={
                                !compact
                            }
                            events={
                                calendarEvents
                            }
                            dateClick={(info) =>
                                canManage &&
                                openCreateModal(
                                    info.dateStr.slice(
                                        0,
                                        10
                                    )
                                )
                            }
                            eventClick={
                                onCalendarEvent
                            }
                            headerToolbar={{
                                start:
                                    'prev,next',
                                center:
                                    'title',
                                end:
                                    'dayGridMonth,timeGridWeek,timeGridDay',
                            }}
                            buttons={{
                                dayGridMonth: {
                                    text: 'Bulan',
                                },
                                timeGridWeek: {
                                    text: 'Minggu',
                                },
                                timeGridDay: {
                                    text: 'Hari',
                                },
                            }}
                            eventTimeFormat={{
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                            }}
                            slotLabelFormat={{
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                            }}
                            slotMinTime="06:00:00"
                            slotMaxTime="22:00:00"
                            slotDuration="00:30:00"
                            nowIndicator
                            navLinks
                            selectable={
                                canManage
                            }
                            dayMaxEvents={
                                compact
                                    ? 2
                                    : 6
                            }
                            fixedWeekCount={
                                false
                            }
                        />
                    </div>
                </div>
            </section>

            {/* MODAL AGENDA */}

            {modalOpen && (
                <div
                    className="modal fade show d-block director-modal-backdrop"
                    role="dialog"
                    aria-modal="true"
                    tabIndex={-1}
                >
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
                            <div
                                className="director-modal-accent"
                                style={{
                                    background:
                                        colorOf(
                                            form.agenda_type
                                        ),
                                }}
                            />

                            {/* MODAL HEADER */}

                            <div className="modal-header border-0 pb-1 px-4 pt-4">
                                <div>
                                    <span className="badge bg-danger-subtle text-danger rounded-pill mb-2">
                                        {form.id
                                            ? 'DETAIL AGENDA'
                                            : 'AGENDA BARU'}
                                    </span>

                                    <h4 className="fw-black mb-0">
                                        {form.id
                                            ? form.title
                                            : 'Tambah Agenda Direktorat'}
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
                                    aria-label="Tutup"
                                />
                            </div>

                            {/* MODAL BODY */}

                            <div className="modal-body px-4 py-3">
                                {detailMode ? (
                                    <div className="row g-3">
                                        {detailLoading && (
                                            <div className="col-12 small text-danger">
                                                <span className="spinner-border spinner-border-sm me-2" />
                                                Memuat detail
                                                terbaru...
                                            </div>
                                        )}

                                        {/* PEMILIK AGENDA */}

                                        <div className="col-12">
                                            <div className="agenda-owner-detail">
                                                <span className="director-owner-icon">
                                                    <i
                                                        className={`bi ${
                                                            owner(
                                                                form.directorate
                                                            )
                                                                ?.icon ||
                                                            'bi-people-fill'
                                                        }`}
                                                    />
                                                </span>

                                                <div>
                                                    <small className="text-muted fw-bold">
                                                        AGENDA UNTUK
                                                    </small>

                                                    <div className="fs-5 fw-black text-danger">
                                                        {ownerLabel(
                                                            form.directorate
                                                        )}
                                                    </div>

                                                    <div className="small text-muted">
                                                        {owner(
                                                            form.directorate
                                                        )
                                                            ?.description ||
                                                            ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* JUDUL */}

                                        <div className="col-12">
                                            <div className="agenda-detail-box">
                                                <small>
                                                    Judul Agenda
                                                </small>

                                                <div className="fs-4 fw-black">
                                                    {
                                                        form.title
                                                    }
                                                </div>
                                            </div>
                                        </div>

                                        {/* DETAIL AGENDA */}

                                        {[
                                            [
                                                'Tanggal',
                                                dateText(
                                                    form.event_date
                                                ),
                                            ],
                                            [
                                                'Waktu',
                                                timeText(
                                                    form
                                                ),
                                            ],
                                            [
                                                'Kategori',
                                                form.agenda_type,
                                            ],
                                            [
                                                'Lokasi',
                                                form.location ||
                                                    '-',
                                            ],
                                        ].map(
                                            ([
                                                label,
                                                value,
                                            ]) => (
                                                <div
                                                    className="col-md-6"
                                                    key={
                                                        label
                                                    }
                                                >
                                                    <div className="agenda-detail-box h-100">
                                                        <small>
                                                            {
                                                                label
                                                            }
                                                        </small>

                                                        <strong>
                                                            {
                                                                value
                                                            }
                                                        </strong>
                                                    </div>
                                                </div>
                                            )
                                        )}

                                        {/* DESKRIPSI */}

                                        <div className="col-12">
                                            <div className="agenda-detail-box">
                                                <small>
                                                    Deskripsi
                                                </small>

                                                <div
                                                    style={{
                                                        whiteSpace:
                                                            'pre-line',
                                                    }}
                                                >
                                                    {form.description ||
                                                        '-'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* VISIBILITAS */}

                                        <div className="col-12">
                                            <span
                                                className={`badge rounded-pill px-3 py-2 ${
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
                                                    ? 'Tampil di Kalender Publik'
                                                    : 'Internal'}
                                            </span>
                                        </div>

                                        {/* AUDIT TRAIL */}

                                        {canManage && (
                                            <div className="col-12">
                                                <div className="audit-section">
                                                    <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                                                        <div>
                                                            <small className="text-muted fw-bold">
                                                                ACTIVITY
                                                                LOG
                                                            </small>

                                                            <h5 className="fw-black mb-1">
                                                                <i className="bi bi-clock-history me-2 text-danger" />
                                                                Riwayat
                                                                Perubahan
                                                            </h5>

                                                            <div className="small text-muted">
                                                                Perubahan
                                                                agenda yang
                                                                dilakukan
                                                                oleh admin.
                                                            </div>
                                                        </div>

                                                        <span className="badge bg-danger-subtle text-danger">
                                                            {
                                                                histories.length
                                                            }
                                                        </span>
                                                    </div>

                                                    {historyError && (
                                                        <div className="alert alert-warning">
                                                            Riwayat perubahan
                                                            belum dapat dimuat.
                                                        </div>
                                                    )}

                                                    {!detailLoading &&
                                                        !historyError &&
                                                        histories.length ===
                                                            0 && (
                                                            <p className="text-muted small mb-0">
                                                                Belum ada
                                                                riwayat
                                                                perubahan.
                                                            </p>
                                                        )}

                                                    <div className="audit-timeline">
                                                        {histories.map(
                                                            (item) => (
                                                                <div
                                                                    key={
                                                                        item.id
                                                                    }
                                                                    className="audit-item"
                                                                >
                                                                    <span
                                                                        className={`audit-marker audit-${item.action}`}
                                                                    >
                                                                        <i
                                                                            className={`bi ${
                                                                                item.action ===
                                                                                'created'
                                                                                    ? 'bi-plus-lg'
                                                                                    : item.action ===
                                                                                      'deleted'
                                                                                    ? 'bi-trash-fill'
                                                                                    : 'bi-pencil-fill'
                                                                            }`}
                                                                        />
                                                                    </span>

                                                                    <div className="audit-content">
                                                                        <div className="d-flex justify-content-between flex-wrap gap-2">
                                                                            <div>
                                                                                <strong>
                                                                                    {item.action ===
                                                                                    'created'
                                                                                        ? 'Agenda Dibuat'
                                                                                        : item.action ===
                                                                                          'deleted'
                                                                                        ? 'Agenda Dihapus'
                                                                                        : 'Agenda Diperbarui'}
                                                                                </strong>

                                                                                <div className="small text-muted">
                                                                                    {item.user_name ||
                                                                                        'User tidak tersedia'}
                                                                                </div>
                                                                            </div>

                                                                            <small className="text-muted">
                                                                                {dateTimeText(
                                                                                    item.created_at
                                                                                )}
                                                                            </small>
                                                                        </div>

                                                                        {item.action ===
                                                                            'updated' &&
                                                                            auditChanges(
                                                                                item
                                                                            ).map(
                                                                                (
                                                                                    change
                                                                                ) => (
                                                                                    <div
                                                                                        className="audit-change"
                                                                                        key={
                                                                                            change.field
                                                                                        }
                                                                                    >
                                                                                        <small className="fw-bold d-block text-muted mb-1">
                                                                                            {
                                                                                                change.label
                                                                                            }
                                                                                        </small>

                                                                                        <div className="audit-change-values">
                                                                                            <span className="audit-old">
                                                                                                {
                                                                                                    change.old
                                                                                                }
                                                                                            </span>

                                                                                            <i className="bi bi-arrow-right" />

                                                                                            <span className="audit-new">
                                                                                                {
                                                                                                    change.next
                                                                                                }
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                )
                                                                            )}

                                                                        {item.action ===
                                                                            'created' && (
                                                                            <div className="small mt-2 text-success">
                                                                                Agenda
                                                                                ini
                                                                                dibuat.
                                                                            </div>
                                                                        )}

                                                                        {item.action ===
                                                                            'deleted' && (
                                                                            <div className="small mt-2 text-danger">
                                                                                Agenda
                                                                                ini
                                                                                dihapus.
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* FORM TAMBAH / EDIT */

                                    <div className="row g-3">
                                        {/* AGENDA UNTUK */}

                                        <div className="col-12">
                                            <Field
                                                label="Agenda Untuk"
                                                required
                                            />

                                            <div className="agenda-owner-options">
                                                {DIRECTORATES.map(
                                                    (item) => (
                                                        <button
                                                            type="button"
                                                            key={
                                                                item.value
                                                            }
                                                            className={`agenda-owner-option ${
                                                                form.directorate ===
                                                                item.value
                                                                    ? 'active'
                                                                    : ''
                                                            }`}
                                                            onClick={() =>
                                                                setField(
                                                                    'directorate',
                                                                    item.value
                                                                )
                                                            }
                                                        >
                                                            <span className="director-owner-icon">
                                                                <i
                                                                    className={`bi ${item.icon}`}
                                                                />
                                                            </span>

                                                            <span className="flex-grow-1">
                                                                <strong className="d-block">
                                                                    {
                                                                        item.label
                                                                    }
                                                                </strong>

                                                                <small>
                                                                    {
                                                                        item.description
                                                                    }
                                                                </small>
                                                            </span>

                                                            {form.directorate ===
                                                                item.value && (
                                                                <i className="bi bi-check-circle-fill" />
                                                            )}
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>

                                        {/* JUDUL */}

                                        <div className="col-12">
                                            <Field
                                                label="Judul Agenda"
                                                required
                                            >
                                                <input
                                                    type="text"
                                                    className="form-control form-control-lg"
                                                    maxLength={
                                                        255
                                                    }
                                                    placeholder="Contoh: Rapat Koordinasi Pimpinan"
                                                    value={
                                                        form.title
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setField(
                                                            'title',
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                />
                                            </Field>
                                        </div>

                                        {/* TANGGAL */}

                                        <div className="col-md-6">
                                            <Field
                                                label="Tanggal"
                                                required
                                            >
                                                <input
                                                    type="date"
                                                    className="form-control form-control-lg"
                                                    value={
                                                        form.event_date
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setField(
                                                            'event_date',
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                />
                                            </Field>
                                        </div>

                                        {/* KATEGORI */}

                                        <div className="col-md-6">
                                            <Field label="Kategori">
                                                <select
                                                    className="form-select form-select-lg"
                                                    value={
                                                        form.agenda_type
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setField(
                                                            'agenda_type',
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                >
                                                    {TYPES.map(
                                                        (
                                                            type
                                                        ) => (
                                                            <option
                                                                key={
                                                                    type
                                                                }
                                                                value={
                                                                    type
                                                                }
                                                            >
                                                                {
                                                                    type
                                                                }
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </Field>
                                        </div>

                                        {/* PREVIEW KATEGORI */}

                                        <div className="col-12">
                                            <div
                                                className="agenda-category-preview"
                                                style={{
                                                    background: `${colorOf(
                                                        form.agenda_type
                                                    )}10`,
                                                    color: colorOf(
                                                        form.agenda_type
                                                    ),
                                                    borderColor: `${colorOf(
                                                        form.agenda_type
                                                    )}40`,
                                                }}
                                            >
                                                <span
                                                    className="agenda-preview-icon"
                                                    style={{
                                                        background:
                                                            colorOf(
                                                                form.agenda_type
                                                            ),
                                                    }}
                                                >
                                                    <i
                                                        className={`bi ${
                                                            ICONS[
                                                                form.agenda_type
                                                            ]
                                                        }`}
                                                    />
                                                </span>

                                                <div>
                                                    <strong>
                                                        {
                                                            form.agenda_type
                                                        }
                                                    </strong>

                                                    <div className="small">
                                                        Warna agenda ditentukan
                                                        otomatis berdasarkan
                                                        kategori.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SEPANJANG HARI */}

                                        <div className="col-12">
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="directorAllDay"
                                                    checked={
                                                        form.all_day
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setField(
                                                            'all_day',
                                                            event
                                                                .target
                                                                .checked
                                                        )
                                                    }
                                                />

                                                <label
                                                    className="form-check-label fw-bold"
                                                    htmlFor="directorAllDay"
                                                >
                                                    Sepanjang Hari
                                                </label>
                                            </div>
                                        </div>

                                        {/* JAM */}

                                        {!form.all_day && (
                                            <>
                                                <div className="col-md-6">
                                                    <Field
                                                        label="Jam Mulai"
                                                        required
                                                    >
                                                        <input
                                                            type="time"
                                                            className="form-control form-control-lg"
                                                            value={
                                                                form.start_time
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                setField(
                                                                    'start_time',
                                                                    event
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                        />
                                                    </Field>
                                                </div>

                                                <div className="col-md-6">
                                                    <Field
                                                        label="Jam Selesai"
                                                        required
                                                    >
                                                        <input
                                                            type="time"
                                                            className="form-control form-control-lg"
                                                            value={
                                                                form.end_time
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                setField(
                                                                    'end_time',
                                                                    event
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                        />
                                                    </Field>
                                                </div>
                                            </>
                                        )}

                                        {/* INFORMASI KETERSEDIAAN */}

                                        {availability && (
                                            <div className="col-12">
                                                <div
                                                    className={`availability-box ${availability}`}
                                                >
                                                    <span className="availability-icon">
                                                        <i
                                                            className={`bi ${
                                                                availability ===
                                                                'available'
                                                                    ? 'bi-check-lg'
                                                                    : availability ===
                                                                      'invalid'
                                                                    ? 'bi-exclamation-lg'
                                                                    : 'bi-calendar-x-fill'
                                                            }`}
                                                        />
                                                    </span>

                                                    <div className="flex-grow-1">
                                                        <strong>
                                                            {availability ===
                                                            'available'
                                                                ? 'Jadwal Tersedia'
                                                                : availability ===
                                                                  'invalid'
                                                                ? 'Jam Tidak Valid'
                                                                : 'Jadwal Bentrok'}
                                                        </strong>

                                                        <div className="small">
                                                            {availability ===
                                                            'available'
                                                                ? `Agenda dapat digunakan untuk ${ownerLabel(
                                                                      form.directorate
                                                                  )}.`
                                                                : availability ===
                                                                  'invalid'
                                                                ? 'Jam selesai harus setelah jam mulai.'
                                                                : `Bertabrakan dengan agenda "${conflict?.title}" milik ${ownerLabel(
                                                                      conflict?.directorate
                                                                  )} (${timeText(
                                                                      conflict
                                                                  )}).`}
                                                        </div>

                                                        {availability ===
                                                            'conflict' &&
                                                            suggestions.length >
                                                                0 && (
                                                                <div className="mt-2">
                                                                    <strong className="small">
                                                                        Saran
                                                                        waktu
                                                                        tersedia:
                                                                    </strong>

                                                                    <div className="d-flex flex-wrap gap-2 mt-2">
                                                                        {suggestions.map(
                                                                            (
                                                                                slot
                                                                            ) => (
                                                                                <button
                                                                                    key={
                                                                                        slot.start
                                                                                    }
                                                                                    type="button"
                                                                                    className="btn btn-sm btn-light border rounded-pill"
                                                                                    onClick={() =>
                                                                                        setForm(
                                                                                            (
                                                                                                old
                                                                                            ) => ({
                                                                                                ...old,
                                                                                                start_time:
                                                                                                    slot.start,
                                                                                                end_time:
                                                                                                    slot.end,
                                                                                                all_day:
                                                                                                    false,
                                                                                            })
                                                                                        )
                                                                                    }
                                                                                >
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
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* LOKASI */}

                                        <div className="col-12">
                                            <Field label="Lokasi">
                                                <input
                                                    type="text"
                                                    className="form-control form-control-lg"
                                                    value={
                                                        form.location
                                                    }
                                                    placeholder="Contoh: Ruang Rapat Pimpinan"
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setField(
                                                            'location',
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                />
                                            </Field>
                                        </div>

                                        {/* DESKRIPSI */}

                                        <div className="col-12">
                                            <Field label="Deskripsi">
                                                <textarea
                                                    className="form-control"
                                                    rows={
                                                        4
                                                    }
                                                    value={
                                                        form.description
                                                    }
                                                    placeholder="Informasi tambahan agenda..."
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setField(
                                                            'description',
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                />
                                            </Field>
                                        </div>

                                        {/* VISIBILITAS PUBLIK */}

                                        <div className="col-12">
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="directorPublic"
                                                    checked={
                                                        form.is_public
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setField(
                                                            'is_public',
                                                            event
                                                                .target
                                                                .checked
                                                        )
                                                    }
                                                />

                                                <label
                                                    className="form-check-label fw-bold"
                                                    htmlFor="directorPublic"
                                                >
                                                    Tampilkan di halaman
                                                    Login
                                                </label>
                                            </div>

                                            <div className="form-text">
                                                Agenda publik dapat dilihat
                                                sebelum pengguna login.
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* MODAL FOOTER */}

                            <div className="modal-footer border-0 px-4 pb-4 pt-2">
                                {detailMode ? (
                                    <>
                                        {canManage && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger rounded-pill"
                                                    disabled={
                                                        saving
                                                    }
                                                    onClick={
                                                        handleDelete
                                                    }
                                                >
                                                    <i className="bi bi-trash-fill me-2" />
                                                    Hapus
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-danger rounded-pill"
                                                    disabled={
                                                        saving
                                                    }
                                                    onClick={() =>
                                                        setDetailMode(
                                                            false
                                                        )
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
                                            disabled={
                                                saving
                                            }
                                            onClick={
                                                closeModal
                                            }
                                        >
                                            Batal
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-danger rounded-pill px-4"
                                            disabled={
                                                saving ||
                                                Boolean(
                                                    conflict
                                                ) ||
                                                availability ===
                                                    'invalid'
                                            }
                                            onClick={
                                                handleSave
                                            }
                                        >
                                            {saving ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" />
                                                    Memeriksa...
                                                </>
                                            ) : conflict ? (
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

            {/* STYLING */}

            <style>
                {`
                .director-schedule-page {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    min-width: 0;
                }

                .director-schedule-page .fw-black {
                    font-weight: 900 !important;
                }

                .director-schedule-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .director-schedule-header h2 {
                    font-size: 2rem;
                }

                .directorate-filter-grid {
                    display: grid;
                    grid-template-columns: repeat(5, minmax(0, 1fr));
                    gap: 9px;
                }

                .directorate-filter-card {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    min-width: 0;
                    padding: 11px;
                    border: 1px solid #e2e8f0;
                    border-radius: 17px;
                    background: #fff;
                    text-align: left;
                    color: #475569;
                    box-shadow: 0 4px 15px #0f172a0a;
                }

                .directorate-filter-card:hover {
                    border-color: #cbd5e1;
                    transform: translateY(-1px);
                }

                .directorate-filter-card.active {
                    border-color: #7f1d1d;
                    color: #7f1d1d;
                    background: #fff7f7;
                }

                .directorate-filter-icon {
                    display: grid;
                    place-items: center;
                    flex: 0 0 38px;
                    width: 38px;
                    height: 38px;
                    border-radius: 12px;
                    background: #f1f5f9;
                    color: #64748b;
                }

                .directorate-filter-card.active
                .directorate-filter-icon {
                    background: #7f1d1d;
                    color: #fff;
                }

                .directorate-filter-content {
                    display: flex;
                    flex: 1;
                    min-width: 0;
                    flex-direction: column;
                }

                .directorate-filter-content strong {
                    font-size: .81rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .directorate-filter-content small {
                    font-size: .62rem;
                    color: #94a3b8;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .directorate-filter-count {
                    display: grid;
                    place-items: center;
                    min-width: 27px;
                    height: 27px;
                    padding: 0 6px;
                    border-radius: 999px;
                    background: #f1f5f9;
                    color: #64748b;
                    font-size: .68rem;
                    font-weight: 900;
                }

                .directorate-filter-card.active
                .directorate-filter-count {
                    background: #7f1d1d;
                    color: #fff;
                }

                .schedule-control-panel {
                    display: grid;
                    grid-template-columns:
                        minmax(0, 1.7fr)
                        minmax(330px, .8fr);
                    gap: 10px;
                }

                .schedule-control-main,
                .schedule-summary-card {
                    border: 1px solid #e5e7eb;
                    border-radius: 18px;
                    background: #fff;
                    box-shadow: 0 4px 18px #0f172a0a;
                }

                .schedule-control-main {
                    padding: 12px 14px;
                    min-width: 0;
                }

                .schedule-control-heading,
                .schedule-control-tools {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                }

                .schedule-control-heading {
                    margin-bottom: 10px;
                }

                .schedule-control-tools {
                    gap: 7px;
                }

                .schedule-search {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 215px;
                    min-width: 0;
                }

                .schedule-search > i {
                    position: absolute;
                    left: 11px;
                    color: #94a3b8;
                    font-size: .76rem;
                }

                .schedule-search input {
                    width: 100%;
                    height: 35px;
                    padding: 0 32px 0 31px;
                    border: 1px solid #e2e8f0;
                    border-radius: 99px;
                    background: #f8fafc;
                    outline: none;
                    font-size: .75rem;
                }

                .schedule-search input:focus {
                    border-color: #7f1d1d;
                    background: #fff;
                }

                .schedule-search button {
                    position: absolute;
                    right: 8px;
                    border: 0;
                    background: none;
                    color: #64748b;
                }

                .schedule-today {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    min-height: 35px;
                    padding: 0 12px;
                    border: 1px solid #fecaca;
                    border-radius: 99px;
                    background: #fff7f7;
                    color: #7f1d1d;
                    font-size: .74rem;
                    font-weight: 900;
                    white-space: nowrap;
                }

                .schedule-category-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .schedule-category-button {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    min-height: 31px;
                    padding: 3px 8px 3px 4px;
                    border: 1px solid #e2e8f0;
                    border-radius: 99px;
                    background: #fff;
                    color: #475569;
                    font-size: .7rem;
                    font-weight: 800;
                    white-space: nowrap;
                }

                .schedule-category-button.active {
                    background: #fff7f7;
                    border-color: #7f1d1d;
                }

                .agenda-dot {
                    display: grid;
                    place-items: center;
                    width: 23px;
                    height: 23px;
                    border-radius: 50%;
                    color: #fff;
                    font-size: .6rem;
                }

                .agenda-count {
                    display: grid;
                    place-items: center;
                    min-width: 19px;
                    height: 19px;
                    border-radius: 99px;
                    background: #f1f5f9;
                    color: #64748b;
                    font-size: .61rem;
                }

                .schedule-summary-grid {
                    display: grid;
                    grid-template-columns: 1fr 1.3fr;
                    gap: 8px;
                    min-width: 0;
                }

                .schedule-summary-card {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px;
                    color: inherit;
                    text-align: left;
                    min-width: 0;
                }

                button.schedule-summary-card:disabled {
                    opacity: 1;
                }

                .schedule-summary-icon {
                    flex: 0 0 40px;
                    display: grid;
                    place-items: center;
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    color: #fff;
                }

                .schedule-summary-icon.today {
                    background: #7f1d1d;
                }

                .schedule-summary-icon.next {
                    background: #334155;
                }

                .schedule-summary-label {
                    font-size: .63rem;
                    font-weight: 800;
                    color: #94a3b8;
                    text-transform: uppercase;
                }

                .schedule-summary-title {
                    display: block;
                    max-width: 210px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .schedule-summary-description {
                    max-width: 215px;
                    margin-top: 2px;
                    color: #64748b;
                    font-size: .65rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                /*
                |--------------------------------------------------------------------------
                | KALENDER PC
                |--------------------------------------------------------------------------
                */

                .director-calendar-card {
                    border-radius: 24px !important;
                    overflow: hidden;
                    min-width: 0;
                    min-height: 0;
                }

                .calendar-active-banner {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-height: 55px;
                    padding: 9px 15px;
                    background: linear-gradient(
                        90deg,
                        #7f1d1d,
                        #991b1b
                    );
                    color: #fff;
                }

                .calendar-active-icon {
                    display: grid;
                    place-items: center;
                    flex: 0 0 37px;
                    width: 37px;
                    height: 37px;
                    border-radius: 11px;
                    background: #ffffff2a;
                }

                .calendar-active-label {
                    font-size: .62rem;
                    font-weight: 800;
                    opacity: .8;
                    text-transform: uppercase;
                }

                .calendar-all-info {
                    font-size: .69rem;
                    font-weight: 700;
                    opacity: .86;
                }

                .director-calendar-body {
                    padding: 14px !important;
                    min-width: 0;
                }

                .director-calendar-viewport {
                    height: calc(100vh - 475px);
                    min-height: 440px;
                    max-height: 720px;
                    min-width: 0;
                }

                .director-calendar-viewport > div,
                .director-calendar-viewport .fc {
                    height: 100%;
                }

                .director-calendar-card .fc {
                    font-size: 1rem;
                    min-width: 0;
                }

                .director-calendar-card .fc-toolbar {
                    margin-bottom: 10px !important;
                }

                .director-calendar-card .fc-toolbar-title {
                    font-size: 1.7rem !important;
                    font-weight: 900 !important;
                    text-transform: capitalize;
                }

                .director-calendar-card .fc-button {
                    min-height: 37px;
                    border-radius: 99px !important;
                    font-size: .82rem !important;
                    font-weight: 800 !important;
                }

                .director-calendar-card .fc-col-header-cell {
                    background: #f8fafc;
                }

                .director-calendar-card
                .fc-col-header-cell-cushion,
                .director-calendar-card
                .fc-daygrid-day-number {
                    font-weight: 900;
                    text-decoration: none;
                }

                .director-calendar-card .fc-day-today {
                    background: #fff7f7 !important;
                }

                .director-calendar-card .fc-event {
                    margin: 2px 3px !important;
                    padding: 3px 5px !important;
                    border-radius: 7px !important;
                    font-weight: 800;
                    cursor: pointer;
                }

                /*
                |--------------------------------------------------------------------------
                | MODAL
                |--------------------------------------------------------------------------
                */

                .director-modal-backdrop {
                    background: #0f172a9e;
                    z-index: 1050;
                }

                .director-modal-accent {
                    height: 7px;
                }

                .agenda-owner-options {
                    display: grid;
                    grid-template-columns:
                        repeat(2, minmax(0, 1fr));
                    gap: 8px;
                }

                .agenda-owner-option {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-width: 0;
                    min-height: 65px;
                    padding: 9px 11px;
                    border: 1px solid #e2e8f0;
                    border-radius: 15px;
                    background: #fff;
                    text-align: left;
                    color: #475569;
                }

                .agenda-owner-option.active {
                    border-color: #7f1d1d;
                    background: #fff7f7;
                    color: #7f1d1d;
                }

                .agenda-owner-option small {
                    display: block;
                    color: #94a3b8;
                    font-size: .65rem;
                }

                .director-owner-icon {
                    display: grid;
                    place-items: center;
                    flex: 0 0 39px;
                    width: 39px;
                    height: 39px;
                    border-radius: 12px;
                    background: #7f1d1d;
                    color: #fff;
                }

                .agenda-owner-detail {
                    display: flex;
                    align-items: center;
                    gap: 13px;
                    padding: 13px 15px;
                    border: 1px solid #fecaca;
                    border-radius: 16px;
                    background: #fff7f7;
                }

                .agenda-detail-box {
                    height: 100%;
                    padding: 14px 16px;
                    border-radius: 15px;
                    background: #f8fafc;
                }

                .agenda-detail-box small {
                    display: block;
                    margin-bottom: 5px;
                    color: #64748b;
                }

                .agenda-detail-box strong {
                    display: block;
                    word-break: break-word;
                }

                .agenda-category-preview {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    border: 1px solid;
                    border-radius: 15px;
                }

                .agenda-preview-icon {
                    display: grid;
                    place-items: center;
                    flex: 0 0 38px;
                    width: 38px;
                    height: 38px;
                    border-radius: 11px;
                    color: #fff;
                }

                /*
                |--------------------------------------------------------------------------
                | KETERSEDIAAN JADWAL
                |--------------------------------------------------------------------------
                */

                .availability-box {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 13px 15px;
                    border: 1px solid;
                    border-radius: 15px;
                }

                .availability-box.available {
                    background: #ecfdf5;
                    border-color: #a7f3d0;
                    color: #065f46;
                }

                .availability-box.invalid {
                    background: #fffbeb;
                    border-color: #fde68a;
                    color: #92400e;
                }

                .availability-box.conflict {
                    background: #fef2f2;
                    border-color: #fecaca;
                    color: #991b1b;
                }

                .availability-icon {
                    display: grid;
                    place-items: center;
                    flex: 0 0 38px;
                    width: 38px;
                    height: 38px;
                    border-radius: 11px;
                    background: #ffffffbf;
                }

                /*
                |--------------------------------------------------------------------------
                | AUDIT TRAIL
                |--------------------------------------------------------------------------
                */

                .audit-section {
                    padding: 18px;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    background: #fff;
                }

                .audit-timeline {
                    display: flex;
                    flex-direction: column;
                    gap: 11px;
                }

                .audit-item {
                    display: grid;
                    grid-template-columns:
                        38px minmax(0, 1fr);
                    gap: 10px;
                }

                .audit-marker {
                    display: grid;
                    place-items: center;
                    width: 37px;
                    height: 37px;
                    border: 3px solid #fff;
                    border-radius: 12px;
                    background: #f1f5f9;
                }

                .audit-marker.audit-created {
                    background: #ecfdf5;
                    color: #047857;
                }

                .audit-marker.audit-updated {
                    background: #eff6ff;
                    color: #1d4ed8;
                }

                .audit-marker.audit-deleted {
                    background: #fef2f2;
                    color: #dc2626;
                }

                .audit-content {
                    min-width: 0;
                    padding: 11px 13px;
                    border: 1px solid #e2e8f0;
                    border-radius: 15px;
                    background: #f8fafc;
                }

                .audit-change {
                    margin-top: 10px;
                    padding: 9px 10px;
                    border: 1px solid #e2e8f0;
                    border-radius: 11px;
                    background: #fff;
                }

                .audit-change-values {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: .73rem;
                    font-weight: 800;
                }

                .audit-old,
                .audit-new {
                    flex: 1;
                    min-width: 0;
                    padding: 6px 8px;
                    border-radius: 8px;
                    word-break: break-word;
                }

                .audit-old {
                    background: #fef2f2;
                    color: #991b1b;
                    text-decoration: line-through;
                }

                .audit-new {
                    background: #ecfdf5;
                    color: #047857;
                }

                /*
                |--------------------------------------------------------------------------
                | RESPONSIVE TABLET
                |--------------------------------------------------------------------------
                */

                @media (max-width: 1400px) {
                    .directorate-filter-grid {
                        grid-template-columns:
                            repeat(3, minmax(0, 1fr));
                    }
                }

                @media (max-width: 1250px) {
                    .schedule-control-panel {
                        grid-template-columns: 1fr;
                    }

                    /*
                     * PERBAIKAN:
                     * Tidak lagi memakai fixed height
                     * ketika tampilan tablet / HP.
                     */

                    .director-calendar-viewport {
                        height: auto;
                        max-height: none;
                        min-height: 0;
                        overflow: visible;
                    }

                    .director-calendar-viewport > div,
                    .director-calendar-viewport .fc {
                        height: auto !important;
                        min-height: 0;
                    }
                }

                /*
                |--------------------------------------------------------------------------
                | RESPONSIVE TABLET KECIL
                |--------------------------------------------------------------------------
                */

                @media (max-width: 992px) {
                    .directorate-filter-grid {
                        grid-template-columns:
                            repeat(2, minmax(0, 1fr));
                    }

                    .schedule-control-heading {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .schedule-control-tools {
                        width: 100%;
                    }

                    .schedule-search {
                        width: auto;
                        flex: 1;
                    }

                    .calendar-all-info {
                        display: none;
                    }

                    .director-calendar-card .fc-toolbar {
                        flex-direction: column;
                        gap: 9px;
                    }

                    .director-calendar-card
                    .fc-toolbar-chunk {
                        display: flex;
                        justify-content: center;
                    }
                }

                /*
                |--------------------------------------------------------------------------
                | RESPONSIVE HP
                |--------------------------------------------------------------------------
                */

                @media (max-width: 768px) {
                    .director-schedule-header h2 {
                        font-size: 1.5rem;
                    }

                    .directorate-filter-grid {
                        grid-template-columns: 1fr;
                    }

                    .schedule-control-tools {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .schedule-search,
                    .schedule-today {
                        width: 100%;
                    }

                    .schedule-category-list {
                        flex-wrap: nowrap;
                        overflow-x: auto;
                        scrollbar-width: none;
                    }

                    .schedule-category-list::-webkit-scrollbar {
                        display: none;
                    }

                    .schedule-category-button {
                        flex-shrink: 0;
                    }

                    .schedule-summary-grid,
                    .agenda-owner-options {
                        grid-template-columns: 1fr;
                    }

                    .director-calendar-body {
                        padding: 8px !important;
                    }

                    .director-calendar-card .fc {
                        width: 100%;
                        font-size: .78rem;
                        min-width: 0;
                    }

                    .director-calendar-card .fc-toolbar-title {
                        font-size: 1.28rem !important;
                    }

                    /*
                     * Memastikan setiap kotak tanggal
                     * tetap memiliki tinggi minimum.
                     */

                    .director-calendar-card
                    .fc-daygrid-day-frame {
                        min-height: 54px;
                    }

                    .director-calendar-card
                    .fc-daygrid-day-number {
                        font-size: .73rem;
                        padding: 4px;
                    }

                    .director-calendar-card .fc-event {
                        margin: 1px !important;
                        padding: 1px 2px !important;
                        font-size: .62rem;
                    }

                    .director-calendar-card
                    .fc-daygrid-more-link {
                        font-size: .62rem;
                    }

                    .audit-change-values {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .audit-change-values > i {
                        align-self: center;
                        transform: rotate(90deg);
                    }
                }
                `}
            </style>
        </div>
    );
}