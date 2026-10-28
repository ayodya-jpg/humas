
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

const OWNERS = [
    { id: 'direktorat', name: 'Direktorat', short: 'DIREKTORAT' },
    { id: 'direktur', name: 'Direktur', short: 'DIREKTUR' },
    { id: 'wakil_direktur_1', name: 'Wakil Direktur I', short: 'WADIR I' },
    { id: 'wakil_direktur_2', name: 'Wakil Direktur II', short: 'WADIR II' },
];

const TYPES = [
    'Rapat', 'Kunjungan', 'Internal', 'Eksternal',
    'Seremonial', 'Akademik', 'Lainnya',
];

const TYPE_COLORS = {
    Rapat: '#7f1d1d',
    Kunjungan: '#1d4ed8',
    Internal: '#4338ca',
    Eksternal: '#047857',
    Seremonial: '#c2410c',
    Akademik: '#7e22ce',
    Lainnya: '#475569',
};

const SOURCES = [
    { id: 'all', name: 'Semua Kegiatan', icon: 'bi-grid-fill', color: '#334155' },
    { id: 'directorate', name: 'Jadwal Direktorat', icon: 'bi-calendar-event', color: '#7f1d1d' },
    { id: 'humas', name: 'Liputan HUMAS', icon: 'bi-camera-reels-fill', color: '#2563eb' },
    { id: 'merchandise', name: 'Merchandise', icon: 'bi-gift-fill', color: '#9333ea' },
    { id: 'asset_request', name: 'Request Barang', icon: 'bi-box2-heart-fill', color: '#0891b2' },
    { id: 'borrowing', name: 'Peminjaman SEKPiM', icon: 'bi-box-seam-fill', color: '#047857' },
    { id: 'pending_schedule', name: 'Pengajuan Jadwal', icon: 'bi-hourglass-split', color: '#d97706' },
];

const STATUS = {
    pending: 'Menunggu Persetujuan',
    revision: 'Perlu Revisi',
    approved: 'Disetujui',
    completed: 'Selesai',
    borrowed: 'Sedang Dipinjam',
    returned: 'Dikembalikan',
    rejected: 'Ditolak',
};

const ownerName = (id) =>
    OWNERS.find((item) => item.id === id)?.name || 'Direktorat';

const ownerShort = (id) =>
    OWNERS.find((item) => item.id === id)?.short || 'DIREKTORAT';

const sourceInfo = (id) =>
    SOURCES.find((item) => item.id === id) || SOURCES[0];

const clock = (value) =>
    value ? String(value).slice(0, 5) : '';

const dateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatDate = (value) => {
    if (!value) return '-';

    const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
    const date = new Date(y, m - 1, d);

    return Number.isNaN(date.getTime())
        ? '-'
        : date.toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
          });
};

const formatDateTime = (value) => {
    if (!value) return '-';

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? '-'
        : date.toLocaleString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          });
};

const errorMessage = (error) => {
    const data = error?.response?.data;
    return (
        Object.values(data?.errors || {}).flat().find(Boolean) ||
        data?.message ||
        'Terjadi kesalahan pada server.'
    );
};

const toMinutes = (value) => {
    const [h, m] = clock(value).split(':').map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

const fromMinutes = (value) =>
    `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

const blankForm = (date = '', owner = '') => ({
    id: null,
    directorate: owner,
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

function findConflict(events, form, excludeId = null) {
    if (!form.directorate || !form.event_date) return null;

    const matchingOwners = form.directorate === 'direktorat'
        ? OWNERS.map((item) => item.id)
        : ['direktorat', form.directorate];

    return events.find((event) => {
        if (
            !matchingOwners.includes(event.directorate) ||
            String(event.event_date).slice(0, 10) !== form.event_date ||
            (excludeId !== null && Number(event.id) === Number(excludeId))
        ) {
            return false;
        }

        if (form.all_day || event.all_day || event.allDay) return true;

        const a = toMinutes(form.start_time);
        const b = toMinutes(form.end_time);
        const c = toMinutes(event.start_time);
        const d = toMinutes(event.end_time);

        return a !== null && b !== null &&
            c !== null && d !== null && a < d && b > c;
    }) || null;
}

function sourceOf(event) {
    const props = event.extendedProps || {};

    return props.record_type === 'pending_request'
        ? 'pending_schedule'
        : props.source_type || 'directorate';
}

function Info({ label, value }) {
    return (
        <div className="calendar-info-box">
            <span>{label}</span>
            <strong>{value || '-'}</strong>
        </div>
    );
}

export default function DirectorSchedulePage() {
    const calendarRef = useRef(null);

    const [official, setOfficial] = useState([]);
    const [integrated, setIntegrated] = useState([]);
    const [canManage, setCanManage] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncError, setSyncError] = useState('');

    const [source, setSource] = useState('all');
    const [owner, setOwner] = useState('semua');
    const [category, setCategory] = useState('Semua');
    const [search, setSearch] = useState('');
    const [range, setRange] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [detailMode, setDetailMode] = useState(false);
    const [selectedOfficial, setSelectedOfficial] = useState(null);
    const [selectedExternal, setSelectedExternal] = useState(null);
    const [form, setForm] = useState(blankForm());
    const [saving, setSaving] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [histories, setHistories] = useState([]);

    const [compact, setCompact] = useState(
        () => window.matchMedia('(max-width: 1100px)').matches
    );

    useEffect(() => {
        try {
            const user = JSON.parse(
                localStorage.getItem('admin_user') || '{}'
            );

            setIsAdmin(
                ['admin', 'admin_humas', 'admin_sekpim', 'superadmin']
                    .includes(user.role)
            );
        } catch {
            setIsAdmin(false);
        }
    }, []);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 1100px)');
        const change = () => setCompact(media.matches);

        media.addEventListener('change', change);
        return () => media.removeEventListener('change', change);
    }, []);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            calendarRef.current?.getApi()?.updateSize();
        });

        return () => cancelAnimationFrame(frame);
    }, [compact]);

    const loadOfficial = useCallback(async (withLoader = true) => {
        try {
            if (withLoader) setLoading(true);

            const response = await api.get('/event-schedules');
            const data = response?.data?.data || {};

            setOfficial(Array.isArray(data.events) ? data.events : []);
            setCanManage(Boolean(data.can_manage));
        } catch (error) {
            await showErrorAlert(
                'Gagal Memuat Jadwal',
                errorMessage(error)
            );
        } finally {
            if (withLoader) setLoading(false);
        }
    }, []);

    const loadIntegrated = useCallback(async () => {
        if (!isAdmin || !range) return;

        try {
            setSyncing(true);
            setSyncError('');

            const response = await api.get(
                '/integrated-calendar/events',
                {
                    params: {
                        start: range.start,
                        end: range.end,
                    },
                }
            );

            const items = response?.data?.data?.events;
            setIntegrated(Array.isArray(items) ? items : []);
        } catch (error) {
            setSyncError(errorMessage(error));
            setIntegrated([]);
        } finally {
            setSyncing(false);
        }
    }, [isAdmin, range]);

    useEffect(() => {
        loadOfficial();
    }, [loadOfficial]);

    useEffect(() => {
        loadIntegrated();
    }, [loadIntegrated]);

    const refresh = async () => {
        await loadOfficial(false);
        await loadIntegrated();
    };

    const handleDatesSet = useCallback((info) => {
        const last = new Date(info.end);
        last.setDate(last.getDate() - 1);

        const next = {
            start: dateKey(info.start),
            end: dateKey(last),
        };

        setRange((previous) =>
            previous?.start === next.start && previous?.end === next.end
                ? previous
                : next
        );
    }, []);

    const counts = useMemo(() => {
        const result = {
            all: official.length,
            directorate: official.length,
            humas: 0,
            merchandise: 0,
            asset_request: 0,
            borrowing: 0,
            pending_schedule: 0,
        };

        integrated.forEach((item) => {
            const name = sourceOf(item);

            if (name !== 'directorate' && name in result) {
                result[name] += 1;
                result.all += 1;
            }
        });

        return result;
    }, [official, integrated]);

    const ownerCounts = useMemo(() => {
        const result = { semua: official.length };

        OWNERS.forEach((item) => {
            result[item.id] = official.filter(
                (event) => event.directorate === item.id
            ).length;
        });

        return result;
    }, [official]);

    const visibleOfficial = useMemo(() => {
        if (source !== 'all' && source !== 'directorate') return [];

        const keyword = search.trim().toLowerCase();

        return official.filter((event) => {
            if (owner !== 'semua' && event.directorate !== owner) return false;
            if (category !== 'Semua' && event.agenda_type !== category) return false;

            return !keyword || [
                event.title,
                event.description,
                event.location,
                ownerName(event.directorate),
            ].filter(Boolean).join(' ').toLowerCase().includes(keyword);
        });
    }, [official, source, owner, category, search]);

    const visibleExternal = useMemo(() => {
        if (!isAdmin || source === 'directorate') return [];

        const keyword = search.trim().toLowerCase();

        return integrated.filter((item) => {
            const name = sourceOf(item);
            const props = item.extendedProps || {};

            // Agenda resmi tidak digandakan.
            if (name === 'directorate') return false;
            if (source !== 'all' && source !== name) return false;

            if (
                owner !== 'semua' &&
                props.directorate !== owner
            ) {
                return false;
            }

            return !keyword || [
                item.title,
                props.description,
                props.location,
                props.pic_name,
                props.requester_unit,
                props.service_code,
                props.coverage_type,
            ].filter(Boolean).join(' ').toLowerCase().includes(keyword);
        });
    }, [integrated, isAdmin, source, owner, search]);

    const calendarEvents = useMemo(() => {
        const directorate = visibleOfficial.map((item) => {
            const allDay = Boolean(item.all_day ?? item.allDay);
            const color = item.color || TYPE_COLORS[item