
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const formatNumber = (value) =>
    Number(value || 0).toLocaleString('id-ID');

const formatDate = (value) => {
    if (!value) return '-';

    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const getError = (error) =>
    error?.response?.data?.message ||
    error?.message ||
    'Gagal memuat rekap Direktorat.';

const statConfig = [
    {
        key: 'total_agendas',
        title: 'Agenda Direktorat',
        icon: 'bi-calendar-event-fill',
        color: 'danger',
    },
    {
        key: 'planned_meetings',
        title: 'Agenda Rapat',
        icon: 'bi-people-fill',
        color: 'primary',
    },
    {
        key: 'total_schedule_requests',
        title: 'Pengajuan Jadwal',
        icon: 'bi-file-earmark-text-fill',
        color: 'info',
    },
    {
        key: 'pending_schedule_requests',
        title: 'Menunggu Approval Jadwal',
        icon: 'bi-hourglass-split',
        color: 'warning',
    },
];

export default function DashboardDirectorateSection() {
    const [filters, setFilters] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    /*
     * Terhubung ke filter Analytics existing.
     * Setiap filter dashboard berhasil diterapkan,
     * komponen akan mengambil laporan periode yang sama.
     */
    useEffect(() => {
        const handleFilters = (event) => {
            const detail = event.detail || {};

            if (!detail.start_date || !detail.end_date) {
                return;
            }

            setFilters({
                service: detail.service || 'all',
                status: detail.status || 'all',
                start_date: detail.start_date,
                end_date: detail.end_date,
            });
        };

        window.addEventListener(
            'humas:dashboard:filters',
            handleFilters
        );

        return () => {
            window.removeEventListener(
                'humas:dashboard:filters',
                handleFilters
            );
        };
    }, []);

    useEffect(() => {
        if (!filters || filters.service !== 'all') {
            setData(null);
            return;
        }

        let cancelled = false;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError('');

                const response = await api.get(
                    '/dashboard/directorate-summary',
                    {
                        params: {
                            start_date: filters.start_date,
                            end_date: filters.end_date,
                        },
                    }
                );

                if (!cancelled) {
                    setData(response?.data?.data || null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(getError(err));
                    setData(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            cancelled = true;
        };
    }, [filters]);

    const comparison = useMemo(
        () => data?.comparison || [],
        [data]
    );

    const current = data?.current || null;
    const summary = current?.summary || {};

    const recentAgendas = useMemo(
        () => (current?.agendas || [])
            .slice()
            .sort((a, b) =>
                String(b.event_date).localeCompare(
                    String(a.event_date)
                )
            )
            .slice(0, 8),
        [current]
    );

    if (!filters || filters.service !== 'all') {
        return null;
    }

    return (
        <section className="mt-4 mb-4">
            <div className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                        <div>
                            <h4 className="fw-black mb-1">
                                Pelaporan Direktorat
                            </h4>

                            <p className="text-muted mb-0">
                                Terintegrasi dengan Dashboard Analytics.
                                Periode: {formatDate(filters.start_date)}
                                {' – '}
                                {formatDate(filters.end_date)}
                            </p>
                        </div>

                        <Link
                            to="/admin/director-schedule"
                            className="btn btn-outline-danger rounded-pill"
                        >
                            <i className="bi bi-calendar3 me-2" />
                            Buka Jadwal
                        </Link>
                    </div>

                    {filters.status !== 'all' && (
                        <div className="alert alert-light border small">
                            <i className="bi bi-info-circle me-2" />
                            Status pada filter utama berlaku untuk pengajuan
                            layanan. Rekap agenda Direktorat dihitung
                            berdasarkan tanggal kegiatan, terlepas dari
                            status pengajuan yang dipilih.
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center p-4">
                            <span className="spinner-border text-danger" />
                            <p className="text-muted mt-2 mb-0">
                                Memuat data Direktorat...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger">
                            <i className="bi bi-exclamation-triangle me-2" />
                            {error}
                        </div>
                    ) : (
                        <>
                            <div className="row g-3 mb-4">
                                {statConfig.map((stat) => (
                                    <div
                                        className="col-md-6 col-xl-3"
                                        key={stat.key}
                                    >
                                        <div className="border rounded-4 h-100 p-3">
                                            <div className="d-flex justify-content-between align-items-start gap-2">
                                                <div>
                                                    <div className="small text-muted fw-semibold">
                                                        {stat.title}
                                                    </div>

                                                    <h3 className="fw-black mt-2 mb-0">
                                                        {stat.key.includes('schedule_requests') &&
                                                        !summary.can_view_schedule_requests
                                                            ? '—'
                                                            : formatNumber(summary[stat.key])}
                                                    </h3>
                                                </div>

                                                <div className={`bg-${stat.color}-subtle text-${stat.color} p-3 rounded-3`}>
                                                    <i className={`bi ${stat.icon} fs-5`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="row g-4">
                                <div className="col-xl-7">
                                    <h5 className="fw-bold mb-2">
                                        Perbandingan Agenda per Direktorat
                                    </h5>

                                    <p className="small text-muted">
                                        Perbandingan dengan periode yang sama
                                        pada tahun sebelumnya.
                                    </p>

                                    <div className="table-responsive">
                                        <table className="table table-hover align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Direktorat</th>
                                                    <th className="text-end">
                                                        Tahun Lalu
                                                    </th>
                                                    <th className="text-end">
                                                        Tahun Ini
                                                    </th>
                                                    <th className="text-end">
                                                        YoY
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {comparison.map((row) => (
                                                    <tr key={row.key}>
                                                        <td className="fw-semibold">
                                                            {row.label}
                                                        </td>

                                                        <td className="text-end">
                                                            {formatNumber(row.previous)}
                                                        </td>

                                                        <td className="text-end">
                                                            {formatNumber(row.current)}
                                                        </td>

                                                        <td className="text-end">
                                                            {row.growth_percent === null ? (
                                                                <span className="text-muted">
                                                                    N/A
                                                                </span>
                                                            ) : (
                                                                <span
                                                                    className={`badge ${
                                                                        row.growth_percent >= 0
                                                                            ? 'bg-success-subtle text-success'
                                                                            : 'bg-danger-subtle text-danger'
                                                                    }`}
                                                                >
                                                                    {row.growth_percent > 0 ? '+' : ''}
                                                                    {row.growth_percent}%
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="small text-muted">
                                        Jumlah agenda tidak otomatis berarti
                                        kegiatan sudah terlaksana.
                                    </div>
                                </div>

                                <div className="col-xl-5">
                                    <h5 className="fw-bold mb-3">
                                        Kategori Agenda
                                    </h5>

                                    {(current?.categories || []).length === 0 ? (
                                        <p className="text-muted">
                                            Belum ada agenda pada periode ini.
                                        </p>
                                    ) : (
                                        <div className="d-flex flex-column gap-2">
                                            {current.categories.map((item) => {
                                                const percentage =
                                                    summary.total_agendas > 0
                                                        ? item.total / summary.total_agendas * 100
                                                        : 0;

                                                return (
                                                    <div key={item.category}>
                                                        <div className="d-flex justify-content-between small mb-1">
                                                            <span>{item.category}</span>
                                                            <strong>{item.total}</strong>
                                                        </div>

                                                        <div
                                                            className="progress"
                                                            style={{ height: 8 }}
                                                        >
                                                            <div
                                                                className="progress-bar bg-danger"
                                                                style={{
                                                                    width: `${percentage}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="border rounded-4 p-3 mt-4">
                                        <div className="small text-muted">
                                            Realisasi Rapat Terlaksana
                                        </div>

                                        <h3 className="fw-black mt-2 mb-1">
                                            {summary.has_meeting_records &&
                                            summary.can_view_meeting_notes
                                                ? formatNumber(summary.meetings_held)
                                                : '—'}
                                        </h3>

                                        <p className="small text-muted mb-0">
                                            {summary.has_meeting_records
                                                ? summary.can_view_meeting_notes
                                                    ? 'Dihitung dari catatan realisasi rapat.'
                                                    : 'Catatan rapat hanya tersedia untuk admin yang berwenang.'
                                                : 'Pencatatan realisasi rapat belum tersedia.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {data && !loading && !error && (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-4">
                        <h5 className="fw-black mb-1">
                            Agenda Direktorat pada Periode Ini
                        </h5>

                        <p className="small text-muted mb-3">
                            Menampilkan delapan agenda terbaru dalam rentang filter.
                            Data lengkap disertakan pada Export Excel existing.
                        </p>

                        {recentAgendas.length === 0 ? (
                            <div className="bg-light rounded-4 p-4 text-center text-muted">
                                Belum ada agenda Direktorat pada periode ini.
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Tanggal</th>
                                            <th>Agenda</th>
                                            <th>Direktorat</th>
                                            <th>Kategori</th>
                                            <th>Lokasi</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {recentAgendas.map((item) => (
                                            <tr key={item.id}>
                                                <td>
                                                    {formatDate(item.event_date)}
                                                </td>

                                                <td className="fw-semibold">
                                                    {item.title}
                                                </td>

                                                <td>
                                                    {item.directorate_label}
                                                </td>

                                                <td>
                                                    <span className="badge bg-danger-subtle text-danger">
                                                        {item.agenda_type || 'Lainnya'}
                                                    </span>
                                                </td>

                                                <td>
                                                    {item.location || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
