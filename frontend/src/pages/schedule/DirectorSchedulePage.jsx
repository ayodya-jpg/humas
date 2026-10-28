
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
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const DIRECTORATES = [
    { value: 'direktorat', label: 'Direktorat', short: 'DIREKTORAT', icon: 'bi-people-fill' },
    { value: 'direktur', label: 'Direktur', short: 'DIREKTUR', icon: 'bi-person-badge-fill' },
    { value: 'wakil_direktur_1', label: 'Wakil Direktur I', short: 'WADIR I', icon: 'bi-person-workspace' },
    { value: 'wakil_direktur_2', label: 'Wakil Direktur II', short: 'WADIR II', icon: 'bi-person-workspace' },
];

const AGENDA_TYPES = [
    'Rapat', 'Kunjungan', 'Internal', 'Eksternal',
    'Seremonial', 'Akademik', 'Lainnya',
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

const SOURCES = [
    { key: 'all', label: 'Semua Kegiatan', icon: 'bi-grid-fill', color: '#334155' },
    { key: 'directorate', label: 'Jadwal Direktorat', icon: 'bi-calendar-event-fill', color: '#7F1D1D' },
    { key: 'humas', label: 'Liputan HUMAS', icon: 'bi-camera-reels-fill', color: '#2563EB' },
    { key: 'merchandise', label: 'Merchandise', icon: 'bi-gift-fill', color: '#9333EA' },
    { key: 'asset_request', label: 'Request Barang', icon: 'bi-box2-heart-fill', color: '#0891B2' },
    { key: 'borrowing', label: 'Peminjaman SEKPiM', icon: 'bi-box-seam-fill', color: '#047857' },
    { key: 'pending_schedule', label: 'Pengajuan Jadwal', icon: 'bi-hourglass-split', color: '#D97706' },
];

const STATUS = {
    pending: 'Menunggu',
    revision: 'Perlu Revisi',
    approved: 'Disetujui',
    completed: 'Selesai',
    borrowed: 'Dipinjam',
    returned: 'Dikembalikan',
    rejected: 'Ditolak',
};

const AUDIT_LABELS = {
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
    DIRECTORATES.find((item) => item.value === value)?.label || 'Direktorat';

const ownerShort = (value) =>
    DIRECTORATES.find((item) => item.value === value)?.short || 'DIREKTORAT';

const agendaColor = (value) => AGENDA_COLORS[value] || AGENDA_COLORS.Lainnya;

const clock = (value) => (value ? String(value).slice(0, 5) : '');

const dateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function parseLocalDate(value, time = '00:00') {
    if (!value) return null;

    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    const [hour, minute] = clock(time).split(':').map(Number);
    const result = new Date(year, month - 1, day, hour || 0, minute || 0);

    return Number.isNaN(result.getTime()) ? null : result;
}

function formatDate(value) {
    const date = parseLocalDate(value);

    return date
        ? date.toLocaleDateString('id-ID', {
              weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
          })
        : '-';
}

function formatDateTime(value) {
    if (!value) return '-';

    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? '-'
        : date.toLocaleString('id-ID', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
          });
}

function getError(error) {
    const data = error?.response?.data;
    return (
        Object.values(data?.errors || {}).flat().find(Boolean) ||
        data?.message ||
        'Terjadi kesalahan pada server.'
    );
}

function toMinutes(value) {
    const [h, m] = clock(value).split(':').map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

function fromMinutes(value) {
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function initialForm(date = '', directorate = '') {
    return {
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
    };
}

function findConflict(events, form, excludedId = null) {
    if (!form.directorate || !form.event_date) return null;

    const owners = form.directorate === 'direktorat'
        ? DIRECTORATES.map((item) => item.value)
        : ['direktorat', form.directorate];

    const candidates = events.filter((item) =>
        owners.includes(item.directorate) &&
        String(item.event_date).slice(0, 10) === form.event_date &&
        (excludedId === null || Number(item.id) !== Number(excludedId))
    );

    if (form.all_day) return candidates[0] || null;

    const a = toMinutes(form.start_time);
    const b = toMinutes(form.end_time);

    if (a === null || b === null || b <= a) return null;

    return candidates.find((item) => {
        if (item.all_day || item.allDay) return true;

        const c = toMinutes(item.start_time);
        const d = toMinutes(item.end_time);

        return c !== null && d !== null && a < d && b > c;
    }) || null;
}

function getSource(event) {
    const props = event.extendedProps || {};

    if (props.record_type === 'pending_request') return 'pending_schedule';
    return props.source_type || 'directorate';
}

function getSourceConfig(source) {
    return SOURCES.find((item) => item.key === source) || SOURCES[0];
}

function InfoBox({ label, value, children }) {
    return (
        <div className="p-3 rounded-4 bg-light h-100">
            <div className="small text-muted mb-1">{label}</div>
            {children || (
                <div className="fw-bold text-break" style={{ whiteSpace: 'pre-wrap' }}>
                    {value === null || value === undefined || value === '' ? '-' : String(value)}
                </div>
            )}
        </div>
    );
}


function FormField({ label, required = false, children }) {
    return (
        <div>
            <label className="form-label fw-bold">
                {label}
                {required && <span className="text-danger ms-1">*</span>}
            </label>
            {children}
        </div>
    );
}

export default function DirectorSchedulePage() {
    const calendarRef = useRef(null);

    const [officialEvents, setOfficialEvents] = useState([]);
    const [integratedEvents, setIntegratedEvents] = useState([]);

    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [integratedError, setIntegratedError] = useState('');

    const [canManage, setCanManage] = useState(false);
    const [isCalendarAdmin, setIsCalendarAdmin] = useState(false);

    const [sourceFilter, setSourceFilter] = useState('all');
    const [ownerFilter, setOwnerFilter] = useState('semua');
    const [typeFilter, setTypeFilter] = useState('Semua');
    const [search, setSearch] = useState('');

    const [calendarRange, setCalendarRange] = useState(null);
    const [compact, setCompact] = useState(
        () => window.matchMedia('(max-width: 1250px)').matches
    );

    const [modalOpen, setModalOpen] = useState(false);
    const [detailMode, setDetailMode] = useState(false);
    const [selectedOfficial, setSelectedOfficial] = useState(null);
    const [selectedIntegrated, setSelectedIntegrated] = useState(null);
    const [form, setForm] = useState(initialForm());

    const [saving, setSaving] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [histories, setHistories] = useState([]);
    const [historyError, setHistoryError] = useState(false);

    const [now, setNow] = useState(new Date());

    useEffect(() => {
        let user = {};

        try {
            user = JSON.parse(localStorage.getItem('admin_user') || '{}');
        } catch {
            user = {};
        }

        setIsCalendarAdmin(
            ['admin', 'admin_humas', 'admin_sekpim', 'superadmin'].includes(user.role)
        );
    }, []);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 1250px)');
        const onChange = () => setCompact(media.matches);

        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 60000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            calendarRef.current?.getApi()?.updateSize();
        });

        return () => window.cancelAnimationFrame(frame);
    }, [compact]);

    const loadOfficial = useCallback(async (withLoader = true) => {
        try {
            if (withLoader) setLoading(true);

            const response = await api.get('/event-schedules');
            const data = response?.data?.data || {};

            setOfficialEvents(Array.isArray(data.events) ? data.events : []);
            setCanManage(Boolean(data.can_manage));
        } catch (error) {
            console.error('Load Director Schedule:', error);
            await showErrorAlert('Gagal Memuat Agenda', getError(error));
        } finally {
            if (withLoader) setLoading(false);
        }
    }, []);

    const loadIntegrated = useCallback(async () => {
        if (!isCalendarAdmin || !calendarRange) return;

        try {
            setSyncing(true);
            setIntegratedError('');

            const response = await api.get('/integrated-calendar/events', {
                params: {
                    start: calendarRange.start,
                    end: calendarRange.end,
                },
            });

            const items = response?.data?.data?.events;
            setIntegratedEvents(Array.isArray(items) ? items : []);
        } catch (error) {
            console.error('Integrated Calendar:', error);
            setIntegratedError(getError(error));
            setIntegratedEvents([]);
        } finally {
            setSyncing(false);
        }
    }, [isCalendarAdmin, calendarRange]);

    useEffect(() => {
        loadOfficial();
    }, [loadOfficial]);

    useEffect(() => {
        loadIntegrated();
    }, [loadIntegrated]);

    const handleDatesSet = useCallback((info) => {
        // FullCalendar memakai tanggal akhir eksklusif.
        const lastDay = new Date(info.end);
        lastDay.setDate(lastDay.getDate() - 1);

        const start = dateKey(info.start);
        const end = dateKey(lastDay);

        setCalendarRange((previous) => {
            if (previous?.start === start && previous?.end === end) {
                return previous;
            }

            return { start, end };
        });
    }, []);

    const refresh = async () => {
        await loadOfficial(false);
        await loadIntegrated();
    };

    const counts = useMemo(() => {
        const result = {
            directorate: officialEvents.length,
            humas: 0,
            merchandise: 0,
            asset_request: 0,
            borrowing: 0,
            pending_schedule: 0,
        };

        integratedEvents.forEach((event) => {
            const source = getSource(event);

            // Event resmi Direktorat tidak dihitung ulang.
            if (source !== 'directorate' && source in result) {
                result[source] += 1;
            }
        });

        result.all = Object.values(result).reduce((sum, value) => sum + value, 0);
        return result;
    }, [officialEvents, integratedEvents]);

    const ownerCounts = useMemo(() => {
        const result = { semua: officialEvents.length };

        DIRECTORATES.forEach((item) => {
            result[item.value] = officialEvents.filter(
                (event) => event.directorate === item.value
            ).length;
        });

        return result;
    }, [officialEvents]);

    const visibleOfficial = useMemo(() => {
        if (!['all', 'directorate'].includes(sourceFilter)) return [];

        const keyword = search.trim().toLowerCase();

        return officialEvents.filter((event) => {
            if (ownerFilter !== 'semua' && event.directorate !== ownerFilter) {
                return false;
            }

            if (typeFilter !== 'Semua' && event.agenda_type !== typeFilter) {
                return false;
            }

            return !keyword || [
                event.title,
                event.description,
                event.location,
                ownerLabel(event.directorate),
            ].filter(Boolean).join(' ').toLowerCase().includes(keyword);
        });
    }, [officialEvents, sourceFilter, ownerFilter, typeFilter, search]);

    const visibleIntegrated = useMemo(() => {
        if (!isCalendarAdmin || sourceFilter === 'directorate') return [];

        const keyword = search.trim().toLowerCase();

        return integratedEvents.filter((event) => {
            const props = event.extendedProps || {};
            const source = getSource(event);

            // Jangan menggandakan agenda Direktorat resmi.
            if (source === 'directorate') return false;

            if (sourceFilter !== 'all' && sourceFilter !== source) {
                return false;
            }

            // Filter pemilik hanya berlaku untuk agenda Direktorat.
            if (
                ownerFilter !== 'semua' &&
                props.directorate !== ownerFilter
            ) {
                return false;
            }

            if (
                typeFilter !== 'Semua' &&
                source === 'pending_schedule' &&
                props.agenda_type !== typeFilter
            ) {
                return false;
            }

            return !keyword || [
                event.title,
                props.description,
                props.location,
                props.requester_unit,
                props.pic_name,
                props.coverage_type,
                props.service_code,
            ].filter(Boolean).join(' ').toLowerCase().includes(keyword);
        });
    }, [
        integratedEvents,
        isCalendarAdmin,
        sourceFilter,
        ownerFilter,
        typeFilter,
        search,
    ]);

    const calendarEvents = useMemo(() => {
        const official = visibleOfficial.map((event) => {
            const allDay = Boolean(event.allDay ?? event.all_day);
            const color = event.color || agendaColor(event.agenda_type);

            return {
                id: `official-${event.id}`,
                title: `[${ownerShort(event.directorate)}] ${event.title}`,
                start: event.start || (
                    allDay
                        ? String(event.event_date).slice(0, 10)
                        : `${String(event.event_date).slice(0, 10)}T${clock(event.start_time)}:00`
                ),
                end: event.end || (
                    allDay
                        ? null
                        : `${String(event.event_date).slice(0, 10)}T${clock(event.end_time)}:00`
                ),
                allDay,
                backgroundColor: color,
                borderColor: color,
                textColor: '#ffffff',
                extendedProps: {
                    source_type: 'official',
                    source_id: event.id,
                },
            };
        });

        const external = visibleIntegrated.map((event) => {
            const source = getSource(event);
            const config = getSourceConfig(source);
            const props = event.extendedProps || {};

            return {
                ...event,
                id: String(event.id),
                title: source === 'pending_schedule'
                    ? event.title
                    : `[${config.label}] ${event.title}`,
                backgroundColor: config.color,
                borderColor: config.color,
                textColor: '#ffffff',
                extendedProps: {
                    ...props,
                    display_source: source,
                },
            };
        });

        return [...official, ...external];
    }, [visibleOfficial, visibleIntegrated]);

    const todayOfficial = useMemo(
        () => officialEvents.filter(
            (event) =>
                String(event.event_date).slice(0, 10) === dateKey(now)
        ),
        [officialEvents, now]
    );

    const conflict = useMemo(
        () => detailMode ? null : findConflict(officialEvents, form, form.id),
        [officialEvents, form, detailMode]
    );

    const invalidTime =
        !form.all_day &&
        Boolean(form.start_time && form.end_time) &&
        form.end_time <= form.start_time;

    const suggestions = useMemo(() => {
        if (!conflict || form.all_day || invalidTime) return [];

        const begin = toMinutes(form.start_time);
        const finish = toMinutes(form.end_time);

        if (begin === null || finish === null || finish <= begin) {
            return [];
        }

        const duration = finish - begin;
        const options = [];

        for (let minute = 360; minute + duration <= 1320; minute += 30) {
            const candidate = {
                ...form,
                start_time: fromMinutes(minute),
                end_time: fromMinutes(minute + duration),
            };

            if (!findConflict(officialEvents, candidate, form.id)) {
                options.push({
                    start: candidate.start_time,
                    end: candidate.end_time,
                    distance: Math.abs(minute - begin),
                });
            }
        }

        return options.sort((a, b) => a.distance - b.distance).slice(0, 3);
    }, [conflict, invalidTime, form, officialEvents]);

    const updateField = (field, value) => {
        setForm((previous) => ({ ...previous, [field]: value }));
    };

    const closeModal = () => {
        if (saving) return;
        setModalOpen(false);
        setDetailMode(false);
        setSelectedOfficial(null);
        setHistories([]);
        setHistoryError(false);
    };

    const openCreateModal = (date = '') => {
        setSelectedOfficial(null);
        setHistories([]);
        setHistoryError(false);
        setDetailMode(false);

        setForm(initialForm(
            date,
            ownerFilter === 'semua' ? '' : ownerFilter
        ));

        setModalOpen(true);
    };

    const applyOfficial = (event) => {
        setForm({
            id: event.id,
            directorate: event.directorate || 'direktur',
            title: event.title || '',
            description: event.description || '',
            event_date: String(event.event_date || '').slice(0, 10),
            start_time: clock(event.start_time) || '09:00',
            end_time: clock(event.end_time) || '10:00',
            all_day: Boolean(event.all_day ?? event.allDay),
            location: event.location || '',
            agenda_type: event.agenda_type || 'Rapat',
            is_public: Boolean(event.is_public),
        });
    };

    const openOfficialDetail = async (event) => {
        setSelectedOfficial(event);
        applyOfficial(event);
        setDetailMode(true);
        setHistories([]);
        setHistoryError(false);
        setModalOpen(true);

        try {
            setDetailLoading(true);

            const response = await api.get(`/event-schedules/${event.id}`);
            const detail = response?.data?.data;

            if (detail) {
                setSelectedOfficial(detail);
                applyOfficial(detail);
                setHistories(Array.isArray(detail.histories) ? detail.histories : []);
            }
        } catch (error) {
            console.error('Detail Direktorat:', error);
            setHistoryError(true);
        } finally {
            setDetailLoading(false);
        }
    };

    const onCalendarEvent = (info) => {
        const props = info.event.extendedProps || {};

        if (props.source_type === 'official') {
            const found = officialEvents.find(
                (event) => Number(event.id) === Number(props.source_id)
            );
            if (found) openOfficialDetail(found);
            return;
        }

        setSelectedIntegrated({
            id: info.event.id,
            title: info.event.title,
            extendedProps: props,
        });
    };

    const validateForm = async () => {
        if (!form.directorate) {
            await showWarningAlert(
                'Pilih Direktorat',
                'Tentukan pemilik agenda terlebih dahulu.'
            );
            return false;
        }

        if (!form.title.trim()) {
            await showWarningAlert('Judul Wajib', 'Judul agenda belum diisi.');
            return false;
        }

        if (!form.event_date) {
            await showWarningAlert('Tanggal Wajib', 'Tanggal agenda belum diisi.');
            return false;
        }

        if (
            !form.all_day &&
            (!form.start_time || !form.end_time || invalidTime)
        ) {
            await showWarningAlert(
                'Jam Tidak Valid',
                'Jam selesai harus lebih besar dari jam mulai.'
            );
            return false;
        }

        if (conflict) {
            await showWarningAlert(
                'Jadwal Bentrok',
                `Bentrok dengan "${conflict.title}" milik ${ownerLabel(conflict.directorate)}.`
            );
            return false;
        }

        return true;
    };

    const handleSave = async () => {
        if (!canManage || !(await validateForm())) return;

        const editing = Boolean(form.id);

        const confirmation = await showConfirmAlert({
            title: editing ? 'Simpan Perubahan Agenda?' : 'Tambahkan Agenda?',
            text: `Agenda ${ownerLabel(form.directorate)} akan disimpan.`,
            confirmButtonText: 'Ya, simpan',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#7F1D1D',
        });

        if (!confirmation?.isConfirmed) return;

        const payload = {
            directorate: form.directorate,
            title: form.title.trim(),
            description: form.description.trim() || null,
            event_date: form.event_date,
            start_time: form.all_day ? null : clock(form.start_time),
            end_time: form.all_day ? null : clock(form.end_time),
            all_day: Boolean(form.all_day),
            location: form.location.trim() || null,
            agenda_type: form.agenda_type,
            color: agendaColor(form.agenda_type),
            is_public: Boolean(form.is_public),
        };

        try {
            setSaving(true);
            showLoadingAlert('Menyimpan Agenda', 'Sedang memproses jadwal.');

            const response = editing
                ? await api.put(`/event-schedules/${form.id}`, payload)
                : await api.post('/event-schedules', payload);

            closeAlert();

            await showSuccessAlert(
                editing ? 'Agenda Diperbarui' : 'Agenda Ditambahkan',
                response?.data?.message || 'Agenda berhasil disimpan.'
            );

            setModalOpen(false);
            setSelectedOfficial(null);
            setDetailMode(false);

            await loadOfficial(false);
            await loadIntegrated();
        } catch (error) {
            closeAlert();

            if (error?.response?.status === 409) {
                await showWarningAlert('Jadwal Bentrok', getError(error));
            } else {
                await showErrorAlert('Gagal Menyimpan Agenda', getError(error));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!canManage || !selectedOfficial) return;

        const confirmation = await showConfirmAlert({
            title: 'Hapus Agenda?',
            text: `Agenda "${selectedOfficial.title}" akan dihapus.`,
            icon: 'warning',
            confirmButtonText: 'Ya, hapus',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#dc2626',
        });

        if (!confirmation?.isConfirmed) return;

        try {
            setSaving(true);
            showLoadingAlert('Menghapus Agenda', 'Mohon tunggu sebentar.');

            await api.delete(`/event-schedules/${selectedOfficial.id}`);

            closeAlert();
            await showSuccessAlert('Agenda Dihapus', 'Agenda berhasil dihapus.');

            setModalOpen(false);
            setSelectedOfficial(null);

            await loadOfficial(false);
            await loadIntegrated();
        } catch (error) {
            closeAlert();
            await showErrorAlert('Gagal Menghapus Agenda', getError(error));
        } finally {
            setSaving(false);
        }
    };

    const selectedProps = selectedIntegrated?.extendedProps || {};
    const selectedSource = selectedProps.display_source || '';
    const selectedSourceInfo = getSourceConfig(selectedSource);

    const detailUrl = selectedSource === 'humas'
        ? `/admin/humas-services/${selectedProps.source_id}`
        : selectedSource === 'merchandise'
          ? `/admin/orders/${selectedProps.source_id}`
          : ['borrowing', 'asset_request'].includes(selectedSource)
            ? `/admin/borrow-requests/${selectedProps.source_id}`
            : selectedSource === 'pending_schedule'
              ? '/admin/director-schedule/requests'
              : null;

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-danger mb-3" />
                    <h5 className="fw-bold">Memuat Jadwal Direktorat</h5>
                </div>
            </div>
        );
    }

    return (
        <div className="director-schedule-page">
            <header className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
                <div>
                    <span className="badge bg-danger-subtle text-danger rounded-pill px-3 py-2 mb-2">
                        SEKRETARIAT PIMPINAN
                    </span>

                    <h2 className="fw-black mb-1">Kalender Jadwal Terintegrasi</h2>

                    <p className="text-muted mb-0">
                        Agenda Direktorat, liputan HUMAS, Merchandise,
                        Request Barang dan Peminjaman SEKPiM dalam satu kalender.
                    </p>
                </div>

                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-danger rounded-pill"
                        disabled={syncing}
                        onClick={async () => {
                            await loadOfficial(false);
                            await loadIntegrated();
                        }}
                    >
                        <i className="bi bi-arrow-clockwise me-2" />
                        Refresh
                    </button>

                    {canManage && (
                        <button
                            type="button"
                            className="btn btn-danger rounded-pill px-4"
                            onClick={() => openCreateModal()}
                        >
                            <i className="bi bi-plus-lg me-2" />
                            Tambah Agenda
                        </button>
                    )}
                </div>
            </header>

            {/* FILTER JENIS KEGIATAN */}
            {isCalendarAdmin && (
                <section className="card border-0 shadow-sm rounded-5 mb-4">
                    <div className="card-body p-4">
                        <div className="d-flex justify-content-between gap-3 flex-wrap mb-3">
                            <div>
                                <h5 className="fw-black mb-1">Sumber Kegiatan</h5>
                                <p className="small text-muted mb-0">
                                    Pilih kategori kegiatan yang ingin ditampilkan.
                                </p>
                            </div>

                            {syncing && (
                                <span className="small text-primary">
                                    <span className="spinner-border spinner-border-sm me-2" />
                                    Memuat integrasi...
                                </span>
                            )}
                        </div>

                        <div className="d-flex flex-wrap gap-2">
                            {SOURCES.map((source) => (
                                <button
                                    type="button"
                                    key={source.key}
                                    className={`btn rounded-pill ${
                                        sourceFilter === source.key
                                            ? 'btn-dark'
                                            : 'btn-outline-secondary'
                                    }`}
                                    onClick={() => {
                                        setSourceFilter(source.key);
                                        setOwnerFilter('semua');
                                        setTypeFilter('Semua');
                                    }}
                                >
                                    <i
                                        className={`bi ${source.icon} me-2`}
                                        style={
                                            sourceFilter === source.key
                                                ? undefined
                                                : { color: source.color }
                                        }
                                    />

                                    {source.label}

                                    <span className="badge rounded-pill bg-light text-dark ms-2">
                                        {counts[source.key] || 0}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {integratedError && (
                            <div className="alert alert-warning rounded-4 mt-3 mb-0">
                                <strong>Integrasi belum berhasil dimuat:</strong>{' '}
                                {integratedError}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* FILTER PEMILIK AGENDA */}
            <section className="row g-2 mb-4">
                {[
                    { value: 'semua', label: 'Semua Direktorat', icon: 'bi-grid' },
                    ...DIRECTORATES,
                ].map((item) => (
                    <div className="col-6 col-lg" key={item.value}>
                        <button
                            type="button"
                            className={`director-owner-button ${
                                ownerFilter === item.value ? 'active' : ''
                            }`}
                            onClick={() => {
                                setOwnerFilter(item.value);
                                setTypeFilter('Semua');

                                if (!['all', 'directorate', 'pending_schedule'].includes(sourceFilter)) {
                                    setSourceFilter('directorate');
                                }
                            }}
                        >
                            <i className={`bi ${item.icon} fs-5`} />
                            <span className="flex-grow-1">
                                <strong>{item.label}</strong>
                                <small>
                                    {ownerCounts[item.value] || 0} agenda
                                </small>
                            </span>
                        </button>
                    </div>
                ))}
            </section>

            {/* FILTER LANJUTAN */}
            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="row g-3">
                        <div className="col-lg-7">
                            <label className="form-label fw-bold">Cari Kegiatan</label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-search" />
                                </span>
                                <input
                                    type="search"
                                    className="form-control"
                                    placeholder="Judul, lokasi, pemohon, PIC..."
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="col-lg-5">
                            <label className="form-label fw-bold">
                                Kategori Agenda Direktorat
                            </label>

                            <select
                                className="form-select"
                                value={typeFilter}
                                onChange={(event) => setTypeFilter(event.target.value)}
                            >
                                <option value="Semua">Semua Kategori</option>
                                {AGENDA_TYPES.map((type) => (
                                    <option value={type} key={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-12 d-flex flex-wrap gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-danger rounded-pill"
                                onClick={() => calendarRef.current?.getApi()?.today()}
                            >
                                <i className="bi bi-calendar2-day me-2" />
                                Hari Ini
                            </button>

                            <button
                                type="button"
                                className="btn btn-light border rounded-pill"
                                onClick={() => {
                                    setSearch('');
                                    setOwnerFilter('semua');
                                    setTypeFilter('Semua');
                                    setSourceFilter('all');
                                }}
                            >
                                <i className="bi bi-arrow-counterclockwise me-2" />
                                Reset Filter
                            </button>
                        </div>
                    </div>

                    <div className="row g-3 mt-1">
                        <div className="col-md-6">
                            <div className="bg-light rounded-4 p-3">
                                <div className="small text-muted">
                                    Agenda Pimpinan Hari Ini
                                </div>
                                <div className="fs-4 fw-black">
                                    {todayOfficial.length} Agenda
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="bg-light rounded-4 p-3">
                                <div className="small text-muted">
                                    Kegiatan Terlihat pada Kalender
                                </div>
                                <div className="fs-4 fw-black">
                                    {calendarEvents.length} Kegiatan
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* LEGENDA */}
            <section className="d-flex flex-wrap gap-3 mb-3">
                {SOURCES.filter((item) => item.key !== 'all').map((item) => (
                    <div
                        className="d-inline-flex align-items-center gap-2 small"
                        key={item.key}
                    >
                        <span
                            className="rounded-circle"
                            style={{
                                width: 11,
                                height: 11,
                                backgroundColor: item.color,
                            }}
                        />
                        <span>{item.label}</span>
                    </div>
                ))}
            </section>

            {/* KALENDER */}
            <section className="card border-0 shadow-sm rounded-5 overflow-hidden">
                <div className="director-calendar-banner">
                    <i className="bi bi-calendar3 fs-4" />
                    <div>
                        <div className="small opacity-75">Kalender Aktif</div>
                        <strong>{getSourceConfig(sourceFilter).label}</strong>
                    </div>
                </div>

                <div className="card-body p-3">
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
                            height={compact ? 'auto' : '100%'}
                            expandRows={!compact}
                            events={calendarEvents}
                            datesSet={handleDatesSet}
                            eventClick={onCalendarEvent}
                            dateClick={(info) => {
                                if (canManage) {
                                    openCreateModal(info.dateStr.slice(0, 10));
                                }
                            }}
                            headerToolbar={{
                                start: 'prev,next',
                                center: 'title',
                                end: 'dayGridMonth,timeGridWeek,timeGridDay',
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
                            dayMaxEvents={compact ? 2 : 6}
                            fixedWeekCount={false}
                        />
                    </div>
                </div>
            </section>

            {/* MODAL DETAIL LAYANAN */}
            {selectedIntegrated && (
                <div className="modal fade show d-block director-modal-backdrop" role="dialog" aria-modal="true">
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
                            <div
                                style={{
                                    height: 7,
                                    background: selectedSourceInfo.color,
                                }}
                            />

                            <div className="modal-header border-0 px-4 pt-4">
                                <div>
                                    <div className="small fw-bold mb-2" style={{ color: selectedSourceInfo.color }}>
                                        {selectedSourceInfo.label.toUpperCase()}
                                    </div>
                                    <h4 className="fw-black mb-0">
                                        {selectedIntegrated.title}
                                    </h4>
                                </div>
                                <button
                                    className="btn-close"
                                    type="button"
                                    aria-label="Tutup"
                                    onClick={() => setSelectedIntegrated(null)}
                                />
                            </div>

                            <div className="modal-body px-4">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <InfoBox
                                            label="Kode Pengajuan"
                                            value={selectedProps.service_code}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <InfoBox
                                            label="Status"
                                            value={STATUS[selectedProps.status] || selectedProps.status}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <InfoBox
                                            label={
                                                ['merchandise', 'asset_request', 'borrowing'].includes(selectedSource)
                                                    ? 'Tanggal Pengambilan'
                                                    : 'Tanggal Kegiatan'
                                            }
                                            value={formatDate(
                                                selectedProps.pickup_date ||
                                                selectedProps.event_date
                                            )}
                                        />
                                    </div>

                                    {selectedSource === 'borrowing' && (
                                        <div className="col-md-6">
                                            <InfoBox
                                                label="Tanggal Pengembalian"
                                                value={formatDate(selectedProps.return_date)}
                                            />
                                        </div>
                                    )}

                                    {selectedSource === 'merchandise' && selectedProps.activity_date && (
                                        <div className="col-md-6">
                                            <InfoBox
                                                label="Tanggal Acara"
                                                value={formatDate(selectedProps.activity_date)}
                                            />
                                        </div>
                                    )}

                                    {[
                                        ['Unit / Instansi', selectedProps.requester_unit],
                                        ['Nama PIC', selectedProps.pic_name],
                                        ['Telepon PIC', selectedProps.pic_phone || selectedProps.pic_whatsapp],
                                        ['Lokasi', selectedProps.location],
                                        ['Jenis Liputan', selectedProps.coverage_type],
                                        ['Kategori Agenda', selectedProps.agenda_type],
                                    ].filter(([, value]) => value).map(([label, value]) => (
                                        <div className="col-md-6" key={label}>
                                            <InfoBox label={label} value={value} />
                                        </div>
                                    ))}

                                    {selectedProps.description && (
                                        <div className="col-12">
                                            <InfoBox
                                                label="Deskripsi / Keperluan"
                                                value={selectedProps.description}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="alert alert-info rounded-4 mt-4 mb-0">
                                    <i className="bi bi-info-circle me-2" />
                                    Agenda ini berasal dari data pengajuan layanan.
                                    Perubahan dilakukan melalui modul layanan terkait,
                                    bukan form agenda Direktorat.
                                </div>
                            </div>

                            <div className="modal-footer border-0 px-4 pb-4">
                                {detailUrl && (
                                    <Link
                                        to={detailUrl}
                                        className="btn btn-danger rounded-pill"
                                        onClick={() => setSelectedIntegrated(null)}
                                    >
                                        <i className="bi bi-box-arrow-up-right me-2" />
                                        Buka Detail Pengajuan
                                    </Link>
                                )}

                                <button
                                    type="button"
                                    className="btn btn-light border rounded-pill"
                                    onClick={() => setSelectedIntegrated(null)}
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL AGENDA DIREKTORAT */}
            {modalOpen && (
                <div className="modal fade show d-block director-modal-backdrop" role="dialog" aria-modal="true">
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
                            <div
                                className="director-modal-accent"
                                style={{ background: agendaColor(form.agenda_type) }}
                            />

                            <div className="modal-header border-0 px-4 pt-4">
                                <div>
                                    <span className="small fw-bold text-danger">
                                        {detailMode
                                            ? 'DETAIL AGENDA'
                                            : form.id
                                              ? 'EDIT AGENDA'
                                              : 'AGENDA BARU'}
                                    </span>

                                    <h4 className="fw-black mt-2 mb-0">
                                        {form.title || 'Tambah Agenda Direktorat'}
                                    </h4>
                                </div>

                                <button
                                    className="btn-close"
                                    type="button"
                                    onClick={closeModal}
                                    disabled={saving}
                                />
                            </div>

                            <div className="modal-body px-4 py-3">
                                {detailMode ? (
                                    <div className="row g-3">
                                        {detailLoading && (
                                            <div className="col-12 text-muted small">
                                                Memuat detail terbaru...
                                            </div>
                                        )}

                                        <div className="col-12">
                                            <InfoBox label="Judul Agenda" value={form.title} />
                                        </div>

                                        {[
                                            ['Agenda Untuk', ownerLabel(form.directorate)],
                                            ['Tanggal', formatDate(form.event_date)],
                                            ['Waktu', form.all_day ? 'Sepanjang Hari' : `${form.start_time} - ${form.end_time}`],
                                            ['Kategori', form.agenda_type],
                                            ['Lokasi', form.location],
                                            ['Visibilitas', form.is_public ? 'Publik' : 'Internal'],
                                        ].map(([label, value]) => (
                                            <div className="col-md-6" key={label}>
                                                <InfoBox label={label} value={value} />
                                            </div>
                                        ))}

                                        <div className="col-12">
                                            <InfoBox label="Deskripsi" value={form.description} />
                                        </div>

                                        {canManage && (
                                            <div className="col-12">
                                                <div className="border rounded-4 p-4">
                                                    <h5 className="fw-black">
                                                        <i className="bi bi-clock-history me-2" />
                                                        Riwayat Perubahan
                                                    </h5>

                                                    {historyError && (
                                                        <div className="alert alert-warning">
                                                            Riwayat belum dapat dimuat.
                                                        </div>
                                                    )}

                                                    {histories.length === 0 && !detailLoading && (
                                                        <p className="text-muted small mb-0">
                                                            Belum ada riwayat perubahan.
                                                        </p>
                                                    )}

                                                    <div className="d-flex flex-column gap-3 mt-3">
                                                        {histories.map((entry) => {
                                                            const changedFields = [
                                                                ...new Set([
                                                                    ...Object.keys(entry.old_values || {}),
                                                                    ...Object.keys(entry.new_values || {}),
                                                                ]),
                                                            ].filter((key) =>
                                                                String(entry.old_values?.[key] ?? '') !==
                                                                String(entry.new_values?.[key] ?? '')
                                                            );

                                                            return (
                                                                <div
                                                                    className="bg-light rounded-4 p-3"
                                                                    key={entry.id}
                                                                >
                                                                    <div className="fw-bold">
                                                                        {entry.action === 'created'
                                                                            ? 'Agenda Dibuat'
                                                                            : entry.action === 'deleted'
                                                                              ? 'Agenda Dihapus'
                                                                              : 'Agenda Diperbarui'}
                                                                    </div>

                                                                    <div className="small text-muted mb-2">
                                                                        {entry.user_name || 'Admin'} •{' '}
                                                                        {formatDateTime(entry.created_at)}
                                                                    </div>

                                                                    {entry.action === 'updated' &&
                                                                        changedFields.map((field) => (
                                                                            <div
                                                                                className="border-top py-2 small"
                                                                                key={field}
                                                                            >
                                                                                <div className="fw-bold">
                                                                                    {AUDIT_LABELS[field] || field}
                                                                                </div>
                                                                                <div>
                                                                                    {String(entry.old_values?.[field] ?? '-')}
                                                                                    {' → '}
                                                                                    {String(entry.new_values?.[field] ?? '-')}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <FormField label="Agenda Untuk" required>
                                                <div className="row g-2">
                                                    {DIRECTORATES.map((item) => (
                                                        <div className="col-sm-6" key={item.value}>
                                                            <button
                                                                type="button"
                                                                className={`director-owner-choice ${
                                                                    form.directorate === item.value ? 'active' : ''
                                                                }`}
                                                                onClick={() => updateField('directorate', item.value)}
                                                            >
                                                                <i className={`bi ${item.icon} me-2`} />
                                                                {item.label}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </FormField>
                                        </div>

                                        <div className="col-12">
                                            <FormField label="Judul Agenda" required>
                                                <input
                                                    className="form-control form-control-lg"
                                                    maxLength={255}
                                                    value={form.title}
                                                    placeholder="Contoh: Rapat Koordinasi Pimpinan"
                                                    onChange={(event) =>
                                                        updateField('title', event.target.value)
                                                    }
                                                />
                                            </FormField>
                                        </div>

                                        <div className="col-md-6">
                                            <FormField label="Tanggal" required>
                                                <input
                                                    type="date"
                                                    className="form-control form-control-lg"
                                                    value={form.event_date}
                                                    onChange={(event) =>
                                                        updateField('event_date', event.target.value)
                                                    }
                                                />
                                            </FormField>
                                        </div>

                                        <div className="col-md-6">
                                            <FormField label="Kategori">
                                                <select
                                                    className="form-select form-select-lg"
                                                    value={form.agenda_type}
                                                    onChange={(event) =>
                                                        updateField('agenda_type', event.target.value)
                                                    }
                                                >
                                                    {AGENDA_TYPES.map((type) => (
                                                        <option value={type} key={type}>
                                                            {type}
                                                        </option>
                                                    ))}
                                                </select>
                                            </FormField>
                                        </div>

                                        <div className="col-12">
                                            <div className="form-check form-switch">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    id="directorAllDay"
                                                    checked={form.all_day}
                                                    onChange={(event) =>
                                                        updateField('all_day', event.target.checked)
                                                    }
                                                />
                                                <label
                                                    htmlFor="directorAllDay"
                                                    className="form-check-label fw-bold"
                                                >
                                                    Sepanjang Hari
                                                </label>
                                            </div>
                                        </div>

                                        {!form.all_day && (
                                            <>
                                                <div className="col-md-6">
                                                    <FormField label="Jam Mulai" required>
                                                        <input
                                                            type="time"
                                                            className="form-control form-control-lg"
                                                            value={form.start_time}
                                                            onChange={(event) =>
                                                                updateField('start_time', event.target.value)
                                                            }
                                                        />
                                                    </FormField>
                                                </div>

                                                <div className="col-md-6">
                                                    <FormField label="Jam Selesai" required>
                                                        <input
                                                            type="time"
                                                            className="form-control form-control-lg"
                                                            value={form.end_time}
                                                            onChange={(event) =>
                                                                updateField('end_time', event.target.value)
                                                            }
                                                        />
                                                    </FormField>
                                                </div>
                                            </>
                                        )}

                                        {form.directorate && form.event_date && (
                                            <div className="col-12">
                                                <div
                                                    className={`alert rounded-4 ${
                                                        invalidTime
                                                            ? 'alert-warning'
                                                            : conflict
                                                              ? 'alert-danger'
                                                              : 'alert-success'
                                                    }`}
                                                >
                                                    <div className="fw-bold">
                                                        <i className={`bi ${
                                                            conflict
                                                                ? 'bi-calendar-x-fill'
                                                                : 'bi-calendar-check-fill'
                                                        } me-2`} />

                                                        {invalidTime
                                                            ? 'Jam Tidak Valid'
                                                            : conflict
                                                              ? 'Jadwal Bentrok'
                                                              : 'Jadwal Tersedia'}
                                                    </div>

                                                    {conflict && (
                                                        <div className="small mt-2">
                                                            Bentrok dengan "{conflict.title}"
                                                            milik {ownerLabel(conflict.directorate)}.
                                                        </div>
                                                    )}

                                                    {conflict && suggestions.length > 0 && (
                                                        <div className="mt-3">
                                                            <div className="small fw-bold mb-2">
                                                                Saran Waktu Tersedia
                                                            </div>
                                                            <div className="d-flex gap-2 flex-wrap">
                                                                {suggestions.map((slot) => (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-light border rounded-pill"
                                                                        key={slot.start}
                                                                        onClick={() =>
                                                                            setForm((previous) => ({
                                                                                ...previous,
                                                                                start_time: slot.start,
                                                                                end_time: slot.end,
                                                                            }))
                                                                        }
                                                                    >
                                                                        {slot.start} - {slot.end}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="col-12">
                                            <FormField label="Lokasi">
                                                <input
                                                    className="form-control form-control-lg"
                                                    value={form.location}
                                                    placeholder="Contoh: Ruang Rapat Pimpinan"
                                                    onChange={(event) =>
                                                        updateField('location', event.target.value)
                                                    }
                                                />
                                            </FormField>
                                        </div>

                                        <div className="col-12">
                                            <FormField label="Deskripsi">
                                                <textarea
                                                    className="form-control"
                                                    rows={4}
                                                    value={form.description}
                                                    placeholder="Informasi tambahan agenda..."
                                                    onChange={(event) =>
                                                        updateField('description', event.target.value)
                                                    }
                                                />
                                            </FormField>
                                        </div>

                                        <div className="col-12">
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="directorPublic"
                                                    checked={form.is_public}
                                                    onChange={(event) =>
                                                        updateField('is_public', event.target.checked)
                                                    }
                                                />
                                                <label
                                                    className="form-check-label fw-bold"
                                                    htmlFor="directorPublic"
                                                >
                                                    Tampilkan di Kalender Publik
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

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
                                                    <i className="bi bi-trash-fill me-2" />
                                                    Hapus
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-danger rounded-pill"
                                                    disabled={saving}
                                                    onClick={() => setDetailMode(false)}
                                                >
                                                    <i className="bi bi-pencil-fill me-2" />
                                                    Edit Agenda
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
                                            className="btn btn-danger rounded-pill px-4"
                                            disabled={saving || Boolean(conflict) || invalidTime}
                                            onClick={handleSave}
                                        >
                                            {saving ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" />
                                                    Menyimpan...
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

            <style>{`
                .director-schedule-page {
                    min-width: 0;
                    padding-bottom: 24px;
                }

                .director-schedule-page .fw-black {
                    font-weight: 900 !important;
                }

                .director-owner-button {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                    min-height: 78px;
                    padding: 13px;
                    border: 1px solid #e2e8f0;
                    border-radius: 17px;
                    background: #fff;
                    text-align: left;
                    color: #475569;
                }

                .director-owner-button.active {
                    border-color: #7f1d1d;
                    background: #fff1f2;
                    color: #7f1d1d;
                }

                .director-owner-button strong,
                .director-owner-button small {
                    display: block;
                }

                .director-owner-button strong {
                    font-size: .8rem;
                }

                .director-owner-button small {
                    font-size: .7rem;
                    color: #94a3b8;
                }

                .director-calendar-banner {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 13px 18px;
                    background: linear-gradient(90deg, #7f1d1d, #991b1b);
                    color: white;
                }

                .director-calendar-viewport {
                    height: calc(100vh - 480px);
                    min-height: 460px;
                    max-height: 760px;
                }

                .director-calendar-viewport > div,
                .director-calendar-viewport .fc {
                    height: 100%;
                }

                .director-schedule-page .fc-toolbar-title {
                    font-size: 1.6rem !important;
                    font-weight: 900;
                    text-transform: capitalize;
                }

                .director-schedule-page .fc-button {
                    min-height: 37px;
                    border-radius: 999px !important;
                    font-size: .82rem !important;
                    font-weight: 800 !important;
                }

                .director-schedule-page .fc-event {
                    margin: 2px 3px !important;
                    padding: 3px 5px !important;
                    border-radius: 7px !important;
                    font-weight: 800;
                    cursor: pointer;
                }

                .director-schedule-page .fc-day-today {
                    background: #fff7f7 !important;
                }

                .director-modal-backdrop {
                    background: #0f172a9e;
                    z-index: 1050;
                }

                .director-modal-accent {
                    height: 7px;
                }

                .director-owner-choice {
                    width: 100%;
                    min-height: 54px;
                    padding: 12px;
                    border: 1px solid #e2e8f0;
                    border-radius: 13px;
                    background: white;
                    font-weight: 700;
                    text-align: left;
                }

                .director-owner-choice.active {
                    border-color: #7f1d1d;
                    background: #fff1f2;
                    color: #7f1d1d;
                }

                @media (max-width: 1250px) {
                    .director-calendar-viewport {
                        height: auto;
                        max-height: none;
                        min-height: 0;
                    }

                    .director-calendar-viewport > div,
                    .director-calendar-viewport .fc {
                        height: auto !important;
                    }
                }

                @media (max-width: 768px) {
                    .director-schedule-page .fc-toolbar {
                        flex-direction: column;
                        gap: 9px;
                    }

                    .director-schedule-page .fc-toolbar-title {
                        font-size: 1.25rem !important;
                    }

                    .director-schedule-page .fc {
                        font-size: .78rem;
                    }

                    .director-schedule-page .fc-event {
                        margin: 1px !important;
                        padding: 1px 2px !important;
                        font-size: .62rem;
                    }
                }
            `}</style>
        </div>
    );
}
