
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { showErrorAlert } from '../../utils/sweetAlert';

const SERVICE_LABELS = {
    'REQUEST DESIGN INSTAGRAM': 'Request Design Instagram',
    'DOKUMENTASI': 'Dokumentasi',
    'PUBLIKASI WEBSITE': 'Publikasi Website',
    'PUBLIKASI MEDIA MASSA': 'Publikasi Media Massa',
    'YOUTUBE': 'YouTube',
    'VIDEO REELS': 'Video Reels',
    'SOCIAL MEDIA': 'Social Media',
};

const STATUSES = [
    { key: 'all', label: 'Semua', icon: 'bi-grid-fill' },
    { key: 'pending', label: 'Menunggu', icon: 'bi-hourglass-split' },
    { key: 'approved', label: 'Disetujui', icon: 'bi-check-circle-fill' },
    { key: 'completed', label: 'Selesai', icon: 'bi-check2-all' },
    { key: 'rejected', label: 'Ditolak', icon: 'bi-x-circle-fill' },
];

const STATUS_CONFIG = {
    pending: ['Menunggu', 'bg-warning-subtle text-warning-emphasis'],
    approved: ['Disetujui', 'bg-primary-subtle text-primary'],
    completed: ['Selesai', 'bg-success-subtle text-success'],
    rejected: ['Ditolak', 'bg-danger-subtle text-danger'],
};

const formatDate = (value) => {
    if (!value) return '-';
    const dateString = String(value).slice(0, 10);
    const [y, m, d] = dateString.split('-').map(Number);
    const parsed = new Date(y, m - 1, d);
    return Number.isNaN(parsed.getTime())
        ? '-'
        : parsed.toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
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

const serviceLabel = (coverage) => {
    if (!coverage) return 'Layanan HUMAS';
    return String(coverage)
        .split(/[;,]/)
        .map((item) => {
            const normalized = item.trim().toUpperCase();
            return SERVICE_LABELS[normalized] || item.trim();
        })
        .join(', ');
};

const getError = (error) =>
    error?.response?.data?.message ||
    'Gagal memuat daftar approval HUMAS.';

function StatusBadge({ status }) {
    const [label, className] = STATUS_CONFIG[status] || [
        status || 'Tidak diketahui',
        'bg-secondary-subtle text-secondary',
    ];

    return (
        <span className={`badge rounded-pill px-3 py-2 ${className}`}>
            {label}
        </span>
    );
}

export default function HumasServiceApprovalPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedService, setSelectedService] = useState('all');

    const loadRequests = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) setLoading(true);
            setError('');

            const response = await api.get('/humas-service-requests');
            const payload = response?.data?.data;

            const rows = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.requests)
                  ? payload.requests
                  : Array.isArray(payload?.data)
                    ? payload.data
                    : [];

            setRequests(rows);
        } catch (err) {
            console.error('Approval HUMAS:', err);
            if (showLoader) setError(getError(err));
        } finally {
            if (showLoader) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRequests();

        const interval = window.setInterval(() => {
            loadRequests(false);
        }, 30000);

        return () => window.clearInterval(interval);
    }, [loadRequests]);

    const services = useMemo(() => {
        const all = requests.flatMap((request) =>
            String(request.coverage_type || '')
                .split(/[;,]/)
                .map((item) => item.trim())
                .filter(Boolean)
        );
        return [...new Set(all)].sort();
    }, [requests]);

    const filteredRequests = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return requests.filter((request) => {
            if (
                selectedStatus !== 'all' &&
                request.status !== selectedStatus
            ) {
                return false;
            }

            const parts = String(request.coverage_type || '')
                .split(/[;,]/)
                .map((item) => item.trim().toUpperCase());

            if (
                selectedService !== 'all' &&
                !parts.includes(selectedService.toUpperCase())
            ) {
                return false;
            }

            const searchable = [
                request.service_code,
                request.coverage_type,
                serviceLabel(request.coverage_type),
                request.applicant_name,
                request.user?.name,
                request.user?.email,
                request.unit_name,
                request.other_unit_name,
                request.event_location,
                request.activity_detail,
                request.pic_whatsapp,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return !keyword || searchable.includes(keyword);
        });
    }, [requests, search, selectedService, selectedStatus]);

    const countStatus = (status) =>
        status === 'all'
            ? requests.length
            : requests.filter((item) => item.status === status).length;

    return (
        <div className="container-fluid px-0">
            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                style={{
                    background:
                        'linear-gradient(135deg,#111827 0%,#7f1d1d 55%,#dc2626 100%)',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge bg-white text-danger rounded-pill px-3 py-2 mb-3">
                                LAYANAN HUBUNGAN MASYARAKAT
                            </span>
                            <h1 className="display-6 fw-black mb-3">
                                Approval Layanan HUMAS
                            </h1>
                            <p className="text-white-50 mb-0">
                                Kelola pengajuan dokumentasi, desain
                                Instagram, publikasi website, publikasi
                                media massa, YouTube, dan video reels.
                            </p>
                        </div>
                        <div className="col-lg-4">
                            <div className="row g-3">
                                {[
                                    ['Total', requests.length],
                                    ['Menunggu', countStatus('pending')],
                                    ['Disetujui', countStatus('approved')],
                                    ['Selesai', countStatus('completed')],
                                ].map(([label, value]) => (
                                    <div className="col-6" key={label}>
                                        <div className="bg-white bg-opacity-10 rounded-4 p-3">
                                            <div className="fs-3 fw-black">
                                                {value}
                                            </div>
                                            <div className="small text-white-50">
                                                {label}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="row g-3">
                        <div className="col-lg-7">
                            <label className="form-label fw-bold">
                                Cari Pengajuan
                            </label>
                            <div className="input-group">
                                <span className="input-group-text bg-light">
                                    <i className="bi bi-search" />
                                </span>
                                <input
                                    type="search"
                                    className="form-control"
                                    placeholder="Kode, pemohon, jenis liputan, lokasi..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-lg-5">
                            <label className="form-label fw-bold">
                                Jenis Layanan
                            </label>
                            <select
                                className="form-select"
                                value={selectedService}
                                onChange={(e) =>
                                    setSelectedService(e.target.value)
                                }
                            >
                                <option value="all">Semua Layanan</option>
                                {services.map((service) => (
                                    <option key={service} value={service}>
                                        {serviceLabel(service)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-12">
                            <label className="form-label fw-bold">
                                Status Pengajuan
                            </label>
                            <div className="d-flex flex-wrap gap-2">
                                {STATUSES.map((status) => (
                                    <button
                                        key={status.key}
                                        type="button"
                                        className={`btn rounded-pill ${
                                            selectedStatus === status.key
                                                ? 'btn-danger'
                                                : 'btn-outline-danger'
                                        }`}
                                        onClick={() =>
                                            setSelectedStatus(status.key)
                                        }
                                    >
                                        <i className={`bi ${status.icon} me-2`} />
                                        {status.label}
                                        <span className="badge rounded-pill bg-light text-dark ms-2">
                                            {countStatus(status.key)}
                                        </span>
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className="btn btn-light border rounded-pill"
                                    onClick={() => {
                                        setSearch('');
                                        setSelectedService('all');
                                        setSelectedStatus('all');
                                    }}
                                >
                                    Reset
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-light border rounded-pill"
                                    onClick={() => loadRequests()}
                                >
                                    <i className="bi bi-arrow-clockwise me-2" />
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {error && (
                <div className="alert alert-danger rounded-4">
                    {error}
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger ms-3"
                        onClick={() => loadRequests()}
                    >
                        Coba Lagi
                    </button>
                </div>
            )}

            {loading ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div className="spinner-border text-danger mb-3" />
                        <h5 className="fw-black">
                            Memuat Pengajuan HUMAS
                        </h5>
                    </div>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <i className="bi bi-inbox fs-1 text-muted" />
                        <h5 className="fw-black mt-3">
                            Data Tidak Ditemukan
                        </h5>
                        <p className="text-muted">
                            Tidak ada permohonan HUMAS sesuai filter.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="row g-3">
                    {filteredRequests.map((request) => {
                        const unit =
                            request.resolved_unit_name ||
                            (request.unit_name === 'Lainnya'
                                ? request.other_unit_name
                                : request.unit_name) ||
                            '-';

                        return (
                            <div className="col-12" key={request.id}>
                                <div className="card border-0 shadow-sm rounded-5">
                                    <div className="card-body p-4">
                                        <div className="row align-items-center g-4">
                                            <div className="col-lg-6">
                                                <div className="d-flex align-items-start gap-3">
                                                    <div
                                                        className="rounded-4 bg-danger-subtle text-danger d-grid flex-shrink-0"
                                                        style={{
                                                            width: 55,
                                                            height: 55,
                                                            placeItems: 'center',
                                                        }}
                                                    >
                                                        <i className="bi bi-camera-reels-fill fs-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="d-flex flex-wrap gap-2 mb-2">
                                                            <span className="badge bg-danger-subtle text-danger rounded-pill px-3 py-2">
                                                                {serviceLabel(
                                                                    request.coverage_type
                                                                )}
                                                            </span>
                                                            <StatusBadge
                                                                status={
                                                                    request.status
                                                                }
                                                            />
                                                        </div>
                                                        <div className="small text-muted">
                                                            {request.service_code ||
                                                                `HMS-${request.id}`}
                                                        </div>
                                                        <h5 className="fw-black mt-2 mb-2">
                                                            {request.activity_detail
                                                                ? String(request.activity_detail).slice(0, 95)
                                                                : serviceLabel(request.coverage_type)}
                                                        </h5>
                                                        <div className="small text-muted">
                                                            Pemohon:{' '}
                                                            <strong>
                                                                {request.applicant_name ||
                                                                    request.user?.name ||
                                                                    '-'}
                                                            </strong>
                                                        </div>
                                                        <div className="small text-muted">
                                                            Unit: {unit}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-md-4 col-lg-2">
                                                <div className="small text-muted mb-1">
                                                    Tanggal Kegiatan
                                                </div>
                                                <strong>
                                                    {formatDate(request.event_date)}
                                                </strong>
                                            </div>

                                            <div className="col-md-4 col-lg-2">
                                                <div className="small text-muted mb-1">
                                                    Lokasi
                                                </div>
                                                <strong>
                                                    {request.event_location || '-'}
                                                </strong>
                                            </div>

                                            <div className="col-md-4 col-lg-2 text-lg-end">
                                                <div className="small text-muted mb-2">
                                                    {formatDateTime(
                                                        request.submitted_at ||
                                                            request.created_at
                                                    )}
                                                </div>
                                                <Link
                                                    to={`/admin/humas-services/${request.id}`}
                                                    className="btn btn-danger rounded-pill px-4"
                                                >
                                                    <i className="bi bi-eye-fill me-2" />
                                                    Detail
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <style>{`
                .fw-black { font-weight: 850 !important; }
            `}</style>
        </div>
    );
}
