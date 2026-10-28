
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import { Link } from 'react-router-dom';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import interactionPlugin from '@fullcalendar/react/interaction';
import listPlugin from '@fullcalendar/react/list';

import api from '../../api/axios';

const SOURCES = [
    {
        value: 'directorate',
        label: 'Jadwal Direktorat',
        color: '#7F1D1D',
        icon: 'bi-calendar2-check',
    },
    {
        value: 'humas',
        label: 'Layanan HUMAS',
        color: '#2563EB',
        icon: 'bi-camera-reels',
    },
    {
        value: 'borrowing',
        label: 'Peminjaman',
        color: '#047857',
        icon: 'bi-box-seam',
    },
];

const STATUS_LABELS = {
    pending: 'Menunggu Persetujuan',
    approved: 'Disetujui',
    completed: 'Selesai',
    borrowed: 'Sedang Dipinjam',
    returned: 'Dikembalikan',
};

const DIRECTORATE_LABELS = {
    direktorat: 'Direktorat',
    direktur: 'Direktur',
    wakil_direktur_1: 'Wakil Direktur I',
    wakil_direktur_2: 'Wakil Direktur II',
};

const dateLabel = (date) => {
    if (!date) return '-';

    const text = String(date).slice(0, 10);
    const [year, month, day] = text.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);

    return Number.isNaN(parsed.getTime())
        ? '-'
        : parsed.toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
          });
};

const timeLabel = (value) =>
    value ? String(value).slice(0, 5) : '-';

const getError = (error) =>
    error?.response?.data?.message ||
    'Kalender gagal dimuat. Periksa koneksi backend.';

function DetailLine({ icon, label, value }) {
    return (
        <div className="ic-detail-line">
            <div className="ic-detail-icon">
                <i className={`bi ${icon}`} />
            </div>
            <div>
                <small>{label}</small>
                <strong>{value || '-'}</strong>
            </div>
        </div>
    );
}

export default function IntegratedCalendarPage() {
    const calendarRef = useRef(null);

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [filters, setFilters] = useState({
        directorate: true,
        humas: true,
        borrowing: true,
    });

    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');

    const [selected, setSelected] = useState(null);

    const [range, setRange] = useState(null);
    const [calendarTitle, setCalendarTitle] = useState('');

    const loadEvents = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const params = {};

            if (range?.start && range?.end) {
                params.start = range.start;
                params.end = range.end;
            }

            const response = await api.get(
                '/integrated-calendar/events',
                { params }
            );

            const data = response?.data?.data || {};

            setEvents(
                Array.isArray(data.events)
                    ? data.events
                    : []
            );
        } catch (err) {
            console.error('Integrated calendar:', err);
            setError(getError(err));
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [range?.start, range?.end]);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    const filteredEvents = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return events.filter((event) => {
            const props = event.extendedProps || {};

            if (!filters[props.source_type]) return false;

            if (
                statusFilter !== 'all' &&
                props.status !== statusFilter
            ) {
                return false;
            }

            if (!keyword) return true;

            return [
                event.title,
                props.description,
                props.requester_unit,
                props.pic_name,
                props.location,
                props.service_code,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(keyword);
        });
    }, [events, filters, statusFilter, search]);

    const summary = useMemo(() => {
        const countBySource = (source) =>
            filteredEvents.filter(
                (event) =>
                    event.extendedProps?.source_type === source
            ).length;

        return {
            total: filteredEvents.length,
            directorate: countBySource('directorate'),
            humas: countBySource('humas'),
            borrowing: countBySource('borrowing'),
        };
    }, [filteredEvents]);

    const toggleSource = (source) => {
        setFilters((previous) => ({
            ...previous,
            [source]: !previous[source],
        }));
    };

    const openEvent = (info) => {
        const event = filteredEvents.find(
            (item) => String(item.id) === info.event.id
        );

        if (event) {
            setSelected(event);
        }
    };

    const currentSource = selected
        ? SOURCES.find(
              (item) =>
                  item.value ===
                  selected.extendedProps?.source_type
          )
        : null;

    const selectedProps = selected?.extendedProps || {};

    const getDetailLink = () => {
        if (!selected) return null;

        const id = selectedProps.source_id;

        if (selectedProps.source_type === 'directorate') {
            if (selectedProps.record_type === 'pending_request') {
                return '/admin/director-schedule/requests';
            }

            return '/admin/director-schedule';
        }

        if (selectedProps.source_type === 'humas') {
            return `/admin/my-requests/humas/${id}/detail`;
        }

        if (selectedProps.source_type === 'borrowing') {
            return `/admin/my-requests/borrowing/${id}/detail`;
        }

        return null;
    };

    return (
        <div className="integrated-calendar-page">
            <header className="ic-header">
                <div>
                    <span className="badge bg-danger-subtle text-danger rounded-pill px-3 py-2 mb-2">
                        HUMAS & SEKRETARIAT PIMPINAN
                    </span>

                    <h2 className="fw-black mb-1">
                        Kalender Kegiatan Terintegrasi
                    </h2>

                    <p className="text-muted mb-0">
                        Monitoring Jadwal Direktorat, layanan HUMAS,
                        dan peminjaman dalam satu kalender.
                    </p>
                </div>

                <button
                    type="button"
                    className="btn btn-outline-danger rounded-pill px-4"
                    onClick={loadEvents}
                    disabled={loading}
                >
                    <i className="bi bi-arrow-clockwise me-2" />
                    Refresh
                </button>
            </header>

            <section className="ic-summary">
                {[
                    {
                        key: 'total',
                        label: 'Semua Kegiatan',
                        color: '#334155',
                        icon: 'bi-grid',
                    },
                    ...SOURCES.map((item) => ({
                        key: item.value,
                        label: item.label,
                        color: item.color,
                        icon: item.icon,
                    })),
                ].map((item) => (
                    <div className="ic-summary-card" key={item.key}>
                        <span
                            className="ic-summary-icon"
                            style={{
                                color: item.color,
                                background: `${item.color}15`,
                            }}
                        >
                            <i className={`bi ${item.icon}`} />
                        </span>

                        <div>
                            <small>{item.label}</small>
                            <strong>{summary[item.key] || 0}</strong>
                        </div>
                    </div>
                ))}
            </section>

            <section className="ic-panel">
                <div className="ic-panel-heading">
                    <div>
                        <h5 className="fw-black mb-1">
                            Filter Kegiatan
                        </h5>
                        <p className="small text-muted mb-0">
                            Tampilkan layanan sesuai kebutuhan.
                        </p>
                    </div>
                </div>

                <div className="ic-filters">
                    {SOURCES.map((source) => (
                        <label
                            key={source.value}
                            className="ic-source-toggle"
                        >
                            <input
                                type="checkbox"
                                checked={filters[source.value]}
                                onChange={() =>
                                    toggleSource(source.value)
                                }
                            />
                            <span
                                className="ic-source-dot"
                                style={{
                                    backgroundColor: source.color,
                                }}
                            />
                            <span>{source.label}</span>
                        </label>
                    ))}
                </div>

                <div className="row g-3 mt-1">
                    <div className="col-lg-8">
                        <label className="form-label small fw-bold">
                            Cari Kegiatan
                        </label>

                        <input
                            type="search"
                            className="form-control"
                            placeholder="Judul, unit, PIC, lokasi, kode pengajuan..."
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                        />
                    </div>

                    <div className="col-lg-4">
                        <label className="form-label small fw-bold">
                            Status
                        </label>

                        <select
                            className="form-select"
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                        >
                            <option value="all">
                                Semua Status
                            </option>
                            <option value="pending">
                                Menunggu Persetujuan
                            </option>
                            <option value="approved">
                                Disetujui
                            </option>
                            <option value="completed">
                                Selesai
                            </option>
                            <option value="borrowed">
                                Sedang Dipinjam
                            </option>
                            <option value="returned">
                                Dikembalikan
                            </option>
                        </select>
                    </div>
                </div>
            </section>

            <section className="ic-calendar-card">
                <div className="ic-calendar-heading">
                    <div>
                        <h5 className="fw-black mb-1">
                            {calendarTitle || 'Kalender Kegiatan'}
                        </h5>
                        <small className="text-muted">
                            {summary.total} kegiatan sesuai filter
                        </small>
                    </div>

                    <div className="d-flex gap-2 align-items-center">
                        {loading && (
                            <span className="spinner-border spinner-border-sm text-danger" />
                        )}
                    </div>
                </div>

                {error && (
                    <div
                        className="alert alert-danger rounded-4 mx-3 mt-3"
                        role="alert"
                    >
                        <i className="bi bi-exclamation-triangle me-2" />
                        {error}
                    </div>
                )}

                <div className="ic-calendar-content">
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[
                            dayGridPlugin,
                            timeGridPlugin,
                            interactionPlugin,
                            listPlugin,
                        ]}
                        initialView="dayGridMonth"
                        locale="id"
                        firstDay={1}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,listMonth',
                        }}
                        buttonText={{
                            today: 'Hari Ini',
                            month: 'Bulan',
                            week: 'Minggu',
                            list: 'Daftar',
                        }}
                        height="auto"
                        contentHeight="auto"
                        dayMaxEvents={3}
                        displayEventTime={true}
                        events={filteredEvents}
                        eventClick={openEvent}
                        datesSet={(info) => {
                            setCalendarTitle(info.view.title);

                            // FullCalendar menggunakan exclusive end.
                            const start = info.startStr.slice(0, 10);

                            const endDate = new Date(
                                info.end.getTime() - 86400000
                            );

                            const end = [
                                endDate.getFullYear(),
                                String(
                                    endDate.getMonth() + 1
                                ).padStart(2, '0'),
                                String(
                                    endDate.getDate()
                                ).padStart(2, '0'),
                            ].join('-');

                            setRange((previous) => {
                                if (
                                    previous?.start === start &&
                                    previous?.end === end
                                ) {
                                    return previous;
                                }

                                return { start, end };
                            });
                        }}
                        eventClassNames={(arg) => {
                            const status =
                                arg.event.extendedProps?.status;

                            return status === 'pending'
                                ? ['ic-event-pending']
                                : [];
                        }}
                    />
                </div>
            </section>

            {/* MODAL DETAIL */}

            {selected && (
                <div className="ic-modal-overlay">
                    <div
                        className="ic-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Detail kegiatan"
                    >
                        <div className="ic-modal-header">
                            <div>
                                <span
                                    className="badge rounded-pill text-white mb-2"
                                    style={{
                                        background:
                                            currentSource?.color ||
                                            '#475569',
                                    }}
                                >
                                    {currentSource?.label ||
                                        'Kegiatan'}
                                </span>

                                <h4 className="fw-black mb-1">
                                    {selected.title}
                                </h4>

                                <span className="small text-muted">
                                    {selectedProps.service_code ||
                                        `ID #${selectedProps.source_id}`}
                                </span>
                            </div>

                            <button
                                type="button"
                                className="btn-close"
                                onClick={() => setSelected(null)}
                                aria-label="Tutup"
                            />
                        </div>

                        <div className="ic-modal-body">
                            <div className="mb-3">
                                <span
                                    className={`badge rounded-pill px-3 py-2 ${
                                        selectedProps.status === 'pending'
                                            ? 'bg-warning-subtle text-warning-emphasis'
                                            : 'bg-success-subtle text-success'
                                    }`}
                                >
                                    {STATUS_LABELS[
                                        selectedProps.status
                                    ] ||
                                        selectedProps.status ||
                                        'Tidak diketahui'}
                                </span>

                                {selectedProps.status === 'pending' && (
                                    <div className="small text-muted mt-2">
                                        Pengajuan belum menjadi agenda resmi.
                                    </div>
                                )}
                            </div>

                            <div className="ic-detail-grid">
                                <DetailLine
                                    icon="bi-calendar3"
                                    label="Tanggal Kegiatan"
                                    value={dateLabel(
                                        selectedProps.event_date
                                    )}
                                />

                                <DetailLine
                                    icon="bi-clock"
                                    label="Waktu"
                                    value={
                                        selected.allDay
                                            ? 'Sepanjang Hari'
                                            : `${timeLabel(
                                                  selectedProps.start_time
                                              )} - ${timeLabel(
                                                  selectedProps.end_time
                                              )}`
                                    }
                                />

                                {selectedProps.return_date && (
                                    <DetailLine
                                        icon="bi-calendar-check"
                                        label="Tanggal Pengembalian"
                                        value={dateLabel(
                                            selectedProps.return_date
                                        )}
                                    />
                                )}

                                <DetailLine
                                    icon="bi-building"
                                    label="Unit Pengaju"
                                    value={selectedProps.requester_unit}
                                />

                                <DetailLine
                                    icon="bi-person"
                                    label="Nama PIC / Pemohon"
                                    value={selectedProps.pic_name}
                                />

                                {selectedProps.directorate && (
                                    <DetailLine
                                        icon="bi-person-vcard"
                                        label="Agenda Untuk"
                                        value={
                                            DIRECTORATE_LABELS[
                                                selectedProps.directorate
                                            ] ||
                                            selectedProps.directorate
                                        }
                                    />
                                )}

                                <DetailLine
                                    icon="bi-geo-alt"
                                    label="Lokasi"
                                    value={selectedProps.location}
                                />
                            </div>

                            {selectedProps.description && (
                                <div className="ic-description">
                                    <small className="text-muted fw-bold">
                                        DESKRIPSI / KEPERLUAN
                                    </small>

                                    <div className="mt-2">
                                        {selectedProps.description}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="ic-modal-footer">
                            <button
                                type="button"
                                className="btn btn-light border rounded-pill"
                                onClick={() => setSelected(null)}
                            >
                                Tutup
                            </button>

                            {getDetailLink() && (
                                <Link
                                    to={getDetailLink()}
                                    className="btn btn-danger rounded-pill"
                                >
                                    <i className="bi bi-box-arrow-up-right me-2" />
                                    Buka Modul Asal
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .integrated-calendar-page {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    min-width: 0;
                }

                .integrated-calendar-page .fw-black {
                    font-weight: 900 !important;
                }

                .ic-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                    flex-wrap: wrap;
                }

                .ic-header h2 {
                    font-size: 1.8rem;
                }

                .ic-summary {
                    display: grid;
                    grid-template-columns:
                        repeat(4, minmax(0, 1fr));
                    gap: 10px;
                }

                .ic-summary-card {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    padding: 16px;
                    border: 1px solid #e2e8f0;
                    border-radius: 17px;
                    background: #fff;
                }

                .ic-summary-icon {
                    width: 43px;
                    height: 43px;
                    flex: 0 0 43px;
                    display: grid;
                    place-items: center;
                    border-radius: 13px;
                    font-size: 1.2rem;
                }

                .ic-summary-card small {
                    display: block;
                    font-size: .7rem;
                    font-weight: 700;
                    color: #64748b;
                }

                .ic-summary-card strong {
                    display: block;
                    font-size: 1.5rem;
                    font-weight: 900;
                    color: #0f172a;
                }

                .ic-panel,
                .ic-calendar-card {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    box-shadow:
                        0 5px 20px rgba(15, 23, 42, .04);
                }

                .ic-panel {
                    padding: 20px;
                }

                .ic-panel-heading {
                    margin-bottom: 15px;
                }

                .ic-filters {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .ic-source-toggle {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 10px 13px;
                    font-size: .83rem;
                    font-weight: 700;
                    cursor: pointer;
                    background: #f8fafc;
                }

                .ic-source-toggle input {
                    cursor: pointer;
                }

                .ic-source-dot {
                    width: 11px;
                    height: 11px;
                    border-radius: 50%;
                }

                .ic-calendar-card {
                    overflow: hidden;
                }

                .ic-calendar-heading {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    padding: 20px;
                    border-bottom: 1px solid #e2e8f0;
                }

                .ic-calendar-content {
                    padding: 18px;
                    min-width: 0;
                }

                .ic-calendar-content .fc {
                    font-family: inherit;
                    --fc-border-color: #e2e8f0;
                    --fc-today-bg-color: #fff1f2;
                }

                .ic-calendar-content .fc-toolbar-title {
                    font-weight: 900;
                    font-size: 1.15rem;
                }

                .ic-calendar-content .fc-button-primary {
                    background: #7f1d1d;
                    border-color: #7f1d1d;
                }

                .ic-calendar-content .fc-button-primary:hover {
                    background: #991b1b;
                    border-color: #991b1b;
                }

                .ic-calendar-content .ic-event-pending {
                    opacity: .65;
                    border-style: dashed !important;
                }

                .ic-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, .68);
                    z-index: 1100;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .ic-modal {
                    width: 100%;
                    max-width: 680px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    background: #fff;
                    border-radius: 22px;
                    box-shadow: 0 24px 70px rgba(0,0,0,.2);
                }

                .ic-modal-header,
                .ic-modal-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 15px;
                    padding: 20px 24px;
                }

                .ic-modal-header {
                    border-bottom: 1px solid #e2e8f0;
                }

                .ic-modal-header .btn-close {
                    flex-shrink: 0;
                }

                .ic-modal-body {
                    padding: 20px 24px;
                    overflow-y: auto;
                }

                .ic-modal-footer {
                    border-top: 1px solid #e2e8f0;
                    justify-content: flex-end;
                    flex-wrap: wrap;
                }

                .ic-detail-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(2, minmax(0, 1fr));
                    gap: 10px;
                }

                .ic-detail-line {
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                    padding: 13px;
                    background: #f8fafc;
                    border-radius: 13px;
                    min-width: 0;
                }

                .ic-detail-icon {
                    color: #7f1d1d;
                }

                .ic-detail-line small {
                    display: block;
                    color: #94a3b8;
                    font-weight: 700;
                    margin-bottom: 4px;
                }

                .ic-detail-line strong {
                    display: block;
                    font-size: .84rem;
                    color: #334155;
                    overflow-wrap: anywhere;
                }

                .ic-description {
                    background: #f8fafc;
                    border-radius: 13px;
                    padding: 15px;
                    margin-top: 12px;
                    white-space: pre-line;
                    font-size: .86rem;
                }

                @media (max-width: 1100px) {
                    .ic-summary {
                        grid-template-columns:
                            repeat(2, minmax(0, 1fr));
                    }
                }

                @media (max-width: 767px) {
                    .ic-header h2 {
                        font-size: 1.45rem;
                    }

                    .ic-panel,
                    .ic-calendar-content {
                        padding: 12px;
                    }

                    .ic-detail-grid {
                        grid-template-columns: 1fr;
                    }

                    .ic-summary-card {
                        padding: 11px;
                    }

                    .ic-calendar-content .fc-header-toolbar {
                        flex-direction: column;
                        gap: 10px;
                    }

                    .ic-modal-overlay {
                        padding: 10px;
                    }

                    .ic-modal-header,
                    .ic-modal-body,
                    .ic-modal-footer {
                        padding: 15px;
                    }
                }
            `}</style>
        </div>
    );
}
